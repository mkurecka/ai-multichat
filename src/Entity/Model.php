<?php

namespace App\Entity;

use App\Repository\ModelRepository;
use Doctrine\ORM\Mapping as ORM;
use Symfony\Component\Serializer\Annotation\Groups; // Import Groups annotation

#[ORM\Entity(repositoryClass: ModelRepository::class)]
class Model
{
    #[ORM\Id]
    #[ORM\GeneratedValue]
    #[ORM\Column]
    #[Groups(['template:read', 'template:write'])] // Read for display, Write to accept ID for association
    private ?int $id = null;

    #[ORM\Column(length: 255)]
    #[Groups(['template:read'])]
    private ?string $name = null;

    #[ORM\Column(length: 255)]
    #[Groups(['template:read'])]
    private ?string $modelId = null;

    #[ORM\Column(type: 'text', nullable: true)]
    #[Groups(['template:read'])]
    private ?string $description = null;

    #[ORM\Column(length: 255)]
    #[Groups(['template:read'])]
    private ?string $provider = null;

    #[ORM\Column(length: 255)]
    #[Groups(['template:read'])]
    private ?string $apiService = 'openrouter';

    #[ORM\Column(type: 'json', nullable: true)]
    #[Groups(['template:read'])]
    private ?array $pricing = null;

    #[ORM\Column(type: 'boolean')]
    #[Groups(['template:read'])]
    private bool $enabled = false;

    #[ORM\Column(type: 'boolean')]
    #[Groups(['template:read'])]
    private bool $supportsStreaming = false;

    #[ORM\Column]
    private ?\DateTimeImmutable $createdAt = null;

    #[ORM\Column]
    private ?\DateTimeImmutable $updatedAt = null;

    public function __construct()
    {
        $this->createdAt = new \DateTimeImmutable();
        $this->updatedAt = new \DateTimeImmutable();
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

    public function getModelId(): ?string
    {
        return $this->modelId;
    }

    public function setModelId(string $modelId): static
    {
        $this->modelId = $modelId;
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

    public function getProvider(): ?string
    {
        return $this->provider;
    }

    public function setProvider(string $provider): static
    {
        $this->provider = $provider;
        return $this;
    }

    public function getApiService(): ?string
    {
        return $this->apiService;
    }

    public function setApiService(string $apiService): static
    {
        $this->apiService = $apiService;
        return $this;
    }

    public function getPricing(): ?array
    {
        return $this->pricing;
    }

    public function setPricing(?array $pricing): static
    {
        $this->pricing = $pricing;
        return $this;
    }

    public function isEnabled(): bool
    {
        return $this->enabled;
    }

    public function setEnabled(bool $enabled): self
    {
        $this->enabled = $enabled;
        return $this;
    }

    public function isSupportsStreaming(): bool
    {
        return $this->supportsStreaming;
    }

    public function setSupportsStreaming(bool $supportsStreaming): self
    {
        $this->supportsStreaming = $supportsStreaming;
        return $this;
    }

    public function getCreatedAt(): ?\DateTimeImmutable
    {
        return $this->createdAt;
    }

    public function setCreatedAt(\DateTimeImmutable $createdAt): static
    {
        $this->createdAt = $createdAt;
        return $this;
    }

    public function getUpdatedAt(): ?\DateTimeImmutable
    {
        return $this->updatedAt;
    }

    public function setUpdatedAt(\DateTimeImmutable $updatedAt): static
    {
        $this->updatedAt = $updatedAt;
        return $this;
    }
}
