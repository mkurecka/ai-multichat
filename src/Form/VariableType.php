<?php

namespace App\Form;

use App\Entity\Organization;
use App\Entity\Variable;
use Symfony\Component\Form\AbstractType;
use Symfony\Component\Form\Extension\Core\Type\ChoiceType;
use Symfony\Component\Form\Extension\Core\Type\TextareaType;
use Symfony\Component\Form\Extension\Core\Type\TextType;
use Symfony\Component\Form\FormBuilderInterface;
use Symfony\Component\OptionsResolver\OptionsResolver;
use Symfony\Component\Security\Core\Authorization\AuthorizationCheckerInterface;
use Symfony\Bundle\SecurityBundle\Security;

class VariableType extends AbstractType
{
    public function __construct(
        private readonly Security $security,
        private readonly AuthorizationCheckerInterface $authorizationChecker
    ) {}

    public function buildForm(FormBuilderInterface $builder, array $options): void
    {
        $builder
            ->add('name', TextType::class, [
                'label' => 'Variable Name',
                'attr' => ['placeholder' => 'e.g., API_KEY or user_preference'],
            ])
            ->add('value', TextareaType::class, [
                'label' => 'Variable Value',
                'attr' => ['rows' => 5],
            ]);

        // Add owner type selection for organization admins
        if ($this->authorizationChecker->isGranted('ROLE_ORGANIZATION_ADMIN')) {
            $user = $this->security->getUser();
            $organization = $user?->getOrganization();

            if ($organization instanceof Organization) {
                $builder->add('ownerType', ChoiceType::class, [
                    'mapped' => false,
                    'label' => 'Variable Owner',
                    'choices' => [
                        'User (Personal)' => 'user',
                        sprintf('Organization (%s)', $organization->getName()) => 'organization',
                    ],
                    'expanded' => true,
                    'multiple' => false,
                    'data' => $options['owner_type'] ?? 'user',
                    'help' => 'User variables are only accessible to you. Organization variables are accessible to all members of your organization.',
                    'help_attr' => ['class' => 'text-sm text-gray-500 mt-1'],
                ]);
            }
        }
    }

    public function configureOptions(OptionsResolver $resolver): void
    {
        $resolver->setDefaults([
            'data_class' => Variable::class,
            'owner_type' => 'user', // Default owner type
        ]);

        $resolver->setAllowedTypes('owner_type', 'string');
        $resolver->setAllowedValues('owner_type', ['user', 'organization']);
    }
}
