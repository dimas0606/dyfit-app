// client/src/pages/admin/ListarPersonaisPage.tsx - SOLUÇÃO FINAL COM POPOVER
import { useState } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { apiRequest } from '../../lib/queryClient';
import { Button } from '../../components/ui/button';
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "../../components/ui/table";
// =======================================================
// --- MUDANÇA: IMPORTANDO POPOVER ---
import {
  Popover,
  PopoverContent,
  PopoverTrigger,
} from "../../components/ui/popover";
// =======================================================
import { MoreHorizontal, Trash2, Edit, Eye, Loader2, ShieldCheck, UserCog, UserPlus } from 'lucide-react';
import { Badge } from '../../components/ui/badge';
import { useToast } from '../../hooks/use-toast';
import { AlertDialog, AlertDialogAction, AlertDialogCancel, AlertDialogContent, AlertDialogDescription, AlertDialogFooter, AlertDialogHeader, AlertDialogTitle } from '../../components/ui/alert-dialog';
import LoadingSpinner from '../../components/LoadingSpinner';
import ErrorMessage from '../../components/ErrorMessage';
import { Link } from 'wouter';
import VisualizarPersonalModal from '../../components/dialogs/admin/VisualizarPersonalModal';

export interface PersonalListadoItem {
  _id: string;
  nome: string;
  email: string;
  role: 'personal' | 'admin' | string;
  createdAt: string;
}

export interface PersonalDetalhes extends PersonalListadoItem {
  tokenCadastroAluno?: string;
  statusAssinatura?: string;
  limiteAlunos?: number;
  dataFimAssinatura?: string;
  updatedAt: string;
}

export default function ListarPersonaisPage() {
  const queryClient = useQueryClient();
  const { toast } = useToast();
  const [personalParaExcluir, setPersonalParaExcluir] = useState<PersonalListadoItem | null>(null);
  const [isConfirmDeleteOpen, setIsConfirmDeleteOpen] = useState(false);

  const [isViewModalOpen, setIsViewModalOpen] = useState(false);
  const [personalParaVisualizar, setPersonalParaVisualizar] = useState<PersonalDetalhes | null>(null);
  const [isLoadingPersonalDetails, setIsLoadingPersonalDetails] = useState(false);

  // Mantemos a configuração que impede re-fetchs desnecessários
  const { data: personais, isLoading, error: queryError } = useQuery<PersonalListadoItem[], Error>({
    queryKey: ['adminPersonalTrainersList'],
    queryFn: () => apiRequest<PersonalListadoItem[]>("GET", "/api/admin/personal-trainers"),
    staleTime: Infinity,
    refetchOnWindowFocus: false,
  });

  const deletePersonalMutation = useMutation<any, Error, string>({
    mutationFn: (personalId: string) => apiRequest("DELETE", `/api/admin/personal-trainers/${personalId}`),
    onSuccess: (data) => {
      toast({ title: "Sucesso!", description: data.message || "Personal trainer excluído." });
      queryClient.invalidateQueries({ queryKey: ['adminPersonalTrainersList'] });
    },
    onError: (err) => {
      toast({ variant: "destructive", title: "Erro ao Excluir", description: err.message || "Não foi possível excluir o personal trainer." });
    },
    onSettled: () => {
      setPersonalParaExcluir(null);
      setIsConfirmDeleteOpen(false);
    }
  });

  const handleExcluirClick = (personal: PersonalListadoItem) => {
    setPersonalParaExcluir(personal);
    setIsConfirmDeleteOpen(true);
  };

  const confirmarExclusao = () => {
    if (personalParaExcluir) {
      deletePersonalMutation.mutate(personalParaExcluir._id);
    }
  };

  const handleVisualizarClick = async (personalId: string) => {
    setIsLoadingPersonalDetails(true);
    setPersonalParaVisualizar(null); 
    setIsViewModalOpen(true);
    try {
      const data = await apiRequest<PersonalDetalhes>("GET", `/api/admin/personal-trainers/${personalId}`);
      setPersonalParaVisualizar(data);
    } catch (err: any) {
      toast({ variant: "destructive", title: "Erro ao buscar detalhes", description: err.message || "Não foi possível carregar os dados do personal." });
      setIsViewModalOpen(false);
    } finally {
      setIsLoadingPersonalDetails(false);
    }
  };

  if (isLoading) return <div className="flex h-[calc(100vh-150px)] items-center justify-center"><LoadingSpinner text="Carregando lista de personais..." /></div>;
  if (queryError) return <ErrorMessage title="Erro ao Carregar Personais" message={queryError?.message || "Não foi possível buscar a lista de personais."} />;

  return (
    <div className="container mx-auto py-8 px-4">
      <div className="flex justify-between items-center mb-6">
        <h1 className="text-3xl font-bold text-gray-800 dark:text-gray-100 flex items-center">
          <UserCog className="mr-3 h-8 w-8 text-primary" />
          Gerenciar Personais
        </h1>
        <Link href="/admin/criar-personal">
          <Button>
            <UserPlus className="mr-2 h-4 w-4" />
            Criar Novo Personal
          </Button>
        </Link>
      </div>

      {personais && personais.length > 0 ? (
        <div className="border rounded-lg shadow-sm overflow-hidden dark:border-gray-700">
          <Table>
            <TableHeader className="bg-gray-50 dark:bg-gray-800">
              <TableRow>
                <TableHead className="w-[250px] font-semibold text-gray-700 dark:text-gray-300">Nome</TableHead>
                <TableHead className="font-semibold text-gray-700 dark:text-gray-300">Email</TableHead>
                <TableHead className="font-semibold text-gray-700 dark:text-gray-300">Função (Role)</TableHead>
                <TableHead className="font-semibold text-gray-700 dark:text-gray-300">Data de Criação</TableHead>
                <TableHead className="text-right font-semibold text-gray-700 dark:text-gray-300">Ações</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {personais.map((personal) => (
                <TableRow key={personal._id} className="dark:border-gray-700 hover:bg-gray-50/50 dark:hover:bg-gray-700/30">
                  <TableCell className="font-medium text-gray-900 dark:text-gray-100">{personal.nome}</TableCell>
                  <TableCell className="text-gray-600 dark:text-gray-300">{personal.email}</TableCell>
                  <TableCell>
                    <Badge variant={personal.role.toLowerCase() === 'admin' ? 'destructive' : 'outline'}
                           className={`font-medium ${personal.role.toLowerCase() === 'admin' ? 
                                      'border-red-500 text-red-600 bg-red-100 dark:bg-red-900/60 dark:text-red-300 dark:border-red-700' : 
                                      'border-blue-500 text-blue-600 bg-blue-100 dark:bg-sky-900/60 dark:text-sky-300 dark:border-sky-700'}`}>
                        {personal.role.toLowerCase() === 'admin' && <ShieldCheck className="mr-1.5 h-3.5 w-3.5" />}
                        {personal.role}
                    </Badge>
                  </TableCell>
                  <TableCell className="text-gray-600 dark:text-gray-300">
                    {new Date(personal.createdAt).toLocaleDateString('pt-BR', { day: '2-digit', month: '2-digit', year: 'numeric' })}
                  </TableCell>
                  <TableCell className="text-right">
                    {/* ======================================================= */}
                    {/* --- SOLUÇÃO: SUBSTITUINDO DROPDOWNMENU POR POPOVER --- */}
                    <Popover>
                      <PopoverTrigger asChild>
                        <Button variant="ghost" className="h-8 w-8 p-0">
                          <span className="sr-only">Abrir menu</span>
                          <MoreHorizontal className="h-4 w-4" />
                        </Button>
                      </PopoverTrigger>
                      <PopoverContent className="w-40 p-1">
                        <div className="flex flex-col space-y-1">
                            <Button variant="ghost" className="w-full justify-start text-sm" onClick={() => handleVisualizarClick(personal._id)}>
                                <Eye className="mr-2 h-4 w-4" /> Visualizar
                            </Button>
                            <Button variant="ghost" className="w-full justify-start text-sm" onClick={() => alert(`Funcionalidade Editar para: ${personal.nome} (não implementada)`)}>
                                <Edit className="mr-2 h-4 w-4" /> Editar
                            </Button>
                            <div className="border-t my-1"></div>
                            <Button variant="ghost" className="w-full justify-start text-sm text-red-600 hover:text-red-700" onClick={() => handleExcluirClick(personal)} disabled={deletePersonalMutation.isPending && personalParaExcluir?._id === personal._id}>
                                {deletePersonalMutation.isPending && personalParaExcluir?._id === personal._id ? (
                                    <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                                ) : (
                                    <Trash2 className="mr-2 h-4 w-4" />
                                )}
                                Excluir
                            </Button>
                        </div>
                      </PopoverContent>
                    </Popover>
                    {/* ======================================================= */}
                  </TableCell>
                </TableRow>
              ))}
            </TableBody>
          </Table>
        </div>
      ) : (
        <p className="text-center py-10 text-gray-500 dark:text-gray-400">Nenhum personal trainer encontrado.</p>
      )}

      <AlertDialog open={isConfirmDeleteOpen} onOpenChange={setIsConfirmDeleteOpen}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Confirmar Exclusão</AlertDialogTitle>
            <AlertDialogDescription>
              Tem certeza que deseja excluir o personal trainer "{personalParaExcluir?.nome}" ({personalParaExcluir?.email})? Esta ação não pode ser desfeita.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel onClick={() => setIsConfirmDeleteOpen(false)} disabled={deletePersonalMutation.isPending}>
              Cancelar
            </AlertDialogCancel>
            <AlertDialogAction
              onClick={confirmarExclusao}
              disabled={deletePersonalMutation.isPending}
              className="bg-red-600 hover:bg-red-700 dark:bg-red-700 dark:hover:bg-red-800"
            >
              {deletePersonalMutation.isPending && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
              Confirmar Exclusão
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>

      <VisualizarPersonalModal
        isOpen={isViewModalOpen}
        onClose={() => {
          setIsViewModalOpen(false);
          setPersonalParaVisualizar(null);
        }}
        personal={personalParaVisualizar}
        isLoading={isLoadingPersonalDetails}
      />
    </div>
  );
}