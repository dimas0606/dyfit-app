// client/src/pages/admin/CriarPersonalPage.tsx
import React from 'react';
import { useForm, Controller } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import * as z from 'zod';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import {
  Card,
  CardContent,
  CardDescription,
  CardFooter,
  CardHeader,
  CardTitle,
} from '@/components/ui/card';
import { apiRequest } from '@/lib/queryClient';
import { useToast } from '@/hooks/use-toast';
import { Loader2, UserPlus } from 'lucide-react';

// Schema de validação com Zod
const criarPersonalSchema = z.object({
  nome: z.string().min(3, { message: "O nome completo é obrigatório (mínimo 3 caracteres)." }),
  email: z.string().email({ message: "Por favor, insira um e-mail válido." }),
  password: z.string().min(6, { message: "A senha deve ter pelo menos 6 caracteres." }),
  role: z.enum(["Personal Trainer", "Admin"], { required_error: "A função é obrigatória." }),
});

type CriarPersonalFormData = z.infer<typeof criarPersonalSchema>;

// Certifique-se de que esta linha existe e está correta
export default function CriarPersonalPage() {
  const { toast } = useToast();
  const [isSubmitting, setIsSubmitting] = React.useState(false);

  const {
    control,
    register,
    handleSubmit,
    formState: { errors },
    reset,
  } = useForm<CriarPersonalFormData>({
    resolver: zodResolver(criarPersonalSchema),
    defaultValues: {
      nome: "",
      email: "",
      password: "",
      role: "Personal Trainer",
    },
  });

  const onSubmit = async (data: CriarPersonalFormData) => {
    setIsSubmitting(true);
    console.log("Dados do formulário para criar personal:", data);
    try {
      const novoPersonal = await apiRequest<any>("POST", "/api/admin/personal-trainers", data);
      toast({
        title: "Sucesso!",
        description: `Usuário "${novoPersonal.nome}" (${novoPersonal.email}) criado com a função de ${novoPersonal.role}.`,
      });
      reset(); 
    } catch (error: any) {
      console.error("Erro ao criar Personal Trainer:", error);
      toast({
        variant: "destructive",
        title: "Erro ao Criar Usuário",
        description: error.response?.data?.mensagem || error.message || "Ocorreu um problema ao tentar criar o usuário.",
      });
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <div className="container mx-auto py-10 px-4 flex flex-col items-center">
      <Card className="w-full max-w-2xl shadow-xl">
        <CardHeader className="text-center">
          <div className="flex justify-center items-center mb-3">
            <UserPlus className="h-10 w-10 text-primary" />
          </div>
          <CardTitle className="text-3xl font-bold">Criar Novo Usuário</CardTitle>
          <CardDescription className="text-md text-muted-foreground">
            Preencha os dados abaixo para adicionar um novo Personal Trainer ou Administrador ao sistema.
          </CardDescription>
        </CardHeader>
        <CardContent>
          <form onSubmit={handleSubmit(onSubmit)} className="space-y-6">
            <div className="space-y-2">
              <Label htmlFor="nome" className="font-semibold">Nome Completo</Label>
              <Input id="nome" placeholder="Ex: João da Silva Pereira" {...register("nome")} />
              {errors.nome && <p className="text-sm font-medium text-destructive">{errors.nome.message}</p>}
            </div>

            <div className="space-y-2">
              <Label htmlFor="email" className="font-semibold">Endereço de E-mail</Label>
              <Input id="email" type="email" placeholder="Ex: joao.silva@example.com" {...register("email")} />
              {errors.email && <p className="text-sm font-medium text-destructive">{errors.email.message}</p>}
            </div>

            <div className="space-y-2">
              <Label htmlFor="password">Senha Inicial</Label>
              <Input id="password" type="password" placeholder="Mínimo 6 caracteres" {...register("password")} />
              {errors.password && <p className="text-sm font-medium text-destructive">{errors.password.message}</p>}
            </div>

            <div className="space-y-2">
              <Label htmlFor="role" className="font-semibold">Função (Role)</Label>
              <Controller
                name="role"
                control={control}
                render={({ field }) => (
                  <Select onValueChange={field.onChange} defaultValue={field.value}>
                    <SelectTrigger id="role" className="w-full">
                      <SelectValue placeholder="Selecione uma função" />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="Personal Trainer">Personal Trainer</SelectItem>
                      <SelectItem value="Admin">Administrador</SelectItem>
                    </SelectContent>
                  </Select>
                )}
              />
              {errors.role && <p className="text-sm font-medium text-destructive">{errors.role.message}</p>}
            </div>

            <CardFooter className="px-0 pt-8">
              <Button type="submit" className="w-full text-lg py-6" disabled={isSubmitting}>
                {isSubmitting && <Loader2 className="mr-2 h-5 w-5 animate-spin" />}
                {isSubmitting ? "Criando Usuário..." : "Criar Usuário"}
              </Button>
            </CardFooter>
          </form>
        </CardContent>
      </Card>
    </div>
  );
}
