<?php

namespace App\Controller;

use App\Entity\ChatHistory;
use App\Entity\PromptTemplate; // Import PromptTemplate
use App\Entity\Thread;
use App\Entity\User; // Make sure User is imported if not already
use App\Event\OpenRouterRequestCompletedEvent;
use App\Repository\ModelRepository;
use App\Repository\PromptTemplateRepository; // Import PromptTemplateRepository
use App\Service\ModelService;
use App\Service\OpenRouterService;
use App\Service\ContextService;
// use App\Service\PromptTemplateService; // Service for processing template text (currently handled by frontend)
use Doctrine\ORM\EntityManagerInterface;
use Psr\Log\LoggerInterface;
use Symfony\Bundle\FrameworkBundle\Controller\AbstractController;
use Symfony\Component\EventDispatcher\EventDispatcherInterface;
use Symfony\Component\HttpFoundation\JsonResponse;
use Symfony\Component\HttpFoundation\Request;
use Symfony\Component\HttpFoundation\Response;
use Symfony\Component\HttpFoundation\StreamedResponse;
use Symfony\Component\HttpKernel\Exception\HttpException;
use Symfony\Component\Routing\Annotation\Route;
use Symfony\Component\Security\Http\Attribute\IsGranted;
// use Symfony\Component\Serializer\SerializerInterface; // Not used currently

#[Route('/api')]
#[IsGranted('ROLE_USER')]
class ChatController extends AbstractController
{
    public function __construct(
        private readonly OpenRouterService $openRouterService,
        private readonly EntityManagerInterface $em,
        private readonly EventDispatcherInterface $eventDispatcher,
        private readonly LoggerInterface $logger,
        private readonly ModelRepository $modelRepository,
        private readonly PromptTemplateRepository $promptTemplateRepository, // Inject PromptTemplateRepository
        private readonly ContextService $contextService // Inject ContextService
        // private readonly PromptTemplateService $promptTemplateService // Inject if needed later
    ) {}

    #[Route('/models', methods: ['GET'])]
    public function getModels(): JsonResponse
    {
        // Get enabled models from the repository
        $dbModels = $this->modelRepository->findAllOrdered(true);

        // Format models for the frontend
        $formattedModels = [];
        foreach ($dbModels as $model) {
            $formattedModels[] = [
                'id' => $model->getId(), // Use database ID as the id for the frontend
                'modelId' => $model->getModelId(), // Add modelId as a separate property
                'name' => $model->getName(),
                'description' => $model->getDescription(),
                'provider' => $model->getProvider(),
                'selected' => false, // Default to not selected
                'pricing' => $model->getPricing() ?? [
                    'prompt' => null,
                    'completion' => null,
                    'unit' => 'tokens'
                ],
                'supportsStreaming' => $model->isSupportsStreaming()
            ];
        }

        return $this->json($formattedModels);
    }

    #[Route('/models/refresh', methods: ['GET'])]
    public function refreshModels(ModelService $modelService): JsonResponse
    {
        return $this->json($modelService->refreshModels());
    }

    #[Route('/chat', methods: ['POST'])]
    public function chat(Request $request, EntityManagerInterface $em, OpenRouterService $openRouter): Response
    {
        $data = json_decode($request->getContent(), true);
        // Expect 'userInput' for raw user text, keep 'prompt' for potential backward compatibility or processed text if needed?
        // Let's prioritize 'userInput' if available.
        $userInput = $data['userInput'] ?? $data['prompt'] ?? null;
        $models = $data['models'] ?? []; // Original models selected by user (might be overridden by template)
        $threadId = $data['threadId'] ?? null;
        $stream = $data['stream'] ?? false;
        $promptId = $data['promptId'] ?? null; // Frontend generated ID for the specific prompt instance
        $templateId = $data['templateId'] ?? null; // Optional ID of the template used

        // $finalPrompt = $prompt; // We no longer use a single 'finalPrompt' in the same way
        $finalModels = $models; // Array of model *string IDs* (e.g., 'openai/gpt-4')
        $selectedTemplate = null;
        /** @var User $currentUser */
        $currentUser = $this->getUser(); // Get current user

        // --- Template Processing Logic ---
        if ($templateId) {
            $selectedTemplate = $this->promptTemplateRepository->find((int)$templateId);

            if (!$selectedTemplate) {
                throw new HttpException(404, 'Prompt template not found.');
            }

            // Authorization Check for Template Usage
            $isOwner = $selectedTemplate->getOwner() === $currentUser;
            $isOrgMatch = $selectedTemplate->getOrganization() === $currentUser->getOrganization();

            if (!($selectedTemplate->getScope() === PromptTemplate::SCOPE_PRIVATE && $isOwner) &&
                !($selectedTemplate->getScope() === PromptTemplate::SCOPE_ORGANIZATION && $isOrgMatch)) {
                 throw new HttpException(403, 'You do not have permission to use this prompt template.');
            }

            // Override models with the one associated with the template
            if ($associatedModel = $selectedTemplate->getAssociatedModel()) {
                if (!$associatedModel->isEnabled()) {
                     throw new HttpException(400, 'The AI model associated with this template is currently disabled.');
                }
                 $finalModels = [$associatedModel->getModelId()]; // Use the model's string ID
                 $stream = $stream && $associatedModel->isSupportsStreaming(); // Adjust stream capability
            } else {
                 throw new HttpException(500, 'The selected template does not have an associated AI model.');
            }

            // Template found and authorized, model is set in $finalModels
        } else {
            // --- No Template Provided ---
            // Decide fallback behavior. For now, require a template or handle differently.
            // Option 1: Throw error if no template ID is provided (enforce template usage)
            // throw new HttpException(400, 'A prompt template ID (templateId) is required for chat requests.');

            // Option 2: Allow direct chat (requires constructing a minimal message array or using a default template)
            // This path needs careful consideration. Let's assume for now a template is required.
            // If we allow direct chat, we'd need to fetch a default template or handle it in OpenRouterService.
             // throw new HttpException(400, 'A prompt template ID (templateId) is required for chat requests.'); // REMOVED: Allow non-template chat

            // If allowing direct chat without template:
             $finalModels = $models; // Use user-selected models
             $selectedTemplate = null; // No template used
             // Ensure stream is based on user request if no template overrides it
             // $stream = $data['stream'] ?? false; // Already set based on initial request data
        }
        // --- End Template Processing ---

        // Validation
        if (!$userInput || empty($finalModels)) {
             throw new HttpException(400, 'User input (userInput) and models are required.');
        }
        // Removed check requiring selectedTemplate
        if (!$promptId) {
            throw new HttpException(400, 'PromptId is required.');
        }

        $organization = $currentUser->getOrganization(); // Get organization from current user

        // --- Handle Thread ---
        if ($threadId) {
            $thread = $em->getRepository(Thread::class)->findOneBy(['threadId' => $threadId, 'user' => $currentUser]);
            if (!$thread) {
                throw new HttpException(404, 'Thread not found or access denied.');
            }
        } else {
            $thread = new Thread();
            // Use the raw user input for the initial title
            $thread->setTitle(substr($userInput, 0, 100));
            $thread->setUser($currentUser);
            $thread->setThreadId(uniqid('thread_', true));
            $em->persist($thread);
            $em->flush(); // Save thread to get ID
            $threadId = $thread->getThreadId(); // Update threadId variable
        }

        // --- Determine Model and Streaming ---
        $modelDbId = null; // Model DB ID for history
        $modelIdString = $finalModels[0]; // Model string ID for API call
        $allowsStream = false;

        // Try to find the model by ID first (if it's a numeric database ID)
        $modelEntity = null;
        if (is_numeric($modelIdString)) {
            $modelEntity = $this->modelRepository->find($modelIdString);
            // If found by ID, use the modelId string for API calls
            if ($modelEntity) {
                $modelIdString = $modelEntity->getModelId();
                $this->logger->info('Found model by database ID', ['id' => $modelIdString, 'modelId' => $modelEntity->getModelId()]);
            }
        }

        // If not found by ID, try to find by modelId string
        if (!$modelEntity) {
            $modelEntity = $this->modelRepository->findByModelId($modelIdString);
        }

        if (!$modelEntity || !$modelEntity->isEnabled()) {
             throw new HttpException(400, "The selected model '{$modelIdString}' is not available or disabled.");
        }

        $modelDbId = $modelEntity->getId();
        $allowsStream = $stream && $modelEntity->isSupportsStreaming();

        // --- Streaming Response ---
        if ($allowsStream) {
            // Call with potentially null Template object and raw userInput
            $modelResponses = $openRouter->streamResponse($selectedTemplate, $userInput, [$modelIdString], $thread); // Pass $selectedTemplate (can be null)

            if (!isset($modelResponses[$modelIdString])) {
                throw new HttpException(500, 'Failed to generate streaming response from OpenRouter.');
            }
            $modelResponse = $modelResponses[$modelIdString]; // Contains stream resource and initial usage data

            // Define the closure for streaming, ensuring all needed variables are passed via 'use'
            $streamClosure = function() use ($modelResponse, $modelDbId, $modelIdString, $userInput, $thread, $em, $promptId, $selectedTemplate, $currentUser) {
                $streamResource = $modelResponse['stream'] ?? null;
                if (!is_resource($streamResource)) {
                     $this->logger->error('Invalid stream resource received from OpenRouterService', ['model' => $modelIdString]);
                     echo "data: " . json_encode(['error' => 'Internal error: Could not get stream.', 'modelId' => $modelIdString]) . "\n\n";
                     flush();
                     return;
                }

                // Initialize variables for the stream processing
                $content = '';
                $openRouterId = null;
                $finalUsage = $modelResponse['usage'] ?? ['prompt_tokens' => 0, 'completion_tokens' => 0, 'total_tokens' => 0];
                $chatHistory = null;
                $historySaved = false;

                // Start the actual loop to process the stream
                while (!feof($streamResource)) {
                    $chunk = fread($streamResource, 8192);
                    if ($chunk === false || $chunk === '') {
                        $this->logger->info('Stream ended or read error.', ['model' => $modelIdString]);
                        break;
                    };

                    $lines = explode("\n", $chunk);
                    foreach ($lines as $line) {
                        if (empty(trim($line))) continue;

                        if (strpos($line, 'data: ') === 0) {
                            $jsonData = substr($line, 6);

                            if ($jsonData === '[DONE]') {
                                $this->logger->info('[DONE] received for stream.', ['model' => $modelIdString]);
                                // Ensure history is saved if content exists
                                if (!$historySaved && !empty($content)) {
                                    // Get API messages from the OpenRouterService
                                    $apiMessages = null;
                                    if ($selectedTemplate) {
                                        // If using a template, get the messages built by PromptTemplateService
                                        $apiMessages = $this->openRouterService->getLastApiMessages();
                                    } else {
                                        // For basic chat without template
                                        $apiMessages = $this->contextService->getHistoryMessages($thread);
                                        // Add current user input
                                        $apiMessages[] = [
                                            'role' => 'user',
                                            'content' => $userInput
                                        ];
                                    }

                                    $chatHistory = new ChatHistory();
                                    $chatHistory->setThread($thread)
                                        ->setPrompt($userInput) // Save raw user input
                                        ->setPromptId($promptId)
                                        ->setResponse(['content' => $content, 'usage' => $finalUsage])
                                        ->setModelId($modelDbId)
                                        ->setOpenRouterId($openRouterId)
                                        ->setUsedTemplate($selectedTemplate)
                                        ->setApiMessages($apiMessages);
                                    $em->persist($chatHistory);
                                    try {
                                        $em->flush();
                                        $historySaved = true; // Mark as saved
                                        $this->logger->info('ChatHistory saved on [DONE].', ['historyId' => $chatHistory->getId()]);
                                    } catch (\Exception $e) {
                                         $this->logger->error("Error flushing ChatHistory on [DONE]: " . $e->getMessage(), ['exception' => $e]);
                                    }
                                }
                                break 2; // Exit both loops
                            }

                            try {
                                $parsed = json_decode($jsonData, true, 512, JSON_THROW_ON_ERROR);

                                if (isset($parsed['id']) && !$openRouterId) {
                                    $openRouterId = $parsed['id'];
                                    $this->logger->info('Captured OpenRouter ID from stream.', ['id' => $openRouterId]);
                                }

                                if (isset($parsed['choices'][0]['delta']['content'])) {
                                    $deltaContent = $parsed['choices'][0]['delta']['content'];
                                    $content .= $deltaContent;
                                    echo "data: " . json_encode([
                                        'content' => $deltaContent,
                                        'modelId' => $modelIdString,
                                        'threadId' => $thread->getThreadId(),
                                        'promptId' => $promptId
                                    ], JSON_UNESCAPED_UNICODE) . "\n\n";
                                    flush();
                                }

                                if (isset($parsed['choices'][0]['usage'])) {
                                     $finalUsage = $parsed['choices'][0]['usage'];
                                     $this->logger->info('Received final usage from stream.', ['usage' => $finalUsage]);
                                }
                                if (isset($parsed['usage'])) { // Less common, but check root
                                     $finalUsage = $parsed['usage'];
                                     $this->logger->info('Received final usage from stream (root).', ['usage' => $finalUsage]);
                                }

                            } catch (\JsonException $e) {
                                $this->logger->error('Error parsing streaming JSON: ' . $e->getMessage(), ['data' => $jsonData]);
                            } catch (\Exception $e) {
                                 $this->logger->error('Generic error processing stream chunk: ' . $e->getMessage(), ['exception' => $e]);
                            }
                        } else {
                             $this->logger->warning('Received non-SSE line from stream.', ['line' => $line]);
                        }
                    }
                } // end while

                 if (is_resource($streamResource)) {
                     fclose($streamResource);
                 }

                // Final save attempt if not saved via [DONE] and content exists
                if (!$historySaved && !empty($content)) {
                    $this->logger->warning('[DONE] not received or history not saved, attempting final save.', ['model' => $modelIdString]);

                    // Get API messages from the OpenRouterService
                    $apiMessages = null;
                    if ($selectedTemplate) {
                        // If using a template, get the messages built by PromptTemplateService
                        $apiMessages = $this->openRouterService->getLastApiMessages();
                    } else {
                        // For basic chat without template
                        $apiMessages = $this->contextService->getHistoryMessages($thread);
                        // Add current user input
                        $apiMessages[] = [
                            'role' => 'user',
                            'content' => $userInput
                        ];
                    }

                    $chatHistory = new ChatHistory();
                    $chatHistory->setThread($thread)
                        ->setPrompt($userInput) // Save raw user input
                        ->setPromptId($promptId)
                        ->setResponse(['content' => $content, 'usage' => $finalUsage])
                        ->setModelId($modelDbId)
                        ->setOpenRouterId($openRouterId)
                        ->setUsedTemplate($selectedTemplate)
                        ->setApiMessages($apiMessages);
                    $em->persist($chatHistory);
                    try {
                        $em->flush();
                        $historySaved = true; // Mark as saved
                        $this->logger->info('ChatHistory saved after stream end.', ['historyId' => $chatHistory->getId()]);
                    } catch (\Exception $e) {
                         $this->logger->error("Error flushing ChatHistory after stream end: " . $e->getMessage(), ['exception' => $e]);
                    }
                }

                // Dispatch event only if history was successfully saved and we have an ID
                if ($historySaved && $chatHistory && $openRouterId) {
                    try {
                         $event = new OpenRouterRequestCompletedEvent($openRouterId, $chatHistory->getId(), 'chat');
                         $this->eventDispatcher->dispatch($event, OpenRouterRequestCompletedEvent::NAME);
                         $this->logger->info('OpenRouterRequestCompletedEvent dispatched successfully for streaming.', ['openRouterId' => $openRouterId]);
                    } catch (\Exception $e) {
                         $this->logger->error("Error dispatching OpenRouterRequestCompletedEvent: " . $e->getMessage(), ['exception' => $e]);
                    }
                } else {
                     $this->logger->warning('Cost tracking event not dispatched.', ['historySaved' => $historySaved, 'hasOpenRouterId' => !is_null($openRouterId)]);
                }
            }; // End $streamClosure definition

            // Create the StreamedResponse *after* defining the closure
            $response = new StreamedResponse($streamClosure);

            $response->headers->set('Content-Type', 'text/event-stream');
            $response->headers->set('Cache-Control', 'no-cache');
            $response->headers->set('Connection', 'keep-alive');
            $response->headers->set('X-Accel-Buffering', 'no');

            return $response;

        // --- Non-Streaming Response ---
        } else {
            $responses = [];
            // Usually only one model in $finalModels here, but loop supports multiple if needed without templates
            foreach ($finalModels as $modelIdStr) {
                 // Try to find the model by ID first (if it's a numeric database ID)
                 $modelEntityForHistory = null;
                 $originalModelIdStr = $modelIdStr;

                 if (is_numeric($modelIdStr)) {
                     $modelEntityForHistory = $this->modelRepository->find($modelIdStr);
                     // If found by ID, use the modelId string for API calls
                     if ($modelEntityForHistory) {
                         $modelIdStr = $modelEntityForHistory->getModelId();
                         $this->logger->info('Found model by database ID', ['id' => $originalModelIdStr, 'modelId' => $modelIdStr]);
                     }
                 }

                 // If not found by ID, try to find by modelId string
                 if (!$modelEntityForHistory) {
                     $modelEntityForHistory = $this->modelRepository->findByModelId($modelIdStr);
                 }

                 // Re-check eligibility in case logic changes
                 if (!$modelEntityForHistory || !$modelEntityForHistory->isEnabled()) {
                     $responses[$originalModelIdStr] = ['error' => "Model '{$modelIdStr}' is not available or disabled."];
                     continue;
                 }
                 $modelDbIdForHistory = $modelEntityForHistory->getId();

                 // Call with potentially null Template object and raw userInput
                $modelApiResponses = $openRouter->generateResponse($selectedTemplate, $userInput, [$modelIdStr], $thread); // Pass $selectedTemplate (can be null)

                if (!isset($modelApiResponses[$modelIdStr])) {
                    $responses[$originalModelIdStr] = ['error' => 'Failed to get response from model.'];
                    continue;
                }
                $modelApiResponse = $modelApiResponses[$modelIdStr]; // Contains content, usage, id

                // Get the API messages that were sent to the model
                $apiMessages = null;
                if (isset($modelApiResponse['messages']) && is_array($modelApiResponse['messages'])) {
                    // If the API response includes the messages that were sent
                    $apiMessages = $modelApiResponse['messages'];
                } else {
                    // Try to get the last messages from the service
                    $apiMessages = $this->openRouterService->getLastApiMessages();
                }

                $modelHistory = new ChatHistory();
                $modelHistory->setThread($thread)
                    ->setPrompt($userInput) // Save raw user input
                    ->setPromptId($promptId)
                    ->setResponse([
                        'content' => $modelApiResponse['content'] ?? 'Error: No content received',
                        'usage' => $modelApiResponse['usage'] ?? ['prompt_tokens' => 0, 'completion_tokens' => 0, 'total_tokens' => 0]
                    ])
                    ->setModelId($modelDbIdForHistory)
                    ->setOpenRouterId($modelApiResponse['id'] ?? null)
                    ->setUsedTemplate($selectedTemplate)
                    ->setApiMessages($apiMessages);

                $em->persist($modelHistory);

                // Prepare response for the frontend *before* flushing and dispatching event
                 $responses[$originalModelIdStr] = [
                    'content' => $modelApiResponse['content'] ?? 'Error: No content received',
                    'usage' => $modelApiResponse['usage'] ?? ['prompt_tokens' => 0, 'completion_tokens' => 0, 'total_tokens' => 0]
                ];

                 // Flush and Dispatch Event
                 try {
                     $em->flush(); // Flush to get modelHistory ID
                     $openRouterRequestId = $modelApiResponse['id'] ?? null;
                     if ($openRouterRequestId) {
                         $event = new OpenRouterRequestCompletedEvent($openRouterRequestId, $modelHistory->getId(), 'chat');
                         $this->eventDispatcher->dispatch($event, OpenRouterRequestCompletedEvent::NAME);
                         $this->logger->info('OpenRouterRequestCompletedEvent dispatched successfully for non-streaming.', ['openRouterId' => $openRouterRequestId]);
                     } else {
                          $this->logger->warning('Cannot dispatch cost tracking event for non-streaming: OpenRouter ID missing.', ['model' => $modelIdStr]);
                     }
                 } catch (\Exception $e) {
                      $this->logger->error("Error flushing/dispatching event for non-streaming model {$modelIdStr}: " . $e->getMessage(), ['exception' => $e]);
                      $responses[$originalModelIdStr]['error'] = ($responses[$originalModelIdStr]['error'] ?? '') . ' Failed to record history/cost.';
                 }
            } // End foreach model loop

            return $this->json([
                'responses' => $responses,
                'threadId' => $thread->getThreadId(),
                'promptId' => $promptId,
            ]);
        }
    }


    #[Route('/chat/history', methods: ['GET'])]
    public function history(): JsonResponse
    {
        /** @var User $user */
        $user = $this->getUser();
        $threads = $user->getThreads(); // Assuming this fetches threads ordered correctly or we sort later
        $data = [];

        foreach ($threads as $thread) {
            try {
                $histories = $thread->getChatHistories()->toArray(); // Get all histories for the thread

                // Sort histories by creation date, oldest first
                usort($histories, fn(ChatHistory $a, ChatHistory $b) => $a->getCreatedAt() <=> $b->getCreatedAt());

                if (empty($histories)) continue; // Skip threads with no history

                $messages = [];
                $currentPromptId = null;
                $currentPromptResponses = [];
                $firstPromptText = null; // To store the text of the very first prompt

                foreach ($histories as $history) {
                    if ($firstPromptText === null) {
                        $firstPromptText = $history->getPrompt(); // Capture the first prompt text
                    }

                    if ($currentPromptId !== $history->getPromptId()) {
                        // Finalize the previous prompt group if it exists
                        if (!empty($currentPromptResponses)) {
                            $messages[] = [
                                'prompt' => $currentPromptResponses[0]['prompt'], // Text of the prompt
                                'responses' => array_column($currentPromptResponses, 'response', 'modelId'), // Responses keyed by model ID string
                                'createdAt' => $currentPromptResponses[0]['createdAt'], // Timestamp of the first response in group
                                'promptId' => $currentPromptId
                            ];
                        }
                        // Start a new group
                        $currentPromptId = $history->getPromptId();
                        $currentPromptResponses = [];
                    }

                    // Get model string ID
                    $modelStringId = $this->modelRepository->find($history->getModelId())?->getModelId() ?? 'unknown_model';

                    // Sanitize response data to ensure valid UTF-8
                    $response = $history->getResponse();
                    if (is_array($response)) {
                        // Recursively sanitize all string values in the response array
                        $response = $this->sanitizeArray($response);
                    }

                    // Add current history details to the group
                    $currentPromptResponses[] = [
                        'prompt' => $this->sanitizeString($history->getPrompt()),
                        'response' => $response,
                        'modelId' => $modelStringId, // Use string model ID for frontend consistency
                        'createdAt' => $history->getCreatedAt()->format('Y-m-d H:i:s'),
                        'usedTemplateId' => $history->getUsedTemplate() ? $history->getUsedTemplate()->getId() : null,
                        'usedTemplateName' => $history->getUsedTemplate() ? $history->getUsedTemplate()->getName() : null
                    ];
                }

                // Add the last processed group
                if (!empty($currentPromptResponses)) {
                    $messages[] = [
                        'prompt' => $currentPromptResponses[0]['prompt'],
                        'responses' => array_column($currentPromptResponses, 'response', 'modelId'),
                        'createdAt' => $currentPromptResponses[0]['createdAt'],
                        'promptId' => $currentPromptId,
                        'usedTemplateId' => $currentPromptResponses[0]['usedTemplateId'],
                        'usedTemplateName' => $currentPromptResponses[0]['usedTemplateName']
                    ];
                }

                // Use the first prompt's text for the thread title if available
                $threadTitle = $firstPromptText ? substr($this->sanitizeString($firstPromptText), 0, 100) : $thread->getTitle();

                $data[] = [
                    'id' => $thread->getId(),
                    'title' => $threadTitle,
                    'messages' => $messages,
                    'threadId' => $thread->getThreadId(),
                    'createdAt' => $thread->getCreatedAt()->format('Y-m-d H:i:s')
                ];
            } catch (\Exception $e) {
                $this->logger->error('Error processing thread history: ' . $e->getMessage(), [
                    'threadId' => $thread->getThreadId(),
                    'exception' => $e
                ]);
                // Continue with next thread instead of failing the entire request
            }
        }

        // Sort threads by creation date, newest first (if not already ordered by repository)
        usort($data, fn($a, $b) => strtotime($b['createdAt']) <=> strtotime($a['createdAt']));

        return $this->json($data, 200, [], ['json_encode_options' => JSON_INVALID_UTF8_SUBSTITUTE | JSON_UNESCAPED_UNICODE]);
    }

    /**
     * Sanitize a string to ensure valid UTF-8 encoding
     */
    private function sanitizeString(?string $str): string
    {
        if ($str === null) {
            return '';
        }

        // First try to detect encoding
        $encoding = mb_detect_encoding($str, ['UTF-8', 'ISO-8859-1', 'Windows-1252'], true);

        // If we can detect the encoding, convert it to UTF-8
        if ($encoding) {
            $sanitized = mb_convert_encoding($str, 'UTF-8', $encoding);
        } else {
            // If we can't detect encoding, try to force UTF-8
            $sanitized = mb_convert_encoding($str, 'UTF-8', 'UTF-8');
        }

        // If conversion failed, return an empty string
        if ($sanitized === false) {
            return '';
        }

        // Remove any invalid UTF-8 sequences
        $sanitized = preg_replace('/[\x00-\x08\x0B\x0C\x0E-\x1F\x7F]/u', '', $sanitized);

        return $sanitized;
    }

    /**
     * Recursively sanitize all string values in an array
     */
    private function sanitizeArray($data)
    {
        if (is_string($data)) {
            return $this->sanitizeString($data);
        }

        if (is_array($data)) {
            $result = [];
            foreach ($data as $key => $value) {
                $result[$key] = $this->sanitizeArray($value);
            }
            return $result;
        }

        if (is_object($data) && method_exists($data, 'toArray')) {
            return $this->sanitizeArray($data->toArray());
        }

        // For other types (int, bool, null, etc.), return as is
        return $data;
    }

    #[Route('/chat/thread/{threadId}', methods: ['GET'])]
    public function getThread(string $threadId, EntityManagerInterface $em): JsonResponse
    {
        /** @var User $user */
        $user = $this->getUser();
        $thread = $em->getRepository(Thread::class)
            ->findOneBy(['threadId' => $threadId, 'user' => $user]);

        if (!$thread) {
            throw $this->createNotFoundException('Thread not found');
        }

        try {
            $messages = [];
            $histories = $thread->getChatHistories()->toArray();

            // Sort histories by creation date, oldest first
            usort($histories, fn(ChatHistory $a, ChatHistory $b) => $a->getCreatedAt() <=> $b->getCreatedAt());

            $currentPromptId = null;
            $currentPromptResponses = [];

            foreach ($histories as $history) {
                if ($currentPromptId !== $history->getPromptId()) {
                    if (!empty($currentPromptResponses)) {
                        $messages[] = [
                            'prompt' => $currentPromptResponses[0]['prompt'],
                            'responses' => array_column($currentPromptResponses, 'response', 'modelId'),
                            'createdAt' => $currentPromptResponses[0]['createdAt'],
                            'promptId' => $currentPromptId,
                            'usedTemplateId' => $currentPromptResponses[0]['usedTemplateId'],
                            'usedTemplateName' => $currentPromptResponses[0]['usedTemplateName']
                        ];
                    }
                    $currentPromptId = $history->getPromptId();
                    $currentPromptResponses = [];
                }

                $modelStringId = $this->modelRepository->find($history->getModelId())?->getModelId() ?? 'unknown_model';

                // Sanitize response data to ensure valid UTF-8
                $response = $history->getResponse();
                if (is_array($response)) {
                    // Recursively sanitize all string values in the response array
                    $response = $this->sanitizeArray($response);
                }

                $currentPromptResponses[] = [
                    'prompt' => $this->sanitizeString($history->getPrompt()),
                    'response' => $response,
                    'modelId' => $modelStringId, // Use string model ID
                    'createdAt' => $history->getCreatedAt()->format('Y-m-d H:i:s'),
                    'usedTemplateId' => $history->getUsedTemplate() ? $history->getUsedTemplate()->getId() : null,
                    'usedTemplateName' => $history->getUsedTemplate() ? $history->getUsedTemplate()->getName() : null
                ];
            }

            // Add the last group
            if (!empty($currentPromptResponses)) {
                $messages[] = [
                    'prompt' => $currentPromptResponses[0]['prompt'],
                    'responses' => array_column($currentPromptResponses, 'response', 'modelId'),
                    'createdAt' => $currentPromptResponses[0]['createdAt'],
                    'promptId' => $currentPromptId,
                    'usedTemplateId' => $currentPromptResponses[0]['usedTemplateId'],
                    'usedTemplateName' => $currentPromptResponses[0]['usedTemplateName']
                ];
            }

            return $this->json([
                'messages' => $messages,
                'threadId' => $thread->getThreadId()
            ], 200, [], ['json_encode_options' => JSON_INVALID_UTF8_SUBSTITUTE | JSON_UNESCAPED_UNICODE]);
        } catch (\Exception $e) {
            $this->logger->error('Error processing thread data: ' . $e->getMessage(), [
                'threadId' => $thread->getThreadId(),
                'exception' => $e
            ]);

            // Return an error response instead of failing
            return $this->json([
                'error' => 'Failed to load chat history. Please try again.',
                'threadId' => $thread->getThreadId()
            ], 500, [], ['json_encode_options' => JSON_INVALID_UTF8_SUBSTITUTE | JSON_UNESCAPED_UNICODE]);
        }
    }

    #[Route('/chat/thread', methods: ['POST'])]
    public function createThread(EntityManagerInterface $em): JsonResponse
    {
        /** @var User $user */
        $user = $this->getUser();

        $thread = new Thread();
        $thread->setTitle('New Chat'); // Default title
        $thread->setUser($user);
        $thread->setThreadId(uniqid('thread_', true));

        $em->persist($thread);
        $em->flush();

        return $this->json([
            'threadId' => $thread->getThreadId()
        ]);
    }

    #[Route('/chat/costs', methods: ['GET'])]
    public function getCosts(EntityManagerInterface $em): JsonResponse
    {
        /** @var User $user */
        $user = $this->getUser();

        $qb = $em->createQueryBuilder();
        $qb->select('t.threadId', 't.title', 't.createdAt as threadCreatedAt', 'COUNT(DISTINCT ch.promptId) as messageCount') // Count distinct prompts
           ->from(Thread::class, 't')
           ->leftJoin('t.chatHistories', 'ch') // Join needed for counting
           ->where('t.user = :user')
           ->setParameter('user', $user)
           ->groupBy('t.threadId', 't.title', 't.createdAt')
           ->orderBy('t.createdAt', 'DESC');

        $threadsData = $qb->getQuery()->getResult();

        // Get costs for each thread more efficiently
        $threadIds = array_column($threadsData, 'threadId');
        $costs = [];
        if (!empty($threadIds)) {
            $costQb = $em->createQueryBuilder();
            $costQb->select('arc.requestReference as threadId',
                             'COALESCE(SUM(arc.totalCost), 0) as totalCost',
                             'COALESCE(SUM(arc.tokensPrompt), 0) as totalPromptTokens',
                             'COALESCE(SUM(arc.tokensCompletion), 0) as totalCompletionTokens')
                   ->from('App\Entity\ApiRequestCost', 'arc')
                   ->where('arc.requestReference IN (:threadIds)')
                   ->andWhere('arc.requestType = :requestType')
                   ->setParameter('threadIds', $threadIds)
                   ->setParameter('requestType', 'chat')
                   ->groupBy('arc.requestReference');
            $costsResult = $costQb->getQuery()->getResult();
            // Index costs by threadId for easy lookup
            foreach ($costsResult as $costRow) {
                $costs[$costRow['threadId']] = $costRow;
            }
        }


        $threadCosts = [];
        foreach ($threadsData as $thread) {
             $threadId = $thread['threadId'];
             $costStats = $costs[$threadId] ?? [
                 'totalCost' => 0,
                 'totalPromptTokens' => 0,
                 'totalCompletionTokens' => 0
             ];

            $threadCosts[] = [
                'threadId' => $threadId,
                'title' => $thread['title'],
                'messageCount' => (int)$thread['messageCount'], // Count of prompt/response pairs
                'lastMessageDate' => $thread['threadCreatedAt']->format('Y-m-d H:i:s'), // This is thread creation, need last message date ideally
                'totalCost' => (float)$costStats['totalCost'],
                'totalTokens' => (int)($costStats['totalPromptTokens'] + $costStats['totalCompletionTokens'])
            ];
             // TODO: Get actual last message date if needed, requires another query or different initial query
        }

        return $this->json($threadCosts);
    }
}
