<?php

namespace App\Command;

use App\Entity\User;
use App\Service\JWTService;
use Doctrine\ORM\EntityManagerInterface;
use Symfony\Component\Console\Attribute\AsCommand;
use Symfony\Component\Console\Command\Command;
use Symfony\Component\Console\Input\InputInterface;
use Symfony\Component\Console\Output\OutputInterface;

#[AsCommand(
    name: 'app:generate-jwt',
    description: 'Generate a JWT token for a user',
)]
class GenerateJwtCommand extends Command
{
    public function __construct(
        private EntityManagerInterface $entityManager,
        private JWTService $jwtService
    ) {
        parent::__construct();
    }

    protected function execute(InputInterface $input, OutputInterface $output): int
    {
        $userRepository = $this->entityManager->getRepository(User::class);
        $user = $userRepository->findOneBy([]);

        if (!$user) {
            $output->writeln('No user found in the database.');
            return Command::FAILURE;
        }

        $token = $this->jwtService->createToken($user);

        $output->writeln("JWT Token for user {$user->getEmail()}:");
        $output->writeln($token);

        return Command::SUCCESS;
    }
}
