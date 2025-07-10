// Localização: client/src/pages/public/CadastroPersonalPorConvitePage.tsx
import React, { useState, useEffect, useCallback } from 'react';
import { useParams } from 'wouter';
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import {
  Card,
  CardContent,
  CardDescription,
  CardFooter,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import { useToast } from "@/hooks/use-toast";
import { apiRequest } from '@/lib/queryClient';
import { Loader2 } from 'lucide-react';

interface ValidacaoTokenResponse {
  mensagem: string;
  emailConvidado?: string;
  roleConvidado?: string;
}

interface RegistroFormData {
  nome: string;
  email: string;
  password?: string;
  confirmPassword?: string;
}

const CadastroPersonalPorConvitePage: React.FC = () => {
  const params = useParams<{ tokenDeConvite?: string }>();
  const tokenDeConvite = params.tokenDeConvite;

  const [isValidToken, setIsValidToken] = useState<boolean | null>(null);
  const [isLoadingValidation, setIsLoadingValidation] = useState<boolean>(true);
  const [validationError, setValidationError] = useState<string | null>(null);
  const [emailWasPrefilled, setEmailWasPrefilled] = useState<boolean>(false); 
  const [formData, setFormData] = useState<RegistroFormData>({
    nome: '',
    email: '',
    password: '',
    confirmPassword: '',
  });
  const [isSubmitting, setIsSubmitting] = useState<boolean>(false);
  const [registrationSuccess, setRegistrationSuccess] = useState<boolean>(false);
  const { toast } = useToast();

  const validarToken = useCallback(async () => {
    if (!tokenDeConvite) {
      setValidationError("Token de convite não encontrado na URL.");
      setIsValidToken(false);
      setIsLoadingValidation(false);
      return;
    }
    setIsLoadingValidation(true);
    setValidationError(null);
    try {
      // =======================================================
      // --- CORREÇÃO: USANDO A ROTA PÚBLICA ---
      const response = await apiRequest<ValidacaoTokenResponse>('GET', `/api/public/convites/validar/${tokenDeConvite}`);
      // =======================================================
      setIsValidToken(true);
      if (response.emailConvidado) {
        setFormData(prev => ({ ...prev, email: response.emailConvidado! }));
        setEmailWasPrefilled(true);
      } else {
        setEmailWasPrefilled(false);
      }
      toast({
        title: "Convite Válido!",
        description: response.mensagem || "Você pode prosseguir com o cadastro.",
      });
    } catch (error: any) {
      setIsValidToken(false);
      const errMsg = error.message || "Erro ao validar o convite. Verifique o link ou contate o administrador.";
      setValidationError(errMsg);
      setEmailWasPrefilled(false);
      toast({
        title: "Erro na Validação do Convite",
        description: errMsg,
        variant: "destructive",
      });
    } finally {
      setIsLoadingValidation(false);
    }
  }, [tokenDeConvite, toast]);

  useEffect(() => {
    validarToken();
  }, [validarToken]);

  const handleChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const { name, value } = e.target;
    setFormData(prevState => ({
      ...prevState,
      [name]: value,
    }));
  };

  const handleSubmit = async (e: React.FormEvent<HTMLFormElement>) => {
    e.preventDefault();
    if (formData.password !== formData.confirmPassword) {
      toast({
        title: "Erro de Validação",
        description: "As senhas não coincidem.",
        variant: "destructive",
      });
      return;
    }
    if (!formData.password || formData.password.length < 6) {
        toast({
            title: "Erro de Validação",
            description: "A senha deve ter pelo menos 6 caracteres.",
            variant: "destructive",
        });
        return;
    }

    setIsSubmitting(true);
    try {
      const payload = {
        nome: formData.nome,
        email: formData.email,
        password: formData.password,
      };
      // =======================================================
      // --- CORREÇÃO: USANDO A ROTA PÚBLICA ---
      const response = await apiRequest<{ mensagem: string }>('POST', `/api/public/convites/registrar/${tokenDeConvite}`, payload);
      // =======================================================
      toast({
        title: "Cadastro Realizado com Sucesso!",
        description: response.mensagem || "Você já pode fazer login.",
        variant: "default",
      });
      setRegistrationSuccess(true); 
    } catch (error: any) {
      const errMsg = error.message || "Falha ao realizar o cadastro. Tente novamente.";
      toast({
        title: "Erro no Cadastro",
        description: errMsg,
        variant: "destructive",
      });
    } finally {
      setIsSubmitting(false);
    }
  };

  if (isLoadingValidation) {
    return (
      <div className="flex flex-col items-center justify-center min-h-screen bg-gray-100 dark:bg-gray-900 p-4">
        <Loader2 className="h-12 w-12 animate-spin text-primary mb-4" />
        <p className="text-lg text-gray-700 dark:text-gray-300">Validando convite...</p>
      </div>
    );
  }

  if (!isValidToken || validationError) {
    return (
      <div className="flex flex-col items-center justify-center min-h-screen bg-gray-100 dark:bg-gray-900 p-4 text-center">
        <Card className="w-full max-w-md shadow-xl">
          <CardHeader>
            <CardTitle className="text-2xl text-destructive">Convite Inválido</CardTitle>
          </CardHeader>
          <CardContent>
            <p className="text-red-600 dark:text-red-400">{validationError || "O link de convite é inválido, expirou ou já foi utilizado."}</p>
            <p className="mt-4 text-sm text-gray-600 dark:text-gray-400">
              Por favor, solicite um novo link de convite ao administrador da plataforma.
            </p>
          </CardContent>
        </Card>
      </div>
    );
  }

  if (registrationSuccess) {
     return (
      <div className="flex flex-col items-center justify-center min-h-screen bg-gray-100 dark:bg-gray-900 p-4 text-center">
        <Card className="w-full max-w-md shadow-xl">
          <CardHeader>
            <CardTitle className="text-2xl text-green-600">Cadastro Concluído!</CardTitle>
          </CardHeader>
          <CardContent>
            <p className="text-lg">Sua conta foi criada com sucesso.</p>
            <p className="mt-2">Você já pode fazer o login na plataforma.</p>
          </CardContent>
          <CardFooter>
            <Button onClick={() => window.location.href = '/login'} className="w-full">
              Ir para Login
            </Button>
          </CardFooter>
        </Card>
      </div>
    );
  }

  return (
    <div className="flex items-center justify-center min-h-screen bg-gradient-to-br from-slate-900 to-slate-800 p-4">
      <Card className="w-full max-w-md shadow-xl bg-white dark:bg-gray-950">
        <CardHeader className="text-center">
          <img src="/logodyfit.png" alt="Logo DyFit" className="w-24 h-auto mx-auto mb-4" />
          <CardTitle className="text-2xl font-bold">Cadastro de Personal Trainer</CardTitle>
          <CardDescription>Complete seus dados para criar sua conta.</CardDescription>
        </CardHeader>
        <CardContent>
          <form onSubmit={handleSubmit} className="space-y-6">
            <div className="space-y-2">
              <Label htmlFor="nome">Nome Completo</Label>
              <Input
                id="nome"
                name="nome"
                type="text"
                placeholder="Seu nome completo"
                value={formData.nome}
                onChange={handleChange}
                required
                className="bg-input/50"
              />
            </div>
            <div className="space-y-2">
              <Label htmlFor="email">Email</Label>
              <Input
                id="email"
                name="email"
                type="email"
                placeholder="seu@email.com"
                value={formData.email}
                onChange={handleChange}
                required
                disabled={emailWasPrefilled}
                className="bg-input/50 disabled:opacity-75"
              />
               {emailWasPrefilled && (
                <p className="text-xs text-muted-foreground">Email pré-preenchido do convite.</p>
              )}
            </div>
            <div className="space-y-2">
              <Label htmlFor="password">Senha</Label>
              <Input
                id="password"
                name="password"
                type="password"
                placeholder="Crie uma senha forte"
                value={formData.password}
                onChange={handleChange}
                required
                className="bg-input/50"
              />
            </div>
            <div className="space-y-2">
              <Label htmlFor="confirmPassword">Confirmar Senha</Label>
              <Input
                id="confirmPassword"
                name="confirmPassword"
                type="password"
                placeholder="Repita a senha"
                value={formData.confirmPassword}
                onChange={handleChange}
                required
                className="bg-input/50"
              />
            </div>
            <Button type="submit" className="w-full font-semibold" disabled={isSubmitting}>
              {isSubmitting ? <Loader2 className="mr-2 h-4 w-4 animate-spin" /> : null}
              {isSubmitting ? 'Registrando...' : 'Criar Conta'}
            </Button>
          </form>
        </CardContent>
      </Card>
    </div>
  );
};

export default CadastroPersonalPorConvitePage;