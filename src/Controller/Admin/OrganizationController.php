<?php

namespace App\Controller\Admin;

use App\Entity\Organization;
use App\Entity\Variable;
use App\Form\VariableType;
use App\Repository\OrganizationRepository;
use App\Repository\VariableRepository;
use Doctrine\ORM\EntityManagerInterface;
use Symfony\Bundle\FrameworkBundle\Controller\AbstractController;
use Symfony\Component\HttpFoundation\Request;
use Symfony\Component\HttpFoundation\Response;
use Symfony\Component\Routing\Attribute\Route;
use Symfony\Component\Security\Http\Attribute\IsGranted;

#[Route('/admin/organization')]
#[IsGranted('ROLE_ADMIN')] // Secure the whole controller for admins
class OrganizationController extends AbstractController
{
    #[Route('/', name: 'admin_organization_index', methods: ['GET'])]
    public function index(OrganizationRepository $organizationRepository): Response
    {
        return $this->render('admin/organization/index.html.twig', [
            'organizations' => $organizationRepository->findAll(), // Consider pagination for large numbers
        ]);
    }

    #[Route('/{id}', name: 'admin_organization_show', methods: ['GET'])]
    public function show(Organization $organization, VariableRepository $variableRepository): Response
    {
        // Fetch variables specifically for this organization
        $organizationVariables = $variableRepository->findBy(['organization' => $organization]);

        return $this->render('admin/organization/show.html.twig', [
            'organization' => $organization,
            'variables' => $organizationVariables,
        ]);
    }

    #[Route('/{orgId}/variable/new', name: 'admin_organization_variable_new', methods: ['GET', 'POST'])]
    public function newVariable(
        Request $request,
        EntityManagerInterface $entityManager,
        OrganizationRepository $organizationRepository,
        int $orgId // Use route parameter name
    ): Response {
        $organization = $organizationRepository->find($orgId);
        if (!$organization) {
            throw $this->createNotFoundException('Organization not found');
        }

        $variable = new Variable();
        $variable->setOrganization($organization); // Pre-associate with the organization

        $form = $this->createForm(VariableType::class, $variable);
        $form->handleRequest($request);

        if ($form->isSubmitted() && $form->isValid()) {
            // Manually set timestamps before persisting, as Gedmo might not be firing
            $now = new \DateTimeImmutable();
            if ($variable->getCreatedAt() === null) {
                 $variable->setCreatedAt($now);
            }
            if ($variable->getUpdatedAt() === null) { // Also set updatedAt on creation
                 $variable->setUpdatedAt($now);
            }
            $entityManager->persist($variable);
            $entityManager->flush();

            $this->addFlash('success', 'Variable created successfully.');

            return $this->redirectToRoute('admin_organization_show', ['id' => $organization->getId()], Response::HTTP_SEE_OTHER);
        }

        return $this->render('admin/organization/variable_new.html.twig', [
            'organization' => $organization,
            'variable' => $variable,
            'form' => $form,
        ]);
    }

    #[Route('/{orgId}/variable/{id}/edit', name: 'admin_organization_variable_edit', methods: ['GET', 'POST'])]
    public function editVariable(
        Request $request,
        Variable $variable, // ParamConverter fetches the Variable by {id}
        EntityManagerInterface $entityManager,
        OrganizationRepository $organizationRepository,
        int $orgId // Still need orgId for context and redirection
    ): Response {
        $organization = $organizationRepository->find($orgId);
        if (!$organization || $variable->getOrganization() !== $organization) {
            // Ensure the variable belongs to the specified organization
            throw $this->createNotFoundException('Variable or Organization not found for this context.');
        }

        $form = $this->createForm(VariableType::class, $variable);
        $form->handleRequest($request);

        if ($form->isSubmitted() && $form->isValid()) {
            $entityManager->flush();

            $this->addFlash('success', 'Variable updated successfully.');

            return $this->redirectToRoute('admin_organization_show', ['id' => $organization->getId()], Response::HTTP_SEE_OTHER);
        }

        return $this->render('admin/organization/variable_edit.html.twig', [
            'organization' => $organization,
            'variable' => $variable,
            'form' => $form,
        ]);
    }

    #[Route('/{orgId}/variable/{id}', name: 'admin_organization_variable_delete', methods: ['POST'])]
    public function deleteVariable(
        Request $request,
        Variable $variable,
        EntityManagerInterface $entityManager,
        OrganizationRepository $organizationRepository,
        int $orgId
    ): Response {
        $organization = $organizationRepository->find($orgId);
        if (!$organization || $variable->getOrganization() !== $organization) {
            throw $this->createNotFoundException('Variable or Organization not found for this context.');
        }

        if ($this->isCsrfTokenValid('delete'.$variable->getId(), $request->request->get('_token'))) {
            $entityManager->remove($variable);
            $entityManager->flush();
            $this->addFlash('success', 'Variable deleted successfully.');
        } else {
             $this->addFlash('error', 'Invalid CSRF token.');
        }


        return $this->redirectToRoute('admin_organization_show', ['id' => $organization->getId()], Response::HTTP_SEE_OTHER);
    }
}
