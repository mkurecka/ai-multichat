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
        $qb = $this->createQueryBuilder('ch')
            ->select('SUM(ch.usage->\'total_tokens\') as total')
            ->where('ch.user = :user')
            ->setParameter('user', $user);

        $result = $qb->getQuery()->getSingleScalarResult();
        return (int) ($result ?? 0);
    }
} 