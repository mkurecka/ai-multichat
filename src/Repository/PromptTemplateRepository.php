<?php

namespace App\Repository;

use App\Entity\Model;
use App\Entity\Organization;
use App\Entity\PromptTemplate;
use App\Entity\User;
use Doctrine\Bundle\DoctrineBundle\Repository\ServiceEntityRepository;
use Doctrine\Persistence\ManagerRegistry;

/**
 * @extends ServiceEntityRepository<PromptTemplate>
 */
class PromptTemplateRepository extends ServiceEntityRepository
{
    public function __construct(ManagerRegistry $registry)
    {
        parent::__construct($registry, PromptTemplate::class);
    }

    /**
     * Count templates owned by a specific user
     */
    public function countByOwner(User $user): int
    {
        $qb = $this->createQueryBuilder('pt')
            ->select('COUNT(pt.id)')
            ->where('pt.owner = :user')
            ->setParameter('user', $user);

        return (int) $qb->getQuery()->getSingleScalarResult();
    }

    /**
     * Count templates by organization
     */
    public function countByOrganization(Organization $organization): int
    {
        $qb = $this->createQueryBuilder('pt')
            ->select('COUNT(pt.id)')
            ->where('pt.organization = :organization')
            ->setParameter('organization', $organization);

        return (int) $qb->getQuery()->getSingleScalarResult();
    }

    /**
     * Count templates by model
     */
    public function countByModel(Model $model): int
    {
        $qb = $this->createQueryBuilder('pt')
            ->select('COUNT(pt.id)')
            ->where('pt.associatedModel = :model')
            ->setParameter('model', $model);

        return (int) $qb->getQuery()->getSingleScalarResult();
    }

    /**
     * Count templates by scope
     */
    public function countByScope(string $scope): int
    {
        $qb = $this->createQueryBuilder('pt')
            ->select('COUNT(pt.id)')
            ->where('pt.scope = :scope')
            ->setParameter('scope', $scope);

        return (int) $qb->getQuery()->getSingleScalarResult();
    }

    /**
     * Find templates with message count
     */
    public function findWithMessageCount(): array
    {
        $qb = $this->createQueryBuilder('pt')
            ->select('pt, COUNT(m.id) as messageCount')
            ->leftJoin('pt.messages', 'm')
            ->groupBy('pt.id')
            ->orderBy('pt.createdAt', 'DESC');

        return $qb->getQuery()->getResult();
    }

    //    /**
    //     * @return PromptTemplate[] Returns an array of PromptTemplate objects
    //     */
    //    public function findByExampleField($value): array
    //    {
    //        return $this->createQueryBuilder('p')
    //            ->andWhere('p.exampleField = :val')
    //            ->setParameter('val', $value)
    //            ->orderBy('p.id', 'ASC')
    //            ->setMaxResults(10)
    //            ->getQuery()
    //            ->getResult()
    //        ;
    //    }

    //    public function findOneBySomeField($value): ?PromptTemplate
    //    {
    //        return $this->createQueryBuilder('p')
    //            ->andWhere('p.exampleField = :val')
    //            ->setParameter('val', $value)
    //            ->getQuery()
    //            ->getOneOrNullResult()
    //        ;
    //    }
}
