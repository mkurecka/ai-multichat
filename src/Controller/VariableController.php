<?php

namespace App\Controller;

use App\Entity\User;
use App\Entity\Variable;
use App\Form\VariableType;
use App\Repository\VariableRepository;
use Doctrine\ORM\EntityManagerInterface;
use Symfony\Bundle\FrameworkBundle\Controller\AbstractController;
use Symfony\Component\HttpFoundation\Request;
use Symfony\Component\HttpFoundation\Response;
use Symfony\Component\Routing\Attribute\Route;
use Symfony\Component\Security\Http\Attribute\IsGranted;

#[Route('/variables')]
#[IsGranted('IS_AUTHENTICATED_FULLY')] // Ensure user is logged in
class VariableController extends AbstractController
{
    #[Route('/', name: 'app_variable_index', methods: ['GET'])]
    public function index(VariableRepository $variableRepository): Response
    {
        /** @var User $user */
        $user = $this->getUser();
        if (!$user) {
            // Should not happen due to IsGranted, but good practice
            return $this->redirectToRoute('app_login'); // Or your login route
        }

        // Fetch only variables belonging to the current user
        $userVariables = $variableRepository->findBy(['user' => $user]);

        return $this->render('variable/index.html.twig', [
            'variables' => $userVariables,
        ]);
    }

    #[Route('/new', name: 'app_variable_new', methods: ['GET', 'POST'])]
    public function new(Request $request, EntityManagerInterface $entityManager): Response
    {
        /** @var User $user */
        $user = $this->getUser();
        if (!$user) {
            return $this->redirectToRoute('app_login');
        }

        $variable = new Variable();
        $variable->setUser($user); // Associate with the current user

        $form = $this->createForm(VariableType::class, $variable);
        $form->handleRequest($request);

        if ($form->isSubmitted() && $form->isValid()) {
            // Ensure it's not accidentally assigned to an organization
            $variable->setOrganization(null);

            // Manually set timestamps before persisting
            $now = new \DateTimeImmutable();
            if ($variable->getCreatedAt() === null) {
                 $variable->setCreatedAt($now);
            }
            if ($variable->getUpdatedAt() === null) {
                 $variable->setUpdatedAt($now);
            }
            $entityManager->persist($variable);
            $entityManager->flush();

            $this->addFlash('success', 'Variable created successfully.');

            return $this->redirectToRoute('app_variable_index', [], Response::HTTP_SEE_OTHER);
        }

        return $this->render('variable/new.html.twig', [
            'variable' => $variable,
            'form' => $form,
        ]);
    }

    #[Route('/{id}/edit', name: 'app_variable_edit', methods: ['GET', 'POST'])]
    public function edit(Request $request, Variable $variable, EntityManagerInterface $entityManager): Response
    {
        /** @var User $user */
        $user = $this->getUser();
        if (!$user || $variable->getUser() !== $user) {
            // Deny access if the variable doesn't belong to the current user
            $this->addFlash('error', 'You are not authorized to edit this variable.');
            return $this->redirectToRoute('app_variable_index');
            // Or throw $this->createAccessDeniedException('You cannot edit this variable.');
        }

        $form = $this->createForm(VariableType::class, $variable);
        $form->handleRequest($request);

        if ($form->isSubmitted() && $form->isValid()) {
            // Ensure it remains associated with the user and not an organization
            $variable->setUser($user);
            $variable->setOrganization(null);

            $entityManager->flush();

            $this->addFlash('success', 'Variable updated successfully.');

            return $this->redirectToRoute('app_variable_index', [], Response::HTTP_SEE_OTHER);
        }

        return $this->render('variable/edit.html.twig', [
            'variable' => $variable,
            'form' => $form,
        ]);
    }

    #[Route('/{id}', name: 'app_variable_delete', methods: ['POST'])]
    public function delete(Request $request, Variable $variable, EntityManagerInterface $entityManager): Response
    {
        /** @var User $user */
        $user = $this->getUser();
        if (!$user || $variable->getUser() !== $user) {
            $this->addFlash('error', 'You are not authorized to delete this variable.');
            return $this->redirectToRoute('app_variable_index');
            // Or throw $this->createAccessDeniedException('You cannot delete this variable.');
        }

        if ($this->isCsrfTokenValid('delete'.$variable->getId(), $request->request->get('_token'))) {
            $entityManager->remove($variable);
            $entityManager->flush();
            $this->addFlash('success', 'Variable deleted successfully.');
        } else {
            $this->addFlash('error', 'Invalid CSRF token.');
        }

        return $this->redirectToRoute('app_variable_index', [], Response::HTTP_SEE_OTHER);
    }
}
