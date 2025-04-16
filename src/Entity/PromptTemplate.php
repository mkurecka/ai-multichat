<?php

namespace App\Entity;

use App\Repository\PromptTemplateRepository;
use DateTimeImmutable;
use Doctrine\Common\Collections\ArrayCollection;
use Doctrine\Common\Collections\Collection;
use Doctrine\DBAL\Types\Types;
use Doctrine\ORM\Mapping as ORM;
use Gedmo\Timestampable\Traits\TimestampableEntity; // Import Timestampable trait
use Symfony\Component\Serializer\Annotation\Groups; // Import Groups annotation
use Symfony\Component\Validator\Constraints as Assert; // Import Assert for validation
use Symfony\Component\Validator\Context\ExecutionContextInterface; // Add this use statement

#[ORM\Entity(repositoryClass: PromptTemplateRepository::class)]
#[ORM\Table(name: 'prompt_templates')] // Use plural table name
#[ORM\HasLifecycleCallbacks] // Re-add annotation
#[Assert\Callback([self::class, 'validateOwnerOrOrganization'])] // Add callback validation
class PromptTemplate
{
    use TimestampableEntity; // Use Timestampable trait for createdAt and updatedAt

    public const SCOPE_PRIVATE = 'private';
    public const SCOPE_ORGANIZATION = 'organization';

    #[ORM\Id]
    #[ORM\GeneratedValue]
    #[ORM\Column]
    #[Groups(['template:read'])]
    private ?int $id = null;

    #[ORM\Column(length: 255)]
    #[Assert\NotBlank]
    #[Assert\Length(max: 255)]
    #[Groups(['template:read', 'template:write'])]
    private ?string $name = null;

    #[ORM\Column(type: Types::TEXT, nullable: true)]
    #[Groups(['template:read', 'template:write'])]
    private ?string $description = null;

    #[ORM\OneToMany(mappedBy: 'template', targetEntity: PromptTemplateMessage::class, cascade: ['persist', 'remove'], orphanRemoval: true)]
    #[ORM\OrderBy(['sortOrder' => 'ASC'])] // Order messages by sortOrder
    #[Groups(['template:read', 'template:write'])] // Need matching groups in PromptTemplateMessage
    private Collection $messages;

    #[ORM\Column(length: 50)]
    #[Assert\NotBlank]
    #[Assert\Choice(choices: [self::SCOPE_PRIVATE, self::SCOPE_ORGANIZATION])]
    #[Groups(['template:read', 'template:write'])]
    private ?string $scope = self::SCOPE_PRIVATE; // Default to private

    #[ORM\ManyToOne(inversedBy: 'promptTemplates')]
    #[ORM\JoinColumn(nullable: true)] // Allow null
    // #[Assert\NotNull] // Removed - validation handled by Callback
    #[Groups(['template:read'])] // This will include fields from User marked with 'user:read' if configured correctly
    private ?User $owner = null;

    #[ORM\ManyToOne(inversedBy: 'promptTemplates')]
    #[ORM\JoinColumn(nullable: true)] // Allow null
    // #[Assert\NotNull] // Removed - validation handled by Callback
    #[Groups(['template:read'])] // This will include fields from Organization marked with 'organization:read'
    private ?Organization $organization = null;

    #[ORM\ManyToOne]
    #[ORM\JoinColumn(nullable: false)] // Assuming a model must be selected
    #[Assert\NotNull]
    #[Groups(['template:read', 'template:write'])] // Write might need custom handling or expect just ID
    private ?Model $associatedModel = null;

    // Note: Timestampable trait properties (createdAt, updatedAt) might need explicit groups
    // if the trait itself doesn't add them or if you need specific control.
    // Adding them explicitly for clarity:
    // #[Groups(['template:read'])] public $createdAt;
    // #[Groups(['template:read'])] public $updatedAt;
    // However, the trait might handle this. Let's assume it does for now unless errors occur.

    public function __construct()
    {
        $this->messages = new ArrayCollection();
        $this->updatedAt = new DateTimeImmutable();
        $this->createdAt = new DateTimeImmutable(); // Initialize createdAt
    }

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

    public function getDescription(): ?string
    {
        return $this->description;
    }

    public function setDescription(?string $description): static
    {
        $this->description = $description;

        return $this;
    }

    public function getScope(): ?string
    {
        return $this->scope;
    }

    public function setScope(string $scope): static
    {
        // Basic validation, more robust validation via Assert\Choice
        if (!in_array($scope, [self::SCOPE_PRIVATE, self::SCOPE_ORGANIZATION])) {
            throw new \InvalidArgumentException("Invalid scope value");
        }
        $this->scope = $scope;

        return $this;
    }

    public function getOwner(): ?User
    {
        return $this->owner;
    }

    public function setOwner(?User $owner): static
    {
        $this->owner = $owner;

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

    public function getAssociatedModel(): ?Model
    {
        return $this->associatedModel;
    }

    public function setAssociatedModel(?Model $associatedModel): static
    {
        $this->associatedModel = $associatedModel;

        return $this;
    }

    /**
     * @return Collection<int, PromptTemplateMessage>
     */
    public function getMessages(): Collection
    {
        return $this->messages;
    }

    public function addMessage(PromptTemplateMessage $message): static
    {
        if (!$this->messages->contains($message)) {
            $this->messages->add($message);
            $message->setTemplate($this);
        }

        return $this;
    }

    public function removeMessage(PromptTemplateMessage $message): static
    {
        if ($this->messages->removeElement($message)) {
            // set the owning side to null (unless already changed)
            if ($message->getTemplate() === $this) {
                $message->setTemplate(null);
            }
        }

        return $this;
    }

    /**
     * Validation callback to ensure either owner or organization is set, but not both.
     */
    public static function validateOwnerOrOrganization(PromptTemplate $template, ExecutionContextInterface $context): void
    {
        if ($template->getOwner() === null && $template->getOrganization() === null) {
            $context->buildViolation('A prompt template must belong to either a user (owner) or an organization.')
                ->atPath('owner') // Or a more general path if preferred
                ->addViolation();
        }

        if ($template->getOwner() !== null && $template->getOrganization() !== null) {
            $context->buildViolation('A prompt template cannot belong to both a user (owner) and an organization.')
                ->atPath('owner') // Or a more general path
                ->addViolation();
        }
    }
}
