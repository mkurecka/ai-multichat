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
                'choices' => [
                    'System' => 'system',
                    'User' => 'user',
                    'Assistant' => 'assistant',
                ],
                'label' => 'Role',
                'label_attr' => ['class' => 'block text-sm font-medium text-gray-700'],
                'attr' => ['class' => 'mt-1 block w-full rounded-md border-gray-300 shadow-sm focus:border-indigo-500 focus:ring-indigo-500 sm:text-sm'],
            ])
            // Corrected field name to match entity property
            ->add('contentTemplate', TextareaType::class, [
                'label' => 'Content',
                'label_attr' => ['class' => 'block text-sm font-medium text-gray-700'],
                'attr' => [
                    'rows' => 3,
                    'class' => 'mt-1 block w-full rounded-md border-gray-300 shadow-sm focus:border-indigo-500 focus:ring-indigo-500 sm:text-sm',
                    'placeholder' => 'Enter message content. Use {{variable_name}} for variables.',
                ],
                'required' => true,
            ])
             // Add sortOrder as a hidden field, managed by JS or default logic
            ->add('sortOrder', HiddenType::class, [
                'attr' => ['class' => 'message-sort-order hidden'],
            ]);
        ; // Keep the semicolon here
    }

    public function configureOptions(OptionsResolver $resolver): void
    {
        $resolver->setDefaults([
            'data_class' => PromptTemplateMessage::class,
        ]);
    }
}
