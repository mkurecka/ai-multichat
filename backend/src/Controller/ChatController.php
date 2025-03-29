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
use Symfony\Component\HttpKernel\Exception\UnauthorizedHttpException;
use Symfony\Component\HttpFoundation\StreamedResponse;
use Symfony\Component\EventDispatcher\EventDispatcherInterface;
use App\Event\OpenRouterRequestCompletedEvent;
use Psr\Log\LoggerInterface;
use Ramsey\Uuid\Uuid;

#[Route('/api')]
class ChatController extends AbstractController
{
    public function __construct(
        private readonly OpenRouterService $openRouterService,
        private readonly EntityManagerInterface $em,
        private readonly EventDispatcherInterface $eventDispatcher,
        private readonly LoggerInterface $logger
    ) {}

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
    public function chat(Request $request, EntityManagerInterface $em, OpenRouterService $openRouter): Response
    {
        $data = json_decode($request->getContent(), true);
        $prompt = $data['prompt'] ?? null;
        $models = $data['models'] ?? [];
        $threadId = $data['threadId'] ?? null;
        $stream = $data['stream'] ?? false;
        $promptId = $data['promptId'] ?? null;
        
        if (!$prompt || empty($models)) {
            throw new HttpException(400, 'Prompt and models are required');
        }
    
        if (!$promptId) {
            throw new HttpException(400, 'PromptId is required');
        }
        
        $user = $this->getUser();
        $organization = $user->getOrganization();
        
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
            $thread->setThreadId(Uuid::uuid4()->toString());
            $em->persist($thread);
            $em->flush(); // Flush immediately to ensure thread is saved
            
            // Get the thread ID to reuse with all models
            $threadId = $thread->getThreadId();
        }
    
        if ($stream) {
            // For streaming, we'll handle one model at a time
            $modelId = $models[0]; // Get first model for streaming
            $modelResponses = $openRouter->streamResponse($prompt, [$modelId], $thread);
            
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
                                            'prompt_tokens' => $modelResponse['usage']['prompt_tokens'] ?? 0,
                                            'completion_tokens' => $modelResponse['usage']['completion_tokens'] ?? 0,
                                            'total_tokens' => $modelResponse['usage']['total_tokens'] ?? 0
                                        ]
                                    ])
                                    ->setModelId($modelId)
                                    ->setOpenRouterId($openRouterId);
                                
                                $em->persist($chatHistory);
                                $em->flush();
                                $historySaved = true;
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
                                error_log('Error parsing streaming response: ' . $e->getMessage());
                                // Send error message to client
                                echo "data: " . json_encode([
                                    'error' => 'Error processing response',
                                    'modelId' => $modelId
                                ], JSON_UNESCAPED_UNICODE) . "\n\n";
                                flush();
                            }
                        }
                    }
                }   
    
                // If we get here without a [DONE] message, save what we have
                if (!$historySaved && !empty($content)) {
                    $chatHistory = new ChatHistory();
                    $chatHistory->setThread($thread)
                        ->setPrompt($prompt)
                        ->setPromptId($promptId)
                        ->setResponse([
                            'content' => $content,
                            'usage' => [
                                'prompt_tokens' => $modelResponse['usage']['prompt_tokens'] ?? 0,
                                'completion_tokens' => $modelResponse['usage']['completion_tokens'] ?? 0,
                                'total_tokens' => $modelResponse['usage']['total_tokens'] ?? 0
                            ]
                        ])
                        ->setModelId($modelId)
                        ->setOpenRouterId($openRouterId);
                    
                    $em->persist($chatHistory);
                    $em->flush();
                }

                // Dispatch event for cost tracking with just the requestId
                if ($openRouterId) {
                    $event = new OpenRouterRequestCompletedEvent($openRouterId, $chatHistory->getId(), 'chat');
                    $this->eventDispatcher->dispatch($event, OpenRouterRequestCompletedEvent::NAME);
                }
            });

            $response->headers->set('Content-Type', 'text/event-stream');
            $response->headers->set('Cache-Control', 'no-cache');
            $response->headers->set('Connection', 'keep-alive');
            $response->headers->set('X-Accel-Buffering', 'no');
            
            return $response;
        } else {
            // Non-streaming response
            $responses = [];
            
            // Save initial user prompt only once
            $userPromptHistory = new ChatHistory();
            $userPromptHistory->setThread($thread)
                ->setPrompt($prompt)
                ->setPromptId($promptId)
                ->setResponse([
                    'content' => '',
                    'usage' => [
                        'prompt_tokens' => 0,
                        'completion_tokens' => 0,
                        'total_tokens' => 0
                    ]
                ])
                ->setModelId('user_prompt')
                ->setCreatedAt(new \DateTime());
            $em->persist($userPromptHistory);
            
            // Process all models but use the same thread
            foreach ($models as $modelId) {
                $modelResponses = $openRouter->generateResponse($prompt, [$modelId], $thread);
                
                if (!isset($modelResponses[$modelId])) {
                    continue;
                }
                
                $modelResponse = $modelResponses[$modelId];
                
                // Create a ChatHistory entry for this model but with the same thread
                $modelHistory = new ChatHistory();
                $modelHistory->setThread($thread) // Using the same thread
                    ->setPrompt($prompt)
                    ->setPromptId($promptId)
                    ->setResponse([
                        'content' => $modelResponse['content'],
                        'usage' => $modelResponse['usage'] ?? [
                            'prompt_tokens' => 0,
                            'completion_tokens' => 0,
                            'total_tokens' => 0
                        ]
                    ])
                    ->setModelId($modelId)
                    ->setOpenRouterId($modelResponse['id']);
                
                $em->persist($modelHistory);
                
                // Log before event dispatch
                $this->logger->info('Dispatching OpenRouterRequestCompletedEvent', [
                    'openRouterId' => $modelResponse['id']
                ]);
                
                // Dispatch event for cost tracking with just the requestId
                $event = new OpenRouterRequestCompletedEvent($modelResponse['id'], $modelHistory->getId(), 'chat');
                $this->eventDispatcher->dispatch($event, OpenRouterRequestCompletedEvent::NAME);
                
                // Log after event dispatch
                $this->logger->info('OpenRouterRequestCompletedEvent dispatched successfully');
                
                $responses[$modelId] = [
                    'content' => $modelResponse['content'],
                    'usage' => $modelResponse['usage'] ?? [
                        'prompt_tokens' => 0,
                        'completion_tokens' => 0,
                        'total_tokens' => 0
                    ]
                ];
            }
            
            // Flush once after all entities are prepared
            $em->flush();
            
            return $this->json([
                'responses' => $responses,
                'threadId' => $thread->getThreadId(), // Return the same thread ID for all
                'promptId' => $promptId,
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
        $thread = $em->getRepository(Thread::class)
            ->findOneBy(['threadId' => $threadId]);
            
        if (!$thread) {
            throw $this->createNotFoundException('Thread not found');
        }

        if ($thread->getUser() !== $this->getUser()) {
            throw $this->createAccessDeniedException('You do not have permission to access this thread');
        }
        
        $messages = [];
        $histories = $thread->getChatHistories()->toArray();
        
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
    public function createThread(Request $request, EntityManagerInterface $em): JsonResponse
    {
        $user = $this->getUser();
        $data = json_decode($request->getContent(), true);
        $title = $data['title'] ?? 'New Chat';
        
        $thread = new Thread();
        $thread->setTitle($title);
        $thread->setUser($user);
        $thread->setThreadId(Uuid::uuid4()->toString());
        
        $em->persist($thread);
        $em->flush();
        
        return $this->json([
            'threadId' => $thread->getThreadId(),
            'title' => $thread->getTitle()
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
                ->select('COALESCE(SUM(arc.totalCost), 0) as totalCost')
                ->addSelect('COALESCE(SUM(arc.tokensPrompt), 0) as totalPromptTokens')
                ->addSelect('COALESCE(SUM(arc.tokensCompletion), 0) as totalCompletionTokens')
                ->from('App\Entity\ApiRequestCost', 'arc')
                ->where('arc.requestReference = :threadId')
                ->andWhere('arc.requestType = :requestType')
                ->setParameter('threadId', $thread['threadId'])
                ->setParameter('requestType', 'chat')
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
