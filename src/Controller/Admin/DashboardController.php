<?php

namespace App\Controller\Admin;

use App\Entity\User;
use App\Repository\ChatHistoryRepository;
use App\Repository\ApiRequestCostRepository;
use Doctrine\ORM\EntityManagerInterface;
use Symfony\Bundle\FrameworkBundle\Controller\AbstractController;
use Symfony\Component\HttpFoundation\Response;
use Symfony\Component\Routing\Annotation\Route;
use Symfony\Component\Security\Http\Attribute\IsGranted;

#[Route('/admin')]
#[IsGranted('ROLE_ADMIN')]
class DashboardController extends AbstractController
{
    #[Route('/', name: 'admin_dashboard')]
    public function index(
        EntityManagerInterface $entityManager,
        ChatHistoryRepository $chatHistoryRepository,
        ApiRequestCostRepository $apiRequestCostRepository
    ): Response {
        // Get all users
        $users = $entityManager->getRepository(User::class)->findAll();
        
        // Initialize usage stats
        $usageStats = [];
        
        // Calculate usage statistics for each user
        foreach ($users as $user) {
            $totalPrompts = $chatHistoryRepository->countByUser($user);
            $totalTokens = $apiRequestCostRepository->getTotalTokensForUser($user);
            $totalCost = $apiRequestCostRepository->getTotalCostForUser($user);
            
            $usageStats[$user->getId()] = [
                'user' => $user,
                'totalPrompts' => $totalPrompts,
                'totalTokens' => number_format($totalTokens),
                'totalCost' => '$' . number_format($totalCost, 4)
            ];
        }
        
        return $this->render('admin/dashboard.html.twig', [
            'usageStats' => $usageStats
        ]);
    }
} 