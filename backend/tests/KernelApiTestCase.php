<?php

namespace App\Tests;

use App\Entity\User;
use App\Service\JWTService;
use Doctrine\ORM\EntityManagerInterface;
use Doctrine\ORM\Tools\SchemaTool;
use Symfony\Bundle\FrameworkBundle\Test\KernelTestCase;

class KernelApiTestCase extends KernelTestCase
{
    protected ?EntityManagerInterface $entityManager;
    protected ?JWTService $jwtService;
    protected ?User $testUser;

    protected function setUp(): void
    {
        $kernel = self::bootKernel();

        $this->entityManager = $kernel->getContainer()
            ->get('doctrine')
            ->getManager();

        $this->jwtService = $kernel->getContainer()->get(JWTService::class);

        $this->createSchema();
        $this->loadFixtures();
        $this->testUser = $this->entityManager->getRepository(User::class)->findOneBy(['email' => 'test@example.com']);
    }

    protected function tearDown(): void
    {
        parent::tearDown();

        if ($this->entityManager) {
            $this->entityManager->close();
            $this->entityManager = null;
        }
    }

    private function createSchema(): void
    {
        $metadatas = $this->entityManager->getMetadataFactory()->getAllMetadata();
        $schemaTool = new SchemaTool($this->entityManager);
        $schemaTool->dropSchema($metadatas);
        $schemaTool->createSchema($metadatas);
    }

    private function loadFixtures(): void
    {
        $kernel = self::bootKernel();
        $application = new \Symfony\Bundle\FrameworkBundle\Console\Application($kernel);
        $application->setAutoExit(false);

        $input = new \Symfony\Component\Console\Input\ArrayInput([
            'command' => 'doctrine:fixtures:load',
            '--no-interaction' => true,
        ]);

        $output = new \Symfony\Component\Console\Output\NullOutput();
        $application->run($input, $output);
    }

    protected function getTestToken(): string
    {
        return $this->jwtService->createToken($this->testUser);
    }
}