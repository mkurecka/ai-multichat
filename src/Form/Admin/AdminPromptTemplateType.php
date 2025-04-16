<?php

namespace App\Form\Admin;

use App\Entity\Model;
use App\Entity\PromptTemplate;
use App\Form\PromptTemplateMessageType; // Use the message type form
use App\Repository\ModelRepository;
use Symfony\Bridge\Doctrine\Form\Type\EntityType;
use Symfony\Component\Form\AbstractType;
use Symfony\Component\Form\Extension\Core\Type\ChoiceType;
use Symfony\Component\Form\Extension\Core\Type\CollectionType;
use Symfony\Component\Form\Extension\Core\Type\TextareaType;
use Symfony\Component\Form\Extension\Core\Type\TextType;
use Symfony\Component\Form\FormBuilderInterface;
use Symfony\Component\OptionsResolver\OptionsResolver;

class AdminPromptTemplateType extends AbstractType
{
    public function __construct(private readonly ModelRepository $modelRepository) {}

    public function buildForm(FormBuilderInterface $builder, array $options): void
    {
        $builder
            ->add('name', TextType::class, [
                'label' => 'Template Name',
                'required' => true,
                'attr' => [
                    'class' => 'mt-1 block w-full rounded-md border-gray-300 shadow-sm focus:border-indigo-500 focus:ring-indigo-500 sm:text-sm',
                    'placeholder' => 'Enter template name'
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
            ])
            ->add('scope', ChoiceType::class, [
                'label' => 'Visibility Scope',
                'choices' => [
                    'Private (Only You)' => PromptTemplate::SCOPE_PRIVATE,
                    'Organization' => PromptTemplate::SCOPE_ORGANIZATION,
                ],
                'required' => true,
                'attr' => ['class' => 'mt-1 block w-full rounded-md border-gray-300 shadow-sm focus:border-indigo-500 focus:ring-indigo-500 sm:text-sm'],
                'label_attr' => ['class' => 'block text-sm font-medium text-gray-700'],
                'help' => 'Private templates are only visible to you. Organization templates are visible to all members of your organization.',
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
                'by_reference' => false,
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
    }

    public function configureOptions(OptionsResolver $resolver): void
    {
        $resolver->setDefaults([
            'data_class' => PromptTemplate::class,
        ]);
    }
}
