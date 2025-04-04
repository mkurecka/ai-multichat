<?php

namespace App\Service;

use App\Entity\Model;
use App\Repository\ModelRepository;
use App\Service\OpenRouterService;
use Doctrine\ORM\EntityManagerInterface;
use Symfony\Component\Cache\Adapter\AdapterInterface;

class ModelService
{
    private OpenRouterService $openRouterService;
    private AdapterInterface $cache;
    private int $cacheTtl;
    private EntityManagerInterface $entityManager;
    private ModelRepository $modelRepository;
    
    public function __construct(
        OpenRouterService $openRouterService,
        AdapterInterface $cache,
        EntityManagerInterface $entityManager,
        ModelRepository $modelRepository,
        int $cacheTtl = 3600 // Default 1 hour cache
    ) {
        $this->openRouterService = $openRouterService;
        $this->cache = $cache;
        $this->cacheTtl = $cacheTtl;
        $this->entityManager = $entityManager;
        $this->modelRepository = $modelRepository;
    }
    
    public function getModels(): array
    {
        return $this->cache->get('openrouter_models', function ($item) {
            $item->expiresAfter($this->cacheTtl);
            
            // First try to get models from the database
            $dbModels = $this->modelRepository->findAllOrdered();
            
            if (!empty($dbModels)) {
                // Format database models
                $formattedModels = [];
                foreach ($dbModels as $model) {
                    $formattedModels[] = [
                        'id' => $model->getModelId(),
                        'name' => $model->getName(),
                        'description' => $model->getDescription(),
                        'provider' => $model->getProvider(),
                        'selected' => false,
                        'pricing' => $model->getPricing() ?? [
                            'prompt' => null,
                            'completion' => null,
                            'unit' => 'tokens'
                        ]
                    ];
                }
                
                return $formattedModels;
            }
            
            // If no models in database, fetch from API
            $rawModels = $this->openRouterService->getModels();
            $formattedModels = $this->formatModels($rawModels);
            
            // Save to database
            $this->saveModelsToDatabase($rawModels);
            
            return $formattedModels;
        });
    }
    
    public function refreshModels(): array
    {
        // Clear the cache
        $this->cache->delete('openrouter_models');
        
        // Fetch fresh models from API
        $rawModels = $this->openRouterService->getModels();
        
        // Save to database
        $this->saveModelsToDatabase($rawModels);
        
        // Format and return
        return $this->formatModels($rawModels);
    }
    
    private function formatModels(array $rawModels): array
    {
        if (empty($rawModels)) {
            return [];
        }

        $formattedModels = [];
        
        foreach ($rawModels as $model) {
            if (!isset($model['id'])) {
                continue;
            }

            $formattedModels[] = [
                'id' => $model['id'],
                'name' => $model['name'] ?? $model['id'],
                'description' => $model['description'] ?? null,
                'provider' => $this->extractProviderFromId($model['id']),
                'selected' => false,
                'pricing' => [
                    'prompt' => $model['pricing']['prompt'] ?? null,
                    'completion' => $model['pricing']['completion'] ?? null,
                    'unit' => 'tokens'
                ]
            ];
        }
        
        return $formattedModels;
    }
    
    private function extractProviderFromId(string $id): ?string
    {
        if (strpos($id, '/') !== false) {
            return explode('/', $id)[0];
        }
        return null;
    }

    private function saveModelsToDatabase(array $rawModels): void
    {
        foreach ($rawModels as $modelData) {
            if (!isset($modelData['id'])) {
                continue;
            }

            $model = $this->modelRepository->findByModelId($modelData['id']) ?? new Model();
            
            $model->setName($modelData['name'] ?? $modelData['id']);
            $model->setModelId($modelData['id']);
            $model->setDescription($modelData['description'] ?? null);
            $model->setProvider($this->extractProviderFromId($modelData['id']) ?? 'unknown');
            $model->setPricing($modelData['pricing'] ?? null);
            $model->setUpdatedAt(new \DateTimeImmutable());

            $this->modelRepository->save($model);
        }

        $this->entityManager->flush();
    }

    public function getModelsByProvider(string $provider): array
    {
        $dbModels = $this->modelRepository->findBy(['provider' => $provider]);
        
        $formattedModels = [];
        foreach ($dbModels as $model) {
            $formattedModels[] = [
                'id' => $model->getModelId(),
                'name' => $model->getName(),
                'description' => $model->getDescription(),
                'provider' => $model->getProvider(),
                'selected' => false,
                'pricing' => $model->getPricing() ?? [
                    'prompt' => null,
                    'completion' => null,
                    'unit' => 'tokens'
                ]
            ];
        }
        
        return $formattedModels;
    }

    public function getModelByModelId(string $modelId): ?Model
    {
        return $this->modelRepository->findByModelId($modelId);
    }
}
