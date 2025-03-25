<?php

namespace App\Service;

class OpenRouterService
{
    private HttpClientInterface $client;
    private string $apiKey;
    
    public function __construct(HttpClientInterface $client, string $apiKey)
    {
        $this->client = $client;
        $this->apiKey = $apiKey;
    }
    
    public function getModels(): array
    {
        $response = $this->client->request('GET', 'https://openrouter.ai/api/v1/models', [
            'headers' => ['Authorization' => "Bearer {$this->apiKey}"]
        ]);
        return $response->toArray();
    }
    
    public function generateResponse(string $prompt, array $models): array
    {
        $responses = [];
        foreach ($models as $model) {
            $response = $this->client->request('POST', 'https://openrouter.ai/api/v1/chat/completions', [
                'headers' => ['Authorization' => "Bearer {$this->apiKey}"],
                'json' => [
                    'model' => $model,
                    'messages' => [['role' => 'user', 'content' => $prompt]]
                ]
            ]);
            $responses[$model] = $response->toArray()['choices'][0]['message']['content'];
        }
        return $responses;
    }
}