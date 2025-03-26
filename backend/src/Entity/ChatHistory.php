<?php

namespace App\Entity;

use App\Entity\User;
use DateTime;
use Doctrine\ORM\Mapping as ORM;
use Doctrine\Common\Collections\ArrayCollection;
use Doctrine\Common\Collections\Collection;
use Symfony\Component\Serializer\Annotation\Groups;

#[ORM\Entity]
class ChatHistory
{
    #[ORM\Id]
    #[ORM\GeneratedValue]
    #[ORM\Column]
    #[Groups(['chat_history:read'])]
    private ?int $id = null;
    
    #[ORM\ManyToOne(targetEntity: User::class)]
    #[Groups(['chat_history:read'])]
    private User $user;
    
    #[ORM\Column(type: "text")]
    #[Groups(['chat_history:read'])]
    private string $prompt;
    
    #[ORM\Column(type: "json")]
    #[Groups(['chat_history:read'])]
    private array $responses;
    
    #[ORM\Column(type: "datetime")]
    #[Groups(['chat_history:read'])]
    private DateTime $createdAt;

    #[ORM\Column(type: "string", nullable: true)]
    #[Groups(['chat_history:read'])]
    private ?string $threadId = null;

    #[ORM\ManyToOne(targetEntity: self::class, inversedBy: "children")]
    #[ORM\JoinColumn(name: "parent_id", referencedColumnName: "id", nullable: true)]
    #[Groups(['chat_history:read'])]
    private ?self $parent = null;

    #[ORM\OneToMany(targetEntity: self::class, mappedBy: "parent")]
    #[Groups(['chat_history:read'])]
    private Collection $children;

    public function __construct()
    {
        $this->children = new ArrayCollection();
    }

    public function getId(): ?int
    {
        return $this->id;
    }

    public function getUser(): User
    {
        return $this->user;
    }

    public function setUser(User $user): self
    {
        $this->user = $user;

        return $this;
    }

    public function getPrompt(): string
    {
        return $this->prompt;
    }

    public function setPrompt(string $prompt): self
    {
        $this->prompt = $prompt;

        return $this;
    }

    public function getResponses(): array
    {
        return $this->responses;
    }

    public function setResponses(array $responses): self
    {
        $this->responses = $responses;

        return $this;
    }

    public function getCreatedAt(): DateTime
    {
        return $this->createdAt;
    }

    public function setCreatedAt(DateTime $createdAt): self
    {
        $this->createdAt = $createdAt;

        return $this;
    }

    public function getThreadId(): ?string
    {
        return $this->threadId;
    }

    public function setThreadId(?string $threadId): self
    {
        $this->threadId = $threadId;
        return $this;
    }

    public function getParent(): ?self
    {
        return $this->parent;
    }

    public function setParent(?self $parent): self
    {
        $this->parent = $parent;
        return $this;
    }

    public function getChildren(): Collection
    {
        return $this->children;
    }

    public function addChild(self $child): self
    {
        if (!$this->children->contains($child)) {
            $this->children->add($child);
            $child->setParent($this);
        }
        return $this;
    }

    public function removeChild(self $child): self
    {
        if ($this->children->removeElement($child)) {
            if ($child->getParent() === $this) {
                $child->setParent(null);
            }
        }
        return $this;
    }
}
