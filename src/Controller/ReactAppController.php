<?php

namespace App\Controller;

use Symfony\Bundle\FrameworkBundle\Controller\AbstractController;
use Symfony\Component\HttpFoundation\Response;
use Symfony\Component\Routing\Annotation\Route;

class ReactAppController extends AbstractController
{
    #[Route('/app/{reactRouting}', name: 'app_react', defaults: ['reactRouting' => null], requirements: ['reactRouting' => '^(?!api).+'])]
    #[Route('/app/callback', name: 'app_callback')]
    public function index(): Response
    {
        return $this->render('react_app/index.html.twig');
    }
}