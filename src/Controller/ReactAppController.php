<?php

namespace App\Controller;

use Symfony\Bundle\FrameworkBundle\Controller\AbstractController;
use Symfony\Component\HttpFoundation\Response;
use Symfony\Component\Routing\Annotation\Route;
use Symfony\Bundle\SecurityBundle\Security;
use Symfony\Component\HttpFoundation\RequestStack;

/**
 * Controller responsible for serving the React Single Page Application.
 * Handles all non-API routes and serves the main React application.
 */
class ReactAppController extends AbstractController
{
    public function __construct(
        private readonly Security $security,
        private readonly RequestStack $requestStack
    ) {}

    #[Route('/', name: 'app_home')]
    #[Route('/app/{reactRouting}', name: 'app_react', defaults: ['reactRouting' => null], requirements: ['reactRouting' => '^(?!api|admin).+'])]
    #[Route('/app/callback', name: 'app_callback')]
    public function index(): Response
    {
        // Always show landing page for non-authenticated users
        if (!$this->security->isGranted('IS_AUTHENTICATED_FULLY')) {
            return $this->render('landing/index.html.twig', [], new Response('', Response::HTTP_OK, ['X-Template' => 'base_public.html.twig']));
        }

        // For authenticated users, always show the React app
        return $this->render('react_app/index.html.twig', [], new Response('', Response::HTTP_OK, ['X-Template' => 'base_app.html.twig']));
    }
}