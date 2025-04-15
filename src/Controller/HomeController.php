<?php

namespace App\Controller;

use Symfony\Bundle\FrameworkBundle\Controller\AbstractController;
use Symfony\Component\HttpFoundation\RedirectResponse;
use Symfony\Component\HttpFoundation\Response;
use Symfony\Component\Routing\Annotation\Route;
use Symfony\Component\Security\Http\Attribute\IsGranted;

class HomeController extends AbstractController
{
    #[Route('/', name: 'app_home')]
    public function index(): Response
    {
        // Check if the user is authenticated
        if ($this->getUser()) {
            // User is authenticated, redirect to the app route
            return $this->redirectToRoute('app_main');
        }

        // User is not authenticated, render the homepage
        return $this->render('home/index.html.twig');
    }
}
