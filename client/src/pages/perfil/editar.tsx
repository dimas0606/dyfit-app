import React, { useState, useEffect } from 'react';
import { Card, CardContent, CardHeader, CardTitle, CardDescription, CardFooter } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { useUser, User } from '@/context/UserContext'; // Importa User
import { useToast } from '@/hooks/use-toast'; // Usa o hook correto
import { useMutation, useQueryClient } from '@tanstack/react-query';
import { apiRequest } from '@/lib/queryClient';
import { Loader2 } from 'lucide-react';

// Interface para os dados a serem enviados para a API
interface UpdateProfilePayload {
    firstName: string;
    lastName: string;
    // avatarUrl?: string; // Para quando implementar upload de foto
}

export default function ProfileEditPage() {
    const { user, setUser, isLoading: isLoadingUserContext } = useUser();
    const { toast } = useToast(); // Usa o hook
    const queryClient = useQueryClient();

    // Estados locais do formulário
    const [firstName, setFirstName] = useState('');
    const [lastName, setLastName] = useState('');
    // const [avatarFile, setAvatarFile] = useState<File | null>(null);
    // const [avatarPreview, setAvatarPreview] = useState<string | null>(null);

    // Efeito para preencher o formulário quando o usuário do contexto carregar/mudar
    useEffect(() => {
        if (user) {
            setFirstName(user.firstName || '');
            setLastName(user.lastName || '');
            // setAvatarPreview(user.avatarUrl || null);
        }
    }, [user]);

    // Função de formatação de URL (CORRIGIDA com retorno explícito)
    const formatVideoUrl = (url: string): string | undefined => {
        if (!url) return undefined;
        let embedUrl: string | undefined = undefined;
        try { // Adiciona try/catch para robustez em caso de URL malformada
            if (url.includes("youtu.be/")) {
                const id = url.split("youtu.be/")[1]?.split(/[?&]/)[0];
                if (id) {
                    const time = url.includes("?t=") ? url.split("?t=")[1]?.split("&")[0] : "";
                    embedUrl = `https://www.youtube.com/embed/${id}${time ? `?start=${time}` : ""}`;
                }
            } else if (url.includes("youtube.com/watch?v=")) {
                const id = url.split("v=")[1]?.split("&")[0];
                 if (id) {
                    const time = url.includes("?t=") ? url.split("?t=")[1]?.split("&")[0] : "";
                    embedUrl = `https://www.youtube.com/embed/${id}${time ? `?start=${time}` : ""}`;
                 }
            } else if (url.includes("drive.google.com/file/d/")) {
                const id = url.split("/d/")[1]?.split("/")[0];
                if (id) {
                   embedUrl = `https://drive.google.com/file/d/${id}/preview`;
                }
            }
        } catch (e) {
             console.error("Erro ao formatar URL de vídeo:", e);
             embedUrl = undefined; // Retorna undefined em caso de erro
        }

        // Retorna a URL original apenas se for um link válido e NÃO foi convertida
        if (!embedUrl && (url.startsWith('http://') || url.startsWith('https://'))) {
            return url;
        }
        // Retorna a URL convertida ou undefined
        return embedUrl;
    }

    // Mutação para atualizar o perfil
    const updateProfileMutation = useMutation<
        { message: string; user: User },
        Error,
        UpdateProfilePayload
    >({
        mutationFn: (payload) => {
            return apiRequest<{ message: string; user: User }>("PATCH", "/api/profile/me", payload);
        },
        onSuccess: (data) => {
            setUser(data.user);
            toast({ title: "Sucesso", description: data.message || "Perfil atualizado." });
            // queryClient.invalidateQueries({ queryKey: ['algumaQueryDoUsuario'] }); // Se necessário
        },
        onError: (error) => {
            toast({ variant: "destructive", title: "Erro ao Atualizar", description: error.message || "Não foi possível salvar as alterações." });
        }
    });

    const handleFileChange = (event: React.ChangeEvent<HTMLInputElement>) => {
        const file = event.target.files?.[0];
        if (file) {
            toast({ title: "Upload de Foto", description: "Funcionalidade de upload de foto em breve.", variant: "default"});
        }
    };

    const handleSubmit = (event: React.FormEvent<HTMLFormElement>) => {
        event.preventDefault();
        if (!firstName.trim() || !lastName.trim()) {
             toast({ variant: "destructive", title: "Erro", description: "Nome e Sobrenome são obrigatórios." });
            return;
        }
        const payload: UpdateProfilePayload = {
            firstName: firstName.trim(),
            lastName: lastName.trim(),
        };
        updateProfileMutation.mutate(payload);
    };

    // Função para gerar iniciais
     const getInitials = (fName: string = "", lName: string = ""): string => {
        const firstInitial = fName?.[0] || '';
        const lastInitial = lName?.[0] || '';
        return `${firstInitial}${lastInitial}`.toUpperCase() || '?';
     };

    // Renderização de Loading ou Erro se usuário não carregado
    if (isLoadingUserContext) {
        return (
             <div className="flex justify-center items-center h-full pt-20"> {/* Ajuste no h-full */}
                 <Loader2 className="h-8 w-8 animate-spin text-primary" />
                 <p className="ml-2">Carregando perfil...</p>
             </div>
        );
    }
    if (!user) {
        return <div className="text-center py-10">Usuário não encontrado. Por favor, faça login novamente.</div>;
    }

    // Renderização principal
    return (
        <div className="container mx-auto max-w-3xl py-8 px-4">
            <Card>
                <CardHeader>
                    <CardTitle>Editar Perfil</CardTitle>
                    <CardDescription>Atualize suas informações pessoais.</CardDescription>
                </CardHeader>
                <form onSubmit={handleSubmit}>
                    <CardContent className="space-y-6">
                        {/* Seção da Foto */}
                        <div className="flex flex-col items-center gap-4">
                            <Avatar className="h-24 w-24 border-2 border-primary/20">
                                {/* <AvatarImage src={avatarPreview || user.avatarUrl} alt="Foto de Perfil" /> */}
                                <AvatarFallback className="text-3xl bg-primary/10 text-primary dark:bg-primary/20">
                                    {getInitials(user.firstName, user.lastName)}
                                </AvatarFallback>
                            </Avatar>
                            {/* Input de Arquivo (Comentado) */}
                            {/* <Input id="picture" type="file" accept="image/*" onChange={handleFileChange} className="max-w-xs ..." /> */}
                             <p className="text-xs text-muted-foreground">(Upload de foto em breve)</p>
                        </div>

                        {/* Campos de Nome */}
                        <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                            <div className="space-y-2">
                                <Label htmlFor="firstName">Nome</Label>
                                <Input
                                    id="firstName"
                                    value={firstName}
                                    onChange={(e) => setFirstName(e.target.value)}
                                    required
                                    disabled={updateProfileMutation.isPending}
                                />
                            </div>
                            <div className="space-y-2">
                                <Label htmlFor="lastName">Sobrenome</Label>
                                <Input
                                    id="lastName"
                                    value={lastName}
                                    onChange={(e) => setLastName(e.target.value)}
                                    required
                                    disabled={updateProfileMutation.isPending}
                                />
                            </div>
                        </div>
                        {/* Campo Email (Desabilitado) */}
                         <div className="space-y-2">
                             <Label htmlFor="email">Email</Label>
                             <Input id="email" value={user.email} disabled />
                             <p className="text-xs text-muted-foreground">O email não pode ser alterado.</p>
                         </div>

                    </CardContent>
                    <CardFooter>
                        <Button type="submit" disabled={updateProfileMutation.isPending}>
                            {updateProfileMutation.isPending && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
                            Salvar Alterações
                        </Button>
                    </CardFooter>
                </form>
            </Card>
        </div>
    );
}