<?php

namespace App\Tests\Controller;

use App\Tests\ApiTestCase;
use Symfony\Component\HttpFoundation\Response;

class SecurityControllerTest extends ApiTestCase
{
    protected function setUp(): void
    {
        // Don't call self::bootKernel() here
        // Let the parent setUp() handle the client creation
        parent::setUp();
    }

    public function testLoginWithGoogle(): void
    {
        $this->client->request('GET', '/login');
        $this->assertResponseRedirects();
    }

    public function testLoginCallback(): void
    {
        $this->client->request('GET', '/login', ['code' => 'test_code']);
        $this->assertResponseRedirects();
    }

    public function testRefreshToken(): void
    {
        $this->client->request(
            'POST',
            '/api/token/refresh',
            [],
            [],
            ['HTTP_Authorization' => 'Bearer ' . $this->getTestToken()]
        );

        $this->assertResponseIsSuccessful();
        $response = json_decode($this->client->getResponse()->getContent(), true);
        $this->assertArrayHasKey('token', $response);
    }

    public function testLogout(): void
    {
        $this->client->request(
            'POST',
            '/api/logout',
            [],
            [],
            ['HTTP_Authorization' => 'Bearer ' . $this->getTestToken()]
        );

        $this->assertResponseIsSuccessful();
    }

    public function testGetUserProfile(): void
    {
        $this->client->request(
            'GET',
            '/api/user/profile',
            [],
            [],
            ['HTTP_Authorization' => 'Bearer ' . $this->getTestToken()]
        );

        $this->assertResponseIsSuccessful();
        $response = json_decode($this->client->getResponse()->getContent(), true);
        $this->assertArrayHasKey('email', $response);
        $this->assertArrayHasKey('name', $response);
        $this->assertArrayHasKey('roles', $response);
    }

    public function testUnauthorizedAccess(): void
    {
        $this->client->request('GET', '/api/user/profile');
        $this->assertResponseStatusCodeSame(401);
    }

    public function testInvalidToken(): void
    {
        $this->client->request(
            'GET',
            '/api/user/profile',
            [],
            [],
            ['HTTP_Authorization' => 'Bearer invalid_token']
        );

        $this->assertResponseStatusCodeSame(401);
    }

    protected function getTestToken(): string
    {
        return $this->jwtService->createToken($this->testUser);
    }
}