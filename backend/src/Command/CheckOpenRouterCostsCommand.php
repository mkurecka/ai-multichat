<?php

namespace App\Command;

use App\Entity\ApiRequestCost;
use App\Entity\ChatHistory;
use App\Service\OpenRouterService;
use Doctrine\ORM\EntityManagerInterface;
use Symfony\Component\Console\Command\Command;
use Symfony\Component\Console\Input\InputInterface;
use Symfony\Component\Console\Output\OutputInterface;
use Symfony\Component\Console\Style\SymfonyStyle;
use Symfony\Component\Console\Attribute\AsCommand;

#[AsCommand(
    name: 'app:check-openrouter-costs',
    description: 'Check OpenRouter costs for chat history',
)]
class CheckOpenRouterCostsCommand extends Command
{
    public function __construct(
        private EntityManagerInterface $entityManager,
        private OpenRouterService $openRouterService
    ) {
        parent::__construct();
    }

    protected function execute(InputInterface $input, OutputInterface $output): int
    {
        $io = new SymfonyStyle($input, $output);
        $io->title('Checking OpenRouter costs...');

        // Get all chat histories with openRouterId
        $chatHistories = $this->entityManager->getRepository(ChatHistory::class)
            ->createQueryBuilder('ch')
            ->where('ch.openRouterId IS NOT NULL')
            ->getQuery()
            ->getResult();

        $io->progressStart(count($chatHistories));
        $totalCost = 0;

        foreach ($chatHistories as $chatHistory) {
            try {
                $data = $this->openRouterService->getGenerationData($chatHistory->getOpenRouterId());
                
                // Find existing cost or create new one
                $apiRequestCost = $this->entityManager->getRepository(ApiRequestCost::class)
                    ->findOneBy(['requestId' => $chatHistory->getOpenRouterId()]);
                
                if (!$apiRequestCost) {
                    $apiRequestCost = new ApiRequestCost();
                }
                
                $apiRequestCost->setUser($chatHistory->getThread()->getUser())
                    ->setRequestId($chatHistory->getOpenRouterId())
                    ->setApiProviderId('openrouter')
                    ->setTotalCost($data['total_cost'] ?? 0.0)
                    ->setModel($data['model'] ?? '')
                    ->setOrigin($data['origin'] ?? null)
                    ->setTotalUsage($data['usage'] ?? null)
                    ->setIsByok($data['is_byok'] ?? false)
                    ->setUpstreamId($data['upstream_id'] ?? null)
                    ->setCacheDiscount($data['cache_discount'] ?? null)
                    ->setAppId($data['app_id'] ?? null)
                    ->setStreamed($data['streamed'] ?? false)
                    ->setCancelled($data['cancelled'] ?? false)
                    ->setProviderName($data['provider_name'] ?? null)
                    ->setLatency($data['latency'] ?? null)
                    ->setModerationLatency($data['moderation_latency'] ?? null)
                    ->setGenerationTime($data['generation_time'] ?? null)
                    ->setFinishReason($data['finish_reason'] ?? null)
                    ->setNativeFinishReason($data['native_finish_reason'] ?? null)
                    ->setTokensPrompt($data['tokens_prompt'] ?? null)
                    ->setTokensCompletion($data['tokens_completion'] ?? null)
                    ->setNativeTokensPrompt($data['native_tokens_prompt'] ?? null)
                    ->setNativeTokensCompletion($data['native_tokens_completion'] ?? null)
                    ->setNativeTokensReasoning($data['native_tokens_reasoning'] ?? null)
                    ->setNumMediaPrompt($data['num_media_prompt'] ?? null)
                    ->setNumMediaCompletion($data['num_media_completion'] ?? null)
                    ->setNumSearchResults($data['num_search_results'] ?? null)
                    ->setRequestType('chat')
                    ->setRequestReference($chatHistory->getId());
                
                $this->entityManager->persist($apiRequestCost);
                $totalCost += $data['total_cost'] ?? 0.0;

                // Show detailed info for each generation
                $io->writeln(sprintf(
                    "\nGeneration %s:\n- Cost: $%.4f\n- Model: %s\n- Provider: %s\n- Tokens: %d prompt, %d completion\n- Cache discount: %.2f%%",
                    $chatHistory->getOpenRouterId(),
                    $data['total_cost'] ?? 0.0,
                    $data['model'] ?? 'unknown',
                    $data['provider_name'] ?? 'unknown',
                    $data['tokens_prompt'] ?? 0,
                    $data['tokens_completion'] ?? 0,
                    ($data['cache_discount'] ?? 0) * 100
                ));
            } catch (\Exception $e) {
                $io->error(sprintf('Error getting data for chat history %d: %s', $chatHistory->getId(), $e->getMessage()));
            }
            
            $io->progressAdvance();
        }

        $this->entityManager->flush();
        $io->progressFinish();
        
        $io->success([
            sprintf('Total cost: $%.4f', $totalCost),
            sprintf('Processed %d generations', count($chatHistories))
        ]);
        
        return Command::SUCCESS;
    }
} 