<?php

namespace App\Repository;

use App\Entity\ApiRequestCost;
use App\Entity\User;
use Doctrine\Bundle\DoctrineBundle\Repository\ServiceEntityRepository;
use Doctrine\Persistence\ManagerRegistry;

class ApiRequestCostRepository extends ServiceEntityRepository
{
    public function __construct(ManagerRegistry $registry)
    {
        parent::__construct($registry, ApiRequestCost::class);
    }

    /**
     * Get total tokens (prompt + completion) for a user
     */
    public function getTotalTokensForUser(User $user): int
    {
        $qb = $this->createQueryBuilder('arc')
            ->select('SUM(arc.tokensPrompt + arc.tokensCompletion) as total')
            ->where('arc.user = :user')
            ->setParameter('user', $user);

        $result = $qb->getQuery()->getSingleScalarResult();
        return (int) ($result ?? 0);
    }

    /**
     * Get total cost for a user
     */
    public function getTotalCostForUser(User $user): float
    {
        $qb = $this->createQueryBuilder('arc')
            ->select('SUM(arc.totalCost) as total')
            ->where('arc.user = :user')
            ->setParameter('user', $user);

        $result = $qb->getQuery()->getSingleScalarResult();
        return (float) ($result ?? 0);
    }

    /**
     * Count total requests for a user
     */
    public function countByUser(User $user): int
    {
        $qb = $this->createQueryBuilder('arc')
            ->select('COUNT(arc.id)')
            ->where('arc.user = :user')
            ->setParameter('user', $user);

        return (int) $qb->getQuery()->getSingleScalarResult();
    }
}
