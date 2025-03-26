<?php

namespace App\Entity;

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

    #[ORM\OneToMany(targetEntity: ChatHistory::class, mappedBy: "user")]
    #[Groups(['user:read'])]
    private Collection $chatHistories;

    public function __construct()
    {
        $this->chatHistories = new ArrayCollection();
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

    public function getChatHistories(): Collection
    {
        return $this->chatHistories;
    }

    public function addChatHistory(ChatHistory $chatHistory): self
    {
        if (!$this->chatHistories->contains($chatHistory)) {
            $this->chatHistories->add($chatHistory);
            $chatHistory->setUser($this);
        }

        return $this;
    }

    public function removeChatHistory(ChatHistory $chatHistory): self
    {
        if ($this->chatHistories->removeElement($chatHistory)) {
            // set the owning side to null (unless already changed)
            if ($chatHistory->getUser() === $this) {
                $chatHistory->setUser(null);
            }
        }

        return $this;
    }

    public function getRoles(): array
    {
        return ['ROLE_USER'];
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

    public function setRoles(array $roles): void
    {
        $this->roles = $roles;
    }
}
