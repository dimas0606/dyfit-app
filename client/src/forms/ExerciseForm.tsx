// client/src/forms/ExerciseForm.tsx
import React, { useEffect } from 'react'; 
import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { exerciseFormSchema, ExerciseFormData, gruposMuscularesOptions, categoriasOptions } from '@/lib/validators/exerciseSchema';
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea"; 
import { Checkbox } from "@/components/ui/checkbox"; // Necessário
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select"; 
import { Form, FormControl, FormDescription, FormField, FormItem, FormLabel, FormMessage } from "@/components/ui/form";
import { Loader2 } from 'lucide-react';

// Interface Props
interface ExerciseFormProps {
  onSubmit: (data: ExerciseFormData) => void; 
  isLoading?: boolean;                      
  initialData?: Partial<ExerciseFormData>;  
  isEditing?: boolean;                      
}

export const ExerciseForm: React.FC<ExerciseFormProps> = ({ 
  onSubmit, 
  isLoading = false, 
  initialData = {}, 
  isEditing = false 
}) => {

  const form = useForm<ExerciseFormData>({
    resolver: zodResolver(exerciseFormSchema),
    defaultValues: { 
      nome: initialData?.nome ?? '',
      grupoMuscular: initialData?.grupoMuscular ?? '', 
      descricao: initialData?.descricao ?? '',
      categoria: initialData?.categoria ?? '', 
      imageUrl: initialData?.imageUrl ?? '',
      videoUrl: initialData?.videoUrl ?? '',
      isCustom: initialData?.isCustom ?? false,
    },
  });

  // Comentado pois estava causando problemas, reavaliar se necessário para edição
  /*
  useEffect(() => {
    form.reset({
      nome: initialData?.nome ?? '',
      grupoMuscular: initialData?.grupoMuscular ?? '', 
      descricao: initialData?.descricao ?? '',
      categoria: initialData?.categoria ?? '',
      imageUrl: initialData?.imageUrl ?? '',
      videoUrl: initialData?.videoUrl ?? '',
      isCustom: initialData?.isCustom ?? false,
    });
  }, [initialData, form.reset]); 
  */

  const handleFormSubmit = (data: ExerciseFormData) => {
    console.log("Dados do formulário validados (handleFormSubmit):", data); 
    onSubmit(data); 
  };

  return (
    <Form {...form}>
      <form onSubmit={form.handleSubmit(handleFormSubmit)} className="space-y-6"> 
        
        {/* Nome */}
        <FormField
          control={form.control}
          name="nome"
          render={({ field }) => ( 
            <FormItem>
              <FormLabel>Nome do Exercício *</FormLabel>
              <FormControl><Input placeholder="Ex: Supino Reto com Barra" {...field} /></FormControl>
              <FormMessage /> 
            </FormItem>
           )}
        />

        {/* Grupo Muscular */}
        <FormField
          control={form.control}
          name="grupoMuscular"
          render={({ field }) => (
            <FormItem>
              <FormLabel>Grupo Muscular *</FormLabel>
              <Select onValueChange={field.onChange} value={field.value ?? ""}> 
                <FormControl>
                  <SelectTrigger ref={field.ref}> 
                    <SelectValue placeholder="Selecione o grupo principal" />
                  </SelectTrigger>
                </FormControl>
                <SelectContent>
                  {gruposMuscularesOptions.map((grupo) => (
                    <SelectItem key={grupo} value={grupo}>{grupo}</SelectItem>
                  ))}
                </SelectContent>
              </Select>
              <FormMessage />
            </FormItem>
          )}
        />
        
        {/* Categoria (Select) - DESCOMENTADO */}
         <FormField
          control={form.control}
          name="categoria"
          render={({ field }) => (
            <FormItem>
              <FormLabel>Categoria</FormLabel>
              <Select onValueChange={field.onChange} value={field.value ?? ""}>
                <FormControl>
                   {/* Adicionar ref aqui também por consistência */}
                  <SelectTrigger ref={field.ref}> 
                    <SelectValue placeholder="Selecione uma categoria (opcional)" />
                  </SelectTrigger>
                </FormControl>
                <SelectContent>
                  {categoriasOptions.map((cat) => (
                    <SelectItem key={cat} value={cat}>{cat}</SelectItem>
                  ))}
                </SelectContent>
              </Select>
              <FormMessage />
            </FormItem>
          )}
        />

        {/* Descrição */}
        <FormField
          control={form.control}
          name="descricao"
          render={({ field }) => ( 
             <FormItem>
               <FormLabel>Descrição</FormLabel>
               <FormControl><Textarea placeholder="Instruções..." className="resize-y min-h-[80px]" {...field} /></FormControl>
               <FormMessage />
             </FormItem>
           )}
        />

        {/* URL Imagem - DESCOMENTADO */}
        <FormField
          control={form.control}
          name="imageUrl"
          render={({ field }) => (
            <FormItem>
              <FormLabel>URL da Imagem</FormLabel>
              <FormControl><Input type="url" placeholder="https://exemplo.com/imagem.jpg (opcional)" {...field} /></FormControl>
              <FormMessage />
            </FormItem>
          )}
        />

        {/* URL Vídeo - DESCOMENTADO */}
         <FormField
          control={form.control}
          name="videoUrl"
          render={({ field }) => (
            <FormItem>
              <FormLabel>URL do Vídeo</FormLabel>
              <FormControl><Input type="url" placeholder="https://youtube.com/watch?v=... (opcional)" {...field} /></FormControl>
              <FormMessage />
            </FormItem>
          )}
        />

         {/* Checkbox Personalizado - DESCOMENTADO */}
         <FormField
          control={form.control}
          name="isCustom"
          render={({ field }) => (
            // Usando um layout ligeiramente diferente para Checkbox com FormField
            <FormItem className="flex flex-row items-center space-x-3 space-y-0">
              <FormControl>
                 {/* Passando props específicas do Checkbox */}
                <Checkbox
                  checked={field.value}
                  onCheckedChange={field.onChange} // RHF lida com o valor boolean
                  ref={field.ref} // Passa a ref também
                />
              </FormControl>
              <div className="space-y-1 leading-none">
                 {/* Associando o label ao checkbox corretamente */}
                 <FormLabel htmlFor={field.name} className="cursor-pointer"> 
                   Exercício Personalizado
                 </FormLabel>
                <FormDescription>Marque se este exercício foi criado por você.</FormDescription>
              </div>
               <FormMessage /> {/* Mensagem de erro se houver */}
            </FormItem>
          )}
        />

        {/* Botão Submit */}
        <Button type="submit" disabled={isLoading} className="w-full md:w-auto"> 
          {isLoading ? (<><Loader2 className="mr-2 h-4 w-4 animate-spin" />Salvando...</>) 
                     : (isEditing ? 'Salvar Alterações' : 'Criar Exercício')}
        </Button>
        
      </form>
    </Form>
  );
};