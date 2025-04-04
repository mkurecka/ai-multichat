<?php

namespace App\EventListener;

use Psr\Log\LoggerInterface;
use Symfony\Component\EventDispatcher\EventSubscriberInterface;
use Symfony\Component\HttpKernel\Event\ResponseEvent;
use Symfony\Component\HttpKernel\KernelEvents;

class RedirectListener implements EventSubscriberInterface
{
    private LoggerInterface $logger;

    public function __construct(LoggerInterface $logger)
    {
        $this->logger = $logger;
    }

    public static function getSubscribedEvents(): array
    {
        return [
            KernelEvents::RESPONSE => 'onKernelResponse',
        ];
    }

    public function onKernelResponse(ResponseEvent $event): void
    {
        $response = $event->getResponse();
        $request = $event->getRequest();
        
        // Log only redirects
        if ($response->isRedirection()) {
            $this->logger->info('Redirect detected', [
                'from' => $request->getUri(),
                'to' => $response->headers->get('Location'),
                'status_code' => $response->getStatusCode(),
                'method' => $request->getMethod(),
                'client_ip' => $request->getClientIp(),
                'user_agent' => $request->headers->get('User-Agent'),
                'referer' => $request->headers->get('Referer'),
            ]);
        }
    }
}
