<?php

namespace App\Controller;

use App\Entity\User;
use App\Repository\ApiRequestCostRepository;
use App\Repository\ChatHistoryRepository;
use App\Repository\PromptTemplateRepository;
use Doctrine\ORM\EntityManagerInterface;
use Symfony\Bundle\FrameworkBundle\Controller\AbstractController;
use Symfony\Component\HttpFoundation\JsonResponse;
use Symfony\Component\HttpFoundation\Response;
use Symfony\Component\Routing\Attribute\Route;
use Symfony\Component\Security\Http\Attribute\IsGranted;
use Symfony\Component\Serializer\Normalizer\AbstractNormalizer;

#[Route('/api/user')]
#[IsGranted('ROLE_USER')]
class ApiUserController extends AbstractController
{
    public function __construct(
        private readonly EntityManagerInterface $entityManager,
        private readonly ApiRequestCostRepository $apiRequestCostRepository,
        private readonly ChatHistoryRepository $chatHistoryRepository,
        private readonly PromptTemplateRepository $promptTemplateRepository
    ) {}

    #[Route('/profile', name: 'api_user_profile', methods: ['GET'])]
    public function profile(): JsonResponse
    {
        /** @var User $user */
        $user = $this->getUser();
        
        // Základní informace o uživateli
        $userData = [
            'id' => $user->getId(),
            'email' => $user->getEmail(),
            'roles' => $user->getRoles(),
            'googleId' => $user->getGoogleId(),
        ];
        
        // Informace o organizaci
        $organization = $user->getOrganization();
        if ($organization) {
            $userData['organization'] = [
                'id' => $organization->getId(),
                'domain' => $organization->getDomain(),
            ];
        }
        
        // Statistiky využití
        $userData['usage'] = [
            'totalPrompts' => $this->chatHistoryRepository->countByUser($user),
            'totalTokens' => $this->apiRequestCostRepository->getTotalTokensForUser($user),
            'totalCost' => $this->apiRequestCostRepository->getTotalCostForUser($user),
        ];
        
        // Počet šablon
        $privateTemplatesCount = $this->promptTemplateRepository->countByOwner($user);
        $userData['templates'] = [
            'privateCount' => $privateTemplatesCount,
        ];
        
        // Počet konverzací (threads)
        $threadsCount = $user->getThreads()->count();
        $userData['conversations'] = [
            'count' => $threadsCount,
        ];
        
        // Získání detailních informací o nákladech na konverzace
        $qb = $this->entityManager->createQueryBuilder();
        $qb->select('t.threadId', 't.title', 't.createdAt as threadCreatedAt', 'COUNT(DISTINCT ch.promptId) as messageCount')
           ->from('App\Entity\Thread', 't')
           ->leftJoin('t.chatHistories', 'ch')
           ->where('t.user = :user')
           ->setParameter('user', $user)
           ->groupBy('t.threadId', 't.title', 't.createdAt')
           ->orderBy('t.createdAt', 'DESC')
           ->setMaxResults(5); // Omezíme na posledních 5 konverzací
        
        $recentThreads = $qb->getQuery()->getResult();
        
        // Získání nákladů pro každou konverzaci
        $threadIds = array_column($recentThreads, 'threadId');
        $costs = [];
        
        if (!empty($threadIds)) {
            $costQb = $this->entityManager->createQueryBuilder();
            $costQb->select('arc.requestReference as threadId',
                           'COALESCE(SUM(arc.totalCost), 0) as totalCost',
                           'COALESCE(SUM(arc.tokensPrompt), 0) as totalPromptTokens',
                           'COALESCE(SUM(arc.tokensCompletion), 0) as totalCompletionTokens')
                  ->from('App\Entity\ApiRequestCost', 'arc')
                  ->where('arc.requestReference IN (:threadIds)')
                  ->andWhere('arc.requestType = :requestType')
                  ->setParameter('threadIds', $threadIds)
                  ->setParameter('requestType', 'chat')
                  ->groupBy('arc.requestReference');
            
            $costsResult = $costQb->getQuery()->getResult();
            
            // Indexování nákladů podle threadId pro snadné vyhledávání
            foreach ($costsResult as $cost) {
                $costs[$cost['threadId']] = $cost;
            }
        }
        
        // Formátování dat o posledních konverzacích
        $recentConversations = [];
        foreach ($recentThreads as $thread) {
            $threadId = $thread['threadId'];
            $costStats = $costs[$threadId] ?? [
                'totalCost' => 0,
                'totalPromptTokens' => 0,
                'totalCompletionTokens' => 0
            ];
            
            $recentConversations[] = [
                'threadId' => $threadId,
                'title' => $thread['title'],
                'messageCount' => (int)$thread['messageCount'],
                'createdAt' => $thread['threadCreatedAt']->format('Y-m-d H:i:s'),
                'totalCost' => (float)$costStats['totalCost'],
                'totalTokens' => (int)($costStats['totalPromptTokens'] + $costStats['totalCompletionTokens'])
            ];
        }
        
        $userData['recentConversations'] = $recentConversations;
        
        return $this->json($userData, Response::HTTP_OK);
    }
}
