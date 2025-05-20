// Localização: client/src/pages/public/AlunoLoginPage.tsx
import React, { useState, useContext, useEffect } from 'react';
import { useLocation, Redirect } from 'wouter';
import { AlunoContext } from '@/context/AlunoContext';
import { useToast } from "@/hooks/use-toast";
import { Loader2, LogIn } from "lucide-react";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle, CardFooter } from '@/components/ui/card';
import { Label } from '@/components/ui/label';
import { apiRequest } from '@/lib/queryClient';

// Interface para a resposta da API de login do aluno
interface AlunoLoginApiResponse {
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

export default function AlunoLoginPage() {
    const [, navigate] = useLocation();
    const alunoContext = useContext(AlunoContext);
    const { toast } = useToast();

    const [email, setEmail] = useState("");
    const [password, setPassword] = useState("");
    const [isLoading, setIsLoading] = useState(false);
    const [error, setError] = useState("");

    if (!alunoContext) {
        console.warn("AlunoContext ainda não está disponível em AlunoLoginPage.");
        return <div className="flex h-screen w-full items-center justify-center"><Loader2 className="h-10 w-10 animate-spin text-primary" /> Carregando contexto...</div>;
    }
    const { loginAluno, aluno: alunoLogado, isLoadingAluno } = alunoContext;

    useEffect(() => {
        if (!isLoadingAluno && alunoLogado) {
            navigate("/aluno/dashboard", { replace: true }); 
        }
    }, [alunoLogado, isLoadingAluno, navigate]);

    const handleLoginAluno = async (e: React.FormEvent) => {
        e.preventDefault();
        setError("");
        setIsLoading(true);

        try {
            const response = await apiRequest<AlunoLoginApiResponse>(
                'POST',
                '/api/auth/aluno/login', 
                { email: email.toLowerCase().trim(), password }
            );
            
            await loginAluno(response.token);

            toast({
                title: "Login bem-sucedido!",
                description: `Bem-vindo(a) de volta, ${response.aluno.nome || 'Aluno'}!`,
            });
            
        } catch (err: any) {
            console.error("Erro no login do aluno:", err);
            const errorMessage = err.message || 'Credenciais inválidas ou erro no servidor.';
            setError(errorMessage);
            toast({
                title: "Erro no Login",
                description: errorMessage,
                variant: "destructive",
            });
        } finally {
            setIsLoading(false);
        }
    };
    
    if (isLoadingAluno) {
        return <div className="flex h-screen w-full items-center justify-center"><Loader2 className="h-10 w-10 animate-spin text-primary" /> <span className="ml-2">Verificando sessão...</span></div>;
    }

    return (
        <div className="min-h-screen flex items-center justify-center bg-gradient-to-br from-sky-500 to-blue-700 p-4 selection:bg-blue-200 selection:text-blue-900">
            {/* Card de Login */}
            <Card className="w-full max-w-md shadow-2xl bg-white dark:bg-gray-900 rounded-xl overflow-hidden md:flex md:max-w-3xl">
                {/* Lado esquerdo com imagem para Aluno */}
                <div
                    className="hidden md:flex md:w-1/2 bg-cover bg-center relative"
                    style={{ backgroundImage: "url('/images/login-aluno.png')" }} // <<< IMAGEM ATUALIZADA AQUI
                >
                     <div className="absolute inset-0 bg-blue-700 opacity-40"></div> {/* Overlay com cor temática do aluno */}
                     <div className="absolute bottom-10 left-10 text-white z-10 p-4">
                        <h1 className="text-4xl font-bold mb-2 drop-shadow-lg">DyFit Aluno</h1>
                        <p className="text-lg text-gray-100 drop-shadow-md">Acesse seus treinos e acompanhe seu progresso.</p>
                    </div>
                </div>

                {/* Lado direito (formulário) */}
                <div className="w-full md:w-1/2 flex flex-col justify-center">
                    <CardHeader className="text-center space-y-3 pt-8 pb-6 md:pt-10">
                        <img src="/logodyfit.png" alt="Logo DyFit" className="h-14 md:h-16 mx-auto" />
                        <CardTitle className="text-2xl md:text-3xl font-bold text-slate-800 dark:text-slate-50">
                            Acesso Aluno
                        </CardTitle>
                        <CardDescription className="text-slate-600 dark:text-slate-400 px-4">
                            Entre com seu email e senha para continuar.
                        </CardDescription>
                    </CardHeader>
                    <CardContent className="px-6 pb-8 sm:px-8">
                        <form onSubmit={handleLoginAluno} className="space-y-6">
                            {error && (
                                <div role="alert" className="text-red-600 dark:text-red-400 text-sm text-center p-3 bg-red-50 dark:bg-red-900/30 border border-red-300 dark:border-red-700 rounded-md">
                                    {error}
                                </div>
                            )}

                            <div className="space-y-2">
                                <Label htmlFor="email-aluno-login" className="text-slate-700 dark:text-slate-300 font-medium">Email</Label>
                                <Input
                                   type="email"
                                   id="email-aluno-login"
                                   value={email}
                                   onChange={(e) => setEmail(e.target.value)}
                                   placeholder="seu.email@exemplo.com"
                                   required
                                   autoComplete="email"
                                   disabled={isLoading}
                                   className="bg-slate-50 dark:bg-slate-800 border-slate-300 dark:border-slate-600 focus:border-primary dark:focus:border-primary focus:ring-primary dark:focus:ring-primary"
                                />
                            </div>

                            <div className="space-y-2">
                                <Label htmlFor="password-aluno-login" className="text-slate-700 dark:text-slate-300 font-medium">Senha</Label>
                                <Input
                                    type="password"
                                    id="password-aluno-login"
                                    value={password}
                                    onChange={(e) => setPassword(e.target.value)}
                                    placeholder="Sua senha"
                                    required
                                    autoComplete="current-password"
                                    disabled={isLoading}
                                    className="bg-slate-50 dark:bg-slate-800 border-slate-300 dark:border-slate-600 focus:border-primary dark:focus:border-primary focus:ring-primary dark:focus:ring-primary"
                                />
                            </div>
                            
                            <Button 
                                type="submit" 
                                className="w-full font-semibold text-base py-3 bg-blue-600 hover:bg-blue-700 dark:bg-sky-600 dark:hover:bg-sky-700" 
                                disabled={isLoading}
                            >
                                {isLoading ? <Loader2 className="mr-2 h-5 w-5 animate-spin" /> : <LogIn className="mr-2 h-5 w-5" />}
                                {isLoading ? 'Entrando...' : 'Entrar'}
                            </Button>
                        </form>
                    </CardContent>
                    <CardFooter className="text-center text-xs text-muted-foreground pt-6 pb-8 border-t dark:border-slate-700 md:border-t-0 md:pt-4">
                        <p>Ainda não tem conta? Peça um convite ao seu personal.</p>
                    </CardFooter>
                </div>
            </Card>
        </div>
    );
}
