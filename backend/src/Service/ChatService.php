<?php

namespace App\Service;

use App\Entity\ChatHistory;
use App\Entity\Thread;
use App\Entity\User;
use Doctrine\ORM\EntityManagerInterface;

class ChatService
{
    public function __construct(
        private EntityManagerInterface $entityManager
    ) {}

    public function getChatHistory(User $user): array
    {
        $threads = $this->entityManager->getRepository(Thread::class)
            ->findBy(['user' => $user], ['createdAt' => 'DESC']);

        return array_map(function (Thread $thread) {
            return [
                'id' => $thread->getId(),
                'title' => $thread->getTitle(),
                'threadId' => $thread->getId(),
                'messages' => $this->getThreadMessages($thread)
            ];
        }, $threads);
    }

    private function getThreadMessages(Thread $thread): array
    {
        $messages = $this->entityManager->getRepository(ChatHistory::class)
            ->findBy(['thread' => $thread], ['createdAt' => 'ASC']);

        return array_map(function (ChatHistory $chatHistory) {
            return [
                'prompt' => $chatHistory->getPrompt(),
                'responses' => $chatHistory->getResponses()
            ];
        }, $messages);
    }

    public function createThread(User $user, ?string $title = null): Thread
    {
        $thread = new Thread();
        $thread->setUser($user);
        $thread->setTitle($title ?? 'New Chat');
        $thread->setCreatedAt(new \DateTime());

        $this->entityManager->persist($thread);
        $this->entityManager->flush();

        return $thread;
    }

    public function getThread(User $user, string $threadId): ?Thread
    {
        return $this->entityManager->getRepository(Thread::class)
            ->findOneBy(['id' => $threadId, 'user' => $user]);
    }

    public function addMessage(Thread $thread, string $prompt, array $responses): ChatHistory
    {
        $chatHistory = new ChatHistory();
        $chatHistory->setThread($thread);
        $chatHistory->setPrompt($prompt);
        $chatHistory->setResponses($responses);
        $chatHistory->setCreatedAt(new \DateTime());

        $this->entityManager->persist($chatHistory);
        $this->entityManager->flush();

        return $chatHistory;
    }
} 