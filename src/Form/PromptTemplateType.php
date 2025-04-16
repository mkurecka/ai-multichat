<?php

namespace App\Form;

use App\Entity\Model;
use App\Entity\Organization;
use App\Entity\PromptTemplate;
use App\Repository\ModelRepository;
use Symfony\Bridge\Doctrine\Form\Type\EntityType;
use Symfony\Component\Form\AbstractType;
use Symfony\Component\Form\Extension\Core\Type\ChoiceType;
use Symfony\Component\Form\Extension\Core\Type\CollectionType;
use Symfony\Component\Form\Extension\Core\Type\TextareaType;
use Symfony\Component\Form\Extension\Core\Type\TextType;
use Symfony\Component\Form\FormBuilderInterface;
use Symfony\Component\OptionsResolver\OptionsResolver;
use Symfony\Component\Security\Core\Authorization\AuthorizationCheckerInterface;
use Symfony\Bundle\SecurityBundle\Security;

class PromptTemplateType extends AbstractType
{
    public function __construct(
        private readonly ModelRepository $modelRepository,
        private readonly Security $security,
        private readonly AuthorizationCheckerInterface $authorizationChecker
    ) {}

    public function buildForm(FormBuilderInterface $builder, array $options): void
    {
        $builder
            ->add('name', TextType::class, [
                'label' => 'Template Name',
                'required' => true,
                'attr' => [
                    'class' => 'mt-1 block w-full rounded-md border-gray-300 shadow-sm focus:border-indigo-500 focus:ring-indigo-500 sm:text-sm',
                    'placeholder' => 'Enter a descriptive name for your template'
                ],
                'label_attr' => ['class' => 'block text-sm font-medium text-gray-700'],
            ])
            ->add('description', TextareaType::class, [
                'label' => 'Description (Optional)',
                'required' => false,
                'attr' => [
                    'rows' => 3,
                    'class' => 'mt-1 block w-full rounded-md border-gray-300 shadow-sm focus:border-indigo-500 focus:ring-indigo-500 sm:text-sm',
                    'placeholder' => 'Describe the purpose of this template'
                ],
                'label_attr' => ['class' => 'block text-sm font-medium text-gray-700'],
                'help' => 'A clear description helps you remember what this template is for',
                'help_attr' => ['class' => 'mt-1 text-sm text-gray-500'],
            ])
            ->add('associatedModel', EntityType::class, [
                'class' => Model::class,
                'choice_label' => 'name',
                'label' => 'Associated Model',
                'placeholder' => 'Select a model',
                'required' => true,
                'query_builder' => $this->modelRepository->findEnabledModelsQueryBuilder(),
                'attr' => ['class' => 'mt-1 block w-full rounded-md border-gray-300 shadow-sm focus:border-indigo-500 focus:ring-indigo-500 sm:text-sm'],
                'label_attr' => ['class' => 'block text-sm font-medium text-gray-700'],
                'help' => 'Select the AI model this template is designed for',
                'help_attr' => ['class' => 'mt-1 text-sm text-gray-500'],
            ])
            ->add('messages', CollectionType::class, [
                'entry_type' => PromptTemplateMessageType::class,
                'entry_options' => ['label' => false],
                'allow_add' => true,
                'allow_delete' => true,
                'by_reference' => false, // Important for Doctrine relationship management
                'label' => 'Messages',
                'label_attr' => ['class' => 'block text-lg font-medium text-gray-700 mb-2'],
                'help' => 'Define the sequence of messages for this template. Use {{variable_name}} syntax to insert variables.',
                'help_attr' => ['class' => 'mt-1 text-sm text-gray-500'],
                'attr' => [
                    'data-controller' => 'form-collection',
                    'data-form-collection-add-label-value' => 'Add Message',
                    'data-form-collection-delete-label-value' => 'Remove',
                    'class' => 'space-y-4'
                ],
            ]);

        // Add owner type selection for organization admins
        if ($options['is_org_admin'] ?? false) {
            $user = $this->security->getUser();
            $organization = $user?->getOrganization();

            if ($organization instanceof Organization) {
                $builder->add('ownerType', ChoiceType::class, [
                    'mapped' => false,
                    'label' => 'Template Owner',
                    'choices' => [
                        'User (Personal)' => 'user',
                        sprintf('Organization (%s)', $organization->getName()) => 'organization',
                    ],
                    'expanded' => true,
                    'multiple' => false,
                    'data' => $options['owner_type'] ?? 'user',
                    'help' => 'User templates are only accessible to you. Organization templates are accessible to all members of your organization.',
                    'help_attr' => ['class' => 'text-sm text-gray-500 mt-1'],
                ]);
            }
        }
    }

    public function configureOptions(OptionsResolver $resolver): void
    {
        $resolver->setDefaults([
            'data_class' => PromptTemplate::class,
            'is_org_admin' => false,
            'owner_type' => 'user',
        ]);

        $resolver->setAllowedTypes('is_org_admin', 'bool');
        $resolver->setAllowedTypes('owner_type', 'string');
        $resolver->setAllowedValues('owner_type', ['user', 'organization']);
    }
}
