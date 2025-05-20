// client/src/components/ui/dashboard/students-table.tsx
import { useState } from "react";
import { ModalEditarAluno } from "@/components/ui/ModalEditarAluno"; // Verifique se este modal usa apiRequest
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Badge } from "@/components/ui/badge";
import { Eye, Loader2, Plus, Search, UserX } from "lucide-react"; 
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query"; // Adicionado useMutation e useQueryClient
import { Link, useLocation } from "wouter";
import { Button } from "@/components/ui/button";
import ActionsAluno from "@/components/ui/ActionsAluno"; 
import { useToast } from "@/hooks/use-toast";
import { apiRequest } from "@/lib/queryClient"; // Importar apiRequest
import { Aluno } from "@/types/aluno"; // Importar tipo Aluno
import { ModalConfirmacao } from "@/components/ui/modal-confirmacao"; // Para confirmação de exclusão
import { useConfirmDialog } from "@/hooks/useConfirmDialog"; // Para confirmação de exclusão
import ErrorMessage from "@/components/ErrorMessage"; // Para exibir erros
import { Input } from "@/components/ui/input"; // Para o campo de busca

interface StudentsTableProps {
  trainerId: string; // Alterado para string
}

export function StudentsTable({ trainerId }: StudentsTableProps) {
  const [, navigate] = useLocation();
  const { toast } = useToast();
  const queryClientHook = useQueryClient(); // Hook para invalidar queries

  const [modalEditarOpen, setModalEditarOpen] = useState(false);
  const [alunoSelecionado, setAlunoSelecionado] = useState<Aluno | null>(null);
  const [alunoParaExcluir, setAlunoParaExcluir] = useState<Aluno | null>(null);
  const [searchQuery, setSearchQuery] = useState("");

  const { 
    isOpen: isConfirmDeleteOpen, 
    options: confirmDeleteOptions, 
    openConfirmDialog: openDeleteStudentDialog, 
    closeConfirmDialog: closeDeleteStudentDialog,
    confirm: confirmDeleteStudentAction
  } = useConfirmDialog();

  const { data: students = [], isLoading, error, refetch: refetchStudents } = useQuery<Aluno[], Error>({ 
    queryKey: ["/api/alunos", { trainerId, forComponent: "StudentsTableDashboard" }], // Chave mais específica
    queryFn: async (): Promise<Aluno[]> => { 
      if (!trainerId) throw new Error("Trainer ID não fornecido para buscar alunos.");
      // Usando apiRequest para chamadas autenticadas
      // A rota /api/alunos já deve filtrar pelo trainerId do usuário autenticado no backend
      return apiRequest<Aluno[]>("GET", `/api/alunos`); 
    },
    enabled: !!trainerId,
    staleTime: 1000 * 60 * 2, // Cache de 2 minutos para a tabela no dashboard
  });

  // Mutação para excluir aluno
  const deleteStudentMutation = useMutation<any, Error, string>({
    mutationFn: (alunoId: string) => {
        return apiRequest("DELETE", `/api/alunos/${alunoId}`);
    },
    onSuccess: (data, alunoId) => {
        toast({ title: "Aluno Removido", description: `${alunoParaExcluir?.nome || 'O aluno'} foi removido.` });
        queryClientHook.invalidateQueries({ queryKey: ["/api/alunos"] }); // Invalida a lista principal de alunos
        queryClientHook.invalidateQueries({ queryKey: ["/api/alunos", { trainerId, forComponent: "StudentsTableDashboard" }] }); // Invalida esta query específica
        // Invalidar também a query de estatísticas do dashboard se ela contar alunos
        queryClientHook.invalidateQueries({ queryKey: ["/api/dashboard/geral", trainerId] });
        setAlunoParaExcluir(null);
        closeDeleteStudentDialog();
    },
    onError: (error) => {
        toast({ variant: "destructive", title: "Erro ao Remover", description: error.message || "Não foi possível remover o aluno." });
        setAlunoParaExcluir(null);
        closeDeleteStudentDialog();
    },
  });


  const handleEditClick = (aluno: Aluno) => {
    setAlunoSelecionado(aluno);
    setModalEditarOpen(true); // ModalEditarAluno deve usar apiRequest internamente
  };
  
  const handleViewClick = (alunoId: string) => {
     navigate(`/alunos/${alunoId}`); 
  }

  const handleDeleteClick = (aluno: Aluno) => {
    if (!aluno._id || !aluno.nome) {
        toast({ variant: "destructive", title: "Erro", description: "ID ou nome do aluno inválido." });
        return;
    }
    setAlunoParaExcluir(aluno);
    openDeleteStudentDialog({
        titulo: "Remover Aluno",
        mensagem: `Tem certeza que deseja remover ${aluno.nome}? Esta ação não pode ser desfeita e removerá também suas fichas de treino.`,
        textoConfirmar: "Remover Aluno",
        textoCancelar: "Cancelar",
        onConfirm: () => {
            if (aluno._id) {
                deleteStudentMutation.mutate(aluno._id);
            }
        },
    });
  };

  const filteredStudents = students.filter((student) => {
    const fullName = (student.nome || "").toLowerCase();
    const email = (student.email || "").toLowerCase();
    const query = searchQuery.toLowerCase();
    return fullName.includes(query) || email.includes(query);
  }).slice(0, 5); // Limitar a 5 alunos no dashboard

  const renderStudentSkeleton = (count = 3) => (
    [...Array(count)].map((_, i) => (
        <TableRow key={`skeleton-student-${i}`}>
            <TableCell className="pl-6 py-3"><div className="flex items-center"><div className="h-9 w-9 rounded-full bg-gray-200 dark:bg-gray-700 animate-pulse mr-3"></div><div className="h-4 bg-gray-200 dark:bg-gray-700 rounded w-32 animate-pulse"></div></div></TableCell>
            <TableCell className="px-6 py-3"><div className="h-4 bg-gray-200 dark:bg-gray-700 rounded w-40 animate-pulse"></div></TableCell>
            <TableCell className="px-6 py-3"><div className="h-4 bg-gray-200 dark:bg-gray-700 rounded w-24 animate-pulse"></div></TableCell>
            <TableCell className="px-6 py-3"><div className="h-6 w-16 bg-gray-200 dark:bg-gray-700 rounded-full animate-pulse"></div></TableCell>
            <TableCell className="text-right pr-6 py-3"><div className="flex justify-end items-center gap-1"><div className="h-8 w-8 bg-gray-200 dark:bg-gray-700 rounded animate-pulse"></div><div className="h-8 w-8 bg-gray-200 dark:bg-gray-700 rounded animate-pulse"></div></div></TableCell>
        </TableRow>
    ))
  );


  return (
    <>
      <Card className="border border-gray-100 dark:border-gray-800 overflow-hidden shadow-sm">
        <CardHeader className="px-6 py-4 border-b border-gray-200 dark:border-gray-700 flex flex-col sm:flex-row items-start sm:items-center justify-between gap-2">
          <CardTitle className="font-semibold text-gray-900 dark:text-gray-100">Alunos Recentes</CardTitle>
          <div className="flex items-center space-x-2">
            <div className="relative">
                <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 text-gray-400 dark:text-gray-500 h-4 w-4 pointer-events-none" />
                <Input 
                    type="search" 
                    placeholder="Buscar alunos..." 
                    className="pl-9 w-full sm:w-48 h-9 text-sm bg-white dark:bg-gray-800 border-gray-300 dark:border-gray-600 rounded-md" 
                    value={searchQuery} 
                    onChange={(e) => setSearchQuery(e.target.value)} 
                    aria-label="Pesquisar alunos"
                />
            </div>
            <Button size="sm" variant="outline" onClick={() => navigate("/alunos/novo")}> 
              <Plus className="mr-1.5 w-4 h-4" /> Adicionar
            </Button>
          </div>
        </CardHeader>
        <CardContent className="p-0">
          <div className="overflow-x-auto">
            <Table>
              <TableHeader className="bg-gray-50 dark:bg-gray-800/50">
                <TableRow>
                  <TableHead className="pl-6 py-3 text-left text-xs font-medium text-gray-500 dark:text-gray-400 uppercase tracking-wider">Aluno</TableHead> 
                  <TableHead className="px-6 py-3 text-left text-xs font-medium text-gray-500 dark:text-gray-400 uppercase tracking-wider">Email</TableHead>
                  <TableHead className="px-6 py-3 text-left text-xs font-medium text-gray-500 dark:text-gray-400 uppercase tracking-wider">Objetivo</TableHead> 
                  <TableHead className="px-6 py-3 text-left text-xs font-medium text-gray-500 dark:text-gray-400 uppercase tracking-wider">Status</TableHead>
                  <TableHead className="text-right pr-6 py-3 text-xs font-medium text-gray-500 dark:text-gray-400 uppercase tracking-wider">Ações</TableHead> 
                </TableRow>
              </TableHeader>
              <TableBody className="bg-white dark:bg-gray-900 divide-y divide-gray-200 dark:divide-gray-700">
                {isLoading && renderStudentSkeleton(3)}
                {error && !isLoading && (
                    <TableRow><TableCell colSpan={5} className="text-center py-10"><ErrorMessage title="Erro ao Carregar Alunos" message={error.message} /></TableCell></TableRow>
                )}
                {!isLoading && !error && filteredStudents.length === 0 && ( 
                  <TableRow>
                    <TableCell colSpan={5} className="text-center py-10 text-gray-500 dark:text-gray-400"> 
                      {searchQuery ? `Nenhum aluno encontrado para "${searchQuery}".` : "Nenhum aluno cadastrado."}
                    </TableCell>
                  </TableRow>
                )}
                {!isLoading && !error && filteredStudents.map((student) => (
                    <TableRow key={student._id} className="hover:bg-slate-50 dark:hover:bg-gray-800/70"> 
                      <TableCell className="pl-6 py-3 whitespace-nowrap"> 
                        <div className="flex items-center">
                          <div className="h-9 w-9 rounded-full bg-primary/10 text-primary flex items-center justify-center mr-3 font-medium text-sm">
                            {student.nome?.split(' ').map(n => n[0]).slice(0, 2).join('').toUpperCase() || '?'}
                          </div>
                          <div className="text-sm font-medium text-gray-900 dark:text-gray-100">{student.nome || 'N/A'}</div>
                        </div>
                      </TableCell>
                      <TableCell className="px-6 py-3 whitespace-nowrap text-sm text-gray-600 dark:text-gray-400">
                         {student.email || '-'}
                      </TableCell>
                      <TableCell className="px-6 py-3 whitespace-nowrap text-sm text-gray-600 dark:text-gray-400 truncate max-w-xs">
                         {student.goal || '-'}
                      </TableCell>
                      <TableCell className="px-6 py-3 whitespace-nowrap">
                           <Badge variant={student.status === 'active' ? 'success' : 'destructive'} 
                                  className={`text-xs ${student.status === 'active' ? 'bg-green-100 text-green-800 dark:bg-green-700/30 dark:text-green-300' : 'bg-red-100 text-red-800 dark:bg-red-700/30 dark:text-red-300'}`}>
                             {student.status === 'active' ? 'Ativo' : 'Inativo'}
                           </Badge>
                      </TableCell>
                      <TableCell className="px-6 py-3 whitespace-nowrap text-right">
                        <div className="flex justify-end items-center gap-0.5"> 
                          <Button variant="ghost" size="icon" onClick={() => handleViewClick(student._id)} title="Visualizar Detalhes" className="h-8 w-8 text-blue-600 hover:text-blue-700">
                            <Eye className="h-4 w-4" />
                          </Button>
                          <ActionsAluno
                            onEdit={() => handleEditClick(student)} 
                            onDelete={() => handleDeleteClick(student)}
                          />
                        </div>
                      </TableCell>
                    </TableRow>
                  ))}
              </TableBody>
            </Table>
          </div>
           {students.length > 5 && !isLoading && (
                <div className="p-4 text-center border-t border-gray-100 dark:border-gray-800">
                    <Link href="/alunos">
                        <Button variant="link" size="sm">Ver todos os alunos</Button>
                    </Link>
                </div>
            )}
        </CardContent>
      </Card>

      {modalEditarOpen && alunoSelecionado && (
        <ModalEditarAluno
          isOpen={modalEditarOpen}
          onClose={() => { setModalEditarOpen(false); setAlunoSelecionado(null); }}
          aluno={alunoSelecionado} 
          atualizarAlunos={refetchStudents} 
        />
      )}
      <ModalConfirmacao
        isOpen={isConfirmDeleteOpen}
        onClose={closeDeleteStudentDialog}
        onConfirm={confirmDeleteStudentAction}
        titulo={confirmDeleteOptions.titulo}
        mensagem={confirmDeleteOptions.mensagem}
        textoConfirmar={confirmDeleteOptions.textoConfirmar}
        textoCancelar={confirmDeleteOptions.textoCancelar}
        isLoadingConfirm={deleteStudentMutation.isPending}
      />
    </>
  );
}
