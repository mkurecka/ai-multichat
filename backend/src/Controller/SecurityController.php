<?php

namespace App\Controller;

use Symfony\Bundle\FrameworkBundle\Controller\AbstractController;
use Symfony\Component\Routing\Annotation\Route;

class SecurityController extends AbstractController
{
    #[Route('/login', name: 'app_login')]
    public function login()
    {
        return $this->redirectToRoute('connect_google');
    }

    #[Route('/logout', name: 'app_logout')]
    public function logout()
    {
        // This method can be empty - it will be intercepted by the logout key on your firewall
    }
}