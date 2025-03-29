<?php

namespace App\Tests;

use App\Entity\User;
use Doctrine\ORM\EntityManagerInterface;
use Symfony\Bundle\FrameworkBundle\KernelBrowser;
use Symfony\Bundle\FrameworkBundle\Test\WebTestCase;
use Symfony\Component\Uid\Uuid;

abstract class ApiTestCase extends WebTestCase
{
    protected KernelBrowser $client;
    protected ?EntityManagerInterface $entityManager = null;
    protected ?User $testUser = null;

    protected function setUp(): void
    {
        $this->client = static::createClient();
        $this->entityManager = static::getContainer()->get('doctrine')->getManager();
        $this->testUser = $this->createTestUser();
        
        // Set up authorization header with JWT token
        $this->client->setServerParameter('HTTP_Authorization', 'Bearer ' . $this->getTestToken());
    }

    protected function tearDown(): void
    {
        if ($this->testUser) {
            $this->entityManager->remove($this->testUser);
            $this->entityManager->flush();
        }
        
        $this->entityManager->close();
        $this->entityManager = null;
        parent::tearDown();
    }

    protected function createTestUser(): User
    {
        $user = new User();
        $user->setEmail(uniqid('test_') . '@example.com');
        $user->setGoogleId(uniqid('test_google_id_'));
        $user->setRoles(['ROLE_USER']);
        
        $this->entityManager->persist($user);
        $this->entityManager->flush();
        
        return $user;
    }

    protected function getTestToken(): string
    {
        $jwtService = static::getContainer()->get('App\Service\JWTService');
        return $jwtService->createToken($this->testUser);
    }

    protected function createTestThread(string $title = 'Test Thread'): array
    {
        $threadId = Uuid::v4()->toRfc4122();
        
        $this->client->request('POST', '/api/chat/thread', [], [], [
            'CONTENT_TYPE' => 'application/json'
        ], json_encode([
            'title' => $title,
            'threadId' => $threadId
        ]));
        
        return [
            'threadId' => $threadId,
            'title' => $title
        ];
    }
} 