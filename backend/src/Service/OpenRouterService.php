<?php

namespace App\Service;

use Symfony\Contracts\HttpClient\HttpClientInterface;
use Symfony\Component\HttpKernel\Exception\HttpException;
use App\Entity\Thread;
use Psr\Log\LoggerInterface;

class OpenRouterService
{
    private HttpClientInterface $client;
    private string $apiKey;
    private const API_URL = 'https://openrouter.ai/api/v1';
    
    // Model-specific token limits
    private const MODEL_TOKEN_LIMITS = [
        'anthropic/claude-3-opus' => 200000,
        'anthropic/claude-3-sonnet' => 200000,
        'anthropic/claude-3-haiku' => 200000,
        'openai/gpt-4-turbo' => 128000,
        'openai/gpt-4' => 8192,
        'openai/gpt-3.5-turbo' => 4096,
        'google/gemini-pro' => 32000,
        'mistral/mistral-large' => 32000,
        'mistral/mistral-medium' => 32000,
        'mistral/mistral-small' => 32000,
    ];
    
    // Default token limit if model not found in the map
    private const DEFAULT_TOKEN_LIMIT = 4096;
    
    public function __construct(
        HttpClientInterface $client, 
        string $apiKey,
        private readonly ContextService $contextService,
        private readonly ContextCompressorService $compressorService,
        private readonly RelevanceService $relevanceService,
        private readonly LoggerInterface $logger
    ) {
        $this->client = $client;
        $this->apiKey = $apiKey;
        $this->logger->info('OpenRouterService initialized with API key: ' . substr($this->apiKey, 0, 4) . '...');
    }
    
    /**
     * Get models from OpenRouter API
     */
    public function getModels(): array
    {
        try {
            $response = $this->client->request('GET', self::API_URL . '/models');
            
            if ($response->getStatusCode() !== 200) {
                throw new HttpException($response->getStatusCode(), 'Failed to fetch models from OpenRouter');
            }
            
            $data = $response->toArray();
            $this->logger->debug('OpenRouter API Response: ' . json_encode($data));
            return $data['data'] ?? [];
        } catch (\Exception $e) {
            $this->logger->error('OpenRouter API Error: ' . $e->getMessage());
            throw new HttpException(500, 'Failed to fetch models: ' . $e->getMessage());
        }
    }

    /**
     * Get generation data for a specific generation ID
     */
    public function getGenerationData(string $generationId): array
    {
        try {
            $response = $this->client->request('GET', self::API_URL . '/generation', [
                'headers' => [
                    'Authorization' => "Bearer {$this->apiKey}",
                    'X-Title' => 'AI MultiChat',
                    'Content-Type' => 'application/json'
                ],
                'query' => [
                    'id' => $generationId
                ]
            ]);

            if ($response->getStatusCode() !== 200) {
                throw new HttpException($response->getStatusCode(), 'Failed to fetch generation data from OpenRouter');
            }

            $data = $response->toArray();
            return $data['data'] ?? [];
        } catch (\Exception $e) {
            $this->logger->error('OpenRouter API Error: ' . $e->getMessage());
            throw new HttpException(500, 'Failed to fetch generation data: ' . $e->getMessage());
        }
    }
    
    /**
     * Generate response with optimized context handling
     */
    public function generateResponse(string $prompt, array $models, ?Thread $thread = null, bool $stream = false): array
    {
        $responses = [];
        
        // Compress thread history if needed
        if ($thread) {
            $this->compressorService->compressThreadIfNeeded($thread);
        }
        
        foreach ($models as $model) {
            try {
                $messages = [];
                
                // Calculate token limit for this model
                $tokenLimit = $this->getModelTokenLimit($model);
                
                // Add optimized context if thread is provided
                if ($thread) {
                    // Check if we should use compressed context (for very long threads)
                    if ($thread->getChatHistories()->count() > 30) {
                        $messages = $this->compressorService->getCompressedContext($thread);
                        $this->logger->info('Using compressed context for thread ' . $thread->getId() . ' with model ' . $model);
                    } else {
                        // For relevance-based selection, we need the current prompt
                        $relevantMessages = $this->relevanceService->getMostRelevantMessages($prompt, $thread, 5);
                        
                        // Use our enhanced context service with relevance information
                        $maxTokens = (int)($tokenLimit * 0.75); // Use 75% of tokens for context
                        $messages = $this->contextService->getThreadContext($thread, 10, $maxTokens);
                    }
                    
                    // Apply model-specific formatting
                    $messages = $this->contextService->formatContextForModel($messages, $model);
                    $this->logger->debug('Context messages for model ' . $model . ': ' . json_encode($messages));
                }
                
                // Add current prompt
                $messages[] = [
                    'role' => 'user',
                    'content' => $prompt
                ];

                // Prepare request data
                $requestData = [
                    'model' => $model,
                    'messages' => $messages,
                    'stream' => $stream
                ];
                
                // Add model-specific parameters
                if (strpos($model, 'anthropic') !== false) {
                    $requestData['temperature'] = 0.7;
                    $requestData['top_p'] = 0.9;
                } elseif (strpos($model, 'openai') !== false) {
                    $requestData['temperature'] = 0.7;
                    $requestData['max_tokens'] = 1024;
                } elseif (strpos($model, 'google') !== false) {
                    $requestData['temperature'] = 0.7;
                    $requestData['top_k'] = 40;
                } elseif (strpos($model, 'mistral') !== false) {
                    $requestData['temperature'] = 0.7;
                    $requestData['top_p'] = 0.9;
                }
                
                $this->logger->debug('OpenRouter request for model ' . $model . ': ' . json_encode($requestData));

                // Send the request
                $headers = [
                    'Authorization' => "Bearer {$this->apiKey}",
                    'X-Title' => 'AI MultiChat',
                    'Content-Type' => 'application/json'
                ];
                
                $this->logger->debug('Request headers: ' . json_encode($headers));
                
                $response = $this->client->request('POST', self::API_URL . '/chat/completions', [
                    'headers' => $headers,
                    'json' => $requestData
                ]);
                
                $this->logger->debug('Response status code: ' . $response->getStatusCode());
                
                if ($response->getStatusCode() !== 200) {
                    $errorData = $response->toArray();
                    $this->logger->error('OpenRouter error response: ' . json_encode($errorData));
                    throw new HttpException(
                        $response->getStatusCode(),
                        $errorData['error']['message'] ?? 'Failed to generate response from OpenRouter'
                    );
                }
                
                if ($stream) {
                    $responses[$model] = [
                        'stream' => $response->toStream(),
                        'id' => null,
                        'usage' => [
                            'prompt_tokens' => 0,
                            'completion_tokens' => 0,
                            'total_tokens' => 0
                        ]
                    ];
                } else {
                    $data = $response->toArray();
                    $this->logger->debug('OpenRouter success response for model ' . $model . ': ' . json_encode($data));
                    
                    // Extract content from the response
                    $content = '';
                    if (isset($data['choices'][0]['message']['content'])) {
                        $content = $data['choices'][0]['message']['content'];
                    } elseif (isset($data['choices'][0]['delta']['content'])) {
                        $content = $data['choices'][0]['delta']['content'];
                    } elseif (isset($data['choices'][0]['text'])) {
                        $content = $data['choices'][0]['text'];
                    }
                    
                    if (empty($content)) {
                        $this->logger->warning('No content found in OpenRouter response: ' . json_encode($data));
                        throw new HttpException(500, 'No content in response from OpenRouter');
                    }
                    
                    // Extract usage data
                    $usage = [
                        'prompt_tokens' => $data['usage']['prompt_tokens'] ?? 0,
                        'completion_tokens' => $data['usage']['completion_tokens'] ?? 0,
                        'total_tokens' => $data['usage']['total_tokens'] ?? 0
                    ];
                    
                    $responses[$model] = [
                        'content' => $content,
                        'id' => $data['id'] ?? null,
                        'usage' => $usage
                    ];
                    
                    $this->logger->debug('Processed response for model ' . $model . ': ' . json_encode($responses[$model]));
                }
            } catch (\Exception $e) {
                $this->logger->error('Error in generateResponse for model ' . $model . ': ' . $e->getMessage());
                $responses[$model] = [
                    'content' => 'Error: ' . $e->getMessage(),
                    'id' => null,
                    'usage' => [
                        'prompt_tokens' => 0,
                        'completion_tokens' => 0,
                        'total_tokens' => 0
                    ]
                ];
            }
        }
        
        return $responses;
    }
    
    /**
     * Stream response with optimized context
     */
    public function streamResponse(string $prompt, array $models, ?Thread $thread = null): array
    {
        // Use the same generateResponse method with stream=true
        return $this->generateResponse($prompt, $models, $thread, true);
    }
    
    /**
     * Get the token limit for a specific model
     */
    private function getModelTokenLimit(string $model): int
    {
        // Try exact match first
        if (isset(self::MODEL_TOKEN_LIMITS[$model])) {
            return self::MODEL_TOKEN_LIMITS[$model];
        }
        
        // Try partial match
        foreach (self::MODEL_TOKEN_LIMITS as $modelPattern => $limit) {
            if (strpos($model, $modelPattern) !== false) {
                return $limit;
            }
        }
        
        // Return default if no match
        return self::DEFAULT_TOKEN_LIMIT;
    }
}