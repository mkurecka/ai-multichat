<?php

namespace App\Service;

use App\Entity\Thread;
use App\Entity\ChatHistory;
use App\Entity\ThreadSummary;
use Doctrine\ORM\EntityManagerInterface;

class ContextCompressorService
{
    private const SUMMARY_THRESHOLD = 20; // Number of messages before creating a summary
    private const MAX_SUMMARY_AGE = 86400; // 24 hours in seconds
    
    public function __construct(
        private readonly EntityManagerInterface $entityManager,
        private readonly OpenRouterService $openRouterService
    ) {
    }
    
    /**
     * Check if a thread needs compression and compress if necessary
     */
    public function compressThreadIfNeeded(Thread $thread): bool
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
    public function compressThread(Thread $thread): bool
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
            $conversationText .= "User: " . $chatHistory->getPrompt() . "\n";
            $conversationText .= "Assistant: " . $chatHistory->getResponse() . "\n\n";
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
        // We'll use a specific summarization model if available, or default to a general model
        try {
            $models = ['anthropic/claude-3-haiku-20240307']; // Use a fast model for summarization
            $response = $this->openRouterService->generateResponse($prompt, $models);
            
            if (isset($response[$models[0]]['content'])) {
                return $response[$models[0]]['content'];
            }
        } catch (\Exception $e) {
            // Log the error but continue
            error_log('Error generating conversation summary: ' . $e->getMessage());
        }
        
        return null;
    }
    
    /**
     * Get compressed context for a thread
     */
    public function getCompressedContext(Thread $thread): array
    {
        $messages = [];
        
        // Add user context
        $user = $thread->getUser();
        $userContext = [
            'role' => 'system',
            'content' => sprintf(
                'You are chatting with a user (email: %s). They are part of organization %s.',
                $user->getEmail(),
                $user->getOrganization() ? $user->getOrganization()->getDomain() : 'no organization'
            ),
        ];
        $messages[] = $userContext;
        
        // Add summary if available
        $summary = $thread->getLatestSummary();
        if ($summary) {
            $summaryMessage = [
                'role' => 'system',
                'content' => "PREVIOUS CONVERSATION SUMMARY:\n" . $summary->getSummary() . "\n\nPlease continue the conversation based on this context."
            ];
            $messages[] = $summaryMessage;
        }
        
        // Add recent messages
        $recentMessages = array_slice($thread->getChatHistories()->toArray(), -5);
        foreach ($recentMessages as $chatHistory) {
            $messages[] = [
                'role' => 'user',
                'content' => $chatHistory->getPrompt(),
                'name' => $user->getEmail(),
            ];
            
            $messages[] = [
                'role' => 'assistant',
                'content' => $chatHistory->getResponse(),
                'name' => $chatHistory->getModelId(),
            ];
        }
        
        return $messages;
    }
}