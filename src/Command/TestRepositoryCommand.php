<?php

namespace App\Command;

use App\Entity\User;
use App\Repository\ChatHistoryRepository;
use App\Repository\PromptTemplateRepository;
use Doctrine\ORM\EntityManagerInterface;
use Symfony\Component\Console\Attribute\AsCommand;
use Symfony\Component\Console\Command\Command;
use Symfony\Component\Console\Input\InputInterface;
use Symfony\Component\Console\Output\OutputInterface;

#[AsCommand(
    name: 'app:test-repository',
    description: 'Test repository methods during development',
)]
class TestRepositoryCommand extends Command
{
    public function __construct(
        private EntityManagerInterface $entityManager,
        private ChatHistoryRepository $chatHistoryRepository,
        private PromptTemplateRepository $promptTemplateRepository,
    ) {
        parent::__construct();
    }

    protected function execute(InputInterface $input, OutputInterface $output): int
    {
        $output->writeln('Testing repositories...');
        
        // Start a transaction to isolate test operations
        $this->entityManager->beginTransaction();
        
        try {
            // Get a test user
            $userRepository = $this->entityManager->getRepository(User::class);
            $user = $userRepository->findOneBy(['email' => 'user@test.local']);
            
            if (!$user) {
                $output->writeln('No test user found with email user@test.local');
                $output->writeln('Looking for any user...');
                $user = $userRepository->findOneBy([]);
                
                if (!$user) {
                    $output->writeln('No users found in the database');
                    $this->entityManager->rollback();
                    return Command::FAILURE;
                }
                
                $output->writeln('Found user with email: ' . $user->getEmail());
            }
            
            // Test ChatHistoryRepository
            $output->writeln('Testing ChatHistoryRepository...');
            try {
                $count = $this->chatHistoryRepository->countByUser($user);
                $output->writeln("Chat history count for user: $count");
            } catch (\Exception $e) {
                $output->writeln('Error testing ChatHistoryRepository: ' . $e->getMessage());
            }
            
            // Test PromptTemplateRepository
            $output->writeln('Testing PromptTemplateRepository...');
            try {
                $count = $this->promptTemplateRepository->countByOwner($user);
                $output->writeln("Prompt template count for user: $count");
            } catch (\Exception $e) {
                $output->writeln('Error testing PromptTemplateRepository: ' . $e->getMessage());
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
