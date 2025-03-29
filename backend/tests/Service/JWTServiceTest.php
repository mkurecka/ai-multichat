<?php

namespace App\Tests\Service;

use Symfony\Bundle\FrameworkBundle\Test\KernelTestCase;
use App\Entity\User;
use App\Service\JWTService;
use Lexik\Bundle\JWTAuthenticationBundle\Services\JWTTokenManagerInterface;

class JWTServiceTest extends KernelTestCase
{
    private JWTService $jwtService;
    private JWTTokenManagerInterface $jwtManager;
    private User $testUser;

    protected function setUp(): void
    {
        self::bootKernel();
        
        $container = static::getContainer();
        $this->jwtService = $container->get(JWTService::class);
        $this->jwtManager = $container->get('lexik_jwt_authentication.jwt_manager');
        
        // Create test user
        $this->testUser = new User();
        $this->testUser->setEmail(uniqid('test_') . '@example.com');
        $this->testUser->setGoogleId(uniqid('test_google_id_'));
        $this->testUser->setRoles(['ROLE_USER']);
        $this->testUser->setName('Test User');
        
        // Persist the test user
        $entityManager = $container->get('doctrine')->getManager();
        $entityManager->persist($this->testUser);
        $entityManager->flush();
    }

    protected function tearDown(): void
    {
        if ($this->testUser) {
            $entityManager = static::getContainer()->get('doctrine')->getManager();
            $entityManager->remove($this->testUser);
            $entityManager->flush();
        }
        
        parent::tearDown();
    }

    public function testCreateToken(): void
    {
        $token = $this->jwtService->createToken($this->testUser);
        $this->assertNotNull($token);
        $this->assertIsString($token);
    }

    public function testValidateToken(): void
    {
        $token = $this->jwtService->createToken($this->testUser);
        $payload = $this->jwtService->validateToken($token);
        
        $this->assertNotNull($payload);
        $this->assertEquals($this->testUser->getEmail(), $payload['email']);
        $this->assertEquals($this->testUser->getGoogleId(), $payload['googleId']);
        $this->assertEquals($this->testUser->getRoles(), $payload['roles']);
    }

    public function testValidateInvalidToken(): void
    {
        $payload = $this->jwtService->validateToken('invalid.token.here');
        $this->assertNull($payload);
    }

    public function testValidateExpiredToken(): void
    {
        $token = $this->jwtManager->createFromPayload($this->testUser, [
            'exp' => time() - 3600,
            'email' => $this->testUser->getEmail(),
            'googleId' => $this->testUser->getGoogleId(),
            'roles' => $this->testUser->getRoles()
        ]);
        
        $payload = $this->jwtService->validateToken($token);
        $this->assertNull($payload);
    }

    public function testGetUserFromToken(): void
    {
        $token = $this->jwtService->createToken($this->testUser);
        $user = $this->jwtService->getUserFromToken($token);
        
        $this->assertNotNull($user);
        $this->assertEquals($this->testUser->getEmail(), $user->getEmail());
        $this->assertEquals($this->testUser->getGoogleId(), $user->getGoogleId());
        $this->assertEquals($this->testUser->getRoles(), $user->getRoles());
    }

    public function testRefreshToken(): void
    {
        $token = $this->jwtService->createToken($this->testUser);
        $newToken = $this->jwtService->refreshToken($token);
        
        $this->assertNotNull($newToken);
        $this->assertIsString($newToken);
        
        // Validate the new token
        $payload = $this->jwtService->validateToken($newToken);
        $this->assertNotNull($payload);
        $this->assertEquals($this->testUser->getEmail(), $payload['email']);
        $this->assertEquals($this->testUser->getGoogleId(), $payload['googleId']);
        $this->assertEquals($this->testUser->getRoles(), $payload['roles']);
    }
} 