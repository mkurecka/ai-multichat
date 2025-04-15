<?php

namespace App\Form\Admin;

use App\Entity\Model;
use App\Entity\Organization;
use App\Entity\PromptTemplate;
use App\Entity\User;
use App\Form\PromptTemplateMessageType;
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
    public function buildForm(FormBuilderInterface $builder, array $options): void
    {
        $builder
            ->add('name', TextType::class, [
                'label' => 'Template Name',
                'attr' => ['class' => 'mt-1 block w-full rounded-md border-gray-300 shadow-sm focus:border-indigo-300 focus:ring focus:ring-indigo-200 focus:ring-opacity-50'],
            ])
            ->add('description', TextareaType::class, [
                'label' => 'Description',
                'required' => false,
                'attr' => [
                    'rows' => 3,
                    'class' => 'mt-1 block w-full rounded-md border-gray-300 shadow-sm focus:border-indigo-300 focus:ring focus:ring-indigo-200 focus:ring-opacity-50',
                    'placeholder' => 'Briefly describe what this template is for.'
                ],
            ])
            ->add('messages', CollectionType::class, [
                'entry_type' => PromptTemplateMessageType::class,
                'entry_options' => ['label' => false],
                'allow_add' => true,
                'allow_delete' => true,
                'by_reference' => false,
                'label' => 'Template Messages',
                'label_attr' => ['class' => 'block text-lg font-medium text-gray-700 mb-2'],
                'attr' => [
                    'class' => 'prompt-template-messages-collection space-y-4',
                    'data-controller' => 'form-collection',
                    'data-form-collection-add-label-value' => 'Add Message',
                    'data-form-collection-delete-label-value' => 'Remove',
                ],
            ])
            ->add('associatedModel', EntityType::class, [
                'class' => Model::class,
                'choice_label' => 'name',
                'label' => 'Associated AI Model',
                'placeholder' => 'Select a model',
                'attr' => ['class' => 'mt-1 block w-full rounded-md border-gray-300 shadow-sm focus:border-indigo-300 focus:ring focus:ring-indigo-200 focus:ring-opacity-50'],
            ])
            ->add('scope', ChoiceType::class, [
                'label' => 'Scope',
                'choices' => [
                    'Private' => PromptTemplate::SCOPE_PRIVATE,
                    'Organization' => PromptTemplate::SCOPE_ORGANIZATION,
                ],
                'expanded' => true,
                'multiple' => false,
                'attr' => ['class' => 'space-y-2'],
                'label_attr' => ['class' => 'text-sm font-medium text-gray-700'],
                'choice_attr' => function($choice, $key, $value) {
                    return ['class' => 'mr-2'];
                },
            ])
            ->add('owner', EntityType::class, [
                'class' => User::class,
                'choice_label' => 'email',
                'label' => 'Owner',
                'placeholder' => 'Select an owner',
                'attr' => ['class' => 'mt-1 block w-full rounded-md border-gray-300 shadow-sm focus:border-indigo-300 focus:ring focus:ring-indigo-200 focus:ring-opacity-50'],
            ])
            ->add('organization', EntityType::class, [
                'class' => Organization::class,
                'choice_label' => 'domain',
                'label' => 'Organization',
                'placeholder' => 'Select an organization',
                'attr' => ['class' => 'mt-1 block w-full rounded-md border-gray-300 shadow-sm focus:border-indigo-300 focus:ring focus:ring-indigo-200 focus:ring-opacity-50'],
            ]);
    }

    public function configureOptions(OptionsResolver $resolver): void
    {
        $resolver->setDefaults([
            'data_class' => PromptTemplate::class,
        ]);
    }
}
