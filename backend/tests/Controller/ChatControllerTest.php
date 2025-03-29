<?php

namespace App\Tests\Controller;

use App\Tests\ApiTestCase;
use Symfony\Component\HttpFoundation\Response;

class ChatControllerTest extends ApiTestCase
{
    public function testCreateThread(): void
    {
        $this->client->request('POST', '/api/chat/thread', [], [], [
            'CONTENT_TYPE' => 'application/json',
        ], json_encode([
            'title' => 'Test Thread'
        ]));

        $this->assertResponseIsSuccessful();
        $this->assertResponseHeaderSame('Content-Type', 'application/json');
        
        $response = json_decode($this->client->getResponse()->getContent(), true);
        $this->assertArrayHasKey('threadId', $response);
        $this->assertArrayHasKey('title', $response);
        $this->assertEquals('Test Thread', $response['title']);
    }

    public function testSendMessage(): void
    {
        $thread = $this->createTestThread();
        
        $this->client->request('POST', '/api/chat', [], [], [
            'CONTENT_TYPE' => 'application/json',
        ], json_encode([
            'threadId' => $thread['threadId'],
            'message' => 'Test message',
            'models' => ['gpt-4', 'claude-3-opus-20240229']
        ]));

        $this->assertResponseIsSuccessful();
        $this->assertResponseHeaderSame('Content-Type', 'application/json');
        
        $response = json_decode($this->client->getResponse()->getContent(), true);
        $this->assertArrayHasKey('responses', $response);
        $this->assertCount(2, $response['responses']);
    }

    public function testGetThreadHistory(): void
    {
        $thread = $this->createTestThread();
        
        $this->client->request('GET', '/api/chat/thread/' . $thread['threadId']);

        $this->assertResponseIsSuccessful();
        $this->assertResponseHeaderSame('Content-Type', 'application/json');
        
        $response = json_decode($this->client->getResponse()->getContent(), true);
        $this->assertArrayHasKey('messages', $response);
        $this->assertIsArray($response['messages']);
    }

    public function testUnauthorizedAccess(): void
    {
        // Remove authorization header for this test
        $this->client->setServerParameter('HTTP_Authorization', '');
        
        $this->client->request('GET', '/api/chat/thread/1');
        $this->assertResponseStatusCodeSame(Response::HTTP_UNAUTHORIZED);
    }
} 