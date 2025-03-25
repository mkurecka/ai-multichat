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
        
        $user = $this->getUser();
        $organization = $user->getOrganization();
        $organization->setUsageCount($organization->getUsageCount() + 1);
        
        $responses = $openRouter->generateResponse($prompt, $models);
        
        $chatHistory = new ChatHistory();
        $chatHistory->setUser($user)
            ->setPrompt($prompt)
            ->setResponses($responses)
            ->setCreatedAt(new \DateTime());
        
        $em->persist($chatHistory);
        $em->flush();
        
        return $this->json([
            'responses' => $responses,
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
}
