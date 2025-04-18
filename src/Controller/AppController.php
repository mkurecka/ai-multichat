<?php

namespace App\Controller;

use Symfony\Bundle\FrameworkBundle\Controller\AbstractController;
use Symfony\Component\HttpFoundation\Request;
use Symfony\Component\HttpFoundation\Response;
use Symfony\Component\Routing\Annotation\Route;
use Symfony\Component\Security\Http\Attribute\IsGranted;

class AppController extends AbstractController
{
    #[Route('/app', name: 'app_main')]
    #[IsGranted('IS_AUTHENTICATED_FULLY')] // Ensure user is logged in
    public function index(Request $request): Response
    {
        // We'll let client-side detection handle the redirection
        // Just render the desktop template with the necessary URLs for client-side switching
        return $this->render('app/index.html.twig', [
            'current_layout' => 'desktop',
            'mobile_url' => $this->generateUrl('app_mobile'),
            'desktop_url' => $this->generateUrl('app_main'),
        ]);
    }
}
