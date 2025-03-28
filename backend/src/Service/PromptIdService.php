<?php

declare(strict_types=1);

namespace App\Service;

use Symfony\Component\Uid\Uuid;

class PromptIdService
{
    public function generatePromptId(): string
    {
        return Uuid::v4()->toRfc4122();
    }
} 