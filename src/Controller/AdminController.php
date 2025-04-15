<?php

namespace App\Controller;

use App\Entity\Model;
use App\Entity\User;
use App\Repository\ApiRequestCostRepository;
use App\Repository\ModelRepository;
use App\Repository\UserRepository;
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
    ) {
    }

    #[Route(path: '', name: 'admin_dashboard')]
    public function dashboard(): Response
    {
        $users = $this->userRepository->findAll();

        $usageStats = [];
        foreach ($users as $user) {
            $usageStats[$user->getId()] = [
                'user' => $user,
                'totalPrompts' => $this->apiRequestCostRepository->countByUser($user),
                'totalTokens' => $this->apiRequestCostRepository->getTotalTokensForUser($user),
                'totalCost' => $this->apiRequestCostRepository->getTotalCostForUser($user),
            ];
        }

        return $this->render('admin/dashboard.html.twig', [
            'users' => $users,
            'usageStats' => $usageStats,
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
}