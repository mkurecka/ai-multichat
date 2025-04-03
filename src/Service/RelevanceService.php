<?php

namespace App\Service;

use App\Entity\Thread;
use App\Entity\ChatHistory;

class RelevanceService
{
    private const RECENCY_WEIGHT = 0.5; // Weight for recency scoring
    private const KEYWORD_WEIGHT = 0.3; // Weight for keyword matching
    private const INTERACTION_WEIGHT = 0.2; // Weight for interaction patterns
    
    /**
     * Score message relevance based on current prompt
     */
    public function scoreMessageRelevance(string $currentPrompt, array $chatHistories): array
    {
        $scores = [];
        $currentKeywords = $this->extractKeywords($currentPrompt);
        $totalMessages = count($chatHistories);
        
        foreach ($chatHistories as $index => $chatHistory) {
            $messageId = $chatHistory->getId();
            
            // Calculate recency score (newer messages get higher scores)
            $recencyScore = ($index + 1) / $totalMessages;
            
            // Calculate keyword match score
            $promptKeywords = $this->extractKeywords($chatHistory->getPrompt());
            $responseKeywords = $this->extractKeywords($chatHistory->getResponse());
            $allHistoryKeywords = array_merge($promptKeywords, $responseKeywords);
            
            $keywordMatchScore = $this->calculateKeywordMatchScore($currentKeywords, $allHistoryKeywords);
            
            // Calculate interaction pattern score
            // This could identify if the message is part of an important workflow or sequence
            $interactionScore = $this->calculateInteractionScore($chatHistory, $currentPrompt);
            
            // Calculate final weighted score
            $finalScore = 
                (self::RECENCY_WEIGHT * $recencyScore) +
                (self::KEYWORD_WEIGHT * $keywordMatchScore) +
                (self::INTERACTION_WEIGHT * $interactionScore);
                
            $scores[$messageId] = [
                'message' => $chatHistory,
                'score' => $finalScore,
                'components' => [
                    'recency' => $recencyScore,
                    'keyword_match' => $keywordMatchScore,
                    'interaction' => $interactionScore
                ]
            ];
        }
        
        // Sort by score (highest first)
        uasort($scores, function($a, $b) {
            return $b['score'] <=> $a['score'];
        });
        
        return $scores;
    }
    
    /**
     * Extract keywords from text
     */
    private function extractKeywords(string $text): array
    {
        // Convert to lowercase
        $text = strtolower($text);
        
        // Remove common punctuation
        $text = preg_replace('/[^\w\s]/', ' ', $text);
        
        // Split into words
        $words = preg_split('/\s+/', $text);
        
        // Remove stopwords (common words with little semantic value)
        $stopwords = ['the', 'and', 'a', 'to', 'of', 'in', 'is', 'that', 'it', 'with', 'as', 'for', 'on', 'was', 'be', 'at'];
        $words = array_diff($words, $stopwords);
        
        // Remove empty strings
        $words = array_filter($words, function($word) {
            return !empty($word) && strlen($word) > 1;
        });
        
        // Return unique keywords
        return array_values(array_unique($words));
    }
    
    /**
     * Calculate the keyword match score
     */
    private function calculateKeywordMatchScore(array $currentKeywords, array $historyKeywords): float
    {
        if (empty($currentKeywords) || empty($historyKeywords)) {
            return 0.0;
        }
        
        // Count matching keywords
        $matchingKeywords = array_intersect($currentKeywords, $historyKeywords);
        $matchCount = count($matchingKeywords);
        
        // Calculate Jaccard similarity (intersection over union)
        $unionCount = count(array_unique(array_merge($currentKeywords, $historyKeywords)));
        
        if ($unionCount === 0) {
            return 0.0;
        }
        
        return $matchCount / $unionCount;
    }
    
    /**
     * Calculate interaction pattern score
     */
    private function calculateInteractionScore(ChatHistory $chatHistory, string $currentPrompt): float
    {
        $score = 0.0;
        
        // Check for question-answer patterns
        if (strpos($chatHistory->getPrompt(), '?') !== false && 
            (strpos($currentPrompt, '?') !== false || 
             strtolower(substr($currentPrompt, 0, 3)) === 'why' ||
             strtolower(substr($currentPrompt, 0, 3)) === 'how')) {
            $score += 0.3;
        }
        
        // Check for continuation patterns
        $continuationPhrases = ['continue', 'go on', 'tell me more', 'next', 'and then'];
        foreach ($continuationPhrases as $phrase) {
            if (stripos($currentPrompt, $phrase) !== false) {
                $score += 0.2;
                break;
            }
        }
        
        // Check for reference to previous content
        $referenceIndicators = ['you said', 'earlier', 'previous', 'before', 'last time'];
        foreach ($referenceIndicators as $indicator) {
            if (stripos($currentPrompt, $indicator) !== false) {
                $score += 0.4;
                break;
            }
        }
        
        // Cap at 1.0
        return min(1.0, $score);
    }
    
    /**
     * Get most relevant messages for context
     */
    public function getMostRelevantMessages(string $currentPrompt, Thread $thread, int $maxMessages = 5): array
    {
        $chatHistories = $thread->getChatHistories();
        $scores = $this->scoreMessageRelevance($currentPrompt, $chatHistories);
        
        // Get top N scored messages
        $relevantMessages = array_slice($scores, 0, $maxMessages, true);
        
        // Extract just the message objects
        $messages = [];
        foreach ($relevantMessages as $data) {
            $messages[] = $data['message'];
        }
        
        return $messages;
    }
}