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
    public function chat(Request $request, OpenRouterService $openRouter, EntityManagerInterface $em): JsonResponse
    {
        $data = json_decode($request->getContent(), true);
        $prompt = $data['prompt'];
        $models = $data['models'];
        $threadId = $data['threadId'] ?? null;
        
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
            $em->persist($thread);
        }
        
        // Generate responses for each model
        $responses = [];
        foreach ($models as $modelId) {
            $response = $openRouter->generateResponse($prompt, [$modelId]);
            
            $chatHistory = new ChatHistory();
            $chatHistory->setThread($thread)
                ->setPrompt($prompt)
                ->setResponse($response)
                ->setModelId($modelId)
                ->setOpenRouterId($response['id'] ?? null);
            
            $em->persist($chatHistory);
            $responses[$modelId] = $response['choices'][0]['message']['content'] ?? '';
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
    
    #[Route('/chat/history', methods: ['GET'])]
    public function history(): JsonResponse
    {
        $user = $this->getUser();
        $threads = $user->getThreads();
        $data = [];
        
        foreach ($threads as $thread) {
            // Get the latest chat history for this thread
            $latestHistory = $thread->getChatHistories()->last();
            if ($latestHistory) {
                $data[] = [
                    'id' => $thread->getId(),
                    'prompt' => $latestHistory->getPrompt(),
                    'responses' => [$latestHistory->getModelId() => $latestHistory->getResponse()['choices'][0]['message']['content'] ?? ''],
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
        foreach ($thread->getChatHistories() as $history) {
            $messages[] = [
                'prompt' => $history->getPrompt(),
                'responses' => [$history->getModelId() => $history->getResponse()['choices'][0]['message']['content'] ?? ''],
                'createdAt' => $history->getCreatedAt()->format('Y-m-d H:i:s')
            ];
        }
        
        return $this->json([
            'messages' => $messages
        ]);
    }
}
