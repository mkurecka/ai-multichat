<?php

namespace App\Tests\Controller;

use App\Tests\ApiTestCase;
use App\Entity\Thread;
use App\Entity\ChatHistory;

class ChatControllerTest extends ApiTestCase
{
    public function testCreateThread(): void
    {
        $threadId = $this->createTestThread();
        $this->assertNotEmpty($threadId);
    }

    public function testGetThreadHistory(): void
    {
        $threadId = $this->createTestThread();

        $this->client->request(
            'GET',
            '/api/chat/thread/' . $threadId,
            [],
            [],
            ['HTTP_Authorization' => 'Bearer ' . $this->getTestToken()]
        );

        $this->assertResponseIsSuccessful();
        $response = json_decode($this->client->getResponse()->getContent(), true);
        $this->assertArrayHasKey('messages', $response);
        $this->assertIsArray($response['messages']);
    }

    public function testSendMessage(): void
    {
        $threadId = $this->createTestThread();

        $this->client->request(
            'POST',
            '/api/chat/thread/' . $threadId . '/message',
            [],
            [],
            ['HTTP_Authorization' => 'Bearer ' . $this->getTestToken()],
            json_encode(['message' => 'Test message'])
        );

        $this->assertResponseIsSuccessful();
        $response = json_decode($this->client->getResponse()->getContent(), true);
        $this->assertArrayHasKey('message', $response);
        $this->assertArrayHasKey('role', $response['message']);
        $this->assertArrayHasKey('content', $response['message']);
    }

    public function testGetChatHistory(): void
    {
        $threadId = $this->createTestThread();

        $this->client->request(
            'GET',
            '/api/chat/history',
            [],
            [],
            ['HTTP_Authorization' => 'Bearer ' . $this->getTestToken()]
        );

        $this->assertResponseIsSuccessful();
        $response = json_decode($this->client->getResponse()->getContent(), true);
        $this->assertIsArray($response);
    }

    public function testUnauthorizedAccess(): void
    {
        $this->client->request('GET', '/api/chat/history');
        $this->assertResponseStatusCodeSame(401);
    }

    public function testInvalidThreadAccess(): void
    {
        $this->client->request(
            'GET',
            '/api/chat/thread/invalid-thread-id',
            [],
            [],
            ['HTTP_Authorization' => 'Bearer ' . $this->getTestToken()]
        );

        $this->assertResponseStatusCodeSame(404);
    }

    public function testInvalidMessageRequest(): void
    {
        $threadId = $this->createTestThread();

        $this->client->request(
            'POST',
            '/api/chat/thread/' . $threadId . '/message',
            [],
            [],
            ['HTTP_Authorization' => 'Bearer ' . $this->getTestToken()],
            json_encode(['invalid' => 'data'])
        );

        $this->assertResponseStatusCodeSame(400);
    }

    public function testConcurrentMessageSending(): void
    {
        $threadId = $this->createTestThread();
        $promises = [];

        for ($i = 0; $i < 3; $i++) {
            $promises[] = $this->client->requestAsync(
                'POST',
                '/api/chat/thread/' . $threadId . '/message',
                [],
                [],
                ['HTTP_Authorization' => 'Bearer ' . $this->getTestToken()],
                json_encode(['message' => 'Test message ' . $i])
            );
        }

        foreach ($promises as $promise) {
            $response = $promise->wait();
            $this->assertEquals(200, $response->getStatusCode());
        }
    }

    public function testMessageStreaming(): void
    {
        $threadId = $this->createTestThread();

        $this->client->request(
            'POST',
            '/api/chat/thread/' . $threadId . '/message',
            [],
            [],
            ['HTTP_Authorization' => 'Bearer ' . $this->getTestToken()],
            json_encode([
                'message' => 'Test streaming message',
                'stream' => true
            ])
        );

        $this->assertResponseIsSuccessful();
        $this->assertResponseHeaderSame('Content-Type', 'text/event-stream');
    }

    public function testContextHandling(): void
    {
        $threadId = $this->createTestThread();

        // Send initial message
        $this->client->request(
            'POST',
            '/api/chat/thread/' . $threadId . '/message',
            [],
            [],
            ['HTTP_Authorization' => 'Bearer ' . $this->getTestToken()],
            json_encode(['message' => 'Initial context message'])
        );

        // Send follow-up message that should use context
        $this->client->request(
            'POST',
            '/api/chat/thread/' . $threadId . '/message',
            [],
            [],
            ['HTTP_Authorization' => 'Bearer ' . $this->getTestToken()],
            json_encode(['message' => 'Follow-up message'])
        );

        $this->assertResponseIsSuccessful();
        $response = json_decode($this->client->getResponse()->getContent(), true);
        $this->assertArrayHasKey('message', $response);
        $this->assertArrayHasKey('context', $response);
    }

    public function testMessageErrorHandling(): void
    {
        $threadId = $this->createTestThread();

        // Test with invalid model
        $this->client->request(
            'POST',
            '/api/chat/thread/' . $threadId . '/message',
            [],
            [],
            ['HTTP_Authorization' => 'Bearer ' . $this->getTestToken()],
            json_encode([
                'message' => 'Test message',
                'models' => ['invalid-model']
            ])
        );

        $this->assertResponseStatusCodeSame(400);

        // Test with empty message
        $this->client->request(
            'POST',
            '/api/chat/thread/' . $threadId . '/message',
            [],
            [],
            ['HTTP_Authorization' => 'Bearer ' . $this->getTestToken()],
            json_encode(['message' => ''])
        );

        $this->assertResponseStatusCodeSame(400);
    }

    protected function getTestToken(): string
    {
        return $this->jwtService->createToken($this->testUser);
    }
} 