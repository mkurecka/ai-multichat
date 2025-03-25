<?php

namespace App\Entity;

use Doctrine\Common\Collections\ArrayCollection;
use Doctrine\Common\Collections\Collection;
use Doctrine\ORM\Mapping as ORM;

#[ORM\Entity]
class Organization
{
    #[ORM\Id]
    #[ORM\GeneratedValue]
    #[ORM\Column]
    private ?int $id = null;
    
    #[ORM\Column(length: 255)]
    private string $googleId;
    
    #[ORM\Column(length: 255, nullable: true)]
    private ?string $domain = null;
    
    #[ORM\Column(type: "integer")]
    private int $usageCount = 0;
    
    #[ORM\ManyToOne(targetEntity: User::class)]
    private ?User $user = null;

    #[ORM\OneToMany(targetEntity: ChatHistory::class, mappedBy: "user")]
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
    
    public function getDomain(): ?string
    {
        return $this->domain;
    }

    public function setDomain(?string $domain): self
    {
        $this->domain = $domain;

        return $this;
    }
    
    public function getUsageCount(): int
    {
        return $this->usageCount;
    }

    public function setUsageCount(int $usageCount): self
    {
        $this->usageCount = $usageCount;

        return $this;
    }

    public function getUser(): ?User
    {
        return $this->user;
    }

    public function setUser(?User $user): self
    {
        $this->user = $user;

        return $this;
    }

    public function getChatHistories(): Collection
    {
        return $this->chatHistories;
    }

    public function addChatHistory(ChatHistory $chatHistory): self
    {
        if (!$this->chatHistories->contains($chatHistory)) {
            $this->chatHistories[] = $chatHistory;
            $chatHistory->setUser($this);
        }

        return $this;
    }

    public function removeChatHistory(ChatHistory $chatHistory): self
    {
        if ($this->chatHistories->contains($chatHistory)) {
            $this->chatHistories->removeElement($chatHistory);
        }

        return $this;
    }
}