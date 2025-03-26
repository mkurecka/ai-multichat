<?php

namespace App\Service;

use Symfony\Contracts\HttpClient\HttpClientInterface;
use Symfony\Component\HttpKernel\Exception\HttpException;

class OpenRouterService
{
    private HttpClientInterface $client;
    private string $apiKey;
    private const API_URL = 'https://openrouter.ai/api/v1';
    
    public function __construct(HttpClientInterface $client, string $apiKey)
    {
        $this->client = $client;
        $this->apiKey = $apiKey;
    }
    
    public function getModels(): array
    {
        try {
            $response = $this->client->request('GET', self::API_URL . '/models');
            
            if ($response->getStatusCode() !== 200) {
                throw new HttpException($response->getStatusCode(), 'Failed to fetch models from OpenRouter');
            }
            
            $data = $response->toArray();
            return $data['data'] ?? [];
        } catch (\Exception $e) {
            throw new HttpException(500, 'Failed to fetch models: ' . $e->getMessage());
        }
    }
    
    public function generateResponse(string $prompt, array $models): array
    {
        $responses = [];
        foreach ($models as $model) {
            try {
                $response = $this->client->request('POST', self::API_URL . '/chat/completions', [
                    'headers' => [
                        'Authorization' => "Bearer {$this->apiKey}",
                        'X-Title' => 'AI MultiChat',
                        'Content-Type' => 'application/json'
                    ],
                    'json' => [
                        'model' => $model,
                        'messages' => [
                            [
                                'role' => 'user',
                                'content' => $prompt
                            ]
                        ],
                        'stream' => false
                    ]
                ]);
                
                if ($response->getStatusCode() !== 200) {
                    $errorData = $response->toArray();
                    throw new HttpException(
                        $response->getStatusCode(),
                        $errorData['error']['message'] ?? 'Failed to generate response from OpenRouter'
                    );
                }
                
                $data = $response->toArray();
                if (!isset($data['choices'][0]['message']['content'])) {
                    throw new HttpException(500, 'Invalid response format from OpenRouter');
                }
                
                $responses[$model] = $data['choices'][0]['message']['content'];
            } catch (\Exception $e) {
                $responses[$model] = 'Error: ' . $e->getMessage();
            }
        }
        return $responses;
    }
}