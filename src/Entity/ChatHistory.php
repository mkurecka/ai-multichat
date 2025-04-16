<?php

namespace App\Entity;

use App\Entity\PromptTemplate; // Import PromptTemplate
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

    #[ORM\Column(type: "string")]
    private string $promptId;

    #[ORM\Column(type: "json")]
    private array $response;

    #[ORM\Column(type: "json", nullable: true)]
    private ?array $apiMessages = null;

    #[ORM\Column(type: "string")]
    private string $modelId;

    #[ORM\Column(type: "string", nullable: true)]
    private ?string $openRouterId = null;

    #[ORM\Column(type: "datetime")]
    private DateTime $createdAt;

    #[ORM\ManyToOne(targetEntity: PromptTemplate::class)]
    #[ORM\JoinColumn(nullable: true, onDelete: 'SET NULL')] // Allow template deletion without deleting history
    private ?PromptTemplate $usedTemplate = null;

    public function __construct()
    {
        $this->createdAt = new DateTime();
        // Keep promptId generation if needed, or remove if frontend always provides it
        // $this->promptId = uniqid('prompt_');
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

    public function getPromptId(): string
    {
        return $this->promptId;
    }

    public function setPromptId(string $promptId): self
    {
        $this->promptId = $promptId;
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

    public function getApiMessages(): ?array
    {
        return $this->apiMessages;
    }

    public function setApiMessages(?array $apiMessages): self
    {
        $this->apiMessages = $apiMessages;
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

    public function getUsedTemplate(): ?PromptTemplate
    {
        return $this->usedTemplate;
    }

    public function setUsedTemplate(?PromptTemplate $usedTemplate): static
    {
        $this->usedTemplate = $usedTemplate;

        return $this;
    }
}
