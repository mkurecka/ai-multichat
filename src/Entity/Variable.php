<?php

namespace App\Entity;

use App\Repository\VariableRepository;
use Doctrine\DBAL\Types\Types;
use Doctrine\ORM\Mapping as ORM;
use Gedmo\Mapping\Annotation as Gedmo;
use Symfony\Component\Serializer\Annotation\Groups; // Add this
use Symfony\Component\Validator\Constraints as Assert;
use Symfony\Component\Validator\Context\ExecutionContextInterface;

#[ORM\Entity(repositoryClass: VariableRepository::class)]
#[ORM\Table(name: '`variable`')] // Use backticks for reserved keyword if necessary
class Variable
{
    #[ORM\Id]
    #[ORM\GeneratedValue]
    #[ORM\Column]
    #[Groups(['variable:read'])]
    private ?int $id = null;

    #[ORM\Column(length: 255)]
    #[Assert\NotBlank]
    #[Groups(['variable:read', 'variable:write'])]
    private ?string $name = null;

    #[ORM\Column(type: Types::TEXT)]
    #[Assert\NotBlank]
    #[Groups(['variable:read', 'variable:write'])]
    private ?string $value = null;

    #[ORM\ManyToOne(inversedBy: 'variables')]
    #[ORM\JoinColumn(nullable: true, onDelete: 'SET NULL')] // Or CASCADE if preferred
    #[Groups(['variable:read'])] // Read user association
    private ?User $user = null;

    #[ORM\ManyToOne(inversedBy: 'variables')]
    #[ORM\JoinColumn(nullable: true, onDelete: 'SET NULL')] // Or CASCADE if preferred
    #[Groups(['variable:read'])] // Read organization association
    private ?Organization $organization = null;

    #[ORM\Column(type: Types::DATETIME_MUTABLE)]
    #[Gedmo\Timestampable(on: 'create')]
    #[Groups(['variable:read'])]
    private ?\DateTimeInterface $createdAt = null;

    #[ORM\Column(type: Types::DATETIME_MUTABLE)]
    #[Gedmo\Timestampable(on: 'update')]
    #[Groups(['variable:read'])]
    private ?\DateTimeInterface $updatedAt = null;

    public function getId(): ?int
    {
        return $this->id;
    }

    public function getName(): ?string
    {
        return $this->name;
    }

    public function setName(string $name): static
    {
        $this->name = $name;

        return $this;
    }

    public function getValue(): ?string
    {
        return $this->value;
    }

    public function setValue(string $value): static
    {
        $this->value = $value;

        return $this;
    }

    public function getUser(): ?User
    {
        return $this->user;
    }

    public function setUser(?User $user): static
    {
        $this->user = $user;

        return $this;
    }

    public function getOrganization(): ?Organization
    {
        return $this->organization;
    }

    public function setOrganization(?Organization $organization): static
    {
        $this->organization = $organization;

        return $this;
    }

    public function getCreatedAt(): ?\DateTimeInterface
    {
        return $this->createdAt;
    }

    public function setCreatedAt(\DateTimeInterface $createdAt): static
    {
        $this->createdAt = $createdAt;

        return $this;
    }

    public function getUpdatedAt(): ?\DateTimeInterface
    {
        return $this->updatedAt;
    }

    public function setUpdatedAt(\DateTimeInterface $updatedAt): static
    {
        $this->updatedAt = $updatedAt;

        return $this;
    }

    #[Assert\Callback]
    public function validateOwner(ExecutionContextInterface $context, $payload): void
    {
        if ($this->user === null && $this->organization === null) {
            $context->buildViolation('Variable must belong to either a User or an Organization.')
                ->atPath('user') // Or organization, doesn't matter much here
                ->addViolation();
        }

        if ($this->user !== null && $this->organization !== null) {
            $context->buildViolation('Variable cannot belong to both a User and an Organization.')
                ->atPath('user') // Or organization
                ->addViolation();
        }
    }
}
