<?php

namespace App\Command;

use App\Entity\Model;
use App\Entity\PromptTemplate;
use App\Entity\User;
use App\Form\PromptTemplateType;
use Doctrine\ORM\EntityManagerInterface;
use Symfony\Component\Console\Attribute\AsCommand;
use Symfony\Component\Console\Command\Command;
use Symfony\Component\Console\Input\InputInterface;
use Symfony\Component\Console\Output\OutputInterface;
use Symfony\Component\Form\FormFactoryInterface;

#[AsCommand(
    name: 'app:test-form',
    description: 'Test form validation during development',
)]
class TestFormCommand extends Command
{
    public function __construct(
        private EntityManagerInterface $entityManager,
        private FormFactoryInterface $formFactory,
    ) {
        parent::__construct();
    }

    protected function execute(InputInterface $input, OutputInterface $output): int
    {
        $output->writeln('Testing form validation...');
        
        // Start a transaction to isolate test operations
        $this->entityManager->beginTransaction();
        
        try {
            // Get dependencies
            $userRepository = $this->entityManager->getRepository(User::class);
            $modelRepository = $this->entityManager->getRepository(Model::class);
            
            // Get test data
            $user = $userRepository->findOneBy([]);
            $model = $modelRepository->findOneBy([]);
            
            if (!$user || !$model) {
                $output->writeln('Required test data not available');
                $this->entityManager->rollback();
                return Command::FAILURE;
            }
            
            $output->writeln('Testing PromptTemplateType form...');
            
            // Create a new entity
            $promptTemplate = new PromptTemplate();
            
            // Create the form
            $form = $this->formFactory->create(PromptTemplateType::class, $promptTemplate, [
                'is_org_admin' => false,
                'owner_type' => 'user',
            ]);
            
            // Set form data
            $formData = [
                'name' => 'TEST_Template_' . uniqid(),
                'description' => 'This is a test template',
                'scope' => 'private',
                'associatedModel' => $model->getId(),
                'messages' => [
                    [
                        'role' => 'system',
                        'content' => 'You are a helpful assistant.',
                        'sortOrder' => 0,
                    ],
                ],
            ];
            
            // Submit the form
            $form->submit($formData);
            
            // Check form validity
            if ($form->isValid()) {
                $output->writeln('Form is valid');
                
                // Check entity mapping
                $output->writeln('Template name: ' . $promptTemplate->getName());
                $output->writeln('Template description: ' . $promptTemplate->getDescription());
                
                // Set owner (not handled by the form)
                $promptTemplate->setOwner($user);
                
                // Persist to test database interaction
                $this->entityManager->persist($promptTemplate);
                $this->entityManager->flush();
                
                // Verify persistence
                $id = $promptTemplate->getId();
                $output->writeln('Template created with ID: ' . $id);
                
                // Test invalid data
                $output->writeln('Testing invalid form data...');
                
                $invalidTemplate = new PromptTemplate();
                $invalidForm = $this->formFactory->create(PromptTemplateType::class, $invalidTemplate, [
                    'is_org_admin' => false,
                    'owner_type' => 'user',
                ]);
                
                $invalidFormData = [
                    // Missing 'name' field
                    'description' => 'This is a test template',
                    'scope' => 'private',
                    // Missing 'associatedModel' field
                ];
                
                $invalidForm->submit($invalidFormData);
                
                if (!$invalidForm->isValid()) {
                    $output->writeln('Invalid form correctly detected');
                    $output->writeln('Validation errors:');
                    foreach ($invalidForm->getErrors(true) as $error) {
                        $output->writeln('- ' . $error->getMessage());
                    }
                } else {
                    $output->writeln('Error: Invalid form data was accepted');
                }
            } else {
                $output->writeln('Form is invalid');
                $output->writeln('Validation errors:');
                foreach ($form->getErrors(true) as $error) {
                    $output->writeln('- ' . $error->getMessage());
                }
            }
            
            // Roll back to clean up
            $this->entityManager->rollback();
            
            $output->writeln('Tests completed successfully');
            return Command::SUCCESS;
        } catch (\Exception $e) {
            if ($this->entityManager->getConnection()->isTransactionActive()) {
                $this->entityManager->rollback();
            }
            $output->writeln('Error: ' . $e->getMessage());
            return Command::FAILURE;
        }
    }
}
