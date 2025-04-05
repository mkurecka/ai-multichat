<?php

namespace App\Entity;

use DateTime;
use Doctrine\ORM\Mapping as ORM;

#[ORM\Entity(repositoryClass: App\Repository\ApiRequestCostRepository::class)]
class ApiRequestCost
{
    #[ORM\Id]
    #[ORM\GeneratedValue]
    #[ORM\Column]
    private ?int $id = null;

    #[ORM\ManyToOne(targetEntity: User::class)]
    #[ORM\JoinColumn(nullable: true)]
    private ?User $user = null;

    #[ORM\Column(type: "string")]
    private string $requestId;

    #[ORM\Column(type: "string")]
    private string $apiProviderId;

    #[ORM\Column(type: "string")]
    private string $model;

    #[ORM\Column(type: "float")]
    private float $totalCost;

    #[ORM\Column(type: "datetime")]
    private DateTime $createdAt;

    #[ORM\Column(type: "string", nullable: true)]
    private ?string $origin = null;

    #[ORM\Column(type: "float", nullable: true)]
    private ?float $totalUsage = null;

    #[ORM\Column(type: "boolean")]
    private bool $isByok = false;

    #[ORM\Column(type: "string", nullable: true)]
    private ?string $upstreamId = null;

    #[ORM\Column(type: "float", nullable: true)]
    private ?float $cacheDiscount = null;

    #[ORM\Column(type: "integer", nullable: true)]
    private ?int $appId = null;

    #[ORM\Column(type: "boolean")]
    private bool $streamed = false;

    #[ORM\Column(type: "boolean")]
    private bool $cancelled = false;

    #[ORM\Column(type: "string", nullable: true)]
    private ?string $providerName = null;

    #[ORM\Column(type: "integer", nullable: true)]
    private ?int $latency = null;

    #[ORM\Column(type: "integer", nullable: true)]
    private ?int $moderationLatency = null;

    #[ORM\Column(type: "integer", nullable: true)]
    private ?int $generationTime = null;

    #[ORM\Column(type: "string", nullable: true)]
    private ?string $finishReason = null;

    #[ORM\Column(type: "string", nullable: true)]
    private ?string $nativeFinishReason = null;

    #[ORM\Column(type: "integer", nullable: true)]
    private ?int $tokensPrompt = null;

    #[ORM\Column(type: "integer", nullable: true)]
    private ?int $tokensCompletion = null;

    #[ORM\Column(type: "integer", nullable: true)]
    private ?int $nativeTokensPrompt = null;

    #[ORM\Column(type: "integer", nullable: true)]
    private ?int $nativeTokensCompletion = null;

    #[ORM\Column(type: "integer", nullable: true)]
    private ?int $nativeTokensReasoning = null;

    #[ORM\Column(type: "integer", nullable: true)]
    private ?int $numMediaPrompt = null;

    #[ORM\Column(type: "integer", nullable: true)]
    private ?int $numMediaCompletion = null;

    #[ORM\Column(type: "integer", nullable: true)]
    private ?int $numSearchResults = null;

    #[ORM\Column(type: "string", nullable: true)]
    private ?string $requestType = null;

    #[ORM\Column(type: "string", nullable: true)]
    private ?string $requestReference = null;

    public function __construct()
    {
        $this->createdAt = new DateTime();
    }

    public function getId(): ?int
    {
        return $this->id;
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

    public function getRequestId(): string
    {
        return $this->requestId;
    }

    public function setRequestId(string $requestId): self
    {
        $this->requestId = $requestId;
        return $this;
    }

    public function getApiProviderId(): string
    {
        return $this->apiProviderId;
    }

    public function setApiProviderId(string $apiProviderId): self
    {
        $this->apiProviderId = $apiProviderId;
        return $this;
    }

    public function getModel(): string
    {
        return $this->model;
    }

    public function setModel(string $model): self
    {
        $this->model = $model;
        return $this;
    }

    public function getTotalCost(): float
    {
        return $this->totalCost;
    }

    public function setTotalCost(float $totalCost): self
    {
        $this->totalCost = $totalCost;
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

    public function getOrigin(): ?string
    {
        return $this->origin;
    }

    public function setOrigin(?string $origin): self
    {
        $this->origin = $origin;
        return $this;
    }

    public function getTotalUsage(): ?float
    {
        return $this->totalUsage;
    }

    public function setTotalUsage(?float $totalUsage): self
    {
        $this->totalUsage = $totalUsage;
        return $this;
    }

    public function getIsByok(): bool
    {
        return $this->isByok;
    }

    public function setIsByok(bool $isByok): self
    {
        $this->isByok = $isByok;
        return $this;
    }

    public function getUpstreamId(): ?string
    {
        return $this->upstreamId;
    }

    public function setUpstreamId(?string $upstreamId): self
    {
        $this->upstreamId = $upstreamId;
        return $this;
    }

    public function getCacheDiscount(): ?float
    {
        return $this->cacheDiscount;
    }

    public function setCacheDiscount(?float $cacheDiscount): self
    {
        $this->cacheDiscount = $cacheDiscount;
        return $this;
    }

    public function getAppId(): ?int
    {
        return $this->appId;
    }

    public function setAppId(?int $appId): self
    {
        $this->appId = $appId;
        return $this;
    }

    public function getStreamed(): bool
    {
        return $this->streamed;
    }

    public function setStreamed(bool $streamed): self
    {
        $this->streamed = $streamed;
        return $this;
    }

    public function getCancelled(): bool
    {
        return $this->cancelled;
    }

    public function setCancelled(bool $cancelled): self
    {
        $this->cancelled = $cancelled;
        return $this;
    }

    public function getProviderName(): ?string
    {
        return $this->providerName;
    }

    public function setProviderName(?string $providerName): self
    {
        $this->providerName = $providerName;
        return $this;
    }

    public function getLatency(): ?int
    {
        return $this->latency;
    }

    public function setLatency(?int $latency): self
    {
        $this->latency = $latency;
        return $this;
    }

    public function getModerationLatency(): ?int
    {
        return $this->moderationLatency;
    }

    public function setModerationLatency(?int $moderationLatency): self
    {
        $this->moderationLatency = $moderationLatency;
        return $this;
    }

    public function getGenerationTime(): ?int
    {
        return $this->generationTime;
    }

    public function setGenerationTime(?int $generationTime): self
    {
        $this->generationTime = $generationTime;
        return $this;
    }

    public function getFinishReason(): ?string
    {
        return $this->finishReason;
    }

    public function setFinishReason(?string $finishReason): self
    {
        $this->finishReason = $finishReason;
        return $this;
    }

    public function getNativeFinishReason(): ?string
    {
        return $this->nativeFinishReason;
    }

    public function setNativeFinishReason(?string $nativeFinishReason): self
    {
        $this->nativeFinishReason = $nativeFinishReason;
        return $this;
    }

    public function getTokensPrompt(): ?int
    {
        return $this->tokensPrompt;
    }

    public function setTokensPrompt(?int $tokensPrompt): self
    {
        $this->tokensPrompt = $tokensPrompt;
        return $this;
    }

    public function getTokensCompletion(): ?int
    {
        return $this->tokensCompletion;
    }

    public function setTokensCompletion(?int $tokensCompletion): self
    {
        $this->tokensCompletion = $tokensCompletion;
        return $this;
    }

    public function getNativeTokensPrompt(): ?int
    {
        return $this->nativeTokensPrompt;
    }

    public function setNativeTokensPrompt(?int $nativeTokensPrompt): self
    {
        $this->nativeTokensPrompt = $nativeTokensPrompt;
        return $this;
    }

    public function getNativeTokensCompletion(): ?int
    {
        return $this->nativeTokensCompletion;
    }

    public function setNativeTokensCompletion(?int $nativeTokensCompletion): self
    {
        $this->nativeTokensCompletion = $nativeTokensCompletion;
        return $this;
    }

    public function getNativeTokensReasoning(): ?int
    {
        return $this->nativeTokensReasoning;
    }

    public function setNativeTokensReasoning(?int $nativeTokensReasoning): self
    {
        $this->nativeTokensReasoning = $nativeTokensReasoning;
        return $this;
    }

    public function getNumMediaPrompt(): ?int
    {
        return $this->numMediaPrompt;
    }

    public function setNumMediaPrompt(?int $numMediaPrompt): self
    {
        $this->numMediaPrompt = $numMediaPrompt;
        return $this;
    }

    public function getNumMediaCompletion(): ?int
    {
        return $this->numMediaCompletion;
    }

    public function setNumMediaCompletion(?int $numMediaCompletion): self
    {
        $this->numMediaCompletion = $numMediaCompletion;
        return $this;
    }

    public function getNumSearchResults(): ?int
    {
        return $this->numSearchResults;
    }

    public function setNumSearchResults(?int $numSearchResults): self
    {
        $this->numSearchResults = $numSearchResults;
        return $this;
    }

    public function getRequestType(): ?string
    {
        return $this->requestType;
    }

    public function setRequestType(?string $requestType): self
    {
        $this->requestType = $requestType;
        return $this;
    }

    public function getRequestReference(): ?string
    {
        return $this->requestReference;
    }

    public function setRequestReference(?string $requestReference): self
    {
        $this->requestReference = $requestReference;
        return $this;
    }
}