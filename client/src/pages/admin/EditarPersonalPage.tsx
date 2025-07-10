// client/src/pages/admin/EditarPersonalPage.tsx
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { useParams, Redirect, useLocation } from 'wouter'; // Importar useLocation
import { useForm } from 'react-hook-form';
import { z } from 'zod';
import { zodResolver } from '@hookform/resolvers/zod';
import { useEffect } from 'react';

import { apiRequest } from '@/lib/queryClient';
import { PersonalDetalhes } from './ListarPersonaisPage'; 
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Card, CardContent, CardHeader, CardTitle, CardDescription, CardFooter } from '@/components/ui/card';
import { Form, FormControl, FormField, FormItem, FormLabel, FormMessage } from '@/components/ui/form';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { useToast } from '@/hooks/use-toast';
import LoadingSpinner from '@/components/LoadingSpinner';
import ErrorMessage from '@/components/ErrorMessage';
import { UserCog } from 'lucide-react';

const personalSchema = z.object({
  nome: z.string().min(3, 'O nome deve ter pelo menos 3 caracteres.'),
  email: z.string().email('Email inválido.'),
  role: z.enum(['personal-trainer', 'admin'], { errorMap: () => ({ message: "Função inválida."}) }),
});

type PersonalFormData = z.infer<typeof personalSchema>;

export default function EditarPersonalPage() {
  const { id } = useParams<{ id: string }>();
  const [, setLocation] = useLocation(); // Pegando a função para navegar
  const { toast } = useToast();
  const queryClient = useQueryClient();

  const { data: personal, isLoading, error, isSuccess } = useQuery<PersonalDetalhes>({
    queryKey: ['personalDetails', id],
    queryFn: () => apiRequest('GET', `/api/admin/personal-trainers/${id}`),
    enabled: !!id,
  });

  const form = useForm<PersonalFormData>({
    resolver: zodResolver(personalSchema),
    defaultValues: {
        nome: '',
        email: '',
        role: 'personal-trainer',
    }
  });

  useEffect(() => {
    if (isSuccess && personal) {
      form.reset({
        nome: personal.nome,
        email: personal.email,
        role: personal.role.toLowerCase() === 'admin' ? 'admin' : 'personal-trainer',
      });
    }
  }, [isSuccess, personal, form]);

  const updateMutation = useMutation<PersonalDetalhes, Error, PersonalFormData>({
    mutationFn: (data) => apiRequest('PUT', `/api/admin/personal-trainers/${id}`, data),
    onSuccess: (updatedData) => {
      toast({ title: "Sucesso!", description: "Dados do personal atualizados." });
      queryClient.invalidateQueries({ queryKey: ['adminPersonalTrainersList'] });
      queryClient.setQueryData(['personalDetails', id], updatedData);
      
      // =======================================================
      // --- PASSO FINAL: REDIRECIONAR APÓS O SUCESSO ---
      setLocation('/admin/gerenciar-personais');
      // =======================================================
    },
    onError: (err) => {
      toast({ variant: 'destructive', title: "Erro ao atualizar", description: err.message });
    }
  });

  const onSubmit = (data: PersonalFormData) => {
    const dataToSend = {
      ...data,
      role: data.role === 'admin' ? 'Admin' : 'Personal Trainer',
    };
    updateMutation.mutate(dataToSend as any);
  };


  if (!id) return <Redirect to="/admin/gerenciar-personais" />;
  if (isLoading) return <LoadingSpinner text="Carregando dados do personal..." />;
  if (error) return <ErrorMessage title="Erro ao carregar" message={error.message} />;
  
  return (
    <div className="container mx-auto py-8 px-4">
      <Card className="max-w-2xl mx-auto">
        <CardHeader>
          <CardTitle className="flex items-center text-2xl">
            <UserCog className="mr-3 h-7 w-7 text-primary" />
            Editar Personal
          </CardTitle>
          <CardDescription>Altere os dados de {personal?.nome}.</CardDescription>
        </CardHeader>
        <Form {...form}>
          <form onSubmit={form.handleSubmit(onSubmit)}>
            <CardContent className="space-y-6">
              <FormField
                control={form.control}
                name="nome"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Nome Completo</FormLabel>
                    <FormControl>
                      <Input placeholder="Nome do Personal" {...field} />
                    </FormControl>
                    <FormMessage />
                  </FormItem>
                )}
              />
              <FormField
                control={form.control}
                name="email"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Email</FormLabel>
                    <FormControl>
                      <Input type="email" placeholder="email@dominio.com" {...field} />
                    </FormControl>
                    <FormMessage />
                  </FormItem>
                )}
              />
              <FormField
                control={form.control}
                name="role"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Função (Role)</FormLabel>
                    <Select onValueChange={field.onChange} value={field.value}>
                        <FormControl>
                            <SelectTrigger>
                                <SelectValue placeholder="Selecione a função" />
                            </SelectTrigger>
                        </FormControl>
                        <SelectContent>
                            <SelectItem value="personal-trainer">Personal Trainer</SelectItem>
                            <SelectItem value="admin">Administrador</SelectItem>
                        </SelectContent>
                    </Select>
                    <FormMessage />
                  </FormItem>
                )}
              />
            </CardContent>
            <CardFooter className="flex justify-end">
              <Button type="submit" disabled={updateMutation.isPending}>
                {updateMutation.isPending ? "Salvando..." : "Salvar Alterações"}
              </Button>
            </CardFooter>
          </form>
        </Form>
      </Card>
    </div>
  );
}