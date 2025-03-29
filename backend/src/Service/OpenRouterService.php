<?php

namespace App\Service;

use Symfony\Contracts\HttpClient\HttpClientInterface;
use Symfony\Component\HttpKernel\Exception\HttpException;
use App\Entity\Thread;
use App\Entity\ThreadSummary;
use Psr\Log\LoggerInterface;
use Doctrine\ORM\EntityManagerInterface;

class OpenRouterService
{
    private HttpClientInterface $client;
    private string $apiKey;
    private const API_URL = 'https://openrouter.ai/api/v1';
    private const SUMMARY_THRESHOLD = 20; // Number of messages before creating a summary
    private const MAX_SUMMARY_AGE = 86400; // 24 hours in seconds
    private const LOG_FILE = __DIR__ . '/../../var/log/openrouter.log';
    
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
    
    private function log(string $message): void
    {
        $timestamp = date('Y-m-d H:i:s');
        $logMessage = "[{$timestamp}] {$message}\n";
        file_put_contents(self::LOG_FILE, $logMessage, FILE_APPEND);
    }
    
    public function __construct(
        HttpClientInterface $client, 
        string $apiKey,
        private readonly ContextService $contextService,
        private readonly EntityManagerInterface $entityManager,
        private readonly LoggerInterface $logger
    ) {
        $this->client = $client;
        $this->apiKey = $apiKey;
        $this->log('OpenRouterService initialized with API key: ' . substr($this->apiKey, 0, 4) . '...');
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
            $this->log('OpenRouter API Response: ' . json_encode($data));
            return $data['data'] ?? [];
        } catch (\Exception $e) {
            $this->log('OpenRouter API Error: ' . $e->getMessage());
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
            $this->log('OpenRouter API Error: ' . $e->getMessage());
            throw new HttpException(500, 'Failed to fetch generation data: ' . $e->getMessage());
        }
    }
    
    /**
     * Generate response with context handling
     */
    public function generateResponse(string $prompt, array $models, ?Thread $thread = null, bool $stream = false): array
    {
        $responses = [];
        
        foreach ($models as $model) {
            try {
                $messages = [];
                
                // Calculate token limit for this model
                $tokenLimit = $this->getModelTokenLimit($model);
                
                // Add context if thread is provided
                if ($thread) {
                    // Check if we need to compress the thread
                    $this->compressThreadIfNeeded($thread);
                    
                    // Get context with token limit
                    $maxTokens = (int)($tokenLimit * 0.75); // Use 75% of tokens for context
                    $messages = $this->getCompressedContext($thread, $maxTokens);
                    
                    // Apply model-specific formatting
                    $messages = $this->contextService->formatContextForModel($messages, $model);
                    $this->log('Context messages for model ' . $model . ': ' . json_encode($messages));
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
                    $requestData['max_tokens'] = 4096;
                } elseif (strpos($model, 'openai') !== false) {
                    $requestData['temperature'] = 0.7;
                    $requestData['max_tokens'] = 1024;
                } elseif (strpos($model, 'google') !== false) {
                    $requestData['temperature'] = 0.7;
                    $requestData['top_k'] = 40;
                    $requestData['max_tokens'] = 2048;
                } elseif (strpos($model, 'mistral') !== false) {
                    $requestData['temperature'] = 0.7;
                    $requestData['top_p'] = 0.9;
                    $requestData['max_tokens'] = 2048;
                }
                
                $this->log('OpenRouter request for model ' . $model . ': ' . json_encode($requestData, JSON_PRETTY_PRINT));

                // Send the request
                $headers = [
                    'Authorization' => "Bearer {$this->apiKey}",
                    'Referer' => 'https://github.com/michalkurecka/ai-multichat',
                    'X-Title' => 'AI MultiChat',
                    'Content-Type' => 'application/json'
                ];
                
                $this->log('Request headers: ' . json_encode($headers));
                
                try {
                    $response = $this->client->request('POST', self::API_URL . '/chat/completions', [
                        'headers' => $headers,
                        'json' => $requestData
                    ]);
                    
                    $this->log('Response status code: ' . $response->getStatusCode());
                    $this->log('Response headers: ' . json_encode($response->getHeaders()));
                    
                    if ($response->getStatusCode() !== 200) {
                        $errorData = $response->toArray();
                        $this->log('OpenRouter error response: ' . json_encode($errorData));
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
                        $this->log('OpenRouter raw response for model ' . $model . ': ' . json_encode($data));
                        
                        // Extract content from the response
                        $content = '';
                        if (isset($data['choices'][0]['message']['content'])) {
                            $content = is_array($data['choices'][0]['message']['content']) 
                                ? ($data['choices'][0]['message']['content']['content'] ?? '')
                                : $data['choices'][0]['message']['content'];
                            $this->log('Found content in choices[0][message][content]');
                        } elseif (isset($data['choices'][0]['delta']['content'])) {
                            $content = is_array($data['choices'][0]['delta']['content'])
                                ? ($data['choices'][0]['delta']['content']['content'] ?? '')
                                : $data['choices'][0]['delta']['content'];
                            $this->log('Found content in choices[0][delta][content]');
                        } elseif (isset($data['choices'][0]['text'])) {
                            $content = is_array($data['choices'][0]['text'])
                                ? ($data['choices'][0]['text']['content'] ?? '')
                                : $data['choices'][0]['text'];
                            $this->log('Found content in choices[0][text]');
                        } elseif (isset($data['content'])) {
                            $content = is_array($data['content'])
                                ? ($data['content']['content'] ?? '')
                                : $data['content'];
                            $this->log('Found content in root content field');
                        }
                        
                        if (empty($content)) {
                            $this->log('No content found in OpenRouter response. Full response: ' . json_encode($data));
                            throw new HttpException(500, 'No content in response from OpenRouter');
                        }
                        
                        $this->log('Extracted content: ' . $content);
                        
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
                        
                        $this->log('Final processed response for model ' . $model . ': ' . json_encode($responses[$model]));
                    }
                } catch (\Exception $e) {
                    $this->log('Request failed: ' . $e->getMessage());
                    throw $e;
                }
            } catch (\Exception $e) {
                $this->log('Error in generateResponse for model ' . $model . ': ' . $e->getMessage());
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
     * Stream response with context
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

    /**
     * Check if a thread needs compression and compress if necessary
     */
    private function compressThreadIfNeeded(Thread $thread): bool
    {
        $chatHistories = $thread->getChatHistories();
        
        // Check if we have enough messages to warrant compression
        if (count($chatHistories) < self::SUMMARY_THRESHOLD) {
            return false;
        }
        
        // Check if we already have a recent summary
        $existingSummary = $thread->getLatestSummary();
        if ($existingSummary && time() - $existingSummary->getCreatedAt()->getTimestamp() < self::MAX_SUMMARY_AGE) {
            return false;
        }
        
        // We need to create a summary
        return $this->compressThread($thread);
    }
    
    /**
     * Compress a thread by summarizing older messages
     */
    private function compressThread(Thread $thread): bool
    {
        $chatHistories = $thread->getChatHistories()->toArray();
        
        // Keep the most recent N messages untouched
        $recentMessages = array_slice($chatHistories, -5);
        $olderMessages = array_slice($chatHistories, 0, -5);
        
        if (empty($olderMessages)) {
            return false;
        }
        
        // Generate a summary of older messages
        $summary = $this->generateSummary($olderMessages, $thread);
        if (!$summary) {
            return false;
        }
        
        // Store the summary
        $threadSummary = new ThreadSummary();
        $threadSummary->setThread($thread);
        $threadSummary->setSummary($summary);
        $threadSummary->setMessageCount(count($olderMessages));
        $threadSummary->setCreatedAt(new \DateTime());
        
        $this->entityManager->persist($threadSummary);
        $this->entityManager->flush();
        
        return true;
    }
    
    /**
     * Generate a summary of a conversation
     */
    private function generateSummary(array $messages, Thread $thread): ?string
    {
        // Prepare a prompt to summarize the conversation
        $conversationText = "";
        foreach ($messages as $chatHistory) {
            $conversationText .= "User: " . $chatHistory['prompt'] . "\n";
            $conversationText .= "Assistant: " . $chatHistory['response'] . "\n\n";
        }
        
        $prompt = <<<EOT
        Please summarize the following conversation between a user and an AI assistant. 
        Focus on the main topics discussed, key information provided by the user, and any important conclusions or decisions made.
        Keep your summary concise but comprehensive. This summary will be used by the AI to maintain context of previous conversations.

        CONVERSATION:
        $conversationText
        
        SUMMARY:
        EOT;
        
        // Call OpenRouter to generate a summary
        try {
            $models = ['anthropic/claude-3-haiku-20240307']; // Use a fast model for summarization
            $response = $this->generateResponse($prompt, $models);
            
            if (isset($response[$models[0]]['content'])) {
                return $response[$models[0]]['content'];
            }
        } catch (\Exception $e) {
            $this->log('Error generating conversation summary: ' . $e->getMessage());
        }
        
        return null;
    }
    
    /**
     * Get compressed context for a thread
     */
    private function getCompressedContext(Thread $thread, int $maxTokens): array
    {
        $messages = [];
        
        // Add user context
        $user = $thread->getUser();
        $messages[] = [
            'role' => 'system',
            'content' => sprintf(
                'You are chatting with a user (email: %s). They are part of organization %s.',
                $user->getEmail(),
                $user->getOrganization() ? $user->getOrganization()->getDomain() : 'no organization'
            )
        ];
        
        // Add summary if available
        $summary = $thread->getLatestSummary();
        if ($summary) {
            $messages[] = [
                'role' => 'system',
                'content' => "PREVIOUS CONVERSATION SUMMARY:\n" . $summary->getSummary() . "\n\nPlease continue the conversation based on this context."
            ];
        }
        
        // Add recent messages
        $recentMessages = array_slice($thread->getChatHistories()->toArray(), -5);
        foreach ($recentMessages as $chatHistory) {
            // Extract response content
            $response = $chatHistory->getResponse();
            if (is_array($response)) {
                if (isset($response['content']['content'])) {
                    $response = $response['content']['content'];
                } elseif (isset($response['content'])) {
                    $response = $response['content'];
                }
            }
            
            $messages[] = [
                'role' => 'user',
                'content' => $chatHistory->getPrompt()
            ];
            
            $messages[] = [
                'role' => 'assistant',
                'content' => $response
            ];
        }
        
        return $messages;
    }
}