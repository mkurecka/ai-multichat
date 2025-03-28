<?php

namespace App\Controller;

use Symfony\Bundle\FrameworkBundle\Controller\AbstractController;
use Symfony\Component\HttpFoundation\JsonResponse;
use Symfony\Component\HttpFoundation\Request;
use Symfony\Component\Routing\Annotation\Route;
use App\Service\OpenRouterService;
use App\Service\ModelService;
use App\Service\PromptIdService;
use Doctrine\ORM\EntityManagerInterface;
use App\Entity\ChatHistory;
use Symfony\Component\Serializer\SerializerInterface;
use App\Entity\Thread;
use Symfony\Component\HttpFoundation\Response;
use Symfony\Component\HttpKernel\Exception\HttpException;
use Symfony\Component\HttpFoundation\StreamedResponse;
use Symfony\Component\Security\Http\Attribute\IsGranted;

#[Route('/api')]
class ChatController extends AbstractController
{
    public function __construct(
        private PromptIdService $promptIdService
    ) {}

    #[Route('/models', methods: ['GET'])]
    public function getModels(ModelService $modelService): JsonResponse
    {
        return $this->json($modelService->getModels());
    }
    
    #[Route('/models/refresh', methods: ['GET'])]
    #[IsGranted('ROLE_USER')]
    public function refreshModels(ModelService $modelService): JsonResponse
    {
        return $this->json($modelService->refreshModels());
    }

    #[Route('/chat', methods: ['POST'])]
    #[IsGranted('ROLE_USER')]
    public function chat(Request $request, EntityManagerInterface $em, OpenRouterService $openRouter): Response
    {
        $data = json_decode($request->getContent(), true);
        $prompt = $data['prompt'] ?? null;
        $models = $data['models'] ?? [];
        $threadId = $data['threadId'] ?? null;
        $stream = $data['stream'] ?? false;
        
        if (!$prompt || empty($models)) {
            throw new HttpException(400, 'Prompt and models are required');
        }
        
        $user = $this->getUser();
        $organization = $user->getOrganization();
        
        // Generate a new prompt ID for this chat window
        $promptId = $this->promptIdService->generatePromptId();
        
        // Handle thread creation or retrieval
        if ($threadId) {
            // If thread ID is provided, use it
            $thread = $em->getRepository(Thread::class)->findOneBy(['threadId' => $threadId]);
            if (!$thread) {
                throw new HttpException(404, 'Thread not found');
            }
        } else {
            // No thread ID provided - create exactly one new thread
            $thread = new Thread();
            $thread->setTitle(substr($prompt, 0, 100));
            $thread->setUser($user);
            $thread->setThreadId(uniqid('thread_', true));
            $em->persist($thread);
            $em->flush(); // Flush immediately to ensure thread is saved
            
            // Get the thread ID to reuse with all models
            $threadId = $thread->getThreadId();
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
            $response = new StreamedResponse(function() use ($modelResponse, $modelId, $prompt, $thread, $em, $promptId) {
                $stream = $modelResponse['stream'];
                $content = '';
                $openRouterId = null;
                $historySaved = false;
                
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
                                    ->setPromptId($promptId)
                                    ->setResponse([
                                        'content' => $content,
                                        'usage' => [
                                            'prompt_tokens' => 0,
                                            'completion_tokens' => 0,
                                            'total_tokens' => 0
                                        ]
                                    ])
                                    ->setModelId($modelId);
                                
                                $em->persist($chatHistory);
                                $em->flush();
                                $historySaved = true;
                                
                                echo "data: [DONE]\n\n";
                                flush();
                                break;
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
                                        'modelId' => $modelId,
                                        'threadId' => $thread->getThreadId(),
                                        'promptId' => $promptId
                                    ], JSON_UNESCAPED_UNICODE) . "\n\n";
                                    flush();
                                }
                                if (isset($parsed['choices'][0]['delta']['usage'])) {
                                    $usage = $parsed['choices'][0]['delta']['usage'];
                                    echo "data: " . json_encode([
                                        'usage' => $usage,
                                        'modelId' => $modelId,
                                        'threadId' => $thread->getThreadId(),
                                        'promptId' => $promptId
                                    ], JSON_UNESCAPED_UNICODE) . "\n\n";
                                    flush();
                                }
                            } catch (\Exception $e) {
                                // Log error but continue processing
                                error_log('Error processing stream data: ' . $e->getMessage());
                            }
                        }
                    }
                }
                
                if (!$historySaved) {
                    // If we didn't save the history yet, save it now
                    $chatHistory = new ChatHistory();
                    $chatHistory->setThread($thread)
                        ->setPrompt($prompt)
                        ->setPromptId($promptId)
                        ->setResponse([
                            'content' => $content,
                            'usage' => [
                                'prompt_tokens' => 0,
                                'completion_tokens' => 0,
                                'total_tokens' => 0
                            ]
                        ])
                        ->setModelId($modelId);
                    
                    $em->persist($chatHistory);
                    $em->flush();
                }
            });
            
            $response->headers->set('Content-Type', 'text/event-stream');
            $response->headers->set('Cache-Control', 'no-cache');
            $response->headers->set('Connection', 'keep-alive');
            
            return $response;
        }
        
        // For non-streaming, handle all models at once
        $modelResponses = $openRouter->sendPrompt($prompt, $models);
        
        foreach ($modelResponses as $modelId => $response) {
            $chatHistory = new ChatHistory();
            $chatHistory->setThread($thread)
                ->setPrompt($prompt)
                ->setPromptId($promptId)
                ->setResponse([
                    'content' => $response['content'],
                    'usage' => $response['usage'] ?? [
                        'prompt_tokens' => 0,
                        'completion_tokens' => 0,
                        'total_tokens' => 0
                    ]
                ])
                ->setModelId($modelId);
            
            $em->persist($chatHistory);
        }
        
        $em->flush();
        
        return $this->json([
            'threadId' => $thread->getThreadId(),
            'promptId' => $promptId
        ]);
    }

    
    #[Route('/chat/history', methods: ['GET'])]
    public function history(): JsonResponse
    {
        $user = $this->getUser();
        $threads = $user->getThreads();
        $data = [];
        
        foreach ($threads as $thread) {
            $histories = $thread->getMessages()->toArray();
            
            // Sort histories by creation date, oldest first
            usort($histories, function($a, $b) {
                return $a->getCreatedAt() <=> $b->getCreatedAt();
            });
            
            if (!empty($histories)) {
                $messages = [];
                $currentPromptId = null;
                $currentPromptResponses = [];
                
                foreach ($histories as $history) {
                    if ($currentPromptId !== $history->getPromptId()) {
                        // If we have responses from previous prompt, add them
                        if (!empty($currentPromptResponses)) {
                            $messages[] = [
                                'prompt' => $currentPromptResponses[0]['prompt'],
                                'responses' => array_column($currentPromptResponses, 'response', 'modelId'),
                                'createdAt' => $currentPromptResponses[0]['createdAt'],
                                'promptId' => $currentPromptId
                            ];
                        }
                        
                        // Start new group
                        $currentPromptId = $history->getPromptId();
                        $currentPromptResponses = [];
                    }
                    
                    $currentPromptResponses[] = [
                        'prompt' => $history->getPrompt(),
                        'response' => $history->getResponse(),
                        'modelId' => $history->getModelId(),
                        'createdAt' => $history->getCreatedAt()->format('Y-m-d H:i:s')
                    ];
                }
                
                // Don't forget to add the last group
                if (!empty($currentPromptResponses)) {
                    $messages[] = [
                        'prompt' => $currentPromptResponses[0]['prompt'],
                        'responses' => array_column($currentPromptResponses, 'response', 'modelId'),
                        'createdAt' => $currentPromptResponses[0]['createdAt'],
                        'promptId' => $currentPromptId
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
        $histories = $thread->getMessages()->toArray();
        
        // Sort histories by creation date, oldest first
        usort($histories, function($a, $b) {
            return $a->getCreatedAt() <=> $b->getCreatedAt();
        });
        
        $currentPromptId = null;
        $currentPromptResponses = [];
        
        foreach ($histories as $history) {
            if ($currentPromptId !== $history->getPromptId()) {
                // If we have responses from previous prompt, add them
                if (!empty($currentPromptResponses)) {
                    $messages[] = [
                        'prompt' => $currentPromptResponses[0]['prompt'],
                        'responses' => array_column($currentPromptResponses, 'response', 'modelId'),
                        'createdAt' => $currentPromptResponses[0]['createdAt'],
                        'promptId' => $currentPromptId
                    ];
                }
                
                // Start new group
                $currentPromptId = $history->getPromptId();
                $currentPromptResponses = [];
            }
            
            $currentPromptResponses[] = [
                'prompt' => $history->getPrompt(),
                'response' => $history->getResponse(),
                'modelId' => $history->getModelId(),
                'createdAt' => $history->getCreatedAt()->format('Y-m-d H:i:s')
            ];
        }
        
        // Don't forget to add the last group
        if (!empty($currentPromptResponses)) {
            $messages[] = [
                'prompt' => $currentPromptResponses[0]['prompt'],
                'responses' => array_column($currentPromptResponses, 'response', 'modelId'),
                'createdAt' => $currentPromptResponses[0]['createdAt'],
                'promptId' => $currentPromptId
            ];
        }
        
        return $this->json([
            'messages' => $messages,
            'threadId' => $thread->getThreadId()
        ]);
    }

    #[Route('/chat/thread', methods: ['POST'])]
    public function createThread(EntityManagerInterface $em): JsonResponse
    {
        $user = $this->getUser();
        
        $thread = new Thread();
        $thread->setTitle('New Chat');
        $thread->setUser($user);
        $thread->setThreadId(uniqid('thread_', true));
        
        $em->persist($thread);
        $em->flush();
        
        return $this->json([
            'threadId' => $thread->getThreadId()
        ]);
    }

    #[Route('/chat/costs', methods: ['GET'])]
    public function getCosts(EntityManagerInterface $em): JsonResponse
    {
        $user = $this->getUser();
        
        $qb = $em->createQueryBuilder();
        $qb->select('t.threadId', 't.title', 't.createdAt as threadCreatedAt', 'COUNT(ch.id) as messageCount')
           ->from(Thread::class, 't')
           ->leftJoin('t.chatHistories', 'ch')
           ->where('t.user = :user')
           ->setParameter('user', $user)
           ->groupBy('t.threadId', 't.title', 't.createdAt')
           ->orderBy('t.createdAt', 'DESC');
        
        $threads = $qb->getQuery()->getResult();
        
        // Get costs for each thread
        $threadCosts = [];
        foreach ($threads as $thread) {
            // Get total costs and tokens for this thread
            $stats = $em->createQueryBuilder()
                ->select('COALESCE(SUM(cc.totalCost), 0) as totalCost')
                ->addSelect('COALESCE(SUM(cc.tokensPrompt), 0) as totalPromptTokens')
                ->addSelect('COALESCE(SUM(cc.tokensCompletion), 0) as totalCompletionTokens')
                ->from('App\Entity\ChatCost', 'cc')
                ->join('cc.chatHistory', 'ch')
                ->join('ch.thread', 't')
                ->where('t.threadId = :threadId')
                ->setParameter('threadId', $thread['threadId'])
                ->getQuery()
                ->getSingleResult();
                
            $threadCosts[] = [
                'threadId' => $thread['threadId'],
                'title' => $thread['title'],
                'messageCount' => (int)$thread['messageCount'],
                'lastMessageDate' => $thread['threadCreatedAt']->format('Y-m-d H:i:s'),
                'totalCost' => (float)$stats['totalCost'],
                'totalTokens' => (int)($stats['totalPromptTokens'] + $stats['totalCompletionTokens'])
            ];
        }
        
        return $this->json($threadCosts);
    }
}
