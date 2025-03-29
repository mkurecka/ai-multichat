<?php

namespace App\Tests;

use App\Entity\User;
use App\Entity\Thread;
use App\Service\JWTService;
use Doctrine\ORM\EntityManagerInterface;
use Lexik\Bundle\JWTAuthenticationBundle\Services\JWTTokenManagerInterface;
use Symfony\Bundle\FrameworkBundle\KernelBrowser;
use Symfony\Bundle\FrameworkBundle\Test\WebTestCase;
use Symfony\Component\DependencyInjection\ContainerInterface;
use Symfony\Component\HttpKernel\KernelInterface;

class ApiTestCase extends WebTestCase
{
    protected static ?KernelInterface $kernel = null;
    protected ?KernelBrowser $client = null;
    protected ?EntityManagerInterface $entityManager = null;
    protected ?User $testUser = null;
    protected ?JWTService $jwtService = null;

    protected static function bootKernel(array $options = []): KernelInterface
    {
        if (null === static::$kernel) {
            static::$kernel = parent::bootKernel($options);
        }
        return static::$kernel;
    }

    protected function setUp(): void
    {
        parent::setUp();
        $this->client = static::createClient();
        $container = $this->client->getContainer();
        
        $this->entityManager = $container->get('doctrine')->getManager();
        $this->jwtService = $container->get(JWTService::class);

        // Create test user with unique email
        $this->testUser = new User();
        $this->testUser->setEmail(uniqid('test_') . '@example.com');
        $this->testUser->setGoogleId('test_google_id_' . uniqid());
        $this->testUser->setRoles(['ROLE_USER']);
        $this->testUser->setName('Test User');

        $this->entityManager->persist($this->testUser);
        $this->entityManager->flush();
    }

    protected function tearDown(): void
    {
        if ($this->entityManager && $this->testUser) {
            // Remove all threads associated with the test user
            $threads = $this->entityManager->getRepository(Thread::class)
                ->findBy(['user' => $this->testUser]);
            foreach ($threads as $thread) {
                $this->entityManager->remove($thread);
            }
            
            // Remove the test user
            $this->entityManager->remove($this->testUser);
            $this->entityManager->flush();
        }

        $this->entityManager = null;
        $this->testUser = null;
        $this->jwtService = null;
        $this->client = null;

        parent::tearDown();
    }

    protected function getTestToken(): string
    {
        return $this->jwtService->createToken($this->testUser);
    }

    protected function createTestThread(): string
    {
        $this->client->request(
            'POST',
            '/api/chat/thread',
            [],
            [],
            ['HTTP_Authorization' => 'Bearer ' . $this->getTestToken()]
        );

        $this->assertResponseIsSuccessful();
        $response = json_decode($this->client->getResponse()->getContent(), true);
        $this->assertArrayHasKey('threadId', $response);

        return $response['threadId'];
    }
}