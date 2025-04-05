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

}