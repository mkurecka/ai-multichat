<?php

namespace App\Controller;

use App\Entity\Model;
use App\Service\OpenRouterService;
use Doctrine\ORM\EntityManagerInterface;
use Symfony\Bundle\FrameworkBundle\Controller\AbstractController;
use Symfony\Component\HttpFoundation\JsonResponse;
use Symfony\Component\HttpFoundation\Request;
use Symfony\Component\HttpFoundation\Response;
use Symfony\Component\Routing\Annotation\Route;

#[Route('/api')]
class ModelController extends AbstractController
{
    public function __construct(
        private readonly OpenRouterService $openRouterService,
        private readonly EntityManagerInterface $entityManager
    ) {
    }

    #[Route('/models', name: 'api_get_models', methods: ['GET'])]
    public function getModels(): JsonResponse
    {
        $models = $this->openRouterService->getModels();
        return $this->json($models);
    }

    #[Route('/models/refresh', name: 'api_refresh_models', methods: ['GET'])]
    public function refreshModels(): JsonResponse
    {
        $models = $this->openRouterService->getModels();
        return $this->json($models);
    }

    #[Route('/models/{id}', name: 'api_get_model', methods: ['GET'])]
    public function getModel(string $id): JsonResponse
    {
        $model = $this->entityManager->getRepository(Model::class)->findOneBy(['modelId' => $id]);

        if (!$model) {
            throw $this->createNotFoundException('Model not found');
        }

        return $this->json([
            'id' => $model->getModelId(),
            'name' => $model->getName(),
            'description' => $model->getDescription(),
            'provider' => $model->getProvider(),
            'pricing' => $model->getPricing()
        ]);
    }
} 