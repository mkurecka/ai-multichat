<?php

namespace App\Controller;

use Symfony\Bundle\FrameworkBundle\Controller\AbstractController;
use Symfony\Component\HttpFoundation\Response;
use Symfony\Component\Routing\Annotation\Route;
use Symfony\Component\Security\Http\Attribute\IsGranted;

class AppMobileController extends AbstractController
{
    #[Route('/app/mobile', name: 'app_mobile')]
    #[IsGranted('IS_AUTHENTICATED_FULLY')] // Ensure user is logged in
    public function index(): Response
    {
        // Just render the mobile template with the necessary URLs for client-side switching
        return $this->render('app/index_mobile.html.twig', [
            'current_layout' => 'mobile',
            'mobile_url' => $this->generateUrl('app_mobile'),
            'desktop_url' => $this->generateUrl('app_main'),
        ]);
    }
}
