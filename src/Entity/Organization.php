<?php

namespace App\Entity;

use App\Entity\PromptTemplate; // Add import for PromptTemplate
use Doctrine\Common\Collections\ArrayCollection;
use Doctrine\Common\Collections\Collection;
use Doctrine\ORM\Mapping as ORM;
use Symfony\Component\Serializer\Annotation\Groups;

#[ORM\Entity]
class Organization
{
    #[ORM\Id]
    #[ORM\GeneratedValue]
    #[ORM\Column]
    #[Groups(['organization:read'])]
    private ?int $id = null;
    
    #[ORM\Column(length: 255)]
    #[Groups(['organization:read'])]
    private string $googleId;
    
    #[ORM\Column(length: 255, nullable: true)]
    #[Groups(['organization:read'])]
    private ?string $domain = null;
    
    #[ORM\Column(type: "integer")]
    #[Groups(['organization:read'])]
    private int $usageCount = 0;
    
    #[ORM\ManyToOne(targetEntity: User::class)]
    #[Groups(['organization:read'])]
    private ?User $user = null;

    #[ORM\OneToMany(mappedBy: 'organization', targetEntity: PromptTemplate::class, cascade: ['persist', 'remove'], orphanRemoval: true)]
    private Collection $promptTemplates;

    public function __construct()
    {
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
            $promptTemplate->setOrganization($this);
        }

        return $this;
    }

    public function removePromptTemplate(PromptTemplate $promptTemplate): static
    {
        if ($this->promptTemplates->removeElement($promptTemplate)) {
            // set the owning side to null (unless already changed)
            if ($promptTemplate->getOrganization() === $this) {
                $promptTemplate->setOrganization(null);
            }
        }

        return $this;
    }
}
