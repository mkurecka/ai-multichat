<?php

namespace App\Entity;

use App\Repository\PromptTemplateMessageRepository;
use Doctrine\DBAL\Types\Types;
use Doctrine\ORM\Mapping as ORM;
use Gedmo\Timestampable\Traits\TimestampableEntity; // Re-add Gedmo trait
use Symfony\Component\Serializer\Annotation\Groups; // Import Groups annotation
use Symfony\Component\Validator\Constraints as Assert;
use DateTimeImmutable;

#[ORM\Entity(repositoryClass: PromptTemplateMessageRepository::class)]
#[ORM\Table(name: 'prompt_template_messages')]
#[ORM\HasLifecycleCallbacks] // Re-add annotation
class PromptTemplateMessage
{
    use TimestampableEntity; // Re-add trait usage

    public const ROLE_SYSTEM = 'system';
    public const ROLE_USER = 'user';
    public const ROLE_ASSISTANT = 'assistant';

    #[ORM\Id]
    #[ORM\GeneratedValue]
    #[ORM\Column]
    #[Groups(['template:read'])] // Read-only for API responses
    private ?int $id = null;

    #[ORM\ManyToOne(targetEntity: PromptTemplate::class, inversedBy: 'messages')]
    #[ORM\JoinColumn(nullable: false, onDelete: 'CASCADE')] // Cascade delete if template is removed
    private ?PromptTemplate $template = null;

    #[ORM\Column(length: 50)]
    #[Assert\NotBlank]
    #[Assert\Choice(choices: [self::ROLE_SYSTEM, self::ROLE_USER, self::ROLE_ASSISTANT])]
    #[Groups(['template:read', 'template:write'])]
    private ?string $role = null;

    #[ORM\Column(type: Types::TEXT)]
    #[Assert\NotBlank]
    #[Groups(['template:read', 'template:write'])]
    private ?string $contentTemplate = null;

    #[ORM\Column(type: Types::INTEGER)]
    #[Assert\NotNull]
    #[Assert\PositiveOrZero]
    #[Groups(['template:read', 'template:write'])]
    private ?int $sortOrder = 0; // Default sort order

    // Note: Add groups to timestampable properties if needed, assuming trait handles it or they aren't exposed by default.
    // #[Groups(['template:read'])] public $createdAt;
    // #[Groups(['template:read'])] public $updatedAt;

    // Removed manual properties, rely on trait

    // Removed constructor

    public function getId(): ?int
    {
        return $this->id;
    }

    public function getTemplate(): ?PromptTemplate
    {
        return $this->template;
    }

    public function setTemplate(?PromptTemplate $template): static
    {
        $this->template = $template;

        return $this;
    }

    public function getRole(): ?string
    {
        return $this->role;
    }

    public function setRole(string $role): static
    {
        if (!in_array($role, [self::ROLE_SYSTEM, self::ROLE_USER, self::ROLE_ASSISTANT])) {
            throw new \InvalidArgumentException("Invalid role value");
        }
        $this->role = $role;

        return $this;
    }

    public function getContentTemplate(): ?string
    {
        return $this->contentTemplate;
    }

    public function setContentTemplate(string $contentTemplate): static
    {
        $this->contentTemplate = $contentTemplate;

        return $this;
    }

    public function getSortOrder(): ?int
    {
        return $this->sortOrder;
    }

    public function setSortOrder(int $sortOrder): static
    {
        $this->sortOrder = $sortOrder;

        return $this;
    }

    // Re-add explicit PrePersist/PreUpdate callbacks as a fallback
    /**
     * Sets createdAt before persistence.
     */
    #[ORM\PrePersist]
    public function setCreatedAtValue(): void
    {
        if ($this->createdAt === null) { // Check if not already set (e.g., by Gedmo)
            $this->createdAt = new \DateTimeImmutable();
        }
        // Also set updatedAt on creation if not set
        if ($this->updatedAt === null) {
             $this->updatedAt = new \DateTimeImmutable();
        }
    }

    /**
     * Sets updatedAt before update.
     */
    #[ORM\PreUpdate]
    public function setUpdatedAtValue(): void
    {
        $this->updatedAt = new \DateTimeImmutable();
    }
}
