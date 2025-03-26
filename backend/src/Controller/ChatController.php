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
        $parentId = $data['parentId'] ?? null;
        
        $user = $this->getUser();
        $organization = $user->getOrganization();
        $organization->setUsageCount($organization->getUsageCount() + 1);
        
        $responses = $openRouter->generateResponse($prompt, $models);
        
        $chatHistory = new ChatHistory();
        $chatHistory->setUser($user)
            ->setPrompt($prompt)
            ->setResponses($responses)
            ->setCreatedAt(new \DateTime());

        // Handle thread logic
        if ($threadId) {
            $chatHistory->setThreadId($threadId);
        } else {
            $chatHistory->setThreadId(uniqid('thread_'));
        }

        if ($parentId) {
            $parent = $em->getRepository(ChatHistory::class)->find($parentId);
            if ($parent) {
                $chatHistory->setParent($parent);
            }
        }
        
        $em->persist($chatHistory);
        $em->flush();
        
        return $this->json([
            'responses' => $responses,
            'threadId' => $chatHistory->getThreadId(),
            'usage' => [
                'user' => $user->getChatHistories()->count(),
                'organization' => $organization->getUsageCount()
            ]
        ]);
    }
    
    #[Route('/chat/history', methods: ['GET'])]
    public function history(): JsonResponse
    {
        $user = $this->getUser();
        return $this->json($user->getChatHistories());
    }

    #[Route('/chat/thread/{threadId}', methods: ['GET'])]
    public function getThread(string $threadId, EntityManagerInterface $em): JsonResponse
    {
        $user = $this->getUser();
        $thread = $em->getRepository(ChatHistory::class)
            ->findOneBy(['threadId' => $threadId, 'user' => $user]);

        if (!$thread) {
            return $this->json(['error' => 'Thread not found'], 404);
        }

        // Get all messages in the thread
        $messages = $this->getThreadMessages($thread);
        
        return $this->json([
            'threadId' => $threadId,
            'messages' => $messages
        ]);
    }

    private function getThreadMessages(ChatHistory $thread): array
    {
        $messages = [];
        $current = $thread;
        
        // Get root message
        while ($current->getParent()) {
            $current = $current->getParent();
        }
        
        // Build message chain
        $messages[] = [
            'id' => $current->getId(),
            'prompt' => $current->getPrompt(),
            'responses' => $current->getResponses(),
            'createdAt' => $current->getCreatedAt()->format('Y-m-d H:i:s')
        ];
        
        // Get all children
        $children = $current->getChildren();
        foreach ($children as $child) {
            $messages[] = [
                'id' => $child->getId(),
                'prompt' => $child->getPrompt(),
                'responses' => $child->getResponses(),
                'createdAt' => $child->getCreatedAt()->format('Y-m-d H:i:s')
            ];
        }
        
        return $messages;
    }
}
