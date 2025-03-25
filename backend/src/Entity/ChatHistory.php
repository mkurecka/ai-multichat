<?php

namespace App\Entity;

use App\Entity\User;
use DateTime;
use Doctrine\ORM\Mapping as ORM;

#[ORM\Entity]
class ChatHistory
{
    #[ORM\Id]
    #[ORM\GeneratedValue]
    #[ORM\Column]
    private ?int $id = null;
    
    #[ORM\ManyToOne(targetEntity: User::class)]
    private User $user;
    
    #[ORM\Column(type: "text")]
    private string $prompt;
    
    #[ORM\Column(type: "json")]
    private array $responses;
    
    #[ORM\Column(type: "datetime")]
    private DateTime $createdAt;

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
}
