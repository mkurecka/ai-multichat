<?php

namespace App\Repository;

use App\Entity\Model;
use Doctrine\Bundle\DoctrineBundle\Repository\ServiceEntityRepository;
use Doctrine\Persistence\ManagerRegistry;

/**
 * @extends ServiceEntityRepository<Model>
 *
 * @method Model|null find($id, $lockMode = null, $lockVersion = null)
 * @method Model|null findOneBy(array $criteria, array $orderBy = null)
 * @method Model[]    findAll()
 * @method Model[]    findBy(array $criteria, array $orderBy = null, $limit = null, $offset = null)
 */
class ModelRepository extends ServiceEntityRepository
{
    public function __construct(ManagerRegistry $registry)
    {
        parent::__construct($registry, Model::class);
    }

    public function save(Model $entity, bool $flush = false): void
    {
        $this->getEntityManager()->persist($entity);

        if ($flush) {
            $this->getEntityManager()->flush();
        }
    }

    public function remove(Model $entity, bool $flush = false): void
    {
        $this->getEntityManager()->remove($entity);

        if ($flush) {
            $this->getEntityManager()->flush();
        }
    }

    public function findByModelId(string $modelId): ?Model
    {
        return $this->createQueryBuilder('m')
            ->andWhere('m.modelId = :modelId')
            ->setParameter('modelId', $modelId)
            ->getQuery()
            ->getOneOrNullResult();
    }

    public function findAllOrdered(?bool $enabledOnly = false): array
    {
        $queryBuilder = $this->createQueryBuilder('m');

        if ($enabledOnly) {
            $queryBuilder->andWhere('m.enabled = :enabled')
                ->setParameter('enabled', true);
        }

        return $queryBuilder
            ->orderBy('m.name', 'ASC')
            ->getQuery()
            ->getResult();
    }

    /**
     * Returns a QueryBuilder for finding enabled models, ordered by name.
     * Used by form types (e.g., PromptTemplateType).
     */
    public function findEnabledModelsQueryBuilder(): \Doctrine\ORM\QueryBuilder
    {
        return $this->createQueryBuilder('m')
            ->andWhere('m.enabled = :enabled')
            ->setParameter('enabled', true)
            ->orderBy('m.name', 'ASC'); // Or m.displayName if preferred
    }
}
