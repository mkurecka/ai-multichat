<?php

namespace App\Event;

use Symfony\Contracts\EventDispatcher\Event;

class OpenRouterRequestCompletedEvent extends Event
{
    public const NAME = 'openrouter.request.completed';

    public function __construct(
        private readonly string $requestId,
        private readonly string $requestReference,
        private readonly ?string $requestType = 'chat'
    ) {}

    public function getRequestId(): string
    {
        return $this->requestId;
    }

    public function getRequestReference(): string
    {
        return $this->requestReference;
    }

    public function getRequestType(): string
    {
        return $this->requestType;
    }
    
} 