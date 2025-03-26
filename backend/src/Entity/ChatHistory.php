<?php

namespace App\Entity;

use DateTime;
use Doctrine\ORM\Mapping as ORM;

#[ORM\Entity]
class ChatHistory
{
    #[ORM\Id]
    #[ORM\GeneratedValue]
    #[ORM\Column]
    private ?int $id = null;
    
    #[ORM\ManyToOne(targetEntity: Thread::class, inversedBy: "chatHistories")]
    #[ORM\JoinColumn(nullable: false)]
    private Thread $thread;
    
    #[ORM\Column(type: "text")]
    private string $prompt;
    
    #[ORM\Column(type: "json")]
    private array $response;
    
    #[ORM\Column(type: "string")]
    private string $modelId;
    
    #[ORM\Column(type: "string", nullable: true)]
    private ?string $openRouterId = null;
    
    #[ORM\Column(type: "datetime")]
    private DateTime $createdAt;

    public function __construct()
    {
        $this->createdAt = new DateTime();
    }

    public function getId(): ?int
    {
        return $this->id;
    }

    public function getThread(): Thread
    {
        return $this->thread;
    }

    public function setThread(Thread $thread): self
    {
        $this->thread = $thread;
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

    public function getResponse(): array
    {
        return $this->response;
    }

    public function setResponse(array $response): self
    {
        $this->response = $response;
        return $this;
    }

    public function getModelId(): string
    {
        return $this->modelId;
    }

    public function setModelId(string $modelId): self
    {
        $this->modelId = $modelId;
        return $this;
    }

    public function getOpenRouterId(): ?string
    {
        return $this->openRouterId;
    }

    public function setOpenRouterId(?string $openRouterId): self
    {
        $this->openRouterId = $openRouterId;
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
