<?php

namespace App\Controller;

use App\Entity\Model;
use App\Entity\User;
use App\Repository\ApiRequestCostRepository;
use App\Repository\ModelRepository;
use App\Repository\UserRepository;
use App\Service\OpenRouterService;
use Doctrine\ORM\EntityManagerInterface;
use Symfony\Bundle\FrameworkBundle\Controller\AbstractController;
use Symfony\Component\HttpFoundation\JsonResponse;
use Symfony\Component\HttpFoundation\Request;
use Symfony\Component\HttpFoundation\Response;
use Symfony\Component\Routing\Annotation\Route;
use Symfony\Component\Security\Http\Attribute\IsGranted;

#[Route('/admin')]
#[IsGranted('ROLE_ADMIN')]
class AdminController extends AbstractController
{
    public function __construct(
        private readonly EntityManagerInterface $entityManager,
        private readonly ApiRequestCostRepository $apiRequestCostRepository,
        private readonly ModelRepository $modelRepository,
        private readonly UserRepository $userRepository,
        private readonly OpenRouterService $openRouterService,
    ) {
    }

    #[Route(path: '', name: 'admin_dashboard')]
    public function dashboard(): Response
    {
        // Get OpenRouter account credit
        $accountCredit = $this->openRouterService->getAccountCredit();

        // Get overall usage statistics
        $conn = $this->entityManager->getConnection();
        $sql = "SELECT
                    COUNT(id) as totalRequests,
                    SUM(tokens_prompt) as totalPromptTokens,
                    SUM(tokens_completion) as totalCompletionTokens,
                    SUM(tokens_prompt + tokens_completion) as totalTokens,
                    SUM(total_cost) as totalCost
                FROM api_request_cost";

        $stmt = $conn->prepare($sql);
        $result = $stmt->executeQuery();
        $overallStats = $result->fetchAssociative();

        // Get usage in the last 24 hours
        $sql = "SELECT
                    COUNT(id) as totalRequests,
                    SUM(tokens_prompt) as totalPromptTokens,
                    SUM(tokens_completion) as totalCompletionTokens,
                    SUM(tokens_prompt + tokens_completion) as totalTokens,
                    SUM(total_cost) as totalCost
                FROM api_request_cost
                WHERE created_at >= :startDate";

        $stmt = $conn->prepare($sql);
        $result = $stmt->executeQuery([
            'startDate' => (new \DateTime('-24 hours'))->format('Y-m-d H:i:s')
        ]);
        $last24HoursStats = $result->fetchAssociative();

        // Get usage by day (last 7 days)
        $sql = "SELECT
                    DATE(created_at) as date,
                    COUNT(id) as requestCount,
                    SUM(total_cost) as dailyCost,
                    SUM(tokens_prompt + tokens_completion) as dailyTokens
                FROM api_request_cost
                WHERE created_at >= :startDate
                GROUP BY DATE(created_at)
                ORDER BY date ASC";

        $stmt = $conn->prepare($sql);
        $result = $stmt->executeQuery([
            'startDate' => (new \DateTime('-7 days'))->format('Y-m-d')
        ]);
        $dailyStats = $result->fetchAllAssociative();

        // Get top models
        $sql = "SELECT
                    arc.model as modelId,
                    COUNT(arc.id) as useCount,
                    SUM(arc.total_cost) as modelCost,
                    SUM(arc.tokens_prompt + arc.tokens_completion) as totalTokens,
                    m.name as modelName,
                    m.provider as modelProvider
                FROM api_request_cost arc
                LEFT JOIN model m ON m.id = CAST(arc.model AS UNSIGNED)
                GROUP BY arc.model, m.name, m.provider
                ORDER BY useCount DESC
                LIMIT 5";

        $stmt = $conn->prepare($sql);
        $result = $stmt->executeQuery();
        $topModels = $result->fetchAllAssociative();

        // Get user count
        $userCount = $this->userRepository->count([]);

        return $this->render('admin/dashboard.html.twig', [
            'accountCredit' => $accountCredit,
            'overallStats' => $overallStats,
            'last24HoursStats' => $last24HoursStats,
            'dailyStats' => $dailyStats,
            'topModels' => $topModels,
            'userCount' => $userCount
        ]);
    }

    #[Route(path: '/users/{id}', name: 'admin_user_detail')]
    public function userDetail(User $user): Response
    {
        // Basic user stats
        $userStats = [
            'totalPrompts' => $this->apiRequestCostRepository->countByUser($user),
            'totalTokens' => $this->apiRequestCostRepository->getTotalTokensForUser($user),
            'totalCost' => $this->apiRequestCostRepository->getTotalCostForUser($user),
        ];

        // Get model usage statistics with model details using a join
        $conn = $this->entityManager->getConnection();
        $sql = "SELECT arc.model as modelId,
                      COUNT(arc.id) as useCount,
                      SUM(arc.total_cost) as modelCost,
                      SUM(arc.tokens_prompt) as promptTokens,
                      SUM(arc.tokens_completion) as completionTokens,
                      SUM(arc.tokens_prompt + arc.tokens_completion) as totalTokens,
                      m.name as modelName,
                      m.provider as modelProvider,
                      m.description as modelDescription
               FROM api_request_cost arc
               LEFT JOIN model m ON m.id = CAST(arc.model AS UNSIGNED)
               WHERE arc.user_id = :userId
               GROUP BY arc.model, m.name, m.provider, m.description
               ORDER BY useCount DESC";

        $stmt = $conn->prepare($sql);
        $result = $stmt->executeQuery([
            'userId' => $user->getId()
        ]);

        $modelsUsage = $result->fetchAllAssociative();

        // Prepare model details for template
        $modelDetails = [];
        foreach ($modelsUsage as $usage) {
            $modelDetails[$usage['modelId']] = [
                'name' => $usage['modelName'] ?: $usage['modelId'],
                'provider' => $usage['modelProvider'] ?: 'Unknown',
                'description' => $usage['modelDescription'] ?: 'Model details not available'
            ];
        }

        // Get usage over time (last 30 days)
        $conn = $this->entityManager->getConnection();
        $sql = "SELECT DATE(created_at) as date,
                      COUNT(id) as requestCount,
                      SUM(total_cost) as dailyCost,
                      SUM(tokens_prompt + tokens_completion) as dailyTokens
               FROM api_request_cost
               WHERE user_id = :userId
               AND created_at >= :startDate
               GROUP BY DATE(created_at)
               ORDER BY date ASC";

        $stmt = $conn->prepare($sql);
        $result = $stmt->executeQuery([
            'userId' => $user->getId(),
            'startDate' => (new \DateTime('-30 days'))->format('Y-m-d')
        ]);

        $timeUsage = $result->fetchAllAssociative();

        return $this->render('admin/user_detail.html.twig', [
            'user' => $user,
            'userStats' => $userStats,
            'modelsUsage' => $modelsUsage,
            'modelDetails' => $modelDetails,
            'timeUsage' => $timeUsage
        ]);
    }

    #[Route(path: '/models-stats', name: 'admin_models_stats')]
    public function modelsStats(): Response
    {
        // Get all models from database
        $models = $this->modelRepository->findAll();

        // Get overall usage statistics
        $conn = $this->entityManager->getConnection();
        $sql = "SELECT
                    COUNT(id) as totalRequests,
                    SUM(tokens_prompt) as totalPromptTokens,
                    SUM(tokens_completion) as totalCompletionTokens,
                    SUM(tokens_prompt + tokens_completion) as totalTokens,
                    SUM(total_cost) as totalCost
                FROM api_request_cost";

        $stmt = $conn->prepare($sql);
        $result = $stmt->executeQuery();
        $overallStats = $result->fetchAssociative();

        // Get model usage statistics with model details
        $sql = "SELECT arc.model as modelId,
                      COUNT(arc.id) as useCount,
                      COUNT(DISTINCT arc.user_id) as uniqueUsers,
                      SUM(arc.total_cost) as modelCost,
                      SUM(arc.tokens_prompt) as promptTokens,
                      SUM(arc.tokens_completion) as completionTokens,
                      SUM(arc.tokens_prompt + arc.tokens_completion) as totalTokens,
                      m.name as modelName,
                      m.provider as modelProvider,
                      m.description as modelDescription
               FROM api_request_cost arc
               LEFT JOIN model m ON m.id = CAST(arc.model AS UNSIGNED)
               GROUP BY arc.model, m.name, m.provider, m.description
               ORDER BY useCount DESC";

        $stmt = $conn->prepare($sql);
        $result = $stmt->executeQuery();
        $modelsUsage = $result->fetchAllAssociative();

        // Prepare model details for template
        $modelDetails = [];
        foreach ($modelsUsage as $usage) {
            $modelDetails[$usage['modelId']] = [
                'name' => $usage['modelName'] ?: $usage['modelId'],
                'provider' => $usage['modelProvider'] ?: 'Unknown',
                'description' => $usage['modelDescription'] ?: 'Model details not available'
            ];
        }

        // Get usage over time (last 30 days)
        $sql = "SELECT DATE(created_at) as date,
                      COUNT(id) as requestCount,
                      SUM(total_cost) as dailyCost,
                      SUM(tokens_prompt + tokens_completion) as dailyTokens
               FROM api_request_cost
               WHERE created_at >= :startDate
               GROUP BY DATE(created_at)
               ORDER BY date ASC";

        $stmt = $conn->prepare($sql);
        $result = $stmt->executeQuery([
            'startDate' => (new \DateTime('-30 days'))->format('Y-m-d')
        ]);

        $timeUsage = $result->fetchAllAssociative();

        // Get usage by provider
        $sql = "SELECT
                    m.provider as provider,
                    COUNT(arc.id) as useCount,
                    SUM(arc.total_cost) as providerCost,
                    SUM(arc.tokens_prompt + arc.tokens_completion) as providerTokens
                FROM api_request_cost arc
                LEFT JOIN model m ON m.id = CAST(arc.model AS UNSIGNED)
                WHERE m.provider IS NOT NULL
                GROUP BY m.provider
                ORDER BY useCount DESC";

        $stmt = $conn->prepare($sql);
        $result = $stmt->executeQuery();
        $providerUsage = $result->fetchAllAssociative();

        return $this->render('admin/models_stats.html.twig', [
            'models' => $models,
            'overallStats' => $overallStats,
            'modelsUsage' => $modelsUsage,
            'modelDetails' => $modelDetails,
            'timeUsage' => $timeUsage,
            'providerUsage' => $providerUsage
        ]);
    }
}