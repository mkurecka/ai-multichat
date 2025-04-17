<?php

namespace App\Tests\Repository;

use App\Entity\Thread;
use App\Entity\User;
use Doctrine\ORM\EntityManagerInterface;
use Symfony\Bundle\FrameworkBundle\Test\KernelTestCase;

class SimpleRepositoryTest extends KernelTestCase
{
    private $entityManager;
    
    protected function setUp(): void
    {
        $kernel = self::bootKernel();
        
        $this->entityManager = $kernel->getContainer()
            ->get('doctrine')
            ->getManager();
    }
    
    public function testDatabaseConnection(): void
    {
        // Simple test to verify database connection works
        $connection = $this->entityManager->getConnection();
        $this->assertTrue($connection->isConnected());
    }
    
    protected function tearDown(): void
    {
        parent::tearDown();
        
        // Close the entity manager to avoid memory leaks
        $this->entityManager->close();
        $this->entityManager = null;
    }
}
