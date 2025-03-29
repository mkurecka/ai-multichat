<?php

namespace App\Tests\Service;

use App\Service\ContextService;
use App\Service\OpenRouterService;
use App\Tests\KernelApiTestCase;
use Psr\Log\LoggerInterface;
use Symfony\Component\EventDispatcher\EventDispatcherInterface;
use Symfony\Component\HttpClient\MockHttpClient;
use Symfony\Component\HttpClient\Response\MockResponse;
use Symfony\Component\HttpKernel\Exception\HttpException;

class OpenRouterServiceTest extends KernelApiTestCase
{
    private OpenRouterService $service;
    private MockHttpClient $httpClient;
    private ContextService $contextService;
    private LoggerInterface $logger;
    private EventDispatcherInterface $eventDispatcher;

    protected function setUp(): void
    {
        parent::setUp();
        
        $this->httpClient = new MockHttpClient();
        $this->contextService = $this->createMock(ContextService::class);
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

    public function testSendMessage(): void
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

        $httpClient = new MockHttpClient($mockResponse);
        $this->service->setHttpClient($httpClient);

        $response = $this->service->sendMessage(
            'Test message',
            ['gpt-4']
        );

        $this->assertEquals('Test response', $response['content']);
        $this->assertEquals('assistant', $response['role']);
        $this->assertArrayHasKey('usage', $response);
        $this->assertArrayHasKey('prompt_tokens', $response['usage']);
        $this->assertArrayHasKey('completion_tokens', $response['usage']);
        $this->assertArrayHasKey('total_tokens', $response['usage']);
    }

    public function testSendMessageWithContext(): void
    {
        $mockResponse = new MockResponse(json_encode([
            'choices' => [
                [
                    'message' => [
                        'content' => 'Test response with context',
                        'role' => 'assistant'
                    ],
                    'usage' => [
                        'prompt_tokens' => 15,
                        'completion_tokens' => 25,
                        'total_tokens' => 40
                    ]
                ]
            ]
        ]));

        $httpClient = new MockHttpClient($mockResponse);
        $this->service->setHttpClient($httpClient);

        $context = [
            ['role' => 'user', 'content' => 'Previous message'],
            ['role' => 'assistant', 'content' => 'Previous response']
        ];

        $response = $this->service->sendMessage(
            'Test message',
            ['gpt-4'],
            $context
        );

        $this->assertEquals('Test response with context', $response['content']);
        $this->assertEquals('assistant', $response['role']);
        $this->assertArrayHasKey('usage', $response);
        $this->assertArrayHasKey('prompt_tokens', $response['usage']);
        $this->assertArrayHasKey('completion_tokens', $response['usage']);
        $this->assertArrayHasKey('total_tokens', $response['usage']);
    }

    public function testHandleError(): void
    {
        $mockResponse = new MockResponse('', ['http_code' => 500]);
        $this->httpClient->setResponseFactory($mockResponse);

        $this->expectException(\Exception::class);
        $this->service->sendMessage('Test message', ['gpt-4']);
    }

    public function testHandleInvalidResponse(): void
    {
        $mockResponse = new MockResponse('invalid json');
        $this->httpClient->setResponseFactory($mockResponse);

        $this->expectException(\Exception::class);
        $this->service->sendMessage('Test message', ['gpt-4']);
    }

    public function testHandleMissingChoices(): void
    {
        $mockResponse = new MockResponse(json_encode([
            'data' => []
        ]));

        $this->httpClient->setResponseFactory($mockResponse);

        $this->expectException(\Exception::class);
        $this->service->sendMessage('Test message', ['gpt-4']);
    }

    public function testHandleMissingMessage(): void
    {
        $mockResponse = new MockResponse(json_encode([
            'choices' => [
                [
                    'usage' => [
                        'prompt_tokens' => 10,
                        'completion_tokens' => 20,
                        'total_tokens' => 30
                    ]
                ]
            ]
        ]));

        $this->httpClient->setResponseFactory($mockResponse);

        $this->expectException(\Exception::class);
        $this->service->sendMessage('Test message', ['gpt-4']);
    }

    public function testRateLimiting(): void
    {
        $mockResponse = new MockResponse('', [
            'http_code' => 429,
            'response_headers' => [
                'X-RateLimit-Limit' => '100',
                'X-RateLimit-Remaining' => '0',
                'X-RateLimit-Reset' => time() + 60
            ]
        ]);

        $this->httpClient->setResponseFactory($mockResponse);

        $this->expectException(HttpException::class);
        $this->expectExceptionMessage('Rate limit exceeded');
        
        $this->service->sendMessage('Test message', ['gpt-4']);
    }

    public function testTokenUsageTracking(): void
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

        $response = $this->service->sendMessage('Test message', ['gpt-4']);

        $this->assertArrayHasKey('usage', $response);
        $this->assertEquals(10, $response['usage']['prompt_tokens']);
        $this->assertEquals(20, $response['usage']['completion_tokens']);
        $this->assertEquals(30, $response['usage']['total_tokens']);
    }

    public function testModelSpecificParameters(): void
    {
        $mockResponse = new MockResponse(json_encode([
            'choices' => [
                [
                    'message' => [
                        'content' => 'Test response with parameters',
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

        $parameters = [
            'temperature' => 0.7,
            'max_tokens' => 1000,
            'top_p' => 0.9,
            'frequency_penalty' => 0.5,
            'presence_penalty' => 0.5
        ];

        $response = $this->service->sendMessage(
            'Test message',
            ['gpt-4'],
            [],
            $parameters
        );

        $this->assertArrayHasKey('message', $response);
        $this->assertEquals('Test response with parameters', $response['message']['content']);
    }

    public function testInvalidModelParameters(): void
    {
        $this->expectException(\InvalidArgumentException::class);
        
        $parameters = [
            'invalid_parameter' => 'value'
        ];

        $this->service->sendMessage(
            'Test message',
            ['gpt-4'],
            [],
            $parameters
        );
    }
} 