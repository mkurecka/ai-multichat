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
    description: 'Refresh the OpenRouter models cache',
)]
class CacheModelsCommand extends Command
{
    private ModelService $modelService;

    public function __construct(ModelService $modelService)
    {
        parent::__construct();
        $this->modelService = $modelService;
    }

    protected function execute(InputInterface $input, OutputInterface $output): int
    {
        $io = new SymfonyStyle($input, $output);

        $io->info('Refreshing OpenRouter models cache...');
        
        try {
            $models = $this->modelService->refreshModels();
            $io->success(sprintf('Successfully cached %d models', count($models)));
            return Command::SUCCESS;
        } catch (\Exception $e) {
            $io->error('Failed to refresh models cache: ' . $e->getMessage());
            return Command::FAILURE;
        }
    }
}
