<?php

namespace App\Service;

use App\Entity\Thread;
use App\Entity\User;
use App\Entity\ChatHistory;
use Doctrine\ORM\EntityManagerInterface;

class ContextService
{
    private const MAX_CONTEXT_MESSAGES = 10;
    private const MAX_TOKEN_ESTIMATE = 4000; // Approximate token limit for context
    private const TOKEN_ESTIMATE_FACTOR = 4; // Rough estimate: 1 token ≈ 4 characters

    public function __construct(
        private readonly EntityManagerInterface $entityManager
    ) {
    }

    /**
     * Get optimized formatted context for a thread
     */
    public function getThreadContext(Thread $thread, ?int $maxMessages = null, ?int $maxTokens = null): array
    {
        $maxMessages = $maxMessages ?? self::MAX_CONTEXT_MESSAGES;
        $maxTokens = $maxTokens ?? self::MAX_TOKEN_ESTIMATE;
        $messages = [];
        
        // Always add user context first (highest priority)
        $user = $thread->getUser();
        $userContext = $this->getUserContext($user);
        $messages[] = $userContext;
        $estimatedTokenCount = $this->estimateTokenCount($userContext['content']);
        
        // Get all chat histories for the thread
        $chatHistories = $thread->getChatHistories();
        
        // If we have more messages than our limit, implement a better selection strategy
        if (count($chatHistories) > $maxMessages - 1) { // -1 because we already added user context
            $messages = array_merge($messages, $this->getOptimizedChatHistory($chatHistories, $maxTokens - $estimatedTokenCount));
        } else {
            // For small conversations, just include all messages
            foreach ($chatHistories as $chatHistory) {
                $userMessage = $this->formatUserMessage($chatHistory, $user);
                $assistantMessage = $this->formatAssistantMessage($chatHistory);
                
                // Check if adding these messages would exceed our token limit
                $userTokens = $this->estimateTokenCount($userMessage['content']);
                $assistantTokens = $this->estimateTokenCount($assistantMessage['content']);
                
                if ($estimatedTokenCount + $userTokens + $assistantTokens > $maxTokens) {
                    break; // Stop adding messages if we exceed the token limit
                }
                
                $messages[] = $userMessage;
                $messages[] = $assistantMessage;
                $estimatedTokenCount += $userTokens + $assistantTokens;
            }
        }

        return $messages;
    }

    /**
     * Get optimized chat history that balances recency and relevance
     */
    private function getOptimizedChatHistory(iterable $chatHistories, int $maxTokens): array
    {
        $messages = [];
        $estimatedTokenCount = 0;
        
        // Convert to array and reverse to get newest first
        $historyArray = [];
        foreach ($chatHistories as $history) {
            $historyArray[] = $history;
        }
        $historyArray = array_reverse($historyArray);
        
        // Always include the most recent exchange (highest priority)
        if (!empty($historyArray)) {
            $mostRecent = array_shift($historyArray);
            $user = $mostRecent->getThread()->getUser();
            
            $userMessage = $this->formatUserMessage($mostRecent, $user);
            $assistantMessage = $this->formatAssistantMessage($mostRecent);
            
            $userTokens = $this->estimateTokenCount($userMessage['content']);
            $assistantTokens = $this->estimateTokenCount($assistantMessage['content']);
            
            $messages[] = $userMessage;
            $messages[] = $assistantMessage;
            $estimatedTokenCount += $userTokens + $assistantTokens;
        }
        
        // For the remaining history, alternately take from oldest and newest
        // This creates a "sandwich" pattern with newest and oldest messages,
        // while potentially skipping some in the middle
        $oldestFirst = array_reverse($historyArray); // Oldest first again
        
        $shouldTakeOldest = true; // Start with oldest for background context
        
        while (!empty($historyArray) && !empty($oldestFirst)) {
            $history = $shouldTakeOldest ? array_shift($oldestFirst) : array_shift($historyArray);
            
            // If we took from oldest, remove it from newest array too
            if ($shouldTakeOldest && in_array($history, $historyArray)) {
                $historyArray = array_filter($historyArray, fn($h) => $h->getId() !== $history->getId());
            } 
            // If we took from newest, remove it from oldest array too
            elseif (!$shouldTakeOldest && in_array($history, $oldestFirst)) {
                $oldestFirst = array_filter($oldestFirst, fn($h) => $h->getId() !== $history->getId());
            }
            
            $user = $history->getThread()->getUser();
            $userMessage = $this->formatUserMessage($history, $user);
            $assistantMessage = $this->formatAssistantMessage($history);
            
            $userTokens = $this->estimateTokenCount($userMessage['content']);
            $assistantTokens = $this->estimateTokenCount($assistantMessage['content']);
            
            // Check if adding these messages would exceed our token limit
            if ($estimatedTokenCount + $userTokens + $assistantTokens > $maxTokens) {
                break;
            }
            
            // Add messages in the correct (chronological) order
            if ($shouldTakeOldest) {
                // Insert at the beginning, but after the system message
                array_splice($messages, 1, 0, [$userMessage, $assistantMessage]);
            } else {
                // Add to the end
                $messages[] = $userMessage;
                $messages[] = $assistantMessage;
            }
            
            $estimatedTokenCount += $userTokens + $assistantTokens;
            $shouldTakeOldest = !$shouldTakeOldest; // Alternate between oldest and newest
        }
        
        // Resort messages to ensure they're in chronological order
        $systemMessage = array_shift($messages); // Remove system message
        
        // Sort pairs of messages by timestamp if available
        // This assumes even indexes are user messages and odd indexes are assistant responses
        $sortedMessages = [];
        for ($i = 0; $i < count($messages); $i += 2) {
            if (isset($messages[$i]) && isset($messages[$i+1])) {
                $sortedMessages[] = [
                    'user' => $messages[$i],
                    'assistant' => $messages[$i+1],
                    'timestamp' => $messages[$i]['timestamp'] ?? 0
                ];
            }
        }
        
        // Sort by timestamp
        usort($sortedMessages, function($a, $b) {
            return $a['timestamp'] <=> $b['timestamp'];
        });
        
        // Flatten the sorted messages back into a single array
        $result = [$systemMessage]; // Put system message back at the start
        foreach ($sortedMessages as $pair) {
            $result[] = $pair['user'];
            $result[] = $pair['assistant'];
        }
        
        return $result;
    }

    /**
     * Format a user message from chat history
     */
    private function formatUserMessage(ChatHistory $chatHistory, User $user): array
    {
        return [
            'role' => 'user',
            'content' => $chatHistory->getPrompt(),
            'name' => $user->getEmail(),
            'timestamp' => $chatHistory->getCreatedAt()->getTimestamp() ?? 0,
        ];
    }

    /**
     * Format an assistant message from chat history
     */
    private function formatAssistantMessage(ChatHistory $chatHistory): array
    {
        return [
            'role' => 'assistant',
            'content' => $chatHistory->getResponse(),
            'name' => $chatHistory->getModelId(),
            'timestamp' => $chatHistory->getCreatedAt()->getTimestamp() ?? 0,
        ];
    }

    /**
     * Get user context information with enhanced context
     */
    private function getUserContext(User $user): array
    {
        $organization = $user->getOrganization();
        $orgInfo = $organization ? sprintf('domain: %s', $organization->getDomain() ?? 'unknown') : 'no organization';
        
        // Add more user preferences and context here as needed
        $context = [
            'role' => 'system',
            'content' => sprintf(
                'You are chatting with a user (email: %s). They are part of organization %s. ' .
                'Maintain conversation continuity based on chat history. Be concise and helpful.',
                $user->getEmail(),
                $orgInfo
            ),
        ];
        
        return $context;
    }

    /**
     * Format context for specific model with optimizations
     */
    public function formatContextForModel(array $context, string $modelId): array
    {
        // Apply model-specific optimizations here
        switch ($modelId) {
            case (str_contains($modelId, 'anthropic') || str_contains($modelId, 'claude')):
                // Claude-specific formatting
                return $this->formatForClaude($context);
                
            case (str_contains($modelId, 'gpt') || str_contains($modelId, 'openai')):
                // OpenAI-specific formatting
                return $this->formatForOpenAI($context);
                
            default:
                // Generic formatting - no changes
                return $context;
        }
    }
    
    /**
     * Optimize context for Claude models
     */
    private function formatForClaude(array $context): array
    {
        // Claude handles messaging format well, so we don't need major changes
        // But we can add specific instructions if needed
        if (!empty($context) && isset($context[0]['role']) && $context[0]['role'] === 'system') {
            $context[0]['content'] .= ' Provide helpful, accurate, and concise responses.';
        }
        
        return $context;
    }
    
    /**
     * Optimize context for OpenAI models
     */
    private function formatForOpenAI(array $context): array
    {
        // OpenAI-specific optimizations
        if (!empty($context) && isset($context[0]['role']) && $context[0]['role'] === 'system') {
            $context[0]['content'] .= ' Provide helpful, accurate, and concise responses.';
        }
        
        return $context;
    }
    
    /**
     * Simple token count estimator
     * Note: This is a rough approximation - for production use,
     * consider using a proper tokenizer or API for accurate counts
     */
    private function estimateTokenCount(string $text): int
    {
        // Rough approximation: ~4 characters per token for English text
        return (int) ceil(strlen($text) / self::TOKEN_ESTIMATE_FACTOR);
    }
}