<?php

namespace App\Service;

use Symfony\Contracts\HttpClient\HttpClientInterface;
use Symfony\Component\HttpKernel\Exception\HttpException;
use App\Entity\PromptTemplate; // Add PromptTemplate
use App\Entity\Thread;
use Psr\Log\LoggerInterface;
use Doctrine\ORM\EntityManagerInterface;
use Symfony\Component\EventDispatcher\EventDispatcherInterface;
use App\Repository\VariableRepository; // Add this
use App\Service\PromptTemplateService;
use App\Service\ContextService;

class OpenRouterService
{
    private const API_URL = 'https://openrouter.ai/api/v1';
    private const SUMMARY_THRESHOLD = 20; // Number of messages before creating a summary
    private const MAX_SUMMARY_AGE = 86400; // 24 hours in seconds
    private const LOG_FILE = __DIR__ . '/../../var/log/openrouter.log';

    /**
     * Store the last messages sent to the API
     * @var array|null
     */
    private ?array $lastApiMessages = null;

    /* // Token limits might be handled elsewhere or within templates now
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
    */

    private function log(string $message): void
    {
        $timestamp = date('Y-m-d H:i:s');
        $logMessage = "[{$timestamp}] {$message}\n";
        file_put_contents(self::LOG_FILE, $logMessage, FILE_APPEND);
    }

    public function __construct(
        private readonly HttpClientInterface $client,
        private readonly string $apiKey,
        private readonly EntityManagerInterface $entityManager, // Keep for model lookup
        private readonly LoggerInterface $logger,
        private readonly EventDispatcherInterface $eventDispatcher,
        private readonly PromptTemplateService $promptTemplateService,
        private readonly ContextService $contextService, // Re-inject ContextService
        private readonly VariableRepository $variableRepository // Inject VariableRepository
    ) {
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
     * Get account credit balance from OpenRouter API
     */
    public function getAccountCredit(): float
    {
        try {
            $response = $this->client->request('GET', self::API_URL . '/credits', [
                'headers' => [
                    'Authorization' => 'Bearer ' . $this->apiKey,
                    'X-Title' => 'AI MultiChat'
                ]
            ]);

            if ($response->getStatusCode() !== 200) {
                $this->log('Error fetching account credit. Status: ' . $response->getStatusCode() . ' Response: ' . $response->getContent(false));
                throw new HttpException($response->getStatusCode(), 'Failed to fetch account credit from OpenRouter');
            }

            $data = $response->toArray();
            $this->log('OpenRouter API Credit Response: ' . json_encode($data));
            return $data['data']['total_credits'] - $data['data']['total_usage'] ?? 0.0;
        } catch (\Exception $e) {
            $this->log('OpenRouter API Error in getAccountCredit: ' . $e->getMessage());
            return 0.0; // Return 0 instead of throwing exception to avoid breaking the dashboard
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
                    'Authorization' => 'Bearer ' . $this->apiKey,
                    'X-Title' => 'AI MultiChat'
                ],
                'query' => [
                    'id' => $generationId
                ]
            ]);

            if ($response->getStatusCode() !== 200) {
                $this->log('Error fetching generation data. Status: ' . $response->getStatusCode() . ' Response: ' . $response->getContent(false));
                throw new HttpException($response->getStatusCode(), 'Failed to fetch generation data from OpenRouter');
            }

            $data = $response->toArray();
            return $data['data'] ?? [];
        } catch (\Exception $e) {
            $this->log('OpenRouter API Error in getGenerationData: ' . $e->getMessage());
            throw new HttpException(500, 'Failed to fetch generation data: ' . $e->getMessage());
        }
    }

    private function processResponse(array $data, string $model, ?Thread $thread, bool $stream): array
    {
        $content = '';
        if (isset($data['choices'][0]['message']['content'])) {
            $content = $data['choices'][0]['message']['content'];
        } elseif (isset($data['choices'][0]['delta']['content'])) {
            $content = $data['choices'][0]['delta']['content'];
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

        return [
            'content' => $content,
            'id' => $data['id'] ?? null,
            'usage' => $usage,
            'model' => $model,
            'data' => $data
        ];
    }

    /**
     * Generate response using a PromptTemplate (or basic history if template is null).
     *
     * @param ?PromptTemplate $template The prompt template to use (optional).
     * @param string $userInput The current user's input.
     * @param array $models List of model IDs to target.
     * @param Thread $thread The current conversation thread.
     * @param bool $stream Whether to attempt streaming.
     * @return array Responses keyed by model ID.
     */
    public function generateResponse(?PromptTemplate $template, string $userInput, array $models, Thread $thread, bool $stream = false): array
    {
        $responses = [];
        $messages = [];

        if ($template) {
            // --- Template Provided: Use PromptTemplateService ---
            $this->log('Building messages using PromptTemplateService.');
            $messages = $this->promptTemplateService->buildApiMessages($template, $thread, $userInput);
            if (empty($messages)) {
                 $this->log('Error: PromptTemplateService returned empty messages array.');
                 // Return error for all models
                 foreach ($models as $model) {
                     $responses[$model] = ['content' => 'Error: Failed to build prompt messages from template.', 'id' => null, 'usage' => ['prompt_tokens' => 0, 'completion_tokens' => 0, 'total_tokens' => 0]];
                 }
                 return $responses;
            }
            $this->log('Built messages array via PromptTemplateService: ' . json_encode($messages));

        } else {
            // --- No Template Provided: Build basic message array ---
            $this->log('Building basic messages (no template).');
            // 1. Get history from ContextService
            $messages = $this->contextService->getHistoryMessages($thread); // Assumes this returns history correctly formatted

            // 2. Add current user input
            $messages[] = [
                'role' => 'user',
                'content' => $userInput
            ];
            $this->log('Built basic messages array: ' . json_encode($messages));
        }


        if (empty($messages)) {
             // This case should ideally not happen if history or userInput exists
             $this->log('Error: Messages array is empty after processing.');
             // Return error for all models
             foreach ($models as $model) {
                 $responses[$model] = ['content' => 'Error: Failed to build prompt messages from template.', 'id' => null, 'usage' => ['prompt_tokens' => 0, 'completion_tokens' => 0, 'total_tokens' => 0]];
             }
             return $responses;
        }

        $this->log('Built messages array: ' . json_encode($messages)); // Log the final messages from PromptTemplateService or basic build

        // Store the final messages for later retrieval (used by ChatController for history)
        $this->lastApiMessages = $messages;

        foreach ($models as $model) {
            try {
                $this->log('Starting request for model: ' . $model);

                 // Check if the model supports streaming
                $modelEntity = $this->entityManager->getRepository(\App\Entity\Model::class)->findOneBy(['modelId' => $model]);
                $shouldStream = false;
                if ($stream && $modelEntity) {
                    $shouldStream = $modelEntity->isSupportsStreaming();
                }

                $this->log('Streaming for model ' . $model . ': ' . ($shouldStream ? 'enabled' : 'disabled'));

                $response = $this->client->request('POST', self::API_URL . '/chat/completions', [
                    'headers' => [
                        'Authorization' => 'Bearer ' . $this->apiKey,
                        'Content-Type' => 'application/json',
                        'HTTP-Referer' => 'https://github.com/michalkurecka/ai-multichat',
                        'X-Title' => 'AI MultiChat'
                    ],
                    'json' => [
                        'model' => $model,
                        'messages' => $messages,
                        'stream' => $shouldStream
                    ]
                ]);

                if ($shouldStream) {
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
                    $responses[$model] = $this->processResponse($data, $model, $thread, $shouldStream);
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
     * Stream response using a PromptTemplate (or basic history if template is null).
     * Note: This will only stream for models that support streaming (supportsStreaming = true)
     *
     * @param ?PromptTemplate $template The prompt template to use (optional).
     * @param string $userInput The current user's input.
     * @param array $models List of model IDs to target.
     * @param Thread $thread The current conversation thread.
     * @return array Stream responses keyed by model ID.
     */
    public function streamResponse(?PromptTemplate $template, string $userInput, array $models, Thread $thread): array
    {
        // Use the same generateResponse method with stream=true
        return $this->generateResponse($template, $userInput, $models, $thread, true); // Pass potentially null template
    }

    /**
     * Get the last messages sent to the API
     *
     * @return array|null The last messages sent to the API or null if none available
     */
    public function getLastApiMessages(): ?array
    {
        return $this->lastApiMessages;
    }

    // Note: getModelTokenLimit method removed as token limits are not handled here anymore.
    // Note: Compression logic (like compressThreadIfNeeded, compressThread, generateSummary)
    //       was previously here but is assumed to be handled by ContextService or another
    //       dedicated service if needed, triggered elsewhere in the application flow.
    //       Keeping the constants SUMMARY_THRESHOLD and MAX_SUMMARY_AGE for now in case
    //       they are referenced by other parts not yet reviewed.
    // Note: getCompressedContext method was removed as context building
    //       is now handled by PromptTemplateService using templates.
}
