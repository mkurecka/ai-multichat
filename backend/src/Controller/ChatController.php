<?php

namespace App\Controller;

use Symfony\Bundle\FrameworkBundle\Controller\AbstractController;
use Symfony\Component\HttpFoundation\JsonResponse;
use Symfony\Component\HttpFoundation\Request;
use Symfony\Component\Routing\Annotation\Route;
use App\Service\OpenRouterService;
use App\Service\ModelService;
use Doctrine\ORM\EntityManagerInterface;
use App\Entity\ChatHistory;
use Symfony\Component\Serializer\SerializerInterface;
use App\Entity\Thread;
use Symfony\Component\HttpFoundation\Response;
use Symfony\Component\HttpKernel\Exception\HttpException;
use Symfony\Component\HttpFoundation\StreamedResponse;

#[Route('/api')]
class ChatController extends AbstractController
{
    #[Route('/models', methods: ['GET'])]
    public function getModels(ModelService $modelService): JsonResponse
    {
        return $this->json($modelService->getModels());
    }
    
    #[Route('/models/refresh', methods: ['GET'])]
    public function refreshModels(ModelService $modelService): JsonResponse
    {
        return $this->json($modelService->refreshModels());
    }
    
    #[Route('/chat', methods: ['POST'])]
    public function chat(Request $request, OpenRouterService $openRouter, EntityManagerInterface $em): Response
    {
        $data = json_decode($request->getContent(), true);
        echo json_encode($data);
        $prompt = $data['prompt'];
        $models = $data['models'];
        $threadId = $data['threadId'] ?? null;
        $stream = $data['stream'] ?? false;
        
        $user = $this->getUser();
        $organization = $user->getOrganization();
        $organization->setUsageCount($organization->getUsageCount() + 1);
        
        // Find or create thread
        $thread = null;
        if ($threadId) {
            $thread = $em->getRepository(Thread::class)
                ->findOneBy(['threadId' => $threadId, 'user' => $user]);
        }
        
        if (!$thread) {
            $thread = new Thread();
            $thread->setUser($user);
            $thread->setThreadId(uniqid('thread_', true));
            $em->persist($thread);
            $em->flush();
        }

        if ($stream) {
            // For streaming, we'll handle one model at a time
            $modelId = $models[0]; // Get first model for streaming
            $modelResponses = $openRouter->streamResponse($prompt, [$modelId]);
            
            if (!isset($modelResponses[$modelId])) {
                throw new HttpException(500, 'Failed to generate streaming response');
            }

            $modelResponse = $modelResponses[$modelId];
            
            // Create a new StreamedResponse
            $response = new StreamedResponse(function() use ($modelResponse, $modelId, $prompt, $thread, $em) {
                $stream = $modelResponse['stream'];
                $content = '';
                $openRouterId = null;
                $historySaved = false;  // Add this flag
                
                while (!feof($stream)) {
                    $chunk = fread($stream, 8192);
                    if ($chunk === false) break;
                    
                    $lines = explode("\n", $chunk);
                    foreach ($lines as $line) {
                        if (empty(trim($line))) continue;
                        if (strpos($line, 'data: ') === 0) {
                            $data = substr($line, 6);
                            if ($data === '[DONE]') {
                                // Save the complete response to chat history
                                $chatHistory = new ChatHistory();
                                $chatHistory->setThread($thread)
                                    ->setPrompt($prompt)
                                    ->setResponse(['content' => $content])
                                    ->setModelId($modelId)
                                    ->setOpenRouterId($openRouterId);
                                
                                $em->persist($chatHistory);
                                $em->flush();
                                $historySaved = true;  // Set the flag
                                
                                echo "data: " . json_encode(['done' => true, 'modelId' => $modelId, 'threadId' => $thread->getThreadId()]) . "\n\n";
                                flush();
                                continue;
                            }
                            
                            try {
                                $parsed = json_decode($data, true);
                                if (isset($parsed['id'])) {
                                    $openRouterId = $parsed['id'];
                                    echo "data: " . json_encode(['id' => $openRouterId]) . "\n\n";
                                    flush();
                                }
                                if (isset($parsed['choices'][0]['delta']['content'])) {
                                    $content .= $parsed['choices'][0]['delta']['content'];
                                    echo "data: " . json_encode([
                                        'content' => $parsed['choices'][0]['delta']['content'],
                                        'modelId' => $modelId
                                    ]) . "\n\n";
                                    flush();
                                }
                            } catch (\Exception $e) {
                                error_log('Error parsing streaming response: ' . $e->getMessage());
                            }
                        }
                    }
                }

                // If we get here without a [DONE] message, save what we have
                if (!$historySaved && !empty($content)) {
                    $chatHistory = new ChatHistory();
                    $chatHistory->setThread($thread)
                        ->setPrompt($prompt)
                        ->setResponse(['content' => $content])
                        ->setModelId($modelId)
                        ->setOpenRouterId($openRouterId);
                    
                    $em->persist($chatHistory);
                    $em->flush();
                }
            });
            
            $response->headers->set('Content-Type', 'text/event-stream');
            $response->headers->set('Cache-Control', 'no-cache');
            $response->headers->set('Connection', 'keep-alive');
            $response->headers->set('X-Accel-Buffering', 'no'); // Disable nginx buffering
            
            return $response;
        } else {
            // Non-streaming response
            $responses = [];
            foreach ($models as $modelId) {
                $modelResponses = $openRouter->generateResponse($prompt, [$modelId]);
                
                if (!isset($modelResponses[$modelId])) {
                    continue;
                }
                
                $modelResponse = $modelResponses[$modelId];
                
                $chatHistory = new ChatHistory();
                $chatHistory->setThread($thread)
                    ->setPrompt($prompt)
                    ->setResponse($modelResponse)
                    ->setModelId($modelId)
                    ->setOpenRouterId($modelResponse['id']);
                
                $em->persist($chatHistory);
                
                $responses[$modelId] = [
                    'content' => $modelResponse['content'],
                    'usage' => $modelResponse['usage']
                ];
            }
            
            $em->flush();
            
            return $this->json([
                'responses' => $responses,
                'threadId' => $thread->getThreadId(),
                'usage' => [
                    'user' => $user->getThreads()->count(),
                    'organization' => $organization->getUsageCount()
                ]
            ]);
        }
    }
    
    #[Route('/chat/history', methods: ['GET'])]
    public function history(): JsonResponse
    {
        $user = $this->getUser();
        $threads = $user->getThreads();
        $data = [];
        
        foreach ($threads as $thread) {
            $histories = $thread->getChatHistories()->toArray();
            
            // Sort histories by creation date, oldest first
            usort($histories, function($a, $b) {
                return $a->getCreatedAt() <=> $b->getCreatedAt();
            });
            
            if (!empty($histories)) {
                $messages = [];
                foreach ($histories as $history) {
                    $messages[] = [
                        'prompt' => $history->getPrompt(),
                        'responses' => [$history->getModelId() => $history->getResponse()['content']],
                        'createdAt' => $history->getCreatedAt()->format('Y-m-d H:i:s'),
                        'modelId' => $history->getModelId()
                    ];
                }
                
                $data[] = [
                    'id' => $thread->getId(),
                    'title' => $messages[0]['prompt'], // Use first message as title
                    'messages' => $messages,
                    'threadId' => $thread->getThreadId(),
                    'createdAt' => $thread->getCreatedAt()->format('Y-m-d H:i:s')
                ];
            }
        }
        
        // Sort by creation date, newest first
        usort($data, function($a, $b) {
            return strtotime($b['createdAt']) - strtotime($a['createdAt']);
        });
        
        return $this->json($data);
    }

    #[Route('/chat/thread/{threadId}', methods: ['GET'])]
    public function getThread(string $threadId, EntityManagerInterface $em): JsonResponse
    {
        $user = $this->getUser();
        $thread = $em->getRepository(Thread::class)
            ->findOneBy(['threadId' => $threadId, 'user' => $user]);
            
        if (!$thread) {
            throw $this->createNotFoundException('Thread not found');
        }
        
        $messages = [];
        $histories = $thread->getChatHistories()->toArray();
        
        // Sort histories by creation date, oldest first
        usort($histories, function($a, $b) {
            return $a->getCreatedAt() <=> $b->getCreatedAt();
        });
        
        foreach ($histories as $history) {
            $messages[] = [
                'prompt' => $history->getPrompt(),
                'responses' => [$history->getModelId() => $history->getResponse()['content']],
                'createdAt' => $history->getCreatedAt()->format('Y-m-d H:i:s'),
                'modelId' => $history->getModelId()
            ];
        }
        
        return $this->json([
            'messages' => $messages,
            'threadId' => $thread->getThreadId()
        ]);
    }
}
