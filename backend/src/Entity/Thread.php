<?php

namespace App\Entity;

use Doctrine\Common\Collections\ArrayCollection;
use Doctrine\Common\Collections\Collection;
use Doctrine\ORM\Mapping as ORM;

#[ORM\Entity]
class Thread
{
    #[ORM\Id]
    #[ORM\GeneratedValue]
    #[ORM\Column]
    private ?int $id = null;

    #[ORM\Column(type: "string", length: 255)]
    private string $title;

    #[ORM\ManyToOne(targetEntity: User::class, inversedBy: "threads")]
    #[ORM\JoinColumn(nullable: false)]
    private User $user;

    #[ORM\Column(type: "datetime")]
    private \DateTime $createdAt;

    #[ORM\Column(type: "string", unique: true)]
    private string $threadId;

    #[ORM\OneToMany(targetEntity: ChatHistory::class, mappedBy: "thread", cascade: ["persist", "remove"])]
    private Collection $chatHistories;

    public function __construct()
    {
        $this->chatHistories = new ArrayCollection();
        $this->createdAt = new \DateTime();
    }

    public function getId(): ?int
    {
        return $this->id;
    }

    public function getTitle(): string
    {
        return $this->title;
    }

    public function setTitle(string $title): self
    {
        $this->title = $title;
        return $this;
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

    public function getCreatedAt(): \DateTime
    {
        return $this->createdAt;
    }

    public function setCreatedAt(\DateTime $createdAt): self
    {
        $this->createdAt = $createdAt;
        return $this;
    }

    public function getThreadId(): string
    {
        return $this->threadId;
    }

    public function setThreadId(string $threadId): self
    {
        $this->threadId = $threadId;
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
            $chatHistory->setThread($this);
        }
        return $this;
    }

    public function removeChatHistory(ChatHistory $chatHistory): self
    {
        if ($this->chatHistories->removeElement($chatHistory)) {
            if ($chatHistory->getThread() === $this) {
                $chatHistory->setThread(null);
            }
        }
        return $this;
    }
} 