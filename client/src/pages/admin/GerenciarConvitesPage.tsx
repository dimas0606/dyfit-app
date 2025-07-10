/// <reference types="vite/client" /> 
// Localização: client/src/pages/admin/GerenciarConvitesPage.tsx
import React, { useState, useEffect, useCallback } from 'react';
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
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
  TableCaption,
} from "@/components/ui/table";
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
  AlertDialogTrigger,
} from "@/components/ui/alert-dialog";
import {
  Tooltip,
  TooltipContent,
  TooltipProvider,
  TooltipTrigger,
} from "@/components/ui/tooltip";
import { useToast } from "@/hooks/use-toast";
import { apiRequest } from '@/lib/queryClient';
import { Copy, Check, Trash2, RefreshCw, Loader2 } from 'lucide-react';
import { format } from 'date-fns';
import { ptBR } from 'date-fns/locale';

interface ConviteCriadoResponse {
  mensagem: string;
  convite: ConviteDetalhes;
  linkConvite: string;
}

interface ConviteFormData {
  emailConvidado?: string;
  diasParaExpirar?: number;
  roleConvidado?: 'Personal Trainer' | 'Admin';
}

interface ConviteDetalhes {
  _id: string;
  token: string;
  emailConvidado?: string;
  roleConvidado: 'Personal Trainer' | 'Admin';
  status: 'pendente' | 'utilizado' | 'expirado';
  dataExpiracao?: string;
  criadoPor: string;
  usadoPor?: {
    _id: string;
    nome?: string;
    email?: string;
  } | null;
  dataUtilizacao?: string;
  createdAt: string;
  updatedAt: string;
}

const GerenciarConvitesPage: React.FC = () => {
  const [formData, setFormData] = useState<ConviteFormData>({
    emailConvidado: '',
    diasParaExpirar: 7,
    roleConvidado: 'Personal Trainer',
  });
  const [linkGerado, setLinkGerado] = useState<string | null>(null);
  const [isLoadingGeracao, setIsLoadingGeracao] = useState<boolean>(false);
  const [isCopiedForm, setIsCopiedForm] = useState<boolean>(false); 
  
  const [convites, setConvites] = useState<ConviteDetalhes[]>([]);
  const [isLoadingLista, setIsLoadingLista] = useState<boolean>(false);
  const [conviteParaRevogar, setConviteParaRevogar] = useState<ConviteDetalhes | null>(null);

  const { toast } = useToast();
  const frontendBaseUrl = import.meta.env.VITE_APP_BASE_URL || window.location.origin;

  const fetchConvites = useCallback(async () => {
    setIsLoadingLista(true);
    try {
      const data = await apiRequest<ConviteDetalhes[]>('GET', '/api/admin/convites/personal');
      setConvites(data);
    } catch (error: any) {
      toast({
        title: "Erro ao Buscar Convites",
        description: error.message || "Não foi possível carregar a lista de convites.",
        variant: "destructive",
      });
    } finally {
      setIsLoadingLista(false);
    }
  }, [toast]);

  useEffect(() => {
    fetchConvites();
  }, [fetchConvites]);

  const handleChange = (e: React.ChangeEvent<HTMLInputElement | HTMLSelectElement>) => {
    const { name, value } = e.target;
    setFormData(prevState => ({
      ...prevState,
      [name]: name === 'diasParaExpirar' ? (value === '' ? undefined : Number(value)) : value,
    }));
  };

  const handleSubmitGerarConvite = async (e: React.FormEvent<HTMLFormElement>) => {
    e.preventDefault();
    setIsLoadingGeracao(true);
    setLinkGerado(null);
    setIsCopiedForm(false);

    try {
      const payload: any = {
        roleConvidado: formData.roleConvidado || 'Personal Trainer',
      };
      if (formData.emailConvidado && formData.emailConvidado.trim() !== '') {
        payload.emailConvidado = formData.emailConvidado.trim();
      }
      if (formData.diasParaExpirar !== undefined && formData.diasParaExpirar > 0) {
        payload.diasParaExpirar = formData.diasParaExpirar;
      }

      const response = await apiRequest<ConviteCriadoResponse>('POST', '/api/admin/convites/personal', payload);
      
      setLinkGerado(response.linkConvite);
      toast({
        title: "Sucesso!",
        description: response.mensagem || "Convite criado e link gerado.",
      });
      fetchConvites(); 
    } catch (error: any) {
      const errorMessage = error.message || "Falha ao criar convite. Tente novamente.";
      toast({
        title: "Erro ao Criar Convite",
        description: errorMessage,
        variant: "destructive",
      });
    } finally {
      setIsLoadingGeracao(false);
    }
  };

  const handleCopyToClipboardForm = () => {
    if (linkGerado) {
      navigator.clipboard.writeText(linkGerado)
        .then(() => {
          setIsCopiedForm(true);
          toast({ description: "Link copiado para a área de transferência!" });
          setTimeout(() => setIsCopiedForm(false), 2000);
        })
        // =======================================================
        // --- AVISO CORRIGIDO: Variável 'err' removida ---
        .catch(() => {
          toast({ description: "Erro ao copiar o link.", variant: "destructive" });
        });
        // =======================================================
    }
  };

  const handleRevogarConvite = async () => {
    if (!conviteParaRevogar) return;
    setIsLoadingGeracao(true); 
    try {
      await apiRequest('DELETE', `/api/admin/convites/personal/${conviteParaRevogar._id}`);
      toast({
        title: "Convite Revogado",
        description: `O convite para ${conviteParaRevogar.emailConvidado || 'convidado genérico'} foi revogado.`,
      });
      fetchConvites(); 
    } catch (error: any) {
      toast({
        title: "Erro ao Revogar Convite",
        description: error.message || "Não foi possível revogar o convite.",
        variant: "destructive",
      });
    } finally {
      setIsLoadingGeracao(false);
      setConviteParaRevogar(null); 
    }
  };

  const formatarData = (dataISO?: string) => {
    if (!dataISO) return 'N/A';
    try {
      return format(new Date(dataISO), "dd/MM/yyyy 'às' HH:mm", { locale: ptBR });
    } catch (e) {
      return 'Data inválida';
    }
  };

  const getStatusBadge = (status: ConviteDetalhes['status']) => {
    switch (status) {
      case 'pendente':
        return <span className="px-2 py-1 text-xs font-semibold text-yellow-800 bg-yellow-100 rounded-full dark:bg-yellow-700 dark:text-yellow-100">Pendente</span>;
      case 'utilizado':
        return <span className="px-2 py-1 text-xs font-semibold text-green-800 bg-green-100 rounded-full dark:bg-green-700 dark:text-green-100">Utilizado</span>;
      case 'expirado':
        return <span className="px-2 py-1 text-xs font-semibold text-red-800 bg-red-100 rounded-full dark:bg-red-700 dark:text-red-100">Expirado</span>;
      default:
        return <span className="px-2 py-1 text-xs font-semibold text-gray-800 bg-gray-100 rounded-full dark:bg-gray-700 dark:text-gray-100">{status}</span>;
    }
  };

  return (
    <TooltipProvider> 
      <div className="container mx-auto p-4 md:p-6 lg:p-8 space-y-8">
        <h1 className="text-3xl font-bold text-center text-gray-800 dark:text-gray-100 mb-8">
          Gerenciamento de Convites para Personais
        </h1>

        <Card className="max-w-2xl mx-auto shadow-xl border dark:border-gray-700">
          <CardHeader>
            <CardTitle className="text-xl font-semibold text-center">Gerar Novo Convite</CardTitle>
            <CardDescription className="text-center text-sm text-muted-foreground">
              Crie um link de convite para novos personais se cadastrarem.
            </CardDescription>
          </CardHeader>
          <CardContent>
            <form onSubmit={handleSubmitGerarConvite} className="space-y-6">
              <div className="space-y-2">
                <Label htmlFor="emailConvidado">Email do Convidado (Opcional)</Label>
                <Input id="emailConvidado" name="emailConvidado" type="email" placeholder="exemplo@email.com" value={formData.emailConvidado || ''} onChange={handleChange} className="bg-background" />
                <p className="text-xs text-muted-foreground">Se preenchido, o convite será específico para este email.</p>
              </div>
              <div className="space-y-2">
                <Label htmlFor="diasParaExpirar">Validade do Convite (em dias)</Label>
                <Input id="diasParaExpirar" name="diasParaExpirar" type="number" min="1" placeholder="7" value={formData.diasParaExpirar || ''} onChange={handleChange} className="bg-background" />
                <p className="text-xs text-muted-foreground">Padrão: 7 dias. Deixe em branco para usar o padrão do servidor.</p>
              </div>
              <div className="space-y-2">
                <Label htmlFor="roleConvidado">Tipo de Usuário</Label>
                <select id="roleConvidado" name="roleConvidado" value={formData.roleConvidado || 'Personal Trainer'} onChange={handleChange} className="flex h-10 w-full items-center justify-between rounded-md border border-input bg-background px-3 py-2 text-sm ring-offset-background placeholder:text-muted-foreground focus:outline-none focus:ring-2 focus:ring-ring focus:ring-offset-2 disabled:cursor-not-allowed disabled:opacity-50">
                  <option value="Personal Trainer">Personal Trainer</option>
                  <option value="Admin">Administrador</option>
                </select>
              </div>
              <Button type="submit" className="w-full font-semibold" disabled={isLoadingGeracao}>
                {isLoadingGeracao ? <Loader2 className="mr-2 h-4 w-4 animate-spin" /> : null}
                {isLoadingGeracao ? 'Gerando...' : 'Gerar Convite'}
              </Button>
            </form>
          </CardContent>
          {linkGerado && (
            <CardFooter className="flex flex-col items-center space-y-3 pt-5 border-t dark:border-gray-700">
              <p className="text-sm font-medium text-center">Link de Convite Gerado:</p>
              <div className="flex w-full max-w-md items-center space-x-2 p-2 border rounded-md bg-muted dark:bg-gray-800">
                <Input type="text" value={linkGerado} readOnly className="flex-grow bg-transparent border-none focus:ring-0 text-sm" />
                <Tooltip>
                  <TooltipTrigger asChild>
                    <Button variant="ghost" size="icon" onClick={handleCopyToClipboardForm} aria-label="Copiar link gerado">
                      {isCopiedForm ? <Check className="h-5 w-5 text-green-500" /> : <Copy className="h-5 w-5" />}
                    </Button>
                  </TooltipTrigger>
                  <TooltipContent>
                    <p>Copiar link</p>
                  </TooltipContent>
                </Tooltip>
              </div>
              <p className="text-xs text-muted-foreground text-center">Envie este link para o personal.</p>
            </CardFooter>
          )}
        </Card>

        <Card className="shadow-xl border dark:border-gray-700">
          <CardHeader className="flex flex-row items-center justify-between pb-4">
            <div>
              <CardTitle className="text-xl font-semibold">Convites Enviados</CardTitle>
              <CardDescription className="text-sm text-muted-foreground">Lista de todos os convites gerados.</CardDescription>
            </div>
            <Tooltip>
              <TooltipTrigger asChild>
                <Button variant="outline" size="icon" onClick={fetchConvites} disabled={isLoadingLista} aria-label="Atualizar lista de convites">
                  {isLoadingLista ? <Loader2 className="h-4 w-4 animate-spin" /> : <RefreshCw className="h-4 w-4" />}
                </Button>
              </TooltipTrigger>
              <TooltipContent>
                <p>Atualizar lista</p>
              </TooltipContent>
            </Tooltip>
          </CardHeader>
          <CardContent>
            {isLoadingLista && convites.length === 0 && (
              <div className="flex justify-center items-center py-10 text-muted-foreground">
                <Loader2 className="h-8 w-8 animate-spin text-primary" />
                <p className="ml-3 text-sm">Carregando convites...</p>
              </div>
            )}
            {!isLoadingLista && convites.length === 0 && (
              <p className="text-center text-muted-foreground py-10 text-sm">Nenhum convite encontrado.</p>
            )}
            {convites.length > 0 && (
              <div className="overflow-x-auto">
                <Table>
                  <TableCaption className="mt-4">Um total de {convites.length} convite(s) encontrado(s).</TableCaption>
                  <TableHeader>
                    <TableRow>
                      <TableHead className="min-w-[200px]">Email Convidado</TableHead>
                      <TableHead>Status</TableHead>
                      <TableHead className="min-w-[150px]">Expira Em</TableHead>
                      <TableHead className="min-w-[200px]">Utilizado Por</TableHead>
                      <TableHead className="min-w-[200px]">Link</TableHead>
                      <TableHead className="text-right">Ações</TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {convites.map((convite) => (
                      <TableRow key={convite._id}>
                        <TableCell className="font-medium text-sm">{convite.emailConvidado || <span className="italic text-gray-500 dark:text-gray-400">Qualquer email</span>}</TableCell>
                        <TableCell>{getStatusBadge(convite.status)}</TableCell>
                        <TableCell className="text-sm">{formatarData(convite.dataExpiracao)}</TableCell>
                        <TableCell className="text-sm">
                          {convite.usadoPor ? 
                            `${convite.usadoPor.nome || 'Nome não disp.'} (${convite.usadoPor.email || 'Email não disp.'})` : 
                            <span className="italic text-gray-500 dark:text-gray-400">Ninguém</span>
                          }
                        </TableCell>
                        <TableCell>
                          <div className="flex items-center">
                            <Input 
                              type="text" 
                              value={`${frontendBaseUrl}/cadastrar-personal/convite/${convite.token}`} 
                              readOnly 
                              className="text-xs p-1 h-8 bg-transparent border-none focus:ring-0 mr-1 truncate flex-grow"
                              title={`${frontendBaseUrl}/cadastrar-personal/convite/${convite.token}`}
                            />
                            <Tooltip>
                              <TooltipTrigger asChild>
                                <Button 
                                  variant="ghost" 
                                  size="icon" 
                                  className="h-8 w-8"
                                  onClick={() => navigator.clipboard.writeText(`${frontendBaseUrl}/cadastrar-personal/convite/${convite.token}`).then(() => toast({description: "Link do convite copiado!"}))}
                                  aria-label="Copiar link do convite"
                                >
                                  <Copy className="h-4 w-4" />
                                </Button>
                              </TooltipTrigger>
                              <TooltipContent><p>Copiar link</p></TooltipContent>
                            </Tooltip>
                          </div>
                        </TableCell>
                        <TableCell className="text-right">
                          {convite.status === 'pendente' && (
                            <AlertDialog>
                              <AlertDialogTrigger asChild>
                                <Button variant="destructive" size="sm" onClick={() => setConviteParaRevogar(convite)}>
                                  <Trash2 className="h-4 w-4 mr-1" />
                                  Revogar
                                </Button>
                              </AlertDialogTrigger>
                              <AlertDialogContent>
                                <AlertDialogHeader>
                                  <AlertDialogTitle>Confirmar Revogação</AlertDialogTitle>
                                  <AlertDialogDescription>
                                    Tem certeza que deseja revogar este convite? Esta ação não poderá ser desfeita.
                                    {conviteParaRevogar?.emailConvidado && ` O convite para ${conviteParaRevogar.emailConvidado} será invalidado.`}
                                  </AlertDialogDescription>
                                </AlertDialogHeader>
                                <AlertDialogFooter>
                                  <AlertDialogCancel onClick={() => setConviteParaRevogar(null)}>Cancelar</AlertDialogCancel>
                                  <AlertDialogAction onClick={handleRevogarConvite} disabled={isLoadingGeracao} className="bg-destructive hover:bg-destructive/90">
                                    {isLoadingGeracao ? <Loader2 className="mr-2 h-4 w-4 animate-spin" /> : null}
                                    Revogar
                                  </AlertDialogAction>
                                </AlertDialogFooter>
                              </AlertDialogContent>
                            </AlertDialog>
                          )}
                        </TableCell>
                      </TableRow>
                    ))}
                  </TableBody>
                </Table>
              </div>
            )}
          </CardContent>
        </Card>
      </div>
    </TooltipProvider>
  );
};

export default GerenciarConvitesPage;
