// Localização: client/src/pages/public/CadastroAlunoPorConvitePersonalPage.tsx
import React, { useState, useEffect, useCallback } from 'react';
import { useParams, Link as WouterLink } from 'wouter'; // Removido Redirect, Link as WouterLink para clareza
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea"; // <<< ADICIONADO IMPORT DE TEXTAREA
import {
  Card,
  CardContent,
  CardDescription,
  CardFooter,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { useToast } from "@/hooks/use-toast";
import { apiRequest } from '@/lib/queryClient';
import { useAluno } from '@/context/AlunoContext';
import { Loader2 } from 'lucide-react';
// Removida importação direta do modelo de backend:
// import PersonalTrainer from '@/../../../server/models/PersonalTrainer'; 

interface ValidacaoTokenResponse {
  mensagem: string;
  emailConvidado?: string;
  roleConvidado?: string;
}

interface AlunoRegistroFormData {
  nome: string;
  email: string;
  password?: string;
  confirmPassword?: string;
  birthDate: string;
  gender: string;
  goal: string;
  weight: string; 
  height: string; 
  startDate: string;
  phone?: string;
  notes?: string;
}

interface AlunoRegistroResponse {
  message: string;
  token: string; 
  aluno: {
    id: string;
    nome: string;
    email: string;
    role: 'Aluno';
    personalId: string;
  };
}

// Interface para a resposta da validação do token do personal (se implementada no futuro)
// interface PersonalValidationResponse {
//     message: string;
//     personalNome: string;
// }


const CadastroAlunoPorConvitePersonalPage: React.FC = () => {
  const params = useParams<{ tokenPersonal?: string }>();
  const tokenPersonal = params.tokenPersonal;

  const [personalNome, setPersonalNome] = useState<string | null>(null); // Usado para exibir o nome do personal que convidou
  const [isLoadingTokenValidation, setIsLoadingTokenValidation] = useState<boolean>(false);
  const [tokenValidationError, setTokenValidationError] = useState<string | null>(null);

  const [formData, setFormData] = useState<AlunoRegistroFormData>({
    nome: '',
    email: '',
    password: '',
    confirmPassword: '',
    birthDate: '',
    gender: '',
    goal: '',
    weight: '',
    height: '',
    startDate: '',
    phone: '',
    notes: '',
  });
  const [isSubmitting, setIsSubmitting] = useState<boolean>(false);
  const [registrationSuccess, setRegistrationSuccess] = useState<boolean>(false);
  const { toast } = useToast();
  const { loginAluno, aluno: alunoLogado } = useAluno();

  // Opcional: Validar o token do personal e buscar o nome ao carregar a página
  useEffect(() => {
    const validarTokenPersonalEBuscarNome = async () => {
      if (!tokenPersonal) {
        setTokenValidationError("Token de convite do personal não encontrado na URL.");
        return;
      }
      setIsLoadingTokenValidation(true);
      try {
        // TODO: Implementar no backend uma rota GET /api/auth/validar-token-personal/:tokenPersonal
        // Esta rota verificaria se o tokenCadastroAluno é válido e retornaria o nome do Personal.
        // Exemplo de como seria a chamada:
        // const response = await apiRequest<PersonalValidationResponse>('GET', `/api/auth/validar-token-personal/${tokenPersonal}`);
        // setPersonalNome(response.personalNome);
        // Por enquanto, vamos simular que o token é válido se existir.
        // Em um cenário real, esta validação é importante para UX.
        console.log("Token do Personal para cadastro de aluno:", tokenPersonal);
        // Se você tiver uma forma de buscar o nome do personal pelo token no frontend (improvável sem API),
        // ou se o backend retornar o nome do personal na validação do token, você pode definir setPersonalNome aqui.
        // Exemplo simulado (REMOVER EM PRODUÇÃO se não houver API para isso):
        // setPersonalNome("Seu Personal Trainer"); 
      } catch (error: any) {
        const errMsg = error.message || "Link de convite inválido ou personal não encontrado.";
        setTokenValidationError(errMsg);
        // toast({ title: "Erro no Convite", description: errMsg, variant: "destructive" });
      } finally {
        setIsLoadingTokenValidation(false);
      }
    };

    validarTokenPersonalEBuscarNome();
  }, [tokenPersonal, toast]);


  const handleChange = (e: React.ChangeEvent<HTMLInputElement | HTMLTextAreaElement>) => {
    const { name, value } = e.target;
    setFormData(prevState => ({
      ...prevState,
      [name]: value,
    }));
  };

  const handleSelectChange = (name: keyof AlunoRegistroFormData) => (value: string) => {
    setFormData(prevState => ({
      ...prevState,
      [name]: value,
    }));
  };

  const handleSubmit = async (e: React.FormEvent<HTMLFormElement>) => {
    e.preventDefault();
    if (!tokenPersonal) { // Segurança adicional
        toast({ title: "Erro", description: "Token de convite ausente.", variant: "destructive" });
        return;
    }
    if (formData.password !== formData.confirmPassword) {
      toast({ title: "Erro de Validação", description: "As senhas não coincidem.", variant: "destructive" });
      return;
    }
    if (!formData.password || formData.password.length < 6) {
      toast({ title: "Erro de Validação", description: "A senha deve ter pelo menos 6 caracteres.", variant: "destructive" });
      return;
    }
    const camposObrigatorios: (keyof AlunoRegistroFormData)[] = ['nome', 'email', 'birthDate', 'gender', 'goal', 'weight', 'height', 'startDate'];
    for (const campo of camposObrigatorios) {
        if (!formData[campo]) {
            toast({ title: "Erro de Validação", description: `O campo '${campo}' é obrigatório.`, variant: "destructive"});
            return;
        }
    }

    setIsSubmitting(true);
    try {
      const payload = {
        ...formData,
        weight: parseFloat(formData.weight.replace(',', '.')), 
        height: parseInt(formData.height, 10), 
      };
      delete (payload as any).confirmPassword; // Remove confirmPassword

      const response = await apiRequest<AlunoRegistroResponse>('POST', `/api/auth/aluno/registrar-por-convite-personal/${tokenPersonal}`, payload);
      
      await loginAluno(response.token); 

      toast({
        title: "Cadastro Realizado com Sucesso!",
        description: response.message || "Sua conta foi criada e você foi conectado.",
        variant: "default",
      });
      setRegistrationSuccess(true); 
    } catch (error: any) {
      const errMsg = error.message || "Falha ao realizar o cadastro. Tente novamente.";
      toast({ title: "Erro no Cadastro", description: errMsg, variant: "destructive" });
    } finally {
      setIsSubmitting(false);
    }
  };
  
  if (alunoLogado && registrationSuccess) {
     return (
      <div className="flex flex-col items-center justify-center min-h-screen bg-gray-100 dark:bg-gray-900 p-4 text-center">
        <Card className="w-full max-w-md shadow-xl">
          <CardHeader>
            <CardTitle className="text-2xl text-green-600">Bem-vindo(a), {alunoLogado.nome || 'Aluno'}!</CardTitle>
          </CardHeader>
          <CardContent>
            <p className="text-lg">Sua conta foi criada e você está conectado(a).</p>
            <WouterLink href="/aluno/dashboard"> {/* Ajuste esta rota para o dashboard do aluno */}
              <Button className="mt-4 w-full">Ir para meu painel</Button>
            </WouterLink>
          </CardContent>
        </Card>
      </div>
    );
  }
  
  if (isLoadingTokenValidation && !tokenValidationError) { // Mostrar loader apenas se não houver erro de validação de token ainda
    return (
      <div className="flex flex-col items-center justify-center min-h-screen bg-gray-100 dark:bg-gray-900 p-4">
        <Loader2 className="h-12 w-12 animate-spin text-primary mb-4" />
        <p className="text-lg text-gray-700 dark:text-gray-300">Verificando convite...</p>
      </div>
    );
  }

  if (tokenValidationError) { // Se houve erro na validação do token (ex: token não encontrado na URL)
    return (
      <div className="flex flex-col items-center justify-center min-h-screen bg-gray-100 dark:bg-gray-900 p-4 text-center">
        <Card className="w-full max-w-md shadow-xl">
          <CardHeader>
            <CardTitle className="text-2xl text-destructive">Link de Convite Inválido</CardTitle>
          </CardHeader>
          <CardContent>
            <p className="text-red-600 dark:text-red-400">{tokenValidationError}</p>
            <p className="mt-4 text-sm text-gray-600 dark:text-gray-400">
              Por favor, verifique o link ou contate o personal trainer que o convidou.
            </p>
          </CardContent>
        </Card>
      </div>
    );
  }

  return (
    <div className="flex items-center justify-center min-h-screen bg-gradient-to-br from-slate-900 to-slate-800 p-4">
      <Card className="w-full max-w-lg shadow-xl bg-white dark:bg-gray-950">
        <CardHeader className="text-center">
          <img src="/logodyfit.png" alt="Logo DyFit" className="w-24 h-auto mx-auto mb-4" />
          <CardTitle className="text-2xl font-bold">Crie sua Conta de Aluno</CardTitle>
          {personalNome && <CardDescription>Você foi convidado(a) por: {personalNome}</CardDescription>}
          {!personalNome && <CardDescription>Preencha seus dados para começar.</CardDescription>}
        </CardHeader>
        <CardContent>
          <form onSubmit={handleSubmit} className="space-y-4 md:space-y-6">
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <div className="space-y-2">
                <Label htmlFor="nome">Nome Completo*</Label>
                <Input id="nome" name="nome" value={formData.nome} onChange={handleChange} required />
              </div>
              <div className="space-y-2">
                <Label htmlFor="email">Email*</Label>
                <Input id="email" name="email" type="email" value={formData.email} onChange={handleChange} required />
              </div>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <div className="space-y-2">
                <Label htmlFor="password">Senha* (mín. 6 caracteres)</Label>
                <Input id="password" name="password" type="password" value={formData.password} onChange={handleChange} required />
              </div>
              <div className="space-y-2">
                <Label htmlFor="confirmPassword">Confirmar Senha*</Label>
                <Input id="confirmPassword" name="confirmPassword" type="password" value={formData.confirmPassword} onChange={handleChange} required />
              </div>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <div className="space-y-2">
                <Label htmlFor="birthDate">Data de Nascimento*</Label>
                <Input id="birthDate" name="birthDate" type="date" value={formData.birthDate} onChange={handleChange} required />
              </div>
              <div className="space-y-2">
                <Label htmlFor="gender">Gênero*</Label>
                <Select name="gender" value={formData.gender} onValueChange={handleSelectChange('gender')}>
                  <SelectTrigger><SelectValue placeholder="Selecione seu gênero" /></SelectTrigger>
                  <SelectContent>
                    <SelectItem value="masculino">Masculino</SelectItem>
                    <SelectItem value="feminino">Feminino</SelectItem>
                    <SelectItem value="outro">Outro</SelectItem>
                    <SelectItem value="prefiroNaoDizer">Prefiro não dizer</SelectItem>
                  </SelectContent>
                </Select>
              </div>
            </div>

            <div className="space-y-2">
              <Label htmlFor="goal">Principal Objetivo*</Label>
              <Input id="goal" name="goal" value={formData.goal} onChange={handleChange} placeholder="Ex: Perder peso, ganhar massa, etc." required />
            </div>

            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <div className="space-y-2">
                <Label htmlFor="weight">Peso Atual (kg)*</Label>
                <Input id="weight" name="weight" type="number" step="0.1" value={formData.weight} onChange={handleChange} placeholder="Ex: 70.5" required />
              </div>
              <div className="space-y-2">
                <Label htmlFor="height">Altura (cm)*</Label>
                <Input id="height" name="height" type="number" value={formData.height} onChange={handleChange} placeholder="Ex: 175" required />
              </div>
            </div>
            
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div className="space-y-2">
                    <Label htmlFor="startDate">Data de Início nos Treinos*</Label>
                    <Input id="startDate" name="startDate" type="date" value={formData.startDate} onChange={handleChange} required />
                </div>
                <div className="space-y-2">
                    <Label htmlFor="phone">Telefone (Opcional)</Label>
                    <Input id="phone" name="phone" type="tel" value={formData.phone || ''} onChange={handleChange} placeholder="(XX) XXXXX-XXXX" />
                </div>
            </div>

            <div className="space-y-2">
              <Label htmlFor="notes">Observações Adicionais (Opcional)</Label>
              <Textarea id="notes" name="notes" value={formData.notes || ''} onChange={handleChange} placeholder="Alguma condição médica, lesão, ou preferência?" />
            </div>

            <Button type="submit" className="w-full font-semibold text-base py-3" disabled={isSubmitting}>
              {isSubmitting ? <Loader2 className="mr-2 h-5 w-5 animate-spin" /> : null}
              {isSubmitting ? 'Criando Conta...' : 'Criar Minha Conta'}
            </Button>
          </form>
        </CardContent>
         <CardFooter className="text-center text-xs text-muted-foreground pt-4">
            Ao se registrar, você concorda com nossos Termos de Serviço.
        </CardFooter>
      </Card>
    </div>
  );
};

export default CadastroAlunoPorConvitePersonalPage;
