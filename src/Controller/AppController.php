<?php

namespace App\Controller;

use Symfony\Bundle\FrameworkBundle\Controller\AbstractController;
use Symfony\Component\HttpFoundation\Response;
use Symfony\Component\Routing\Annotation\Route;
use Symfony\Component\Security\Http\Attribute\IsGranted;

class AppController extends AbstractController
{
    #[Route('/app', name: 'app_main')]
    #[IsGranted('IS_AUTHENTICATED_FULLY')] // Ensure user is logged in
    public function index(): Response
    {
        // Render the main application template which now contains the Stimulus setup
        return $this->render('app/index.html.twig');
    }
}
