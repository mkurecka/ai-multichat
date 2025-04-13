<?php

namespace App\Command;

use App\Entity\User;
use App\Repository\UserRepository;
use Doctrine\ORM\EntityManagerInterface;
use Symfony\Component\Console\Attribute\AsCommand;
use Symfony\Component\Console\Command\Command;
use Symfony\Component\Console\Input\InputArgument;
use Symfony\Component\Console\Input\InputInterface;
use Symfony\Component\Console\Input\InputOption;
use Symfony\Component\Console\Output\OutputInterface;
use Symfony\Component\Console\Style\SymfonyStyle;

#[AsCommand(
    name: 'app:promote-user',
    description: 'Promotes a user to a specified role (default: ROLE_ADMIN)',
)]
class PromoteUserCommand extends Command
{
    // Define allowed roles for promotion
    private const ALLOWED_ROLES = ['ROLE_ADMIN', 'ROLE_ORGANIZATION_ADMIN'];

    public function __construct(
        private readonly UserRepository $userRepository,
        private readonly EntityManagerInterface $entityManager,
    ) {
        parent::__construct();
    }

    protected function configure(): void
    {
        $this
            ->addArgument('email', InputArgument::REQUIRED, 'Email of the user to promote')
            ->addOption('role', 'r', InputOption::VALUE_REQUIRED, 'The role to assign (e.g., ROLE_ADMIN, ROLE_ORGANIZATION_ADMIN)', 'ROLE_ADMIN')
        ;
    }

    protected function execute(InputInterface $input, OutputInterface $output): int
    {
        $io = new SymfonyStyle($input, $output);
        $email = $input->getArgument('email');
        $roleToAssign = $input->getOption('role');

        // Validate the requested role
        if (!in_array($roleToAssign, self::ALLOWED_ROLES)) {
             $io->error(sprintf('Invalid role "%s". Allowed roles are: %s', $roleToAssign, implode(', ', self::ALLOWED_ROLES)));
             return Command::FAILURE;
        }

        /** @var User|null $user */
        $user = $this->userRepository->findOneBy(['email' => $email]);

        if (!$user) {
            $io->error(sprintf('User with email "%s" not found.', $email));
            return Command::FAILURE;
        }

        $roles = $user->getRoles(); // Get existing roles (includes ROLE_USER by default)

        // Ensure roles are unique and add the new role if not present
        if (!in_array($roleToAssign, $roles)) {
            $roles[] = $roleToAssign;
            $user->setRoles(array_unique($roles)); // Ensure uniqueness and set
            $this->entityManager->flush();
            $io->success(sprintf('User "%s" has been granted the role "%s".', $email, $roleToAssign));
        } else {
            $io->info(sprintf('User "%s" already has the role "%s".', $email, $roleToAssign));
        }

        return Command::SUCCESS;
    }
}
