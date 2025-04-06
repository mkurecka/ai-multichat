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
    // Removed Security and RequestStack dependencies as they are no longer needed here

    /**
     * Serves the public landing page.
     */
    #[Route('/', name: 'app_home', methods: ['GET'])]
    public function landing(): Response
    {
        // This route is configured for PUBLIC_ACCESS in security.yaml
        return $this->render('landing/index.html.twig', [], new Response('', Response::HTTP_OK, ['X-Template' => 'base_public.html.twig']));
    }

    /**
     * Serves the main React application shell for all /app/... routes.
     * Access control (requiring ROLE_USER) is handled by the 'main' firewall in security.yaml.
     * React Router (BrowserRouter with basename="/app") handles client-side routing beyond this point.
     */
    #[Route('/app/{reactRouting}', name: 'app_react', defaults: ['reactRouting' => null], requirements: ['reactRouting' => '.+'], methods: ['GET'])] // Allow any character after /app/
    #[Route('/app', name: 'app_react_base', methods: ['GET'])] // Explicitly handle /app base route
    public function index(): Response
    {
        // This route is configured for ROLE_USER in security.yaml
        // Always render the React app shell; authentication is checked by the firewall.
        return $this->render('react_app/index.html.twig', [], new Response('', Response::HTTP_OK, ['X-Template' => 'base_app.html.twig']));
    }

    /**
     * Handles the OAuth callback.
     * This route needs to be PUBLIC_ACCESS in security.yaml as the user isn't fully authenticated yet.
     * The GoogleAuthenticator handles the logic and redirects.
     */
     #[Route('/app/callback', name: 'app_callback', methods: ['GET'])]
     public function callback(): Response
     {
         // This action might not even be strictly necessary if GoogleAuthenticator
         // and GoogleController handle the redirect properly.
         // However, having an explicit route ensures it's matched.
         // We render the React app shell here too, as the GoogleController
         // will redirect *back* to the frontend with the token (e.g., /app/callback?token=...).
         // The React Callback component then handles the token.
         return $this->render('react_app/index.html.twig', [], new Response('', Response::HTTP_OK, ['X-Template' => 'base_app.html.twig']));
     }
}
