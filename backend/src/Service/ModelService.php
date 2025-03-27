<?php

namespace App\Service;

use Symfony\Component\Cache\Adapter\AdapterInterface;
use Symfony\Contracts\Cache\ItemInterface;

class ModelService
{
    private OpenRouterService $openRouterService;
    private AdapterInterface $cache;
    private int $cacheTtl;
    
    public function __construct(
        OpenRouterService $openRouterService,
        AdapterInterface $cache,
        int $cacheTtl = 3600 // Default 1 hour cache
    ) {
        $this->openRouterService = $openRouterService;
        $this->cache = $cache;
        $this->cacheTtl = $cacheTtl;
    }
    
    public function getModels(): array
    {
        return $this->cache->get('openrouter_models', function (ItemInterface $item) {
            $item->expiresAfter($this->cacheTtl);
            
            $rawModels = $this->openRouterService->getModels();
            return $this->formatModels($rawModels);
        });
    }
    
    public function refreshModels(): array
    {
        $this->cache->delete('openrouter_models');
        return $this->getModels();
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
        // Extract provider from model ID (e.g., "anthropic/claude-3-opus" -> "anthropic")
        if (strpos($id, '/') !== false) {
            return explode('/', $id)[0];
        }
        
        return null;
    }
}
