<?php

namespace App\Command;

use App\Service\ModelService;
use Symfony\Component\Console\Attribute\AsCommand;
use Symfony\Component\Console\Command\Command;
use Symfony\Component\Console\Input\InputInterface;
use Symfony\Component\Console\Output\OutputInterface;
use Symfony\Component\Console\Style\SymfonyStyle;

#[AsCommand(
    name: 'app:cache:models',
    description: 'Cache available models from OpenRouter',
)]
class CacheModelsCommand extends Command
{
    public function __construct(
        private readonly ModelService $modelService,
    ) {
        parent::__construct();
    }

    protected function execute(InputInterface $input, OutputInterface $output): int
    {
        $io = new SymfonyStyle($input, $output);

        try {
            $models = $this->modelService->refreshModels();
            $io->success(sprintf('Successfully cached %d models', count($models)));

            return Command::SUCCESS;
        } catch (\Exception $e) {
            $io->error($e->getMessage());
            return Command::FAILURE;
        }
    }
}
