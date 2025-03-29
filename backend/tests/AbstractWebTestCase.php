<?php

namespace App\Tests;

use App\Entity\User;
use Doctrine\ORM\EntityManagerInterface;
use Lexik\Bundle\JWTAuthenticationBundle\Services\JWTTokenManagerInterface;
use Symfony\Bundle\FrameworkBundle\Test\WebTestCase;
use Symfony\Component\DependencyInjection\ContainerInterface;
use App\Service\JWTService;

abstract class AbstractWebTestCase extends WebTestCase
{
    protected $client;
    protected ContainerInterface $container;
    protected EntityManagerInterface $entityManager;
    protected User $user;

    protected function setUp(): void
    {
        parent::setUp();
        $this->client = static::createClient();
        $this->container = $this->client->getContainer();
        $this->entityManager = $this->container->get('doctrine.orm.entity_manager');
        $this->user = $this->createUser();
    }

    protected function tearDown(): void
    {
        if ($this->user && $this->entityManager->contains($this->user)) {
            $this->entityManager->remove($this->user);
            $this->entityManager->flush();
        }
        
        $this->entityManager->clear();
        $this->client = null;
        parent::tearDown();
    }

    protected function getUser(): User
    {
        return $this->user;
    }

    protected function getToken(): string
    {
        $jwtService = $this->container->get(JWTService::class);
        return $jwtService->createToken($this->user);
    }

    private function createUser(): User
    {
        $user = new User();
        $user->setEmail(uniqid('test_') . '@example.com');
        $user->setGoogleId(uniqid('test_google_id_'));
        $user->setRoles(['ROLE_USER']);
        
        $this->entityManager->persist($user);
        $this->entityManager->flush();
        
        return $user;
    }
} 