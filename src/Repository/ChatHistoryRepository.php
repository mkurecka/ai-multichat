<?php

namespace App\Repository;

use App\Entity\ChatHistory;
use App\Entity\User;
use Doctrine\Bundle\DoctrineBundle\Repository\ServiceEntityRepository;
use Doctrine\Persistence\ManagerRegistry;

class ChatHistoryRepository extends ServiceEntityRepository
{
    public function __construct(ManagerRegistry $registry)
    {
        parent::__construct($registry, ChatHistory::class);
    }

    public function findByThreadId(string $threadId): array
    {
        return $this->findBy(['threadId' => $threadId], ['createdAt' => 'ASC']);
    }

    public function getTotalTokensForUser(User $user): int
    {
        $qb = $this->getEntityManager()->createQueryBuilder();
        $qb->select('SUM(arc.tokensPrompt + arc.tokensCompletion) as total')
           ->from('App\Entity\ApiRequestCost', 'arc')
           ->where('arc.user = :user')
           ->setParameter('user', $user);

        $result = $qb->getQuery()->getSingleScalarResult();
        return (int) ($result ?? 0);
    }

    public function getTotalCostForUser(User $user): float
    {
        $qb = $this->getEntityManager()->createQueryBuilder();
        $qb->select('SUM(arc.totalCost) as total')
           ->from('App\Entity\ApiRequestCost', 'arc')
           ->where('arc.user = :user')
           ->setParameter('user', $user);

        $result = $qb->getQuery()->getSingleScalarResult();
        return (float) ($result ?? 0);
    }

    public function countByUser(User $user): int
    {
        $qb = $this->createQueryBuilder('ch')
            ->select('COUNT(ch.id)')
            ->join('ch.thread', 't')
            ->where('t.user = :user')
            ->setParameter('user', $user);

        return (int) $qb->getQuery()->getSingleScalarResult();
    }
}