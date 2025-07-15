// client/src/pages/public/CadastroAlunoPorConvitePage.tsx
import React, { useState } from 'react';
import { useLocation, useParams } from 'wouter';
import { useQuery, useMutation } from '@tanstack/react-query';
import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import * as z from 'zod';

import { apiRequest } from '@/lib/queryClient';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Form, FormControl, FormField, FormItem, FormLabel, FormMessage } from '@/components/ui/form';
import { Input } from '@/components/ui/input';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { useToast } from '@/hooks/use-toast';
import { Loader2 } from 'lucide-react';
import ErrorMessage from '@/components/ErrorMessage';
import LoadingSpinner from '@/components/LoadingSpinner';

const formSchema = z.object({
  nome: z.string().min(3, "Nome completo é obrigatório."),
  password: z.string().min(6, "A senha deve ter no mínimo 6 caracteres."),
  confirmPassword: z.string(),
  phone: z.string().optional(),
  birthDate: z.string().min(1, "Data de nascimento é obrigatória."),
  gender: z.enum(['masculino', 'feminino', 'outro']),
  goal: z.string().min(1, "Objetivo é obrigatório."),
  weight: z.string().min(1, "Peso é obrigatório.").refine(val => !isNaN(parseFloat(val.replace(',', '.'))), "Deve ser um número."),
  height: z.string().min(1, "Altura é obrigatória.").refine(val => /^\d+$/.test(val), "Deve ser um número inteiro."),
  // A data de início não precisa mais de validação, pois será definida automaticamente
  startDate: z.string(),
}).refine(data => data.password === data.confirmPassword, {
  message: "As senhas não coincidem.",
  path: ["confirmPassword"],
});

type FormValues = z.infer<typeof formSchema>;

const CadastroAlunoPorConvitePage: React.FC = () => {
  const params = useParams<{ token: string }>();
  const token = params.token;
  const [, setLocation] = useLocation();
  const { toast } = useToast();
  const [emailConvidado, setEmailConvidado] = useState<string | null>(null);

  const { isLoading: isValidating, isError, error: validationError } = useQuery({
    queryKey: ['validateAlunoInvite', token],
    queryFn: async () => {
      const data = await apiRequest<{ email: string }>('GET', `/api/public/convite-aluno/${token}`);
      setEmailConvidado(data.email);
      return data;
    },
    enabled: !!token,
    retry: false,
  });

  const form = useForm<FormValues>({
    resolver: zodResolver(formSchema),
    // <<< CORREÇÃO AQUI: Data de início agora é a data atual >>>
    defaultValues: {
      nome: "", password: "", confirmPassword: "", phone: "", birthDate: "",
      goal: "", weight: "", height: "", startDate: new Date().toISOString().split('T')[0]
    },
  });

  const registerMutation = useMutation({
    mutationFn: (data: FormValues) => {
        const { confirmPassword, ...payload } = data;
        return apiRequest('POST', '/api/public/convite-aluno/registrar', {
          token,
          ...payload,
          weight: parseFloat(payload.weight.replace(',', '.')),
          height: parseInt(payload.height, 10),
        })
    },
    onSuccess: () => {
      toast({
        title: "Cadastro realizado com sucesso!",
        description: "Você já pode fazer login com seu e-mail e senha.",
      });
      setLocation('/aluno/login');
    },
    onError: (error: Error) => {
      toast({ variant: "destructive", title: "Erro no Cadastro", description: error.message });
    },
  });

  const onSubmit = (data: FormValues) => registerMutation.mutate(data);
  if (isValidating) return <LoadingSpinner text="Validando convite..." />;
  if (isError) return <ErrorMessage title="Convite Inválido" message={validationError?.message || "O link de convite que você usou é inválido ou já expirou."} />;

  return (
    <div className="min-h-screen flex items-center justify-center bg-gray-100 dark:bg-gray-900 p-4">
      <Card className="w-full max-w-lg">
        <CardHeader>
          <CardTitle>Finalize seu Cadastro</CardTitle>
          <CardDescription>Bem-vindo(a) ao DyFit! Complete seus dados para acessar a plataforma.</CardDescription>
        </CardHeader>
        <CardContent>
          <Form {...form}>
            <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-4">
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <FormItem><FormLabel>Email</FormLabel><FormControl><Input value={emailConvidado || ''} disabled /></FormControl></FormItem>
                <FormField control={form.control} name="nome" render={({ field }) => ( <FormItem><FormLabel>Nome Completo*</FormLabel><FormControl><Input placeholder="Seu nome completo" {...field} /></FormControl><FormMessage /></FormItem> )} />
                <FormField control={form.control} name="password" render={({ field }) => ( <FormItem><FormLabel>Crie uma Senha*</FormLabel><FormControl><Input type="password" placeholder="Mínimo de 6 caracteres" {...field} /></FormControl><FormMessage /></FormItem> )} />
                <FormField control={form.control} name="confirmPassword" render={({ field }) => ( <FormItem><FormLabel>Confirme sua Senha*</FormLabel><FormControl><Input type="password" placeholder="Repita a senha" {...field} /></FormControl><FormMessage /></FormItem> )} />
                <FormField control={form.control} name="phone" render={({ field }) => ( <FormItem><FormLabel>Telefone</FormLabel><FormControl><Input placeholder="(00) 00000-0000" {...field} /></FormControl><FormMessage /></FormItem> )} />
                <FormField control={form.control} name="birthDate" render={({ field }) => ( <FormItem><FormLabel>Data de Nascimento*</FormLabel><FormControl><Input type="date" {...field} /></FormControl><FormMessage /></FormItem> )} />
                <FormField control={form.control} name="gender" render={({ field }) => ( <FormItem><FormLabel>Gênero*</FormLabel><Select onValueChange={field.onChange} defaultValue={field.value}><FormControl><SelectTrigger><SelectValue placeholder="Selecione..." /></SelectTrigger></FormControl><SelectContent><SelectItem value="masculino">Masculino</SelectItem><SelectItem value="feminino">Feminino</SelectItem><SelectItem value="outro">Outro</SelectItem></SelectContent></Select><FormMessage /></FormItem> )} />
                <FormField control={form.control} name="goal" render={({ field }) => ( <FormItem><FormLabel>Objetivo Principal*</FormLabel><Select onValueChange={field.onChange} defaultValue={field.value}><FormControl><SelectTrigger><SelectValue placeholder="Selecione..." /></SelectTrigger></FormControl><SelectContent><SelectItem value="Hipertrofia">Hipertrofia</SelectItem><SelectItem value="Emagrecimento">Emagrecimento</SelectItem><SelectItem value="Outros">Outros</SelectItem></SelectContent></Select><FormMessage /></FormItem> )} />
                <FormField control={form.control} name="weight" render={({ field }) => ( <FormItem><FormLabel>Peso (kg)*</FormLabel><FormControl><Input placeholder="Ex: 75.5" {...field} /></FormControl><FormMessage /></FormItem> )} />
                <FormField control={form.control} name="height" render={({ field }) => ( <FormItem><FormLabel>Altura (cm)*</FormLabel><FormControl><Input placeholder="Ex: 178" {...field} /></FormControl><FormMessage /></FormItem> )} />
                {/* <<< CORREÇÃO AQUI: Campo de data desabilitado >>> */}
                <FormField control={form.control} name="startDate" render={({ field }) => ( <FormItem><FormLabel>Data de Início</FormLabel><FormControl><Input type="date" {...field} disabled /></FormControl><FormMessage /></FormItem> )} />
              </div>
              <Button type="submit" className="w-full mt-6" disabled={registerMutation.isPending}>
                {registerMutation.isPending && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
                Finalizar Cadastro
              </Button>
            </form>
          </Form>
        </CardContent>
      </Card>
    </div>
  );
};

export default CadastroAlunoPorConvitePage;