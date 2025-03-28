<?php

namespace App\Service;

use App\Entity\Model;
use Doctrine\ORM\EntityManagerInterface;
use GuzzleHttp\Client;
use GuzzleHttp\Exception\GuzzleException;

class ModelService
{
    private const CACHE_TTL = 3600; // 1 hour in seconds

    public function __construct(
        private EntityManagerInterface $entityManager,
        private OpenRouterService $openRouterService
    ) {}

    public function getModels(): array
    {
        $models = $this->entityManager->getRepository(Model::class)->findAll();
        
        // Check if we need to refresh the cache
        if (empty($models) || $this->isCacheExpired($models)) {
            return $this->refreshModels();
        }

        return array_map(function (Model $model) {
            return [
                'id' => $model->getModelId(),
                'name' => $model->getName(),
                'description' => $model->getDescription(),
                'provider' => $model->getProvider(),
                'selected' => false,
                'pricing' => [
                    'prompt' => $model->getPromptPrice(),
                    'completion' => $model->getCompletionPrice(),
                    'unit' => 'token'
                ]
            ];
        }, $models);
    }

    private function isCacheExpired(array $models): bool
    {
        if (empty($models)) {
            return true;
        }

        // Check if any model's cache is expired
        foreach ($models as $model) {
            if (!$model->getUpdatedAt() || 
                (time() - $model->getUpdatedAt()->getTimestamp()) > self::CACHE_TTL) {
                return true;
            }
        }

        return false;
    }

    public function refreshModels(): array
    {
        try {
            // Get models from OpenRouter
            $openRouterData = $this->openRouterService->getModels();
            
            if (!is_array($openRouterData)) {
                throw new \RuntimeException('Invalid API response format: expected array');
            }

            $models = [];
            foreach ($openRouterData as $modelData) {
                if (!isset($modelData['id']) || !isset($modelData['name'])) {
                    continue; // Skip invalid model data
                }

                // Try to find existing model
                $model = $this->entityManager->getRepository(Model::class)->findOneBy([
                    'provider' => 'openrouter',
                    'modelId' => $modelData['id']
                ]);

                // Create new model if not found
                if (!$model) {
                    $model = new Model();
                    $model->setModelId($modelData['id']);
                    $model->setProvider('openrouter');
                }

                // Update model data
                $model->setName($modelData['name']);
                $model->setDescription($modelData['description'] ?? '');
                
                // Handle pricing data
                $pricing = $modelData['pricing'] ?? [];
                if (is_array($pricing)) {
                    $model->setPromptPrice($pricing['prompt'] ?? 0);
                    $model->setCompletionPrice($pricing['completion'] ?? 0);
                } else {
                    $price = is_numeric($pricing) ? $pricing : 0;
                    $model->setPromptPrice($price);
                    $model->setCompletionPrice($price);
                }
                
                $model->setUpdatedAt(new \DateTimeImmutable());

                $this->entityManager->persist($model);
                $models[] = $model;
            }

            if (empty($models)) {
                throw new \RuntimeException('No valid models found in API response');
            }

            $this->entityManager->flush();

            return array_map(function (Model $model) {
                return [
                    'id' => $model->getModelId(),
                    'name' => $model->getName(),
                    'description' => $model->getDescription(),
                    'provider' => $model->getProvider(),
                    'selected' => false,
                    'pricing' => [
                        'prompt' => $model->getPromptPrice(),
                        'completion' => $model->getCompletionPrice(),
                        'unit' => 'token'
                    ]
                ];
            }, $models);
        } catch (\Exception $e) {
            // Handle errors
            $cachedModels = $this->entityManager->getRepository(Model::class)->findAll();
            if (!empty($cachedModels)) {
                return array_map(function (Model $model) {
                    return [
                        'id' => $model->getModelId(),
                        'name' => $model->getName(),
                        'description' => $model->getDescription(),
                        'provider' => $model->getProvider(),
                        'selected' => false,
                        'pricing' => [
                            'prompt' => $model->getPromptPrice(),
                            'completion' => $model->getCompletionPrice(),
                            'unit' => 'token'
                        ]
                    ];
                }, $cachedModels);
            }
            throw new \RuntimeException('Failed to process models: ' . $e->getMessage());
        }
    }
}
