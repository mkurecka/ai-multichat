<?php

namespace App\Tests\Controller;

use App\Entity\Thread;
use App\Entity\User;
use App\Repository\ThreadRepository;
use App\Repository\UserRepository;
use Symfony\Bundle\FrameworkBundle\Test\WebTestCase;
use Symfony\Component\HttpFoundation\Response;

class ChatControllerTest extends WebTestCase
{
    private $client;
    
    protected function setUp(): void
    {
        $this->client = static::createClient();
        
        // Mock authentication if needed
        // This is a simplified example - you'll need to adapt this to your auth system
        $this->mockUserAuthentication();
    }
    
    private function mockUserAuthentication(): void
    {
        // Get the user repository
        $userRepository = static::getContainer()->get(UserRepository::class);
        
        // Retrieve a test user (you might need to create one in your test database)
        // This assumes you have a user with this email in your test database
        $testUser = $userRepository->findOneBy(['email' => 'user@test.local']);
        
        // If no test user exists, you might want to create one
        if (!$testUser) {
            // You could create a user here or skip the test
            $this->markTestSkipped('No test user available');
        }
        
        // Log in the user
        $this->client->loginUser($testUser);
    }
    
    public function testGetThreads(): void
    {
        // Make a request to the endpoint
        $this->client->request('GET', '/chat/threads');
        
        // Assert that the response is successful
        $this->assertEquals(Response::HTTP_OK, $this->client->getResponse()->getStatusCode());
        
        // Assert that the response is JSON
        $this->assertTrue(
            $this->client->getResponse()->headers->contains(
                'Content-Type',
                'application/json'
            )
        );
        
        // Decode the JSON response
        $responseData = json_decode($this->client->getResponse()->getContent(), true);
        
        // Assert that the response contains the expected structure
        $this->assertIsArray($responseData);
        
        // If there are threads, check the structure of the first one
        if (count($responseData) > 0) {
            $this->assertArrayHasKey('id', $responseData[0]);
            $this->assertArrayHasKey('title', $responseData[0]);
            $this->assertArrayHasKey('threadId', $responseData[0]);
        }
    }
    
    public function testCreateThread(): void
    {
        // Prepare the request data
        $data = [
            'title' => 'Test Thread ' . uniqid(),
        ];
        
        // Make a POST request to create a thread
        $this->client->request(
            'POST',
            '/chat/thread',
            [],
            [],
            ['CONTENT_TYPE' => 'application/json'],
            json_encode($data)
        );
        
        // Assert that the response is successful
        $this->assertEquals(Response::HTTP_CREATED, $this->client->getResponse()->getStatusCode());
        
        // Decode the JSON response
        $responseData = json_decode($this->client->getResponse()->getContent(), true);
        
        // Assert that the response contains the expected data
        $this->assertArrayHasKey('id', $responseData);
        $this->assertArrayHasKey('title', $responseData);
        $this->assertArrayHasKey('threadId', $responseData);
        $this->assertEquals($data['title'], $responseData['title']);
        
        // Verify that the thread was actually created in the database
        $threadRepository = static::getContainer()->get(ThreadRepository::class);
        $thread = $threadRepository->findOneBy(['threadId' => $responseData['threadId']]);
        
        $this->assertNotNull($thread);
        $this->assertEquals($data['title'], $thread->getTitle());
    }
    
    public function testSendChatMessage(): void
    {
        // First, create a thread to use for the test
        $threadRepository = static::getContainer()->get(ThreadRepository::class);
        $userRepository = static::getContainer()->get(UserRepository::class);
        
        $user = $userRepository->findOneBy(['email' => 'user@test.local']);
        
        // Create a thread directly in the database
        $thread = new Thread();
        $thread->setTitle('Test Thread for Message');
        $thread->setUser($user);
        $thread->setThreadId('test_thread_' . uniqid());
        
        $entityManager = static::getContainer()->get('doctrine.orm.entity_manager');
        $entityManager->persist($thread);
        $entityManager->flush();
        
        // Prepare the message data
        $messageData = [
            'prompt' => 'This is a test message',
            'threadId' => $thread->getThreadId(),
            'modelId' => 'test-model', // Use a valid model ID from your test database
        ];
        
        // Make a POST request to send a message
        $this->client->request(
            'POST',
            '/chat/message',
            [],
            [],
            ['CONTENT_TYPE' => 'application/json'],
            json_encode($messageData)
        );
        
        // This test might need to be adjusted based on your actual implementation
        // If your endpoint returns a streaming response or has other behavior,
        // you'll need to adapt the assertions accordingly
        
        // For now, just check that the response is successful
        $this->assertTrue(
            $this->client->getResponse()->isSuccessful(),
            'Request failed: ' . $this->client->getResponse()->getContent()
        );
    }
    
    // Add more test methods for other controller endpoints
}
