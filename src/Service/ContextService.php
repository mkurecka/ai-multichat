<?php

namespace App\Service;

use App\Entity\Thread;
use App\Entity\User;
use App\Entity\ChatHistory;
use App\Entity\ThreadSummary; // Import ThreadSummary
use Doctrine\ORM\EntityManagerInterface;
use Psr\Log\LoggerInterface; // Add Logger

class ContextService
{
    private const MAX_RECENT_MESSAGES = 5; // Number of recent user/assistant pairs to include
    private const TOKEN_ESTIMATE_FACTOR = 4; // Rough estimate: 1 token ≈ 4 characters

    public function __construct(
        private readonly EntityManagerInterface $entityManager,
        private readonly LoggerInterface $logger // Inject Logger
    ) {
    }

    /**
     * Gets the relevant chat history messages for a thread, including a summary if available.
     * Returns an array formatted for the LLM API (e.g., [['role' => 'system', 'content' => '...'], ...]).
     * Does NOT include user-specific system messages (handled by templates now).
     *
     * @param Thread $thread The conversation thread.
     * @param int $maxTokens Optional token limit for history (not fully implemented yet).
     * @return array
     */
    public function getHistoryMessages(Thread $thread, ?int $maxTokens = null): array
    {
        $messages = [];
        $estimatedTokenCount = 0;

        // 1. Add Summary if available
        $summary = $thread->getLatestSummary();
        if ($summary) {
            $summaryContent = "PREVIOUS CONVERSATION SUMMARY:\n" . $summary->getSummary();
            $messages[] = [
                'role' => 'system',
                'content' => $summaryContent
            ];
            $estimatedTokenCount += $this->estimateTokenCount($summaryContent);
            $this->logger->info('Added conversation summary to context.', ['thread_id' => $thread->getId(), 'summary_id' => $summary->getId()]);
        }

        // 2. Add Recent Messages (e.g., last N pairs)
        // Fetch recent messages ordered by creation date
        $chatHistoryRepo = $this->entityManager->getRepository(ChatHistory::class);
        $recentHistories = $chatHistoryRepo->findBy(
            ['thread' => $thread],
            ['createdAt' => 'DESC'],
            self::MAX_RECENT_MESSAGES * 2 // Fetch enough to potentially get N pairs
        );
        $recentHistories = array_reverse($recentHistories); // Reverse to get chronological order

        $addedMessages = 0;
        foreach ($recentHistories as $chatHistory) {
            // Basic check to prevent exceeding a rough token limit if provided
            // TODO: Implement more robust token limiting if needed
            if ($maxTokens !== null && $estimatedTokenCount > $maxTokens) {
                 $this->logger->warning('Stopping history addition due to token limit.', ['thread_id' => $thread->getId(), 'current_tokens' => $estimatedTokenCount]);
                 break;
            }

            // Format user message
            $userMessageContent = $chatHistory->getPrompt() ?? '';
            $messages[] = [
                'role' => 'user',
                'content' => $userMessageContent
                // Note: 'name' field (user email) is intentionally omitted here
            ];
            $estimatedTokenCount += $this->estimateTokenCount($userMessageContent);

            // Format assistant message
            // Handle potential array structure in response
            $responseContent = '';
            $rawResponse = $chatHistory->getResponse();
            if (is_array($rawResponse)) {
                 // Attempt to extract content, adjust keys based on actual structure
                 if (isset($rawResponse['content']['content'])) {
                     $responseContent = $rawResponse['content']['content'];
                 } elseif (isset($rawResponse['content']) && is_string($rawResponse['content'])) {
                     $responseContent = $rawResponse['content'];
                 } elseif (isset($rawResponse['choices'][0]['message']['content'])) { // Common OpenAI structure
                     $responseContent = $rawResponse['choices'][0]['message']['content'];
                 } else {
                     // Fallback: stringify the array if structure is unknown
                     $responseContent = json_encode($rawResponse);
                     $this->logger->warning('Could not extract string content from assistant response array.', ['history_id' => $chatHistory->getId()]);
                 }
            } elseif (is_string($rawResponse)) {
                 $responseContent = $rawResponse;
            }

            $messages[] = [
                'role' => 'assistant',
                'content' => $responseContent
                // Note: 'name' field (model id) is omitted here, can be added if needed by API/template
            ];
            $estimatedTokenCount += $this->estimateTokenCount($responseContent);

            $addedMessages++;
            // Limit to MAX_RECENT_MESSAGES pairs (user + assistant)
             if ($addedMessages >= self::MAX_RECENT_MESSAGES) {
                 break;
             }
        }

        $this->logger->info('Retrieved history messages.', ['thread_id' => $thread->getId(), 'message_count' => count($messages)]);
        return $messages;
    }


    // --- Deprecated/Removed Methods ---

    /* // Removed: User context is now handled by PromptTemplateService
    private function getUserContext(User $user): array
    {
        // ... old implementation ...
    }
    */

    /* // Deprecated: Replaced by PromptTemplateService::buildApiMessages + self::getHistoryMessages
    public function getThreadContext(Thread $thread, ?int $maxMessages = null, ?int $maxTokens = null): array
    {
        // ... old implementation ...
    }
    */

    /* // Deprecated: Logic incorporated or simplified in getHistoryMessages
    private function getOptimizedChatHistory(iterable $chatHistories, int $maxTokens): array
    {
        // ... old implementation ...
    }
    */

    /* // Deprecated: Formatting is now primarily template-driven
    public function formatContextForModel(array $context, string $modelId): array
    {
        // ... old implementation ...
    }
    */
    /* // Deprecated: Formatting is now primarily template-driven
    private function formatForClaude(array $context): array
    {
        // ... old implementation ...
    }
    */
    /* // Deprecated: Formatting is now primarily template-driven
    private function formatForOpenAI(array $context): array
    {
        // ... old implementation ...
    }
    */

    /**
     * Simple token count estimator
     * Note: This is a rough approximation.
     */
    private function estimateTokenCount(?string $text): int
    {
        if ($text === null) {
            return 0;
        }
        // Rough approximation: ~4 characters per token for English text
        return (int) ceil(strlen($text) / self::TOKEN_ESTIMATE_FACTOR);
    }
}
