<?php

namespace App\Repository;

use App\Entity\User;
use Doctrine\Bundle\DoctrineBundle\Repository\ServiceEntityRepository;
use Doctrine\Persistence\ManagerRegistry;

/**
 * @extends ServiceEntityRepository<User>
 */
class UserRepository extends ServiceEntityRepository
{
    public function __construct(ManagerRegistry $registry)
    {
        parent::__construct($registry, User::class);
    }

    public function findOneByGoogleId(string $googleId): ?User
    {
        return $this->createQueryBuilder('u')
            ->andWhere('u.googleId = :googleId')
            ->setParameter('googleId', $googleId)
            ->getQuery()
            ->getOneOrNullResult();
    }

    public function findByOrganization(int $organizationId): array
    {
        return $this->createQueryBuilder('u')
            ->andWhere('u.organization = :organizationId')
            ->setParameter('organizationId', $organizationId)
            ->getQuery()
            ->getResult();
    }

    public function countChatHistories(int $userId): int
    {
        return $this->createQueryBuilder('u')
            ->select('COUNT(ch.id)')
            ->leftJoin('u.chatHistories', 'ch')
            ->andWhere('u.id = :userId')
            ->setParameter('userId', $userId)
            ->getQuery()
            ->getSingleScalarResult();
    }
}
