<?php

namespace App\Form;

use App\Entity\Model;
use App\Entity\PromptTemplate;
use App\Form\PromptTemplateMessageType; // Import the new message type form
use Symfony\Bridge\Doctrine\Form\Type\EntityType;
use Symfony\Component\Form\AbstractType;
use Symfony\Component\Form\Extension\Core\Type\ChoiceType;
use Symfony\Component\Form\Extension\Core\Type\CollectionType; // Import CollectionType
use Symfony\Component\Form\Extension\Core\Type\TextareaType;
use Symfony\Component\Form\Extension\Core\Type\TextType;
use Symfony\Component\Form\FormBuilderInterface;
use Symfony\Component\OptionsResolver\OptionsResolver;
use Symfony\Component\Security\Core\Authorization\AuthorizationCheckerInterface; // Import AuthorizationCheckerInterface

class PromptTemplateType extends AbstractType
{
    private AuthorizationCheckerInterface $authorizationChecker;

    public function __construct(AuthorizationCheckerInterface $authorizationChecker)
    {
        $this->authorizationChecker = $authorizationChecker;
    }

    public function buildForm(FormBuilderInterface $builder, array $options): void
    {
        $builder
            ->add('name', TextType::class, [
                'label' => 'Template Name',
                'attr' => ['class' => 'mt-1 block w-full rounded-md border-gray-300 shadow-sm focus:border-indigo-300 focus:ring focus:ring-indigo-200 focus:ring-opacity-50 dark:bg-gray-700 dark:border-gray-600 dark:text-white'],
            ])
            ->add('description', TextareaType::class, [
                'label' => 'Description (Optional)',
                'required' => false,
                'attr' => [
                    'rows' => 3,
                    'class' => 'mt-1 block w-full rounded-md border-gray-300 shadow-sm focus:border-indigo-300 focus:ring focus:ring-indigo-200 focus:ring-opacity-50 dark:bg-gray-700 dark:border-gray-600 dark:text-white',
                     'placeholder' => 'Briefly describe what this template is for.'
                     ],
             ])
            // Remove templateText, replace with messages collection
            ->add('messages', CollectionType::class, [
                'entry_type' => PromptTemplateMessageType::class,
                'entry_options' => ['label' => false], // Don't label each message form individually
                'allow_add' => true,        // Allow adding new messages via JS
                'allow_delete' => true,     // Allow deleting messages via JS
                'by_reference' => false,    // Ensure adder/remover methods are called on PromptTemplate entity
                'label' => 'Template Messages',
                'label_attr' => ['class' => 'block text-lg font-medium text-gray-700 dark:text-gray-300 mb-2'],
                'attr' => [
                    'class' => 'prompt-template-messages-collection space-y-4', // Class for JS targeting and styling
                    // Data attributes for Stimulus/JS collection handling
                    'data-controller' => 'form-collection',
                    'data-form-collection-add-label-value' => 'Add Message',
                    'data-form-collection-delete-label-value' => 'Remove',
                ],
            ])
            ->add('associatedModel', EntityType::class, [
                'class' => Model::class,
                'choice_label' => 'name', // Assuming Model entity has a 'name' property
                'label' => 'Associated AI Model',
                'placeholder' => 'Select a model',
                'attr' => ['class' => 'mt-1 block w-full rounded-md border-gray-300 shadow-sm focus:border-indigo-300 focus:ring focus:ring-indigo-200 focus:ring-opacity-50 dark:bg-gray-700 dark:border-gray-600 dark:text-white'],
            ]);

        // Only allow setting scope to 'organization' if user is ORG_ADMIN or ADMIN
        if ($this->authorizationChecker->isGranted('ROLE_ORGANIZATION_ADMIN')) {
             $builder->add('scope', ChoiceType::class, [
                'label' => 'Scope',
                'choices' => [
                    'Private (Only you can see this)' => PromptTemplate::SCOPE_PRIVATE,
                    'Organization (Visible to everyone in your organization)' => PromptTemplate::SCOPE_ORGANIZATION,
                ],
                'expanded' => true, // Render as radio buttons
                'multiple' => false,
                'attr' => ['class' => 'space-y-2'], // Add some spacing for radio buttons
                'label_attr' => ['class' => 'text-sm font-medium text-gray-700 dark:text-gray-300'],
                'choice_attr' => function($choice, $key, $value) {
                    return ['class' => 'mr-2 dark:text-gray-300'];
                },
            ]);
        } else {
             // For regular users, scope is always private, maybe hide the field or set it automatically
             // For simplicity, we can omit the field, and set the scope in the controller.
             // Or add a hidden field if needed. Let's omit for now.
        }
    }

    public function configureOptions(OptionsResolver $resolver): void
    {
        $resolver->setDefaults([
            'data_class' => PromptTemplate::class,
        ]);
    }
}
