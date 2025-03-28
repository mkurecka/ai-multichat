<?php

namespace App\Controller;

use App\Service\ModelService;
use App\Service\ChatService;
use Symfony\Bundle\FrameworkBundle\Controller\AbstractController;
use Symfony\Component\HttpFoundation\Response;
use Symfony\Component\HttpFoundation\Session\SessionInterface;
use Symfony\Component\Routing\Annotation\Route;

class HomeController extends AbstractController
{
    public function __construct(
        private ModelService $modelService,
        private ChatService $chatService,
        private SessionInterface $session
    ) {}

    #[Route('/', name: 'app_home')]
    public function index(): Response
    {
        $models = $this->modelService->getModels();
        if ($this->getUser()) {
            $chatHistory = $this->chatService->getChatHistory($this->getUser());
        } else {
            $chatHistory = [];
        }

        // Get the JWT token from the session
        $jwtToken = $this->session->get('jwt_token');

        return $this->render('home/index.html.twig', [
            'models' => $models,
            'chatHistory' => $chatHistory,
            'currentSessionId' => null, // Will be set by JavaScript when a chat is selected
            'jwt_token' => $jwtToken
        ]);
    }
}
