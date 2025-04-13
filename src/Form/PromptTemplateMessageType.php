<?php

namespace App\Form;

use App\Entity\PromptTemplateMessage;
use Symfony\Component\Form\AbstractType;
use Symfony\Component\Form\Extension\Core\Type\ChoiceType;
use Symfony\Component\Form\Extension\Core\Type\HiddenType;
use Symfony\Component\Form\Extension\Core\Type\TextareaType;
use Symfony\Component\Form\FormBuilderInterface;
use Symfony\Component\OptionsResolver\OptionsResolver;

class PromptTemplateMessageType extends AbstractType
{
    public function buildForm(FormBuilderInterface $builder, array $options): void
    {
        $builder
            ->add('role', ChoiceType::class, [
                'label' => 'Role',
                'choices' => [
                    'System' => PromptTemplateMessage::ROLE_SYSTEM,
                    'User' => PromptTemplateMessage::ROLE_USER,
                    'Assistant' => PromptTemplateMessage::ROLE_ASSISTANT,
                ],
                'attr' => ['class' => 'form-select rounded-md shadow-sm dark:bg-gray-700 dark:border-gray-600 dark:text-white'],
                'label_attr' => ['class' => 'block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1'],
            ])
            ->add('contentTemplate', TextareaType::class, [
                'label' => 'Content Template',
                'attr' => [
                    'rows' => 5,
                    'class' => 'form-textarea mt-1 block w-full rounded-md border-gray-300 shadow-sm focus:border-indigo-300 focus:ring focus:ring-indigo-200 focus:ring-opacity-50 dark:bg-gray-700 dark:border-gray-600 dark:text-white font-mono',
                    'placeholder' => 'Enter message content. Use {{ variable_name }} for variables.'
                ],
                 'label_attr' => ['class' => 'block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1'],
            ])
            // Sort order will likely be handled by drag-and-drop in the UI,
            // but we can include it as a hidden field for submission.
            ->add('sortOrder', HiddenType::class, [
                'attr' => ['class' => 'prompt-template-message-sort-order'] // Class for JS targeting
            ]);
    }

    public function configureOptions(OptionsResolver $resolver): void
    {
        $resolver->setDefaults([
            'data_class' => PromptTemplateMessage::class,
        ]);
    }
}
