<?php

namespace App\Entity;

use App\Entity\PromptTemplate; // Add import for PromptTemplate
use Doctrine\Common\Collections\ArrayCollection;
use Doctrine\Common\Collections\Collection;
use Doctrine\ORM\Mapping as ORM;
use Symfony\Component\Security\Core\User\PasswordAuthenticatedUserInterface;
use Symfony\Component\Security\Core\User\UserInterface;
use Symfony\Component\Serializer\Annotation\Groups;

#[ORM\Entity]
class User implements UserInterface, PasswordAuthenticatedUserInterface
{
    #[ORM\Id]
    #[ORM\GeneratedValue]
    #[ORM\Column]
    #[Groups(['user:read'])]
    private ?int $id = null;

    #[ORM\Column(length: 255, unique: true)]
    #[Groups(['user:read'])]
    private string $googleId;

    #[ORM\Column]
    #[Groups(['user:read'])]
    private array $roles = [];

    #[ORM\Column(length: 255)]
    #[Groups(['user:read'])]
    private ?string $email = null;

    #[ORM\ManyToOne(targetEntity: Organization::class)]
    #[ORM\JoinColumn(nullable: true)]
    #[Groups(['user:read'])]
    private ?Organization $organization = null;

    #[ORM\OneToMany(targetEntity: Thread::class, mappedBy: 'user', cascade: ['persist', 'remove'])]
    private Collection $threads;

    #[ORM\OneToMany(mappedBy: 'owner', targetEntity: PromptTemplate::class, cascade: ['persist', 'remove'], orphanRemoval: true)]
    private Collection $promptTemplates;

    public function __construct()
    {
        $this->threads = new ArrayCollection();
        $this->promptTemplates = new ArrayCollection(); // Initialize the new collection
    }

    public function getId(): ?int
    {
        return $this->id;
    }

    public function getGoogleId(): string
    {
        return $this->googleId;
    }

    public function setGoogleId(string $googleId): self
    {
        $this->googleId = $googleId;

        return $this;
    }

    public function getOrganization(): ?Organization
    {
        return $this->organization;
    }

    public function setOrganization(?Organization $organization): self
    {
        $this->organization = $organization;

        return $this;
    }

    public function getThreads(): Collection
    {
        return $this->threads;
    }

    public function addThread(Thread $thread): self
    {
        if (!$this->threads->contains($thread)) {
            $this->threads->add($thread);
            $thread->setUser($this);
        }

        return $this;
    }

    public function removeThread(Thread $thread): self
    {
        if ($this->threads->removeElement($thread)) {
            // set the owning side to null (unless already changed)
            if ($thread->getUser() === $this) {
                $thread->setUser(null);
            }
        }

        return $this;
    }

    public function getRoles(): array
    {
        $roles = $this->roles;
        // guarantee every user at least has ROLE_USER
        $roles[] = 'ROLE_USER';

        return array_unique($roles);
    }

    public function getPassword(): ?string
    {
        return null;
    }

    public function getSalt(): ?string
    {
        return null;
    }

    public function eraseCredentials(): void
    {
        // If you store any temporary, sensitive data on the user, clear it here
        // $this->plainPassword = null;
    }

     /**
     * Returns the identifier for this user (e.g. its email address).
     *
     * @return string
     */
    public function getUserIdentifier(): string
    {
        return $this->googleId;
    }

     /**
     * @see UserInterface
     */
    public function getUsername(): string
    {
        return $this->getUserIdentifier();
    }

    public function getEmail(): ?string
    {
        return $this->email;
    }

    public function setEmail(?string $email): void
    {
        $this->email = $email;
    }

    /**
     * Get the user's name (derived from email)
     *
     * @return string
     */
    public function getName(): string
    {
        // Extract name from email (before the @ symbol)
        if ($this->email) {
            $parts = explode('@', $this->email);
            return $parts[0];
        }

        return 'User';
    }

    /**
     * Get the user's first name (derived from email)
     *
     * @return string
     */
    public function getFirstName(): string
    {
        // Extract first part of name from email
        $name = $this->getName();
        $parts = explode('.', $name);
        return ucfirst($parts[0]);
    }

    /**
     * Get the user's last name (derived from email)
     *
     * @return string
     */
    public function getLastName(): string
    {
        // Extract last part of name from email
        $name = $this->getName();
        $parts = explode('.', $name);
        return isset($parts[1]) ? ucfirst($parts[1]) : '';
    }

    public function setRoles(array $roles): void
    {
        $this->roles = $roles;
    }

    /**
     * @return Collection<int, PromptTemplate>
     */
    public function getPromptTemplates(): Collection
    {
        return $this->promptTemplates;
    }

    public function addPromptTemplate(PromptTemplate $promptTemplate): static
    {
        if (!$this->promptTemplates->contains($promptTemplate)) {
            $this->promptTemplates->add($promptTemplate);
            $promptTemplate->setOwner($this);
        }

        return $this;
    }

    public function removePromptTemplate(PromptTemplate $promptTemplate): static
    {
        if ($this->promptTemplates->removeElement($promptTemplate)) {
            // set the owning side to null (unless already changed)
            if ($promptTemplate->getOwner() === $this) {
                $promptTemplate->setOwner(null);
            }
        }

        return $this;
    }
}
