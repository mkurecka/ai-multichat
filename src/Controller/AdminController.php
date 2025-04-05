<?php

namespace App\Controller;

use App\Entity\Model;
use App\Entity\User;
use App\Repository\ChatHistoryRepository;
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
        private readonly ChatHistoryRepository $chatHistoryRepository,
        private readonly ModelRepository $modelRepository,
        private readonly UserRepository $userRepository,
    ) {
    }

    #[Route('', name: 'app_admin_dashboard')]
    public function dashboard(): Response
    {
        $users = $this->userRepository->findAll();
        $models = $this->modelRepository->findAll();
        
        $usageStats = [];
        foreach ($users as $user) {
            $usageStats[$user->getId()] = [
                'user' => $user,
                'totalPrompts' => $this->chatHistoryRepository->count(['user' => $user]),
                'totalTokens' => $this->chatHistoryRepository->getTotalTokensForUser($user),
            ];
        }

        return $this->render('admin/dashboard.html.twig', [
            'users' => $users,
            'models' => $models,
            'usageStats' => $usageStats,
        ]);
    }

    #[Route('/models/{id}/toggle', name: 'app_admin_toggle_model', methods: ['POST'])]
    public function toggleModel(Model $model): JsonResponse
    {
        $model->setEnabled(!$model->isEnabled());
        $this->entityManager->flush();

        return new JsonResponse([
            'success' => true,
            'enabled' => $model->isEnabled(),
        ]);
    }
} 