<?php

namespace App\Tests\Repository;

use App\Entity\Model;
use App\Entity\Organization;
use App\Entity\PromptTemplate;
use App\Entity\User;
use App\Repository\ModelRepository;
use App\Repository\OrganizationRepository;
use App\Repository\PromptTemplateRepository;
use App\Repository\UserRepository;
use Doctrine\ORM\EntityManagerInterface;
use Symfony\Bundle\FrameworkBundle\Test\KernelTestCase;

class PromptTemplateRepositoryTest extends KernelTestCase
{
    private $entityManager;
    private $promptTemplateRepository;
    private $userRepository;
    private $modelRepository;
    private $organizationRepository;

    protected function setUp(): void
    {
        $kernel = self::bootKernel();

        $this->entityManager = $kernel->getContainer()
            ->get('doctrine')
            ->getManager();

        $this->promptTemplateRepository = $this->entityManager->getRepository(PromptTemplate::class);
        $this->userRepository = $this->entityManager->getRepository(User::class);
        $this->modelRepository = $this->entityManager->getRepository(Model::class);
        $this->organizationRepository = $this->entityManager->getRepository(Organization::class);
    }

    public function testCountByOwner(): void
    {
        // Start a transaction to isolate this test
        $this->entityManager->beginTransaction();

        try {
            // Get a test user
            $user = $this->userRepository->findOneBy(['email' => 'user@test.local']);

            if (!$user) {
                $this->markTestSkipped('No test user available');
            }

            // Get the initial count
            $initialCount = $this->promptTemplateRepository->countByOwner($user);

            // Create a new template with TEST_ prefix
            $template = $this->createTemplate($user, 'TEST_Template_');

            // Get the count after adding a template
            $newCount = $this->promptTemplateRepository->countByOwner($user);

            // Assert that the count increased by 1
            $this->assertEquals($initialCount + 1, $newCount);
        } finally {
            // Roll back the transaction to clean up
            $this->entityManager->rollback();
        }
    }

    public function testFindByOwner(): void
    {
        // Start a transaction to isolate this test
        $this->entityManager->beginTransaction();

        try {
            // Get a test user
            $user = $this->userRepository->findOneBy(['email' => 'user@test.local']);

            if (!$user) {
                $this->markTestSkipped('No test user available');
            }

            // Create a new template with TEST_ prefix
            $template = $this->createTemplate($user, 'TEST_Template_');

            // Find templates by owner
            $templates = $this->promptTemplateRepository->findBy(['owner' => $user]);

            // Assert that the template is found
            $this->assertGreaterThan(0, count($templates));
            $found = false;
            foreach ($templates as $t) {
                if ($t->getId() === $template->getId()) {
                    $found = true;
                    break;
                }
            }
            $this->assertTrue($found);
        } finally {
            // Roll back the transaction to clean up
            $this->entityManager->rollback();
        }
    }

    public function testFindByOrganization(): void
    {
        // Start a transaction to isolate this test
        $this->entityManager->beginTransaction();

        try {
            // Get a test organization
            $organization = $this->organizationRepository->findOneBy([]);

            if (!$organization) {
                $this->markTestSkipped('No test organization available');
            }

            // Create a new template for the organization with TEST_ prefix
            $template = $this->createTemplateForOrganization($organization, 'TEST_Org_Template_');

            // Find templates by organization
            $templates = $this->promptTemplateRepository->findBy(['organization' => $organization]);

            // Assert that the template is found
            $this->assertGreaterThan(0, count($templates));
            $found = false;
            foreach ($templates as $t) {
                if ($t->getId() === $template->getId()) {
                    $found = true;
                    break;
                }
            }
            $this->assertTrue($found);
        } finally {
            // Roll back the transaction to clean up
            $this->entityManager->rollback();
        }
    }

    private function createTemplate(User $user, string $prefix = 'Test_Template_'): PromptTemplate
    {
        // Get a model
        $model = $this->modelRepository->findOneBy([]);

        if (!$model) {
            $this->markTestSkipped('No models available for testing');
        }

        // Create a new template
        $template = new PromptTemplate();
        $template->setName($prefix . uniqid());
        $template->setDescription('This is a test template');
        $template->setScope('private');
        $template->setOwner($user);
        $template->setAssociatedModel($model);

        // Persist and flush
        $this->entityManager->persist($template);
        $this->entityManager->flush();

        return $template;
    }

    private function createTemplateForOrganization(Organization $organization, string $prefix = 'Test_Org_Template_'): PromptTemplate
    {
        // Get a model
        $model = $this->modelRepository->findOneBy([]);

        if (!$model) {
            $this->markTestSkipped('No models available for testing');
        }

        // Create a new template
        $template = new PromptTemplate();
        $template->setName($prefix . uniqid());
        $template->setDescription('This is an organization template');
        $template->setScope('organization');
        $template->setOrganization($organization);
        $template->setAssociatedModel($model);

        // Persist and flush
        $this->entityManager->persist($template);
        $this->entityManager->flush();

        return $template;
    }

    protected function tearDown(): void
    {
        // Make sure any active transaction is rolled back
        if ($this->entityManager->getConnection()->isTransactionActive()) {
            $this->entityManager->rollback();
        }

        parent::tearDown();

        // Close the entity manager to avoid memory leaks
        $this->entityManager->close();
        $this->entityManager = null;
    }
}
