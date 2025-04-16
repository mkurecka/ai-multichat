<?php

namespace App\Form;

use App\Entity\Variable;
use Symfony\Component\Form\AbstractType;
use Symfony\Component\Form\Extension\Core\Type\TextareaType;
use Symfony\Component\Form\Extension\Core\Type\TextType;
use Symfony\Component\Form\FormBuilderInterface;
use Symfony\Component\OptionsResolver\OptionsResolver;

class VariableType extends AbstractType
{
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
            ])
            // user and organization are set programmatically in the controller
        ;
    }

    public function configureOptions(OptionsResolver $resolver): void
    {
        $resolver->setDefaults([
            'data_class' => Variable::class,
        ]);
    }
}
