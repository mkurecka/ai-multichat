<?php

namespace App\Tests\Service;

use App\Entity\Thread;
use App\Service\ContextService;
use App\Service\OpenRouterService;
use Doctrine\ORM\EntityManagerInterface;
use PHPUnit\Framework\TestCase;
use Psr\Log\LoggerInterface;
use Symfony\Component\EventDispatcher\EventDispatcherInterface;
use Symfony\Component\HttpClient\MockHttpClient;
use Symfony\Component\HttpClient\Response\MockResponse;
use Symfony\Component\HttpKernel\Exception\HttpException;

class OpenRouterServiceTest extends TestCase
{
    private OpenRouterService $service;
    private MockHttpClient $httpClient;
    private ContextService $contextService;
    private EntityManagerInterface $entityManager;
    private LoggerInterface $logger;
    private EventDispatcherInterface $eventDispatcher;

    protected function setUp(): void
    {
        $this->httpClient = new MockHttpClient();
        $this->contextService = $this->createMock(ContextService::class);
        $this->entityManager = $this->createMock(EntityManagerInterface::class);
        $this->logger = $this->createMock(LoggerInterface::class);
        $this->eventDispatcher = $this->createMock(EventDispatcherInterface::class);
        
        $this->service = new OpenRouterService(
            $this->httpClient,
            'test-api-key',
            $this->contextService,
            $this->entityManager,
            $this->logger,
            $this->eventDispatcher
        );
    }

    public function testGetModels(): void
    {
        $mockResponse = new MockResponse(json_encode([
            'data' => [
                [
                    'id' => 'gpt-4',
                    'name' => 'GPT-4',
                    'description' => 'OpenAI GPT-4',
                    'pricing' => [
                        'prompt' => 0.03,
                        'completion' => 0.06,
                        'unit' => '1K tokens'
                    ]
                ]
            ]
        ]));

        $this->httpClient->setResponseFactory($mockResponse);

        $models = $this->service->getModels();

        $this->assertIsArray($models);
        $this->assertCount(1, $models);
        $this->assertEquals('gpt-4', $models[0]['id']);
        $this->assertEquals('GPT-4', $models[0]['name']);
    }

    public function testGenerateResponse(): void
    {
        $mockResponse = new MockResponse(json_encode([
            'choices' => [
                [
                    'message' => [
                        'content' => 'Test response',
                        'role' => 'assistant'
                    ],
                    'usage' => [
                        'prompt_tokens' => 10,
                        'completion_tokens' => 20,
                        'total_tokens' => 30
                    ]
                ]
            ]
        ]));

        $this->httpClient->setResponseFactory($mockResponse);
        $this->contextService->expects($this->never())
            ->method('getThreadContext');

        $response = $this->service->generateResponse(
            'Test message',
            ['gpt-4']
        );

        $this->assertIsArray($response);
        $this->assertArrayHasKey('gpt-4', $response);
        $this->assertArrayHasKey('content', $response['gpt-4']);
        $this->assertArrayHasKey('usage', $response['gpt-4']);
        $this->assertEquals('Test response', $response['gpt-4']['content']);
    }

    public function testErrorHandling(): void
    {
        $mockResponse = new MockResponse('', ['http_code' => 400]);
        $this->httpClient->setResponseFactory($mockResponse);
        $this->contextService->expects($this->never())
            ->method('getThreadContext');

        $this->expectException(HttpException::class);
        $this->expectExceptionMessage('Failed to fetch models: ');
        
        $this->service->getModels();
    }
} 