<?php

namespace App\Tests\Controller;

use App\Tests\ApiTestCase;
use App\Entity\Model;

class ModelControllerTest extends ApiTestCase
{
    public function testGetModels(): void
    {
        $this->client->request(
            'GET',
            '/api/models',
            [],
            [],
            ['HTTP_Authorization' => 'Bearer ' . $this->getTestToken()]
        );

        $this->assertResponseIsSuccessful();
        $response = json_decode($this->client->getResponse()->getContent(), true);
        $this->assertIsArray($response);
        $this->assertNotEmpty($response);
    }

    public function testRefreshModels(): void
    {
        $this->client->request(
            'GET',
            '/api/models/refresh',
            [],
            [],
            ['HTTP_Authorization' => 'Bearer ' . $this->getTestToken()]
        );

        $this->assertResponseIsSuccessful();
        $response = json_decode($this->client->getResponse()->getContent(), true);
        $this->assertIsArray($response);
        $this->assertNotEmpty($response);
    }

    public function testGetModelDetails(): void
    {
        $this->client->request(
            'GET',
            '/api/models/gpt-4',
            [],
            [],
            ['HTTP_Authorization' => 'Bearer ' . $this->getTestToken()]
        );

        $this->assertResponseIsSuccessful();
        $response = json_decode($this->client->getResponse()->getContent(), true);
        $this->assertIsArray($response);
        $this->assertArrayHasKey('id', $response);
        $this->assertArrayHasKey('name', $response);
        $this->assertArrayHasKey('description', $response);
    }

    public function testGetNonExistentModel(): void
    {
        $this->client->request(
            'GET',
            '/api/models/non-existent-model',
            [],
            [],
            ['HTTP_Authorization' => 'Bearer ' . $this->getTestToken()]
        );

        $this->assertResponseStatusCodeSame(404);
    }

    public function testUnauthorizedAccess(): void
    {
        $this->client->request('GET', '/api/models');
        $this->assertResponseStatusCodeSame(401);
    }

    public function testInvalidModelData(): void
    {
        $this->client->request(
            'GET',
            '/api/models/refresh',
            ['invalid' => 'data'],
            [],
            ['HTTP_Authorization' => 'Bearer ' . $this->getTestToken()]
        );

        $this->assertResponseStatusCodeSame(400);
    }

    protected function getTestToken(): string
    {
        return $this->jwtService->createToken($this->testUser);
    }
} 