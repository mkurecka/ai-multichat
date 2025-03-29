<?php

namespace App\EventSubscriber;

use App\Event\OpenRouterRequestCompletedEvent;
use App\Entity\ApiRequestCost;
use App\Entity\ChatHistory;
use App\Service\OpenRouterService;
use Doctrine\ORM\EntityManagerInterface;
use Psr\Log\LoggerInterface;
use Symfony\Component\EventDispatcher\EventSubscriberInterface;

class OpenRouterCostTrackingSubscriber implements EventSubscriberInterface
{
    public function __construct(
        private readonly EntityManagerInterface $entityManager,
        private readonly OpenRouterService $openRouterService,
        private readonly LoggerInterface $logger
    ) {}

    public static function getSubscribedEvents(): array
    {
        return [
            OpenRouterRequestCompletedEvent::NAME => 'onRequestCompleted',
        ];
    }

    public function onRequestCompleted(OpenRouterRequestCompletedEvent $event): void
    {
        $this->logger->info('OpenRouterCostTrackingSubscriber received event', [
            'requestId' => $event->getRequestId()
        ]);

        // Find the chat history to get user and thread info
        $chatHistory = $this->entityManager->getRepository(ChatHistory::class)
            ->findOneBy(['openRouterId' => $event->getRequestId()]);

        if (!$chatHistory) {
            $this->logger->error('Chat history not found for request', [
                'requestId' => $event->getRequestId()
            ]);
            return;
        }

        $maxRetries = 3;
        $retryDelay = 1; // Start with 1 second delay
        
        for ($attempt = 1; $attempt <= $maxRetries; $attempt++) {
            try {
                $this->logger->info('Attempting to fetch cost data', [
                    'attempt' => $attempt,
                    'maxRetries' => $maxRetries
                ]);
                
                $generationData = $this->openRouterService->getGenerationData($event->getRequestId());
                
                if (empty($generationData)) {
                    $this->logger->error('Empty generation data received');
                    continue;
                }
                
                $this->logger->info('Successfully fetched cost data', [
                    'totalCost' => $generationData['total_cost'] ?? 0,
                    'tokens' => $generationData['usage']['total_tokens'] ?? 0
                ]);
                
                // Create and persist the cost entry
                $cost = new ApiRequestCost();
                $cost->setUser($chatHistory->getThread()->getUser())
                    ->setRequestId($event->getRequestId())
                    ->setApiProviderId('openrouter')
                    ->setAppId($generationData['app_id'] ?? '')
                    ->setModel($chatHistory->getModelId())
                    ->setTotalCost($generationData['total_cost'] ?? 0)
                    ->setCreatedAt(new \DateTime())
                    ->setTotalUsage($generationData['usage'] ?? [])
                    ->setCacheDiscount($generationData['cache_discount'] ?? null)
                    ->setProviderName($generationData['provider_name'] ?? '')
                    ->setLatency($generationData['latency'] ?? 0)
                    ->setTokensPrompt($generationData['tokens_prompt'] ?? 0)
                    ->setTokensCompletion($generationData['tokens_completion'] ?? 0)
                    ->setNativeTokensPrompt($generationData['native_tokens_prompt'] ?? 0)
                    ->setNativeTokensCompletion($generationData['native_tokens_completion'] ?? 0)
                    ->setNativeTokensReasoning($generationData['native_tokens_reasoning'] ?? 0)
                    ->setOrigin($generationData['origin'] ?? '')
                    ->setIsByok($generationData['byok'] ?? false)
                    ->setUpstreamId($generationData['upstream_id'] ?? '')
                    ->setStreamed($generationData['streamed'] ?? false)
                    ->setCancelled($generationData['cancelled'] ?? false)
                    ->setNumMediaPrompt($generationData['num_media_prompt'] ?? 0)
                    ->setModerationLatency($generationData['moderation_latency'] ?? 0)
                    ->setGenerationTime($generationData['generation_time'] ?? 0)
                    ->setFinishReason($generationData['finish_reason'] ?? '')
                    ->setNativeFinishReason($generationData['native_finish_reason'] ?? '')
                    ->setNumMediaCompletion($generationData['num_media_completion'] ?? 0)
                    ->setNumSearchResults($generationData['num_search_results'] ?? 0)
                    ->setRequestType($event->getRequestType())
                    ->setRequestReference($event->getRequestReference());
                
                $this->entityManager->persist($cost);
                $this->entityManager->flush();
                
                $this->logger->info('Successfully saved cost data to database');
                return;
                
            } catch (\Exception $e) {
                $this->logger->error('Error fetching cost data', [
                    'attempt' => $attempt,
                    'error' => $e->getMessage(),
                    'trace' => $e->getTraceAsString()
                ]);
                
                if ($attempt < $maxRetries) {
                    sleep($retryDelay);
                    $retryDelay *= 2; // Exponential backoff
                }
            }
        }
        
        $this->logger->error('Failed to fetch cost data after all retries');
    }
} 