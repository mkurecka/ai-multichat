<?php

namespace App\Tests\Repository;

use App\Entity\ChatHistory;
use App\Entity\Thread;
use App\Entity\User;
use App\Repository\ChatHistoryRepository;
use App\Repository\ThreadRepository;
use App\Repository\UserRepository;
use Doctrine\ORM\EntityManagerInterface;
use Symfony\Bundle\FrameworkBundle\Test\KernelTestCase;

class ChatHistoryRepositoryTest extends KernelTestCase
{
    private $entityManager;
    private $chatHistoryRepository;
    private $threadRepository;
    private $userRepository;

    protected function setUp(): void
    {
        $kernel = self::bootKernel();

        $this->entityManager = $kernel->getContainer()
            ->get('doctrine')
            ->getManager();

        $this->chatHistoryRepository = $this->entityManager->getRepository(ChatHistory::class);
        $this->threadRepository = $this->entityManager->getRepository(Thread::class);
        $this->userRepository = $this->entityManager->getRepository(User::class);
    }

    public function testFindByThreadId(): void
    {
        // Start a transaction to isolate this test
        $this->entityManager->beginTransaction();

        try {
            // Get a test user
            $user = $this->userRepository->findOneBy(['email' => 'user@test.local']);

            if (!$user) {
                $this->markTestSkipped('No test user available');
            }

            // Create a thread with TEST_ prefix to identify test data
            $thread = $this->createThread($user, 'TEST_Thread_');

            // Create chat history entries
            $chatHistory1 = $this->createChatHistory($thread, 'TEST_message_1');
            $chatHistory2 = $this->createChatHistory($thread, 'TEST_message_2');

            // Find chat history by thread
            $chatHistories = $this->chatHistoryRepository->findBy(['thread' => $thread], ['createdAt' => 'ASC']);

            // Assert that both chat history entries are found
            $this->assertCount(2, $chatHistories);
        } finally {
            // Roll back the transaction to clean up, regardless of test result
            $this->entityManager->rollback();
        }
    }

    public function testCountByUser(): void
    {
        // Start a transaction to isolate this test
        $this->entityManager->beginTransaction();

        try {
            // Get a test user
            $user = $this->userRepository->findOneBy(['email' => 'user@test.local']);

            if (!$user) {
                $this->markTestSkipped('No test user available');
            }

            // Get the initial count using the custom repository method
            $initialCount = $this->chatHistoryRepository->countByUser($user);

            // Create a thread with TEST_ prefix
            $thread = $this->createThread($user, 'TEST_Thread_');

            // Create a chat history entry
            $chatHistory = $this->createChatHistory($thread, 'TEST_message');

            // Get the count after adding a chat history entry
            $newCount = $this->chatHistoryRepository->countByUser($user);

            // Assert that the count increased by 1
            $this->assertEquals($initialCount + 1, $newCount);
        } finally {
            // Roll back the transaction to clean up
            $this->entityManager->rollback();
        }
    }

    private function createThread(User $user, string $prefix = 'Test_Thread_'): Thread
    {
        $thread = new Thread();
        $thread->setTitle($prefix . uniqid());
        $thread->setUser($user);
        $thread->setThreadId($prefix . 'thread_' . uniqid());

        $this->entityManager->persist($thread);
        $this->entityManager->flush();

        return $thread;
    }

    private function createChatHistory(Thread $thread, string $prompt): ChatHistory
    {
        $chatHistory = new ChatHistory();
        $chatHistory->setThread($thread);
        $chatHistory->setPrompt($prompt);
        $chatHistory->setPromptId('prompt_' . uniqid());
        $chatHistory->setResponse(['content' => 'Test response']);
        $chatHistory->setModelId('test-model');

        $this->entityManager->persist($chatHistory);
        $this->entityManager->flush();

        return $chatHistory;
    }

    protected function tearDown(): void
    {
        // Make sure any active transaction is rolled back
        if ($this->entityManager->getConnection()->isTransactionActive()) {
            $this->entityManager->rollback();
        }

        parent::tearDown();

        // Close the entity manager to avoid memory leaks
        $this->entityManager->close();
        $this->entityManager = null;
    }
}
