// client/src/pages/alunos/index.tsx
// ATUALIZADO: Adicionada invalidação da query ["/api/alunos"] no onSuccess da exclusão de aluno

import React, { useState, useEffect } from "react"; // Adicionado useEffect
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { useLocation, Link } from "wouter";

import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Badge } from "@/components/ui/badge";
import { Skeleton } from "@/components/ui/skeleton";
import { Eye, Pencil, Plus, Search, Trash, UserX } from "lucide-react"; // Adicionado UserX para ícone de exclusão
// import { queryClient as localQueryClient, apiRequest } from "@/lib/queryClient"; // Removido localQueryClient se estiver usando o hook
import { fetchWithAuth } from "@/lib/apiClient"; // Usar fetchWithAuth consistentemente
import { useToast } from "@/hooks/use-toast";
import { ModalConfirmacao } from "@/components/ui/modal-confirmacao";
import { useConfirmDialog } from "@/hooks/useConfirmDialog";
import ErrorMessage from "@/components/ErrorMessage";
import { Aluno } from "@/types/aluno"; // Supondo que esta interface existe e é relevante

export default function StudentsIndex() {
    const [, setLocation] = useLocation();
    const { toast } = useToast();
    const queryClient = useQueryClient(); // Hook para acessar o query client
    const {
        isOpen: isConfirmOpen,
        options: confirmOptions,
        openConfirmDialog,
        closeConfirmDialog,
        confirm: confirmAction,
    } = useConfirmDialog();
    const [searchQuery, setSearchQuery] = useState("");
    const [alunoParaExcluir, setAlunoParaExcluir] = useState<Aluno | null>(null);


    const { data: students = [], isLoading, isError, error, refetch } = useQuery<Aluno[], Error>({
        queryKey: ['/api/alunos'], // Chave padronizada
        queryFn: async (): Promise<Aluno[]> => {
            const data = await fetchWithAuth<Aluno[]>("/api/alunos");
            return Array.isArray(data) ? data : [];
        },
        retry: 1,
    });

    // Mutação para excluir aluno
    const deleteStudentMutation = useMutation<any, Error, string>({
        mutationFn: (alunoId: string) => {
            return fetchWithAuth(`/api/alunos/${alunoId}`, { method: 'DELETE' });
        },
        onSuccess: (data, alunoId) => {
            toast({ title: "Aluno Removido", description: `${alunoParaExcluir?.nome || 'O aluno'} foi removido com sucesso.` });
            // **INVALIDE A QUERY AQUI**
            queryClient.invalidateQueries({ queryKey: ['/api/alunos'] });
            // Se você tiver outras queries que dependem de um aluno específico, invalide-as também:
            // queryClient.invalidateQueries({ queryKey: ['aluno', alunoId] });
            // queryClient.invalidateQueries({ queryKey: ['fichasAluno', alunoId] }); // Se o aluno tinha fichas
            setAlunoParaExcluir(null);
            closeConfirmDialog(); // Fecha o modal de confirmação
        },
        onError: (error) => {
            toast({ variant: "destructive", title: "Erro ao Remover", description: error.message || "Não foi possível remover o aluno." });
            setAlunoParaExcluir(null);
            closeConfirmDialog();
        },
    });


    const filteredStudents = students.filter((student) => {
        const fullName = (student.nome || "").toLowerCase();
        const email = (student.email || "").toLowerCase();
        const query = searchQuery.toLowerCase();
        return fullName.includes(query) || email.includes(query);
    });

    const renderStudentSkeleton = () => {
      return [...Array(5)].map((_, i) => (
            <TableRow key={`skeleton-${i}`}>
                <TableCell className="pl-6 py-4">
                    <div className="flex items-center">
                        <Skeleton className="h-10 w-10 rounded-full mr-4" />
                        <Skeleton className="h-4 w-32 rounded" />
                    </div>
                </TableCell>
                <TableCell className="px-6 py-4"><Skeleton className="h-4 w-48 rounded" /></TableCell>
                <TableCell className="px-6 py-4"><Skeleton className="h-6 w-16 rounded-full" /></TableCell>
                <TableCell className="text-right pr-6 py-4">
                    <div className="flex justify-end items-center space-x-1">
                        <Skeleton className="h-8 w-8 rounded" />
                        <Skeleton className="h-8 w-8 rounded" />
                        <Skeleton className="h-8 w-8 rounded" />
                    </div>
                </TableCell>
            </TableRow>
        ));
     };

    const handleDeleteClick = (aluno: Aluno) => {
        if (!aluno._id || !aluno.nome) {
            toast({ variant: "destructive", title: "Erro", description: "ID ou nome do aluno inválido para exclusão." });
            return;
        }
        setAlunoParaExcluir(aluno); // Guarda o aluno para usar o nome no toast de sucesso
        openConfirmDialog({
            titulo: "Remover Aluno",
            mensagem: `Tem certeza que deseja remover o aluno ${aluno.nome}? Esta ação não pode ser desfeita e removerá também suas fichas de treino.`,
            textoConfirmar: "Remover Aluno",
            textoCancelar: "Cancelar",
            onConfirm: () => {
                if (aluno._id) { // Segurança extra
                    deleteStudentMutation.mutate(aluno._id);
                }
            },
        });
    };

    return (
        <div className="p-4 md:p-6 lg:p-8">
            <Card className="border border-gray-100 dark:border-gray-800 shadow-sm overflow-hidden bg-white dark:bg-gray-900">
                <CardHeader className="flex flex-col sm:flex-row sm:items-center sm:justify-between space-y-2 sm:space-y-0 px-6 py-4 border-b border-gray-200 dark:border-gray-700">
                    <CardTitle className="text-xl font-semibold text-gray-800 dark:text-gray-100">Alunos</CardTitle>
                    <div className="flex flex-col sm:flex-row gap-2 sm:gap-4">
                        <div className="relative">
                            <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 text-gray-400 dark:text-gray-500 h-4 w-4 pointer-events-none" />
                            <Input type="search" placeholder="Pesquisar por nome ou email..." className="pl-9 w-full sm:w-64 text-sm bg-white dark:bg-gray-800 border-gray-300 dark:border-gray-600 rounded-md" value={searchQuery} onChange={(e) => setSearchQuery(e.target.value)} aria-label="Pesquisar alunos" />
                        </div>
                        <Link href="/alunos/novo">
                            <Button><Plus className="h-4 w-4 mr-2" /> Adicionar Aluno</Button>
                        </Link>
                    </div>
                </CardHeader>
                <CardContent className="p-0">
                    <div className="overflow-x-auto">
                        <Table>
                            <TableHeader className="bg-gray-50 dark:bg-gray-800/50">
                                <TableRow>
                                    <TableHead className="pl-6 py-3 text-left text-xs font-medium text-gray-500 dark:text-gray-400 uppercase tracking-wider">Aluno</TableHead>
                                    <TableHead className="px-6 py-3 text-left text-xs font-medium text-gray-500 dark:text-gray-400 uppercase tracking-wider">Email</TableHead>
                                    <TableHead className="px-6 py-3 text-left text-xs font-medium text-gray-500 dark:text-gray-400 uppercase tracking-wider">Status</TableHead>
                                    <TableHead className="pr-6 py-3 text-right text-xs font-medium text-gray-500 dark:text-gray-400 uppercase tracking-wider">Ações</TableHead>
                                </TableRow>
                            </TableHeader>
                            <TableBody className="bg-white dark:bg-gray-900 divide-y divide-gray-200 dark:divide-gray-700">
                                {isLoading && renderStudentSkeleton()}
                                {isError && !isLoading && (
                                    <TableRow>
                                        <TableCell colSpan={4} className="px-6 py-16 text-center">
                                            <ErrorMessage title="Erro ao Carregar Alunos" message={error?.message || "Não foi possível buscar os dados. Tente novamente."} />
                                        </TableCell>
                                    </TableRow>
                                )}
                                {!isLoading && !isError && filteredStudents.length === 0 && (
                                     <TableRow>
                                        <TableCell colSpan={4} className="px-6 py-16 text-center text-gray-500 dark:text-gray-400">
                                            {searchQuery ? `Nenhum aluno encontrado para "${searchQuery}".` : "Nenhum aluno cadastrado ainda."}
                                        </TableCell>
                                    </TableRow>
                                )}
                                {!isLoading && !isError && filteredStudents.length > 0 &&
                                    filteredStudents.map((student) => (
                                        <TableRow key={student._id} className="hover:bg-gray-50 dark:hover:bg-gray-800/50">
                                            <TableCell className="pl-6 py-4 whitespace-nowrap">
                                                <div className="flex items-center">
                                                    <div className="flex-shrink-0 h-10 w-10 rounded-full bg-blue-100 dark:bg-blue-900 text-blue-700 dark:text-blue-300 flex items-center justify-center mr-4 font-semibold text-sm">
                                                        {student.nome?.split(' ').map(n => n[0]).slice(0, 2).join('').toUpperCase() || '?'}
                                                    </div>
                                                    <div className="text-sm font-medium text-gray-900 dark:text-gray-100">{student.nome}</div>
                                                </div>
                                            </TableCell>
                                            <TableCell className="px-6 py-4 whitespace-nowrap text-sm text-gray-500 dark:text-gray-400">{student.email || "-"}</TableCell>
                                            <TableCell className="px-6 py-4 whitespace-nowrap">
                                                <Badge variant={student.status === "active" ? "success" : "destructive"}>
                                                    {student.status === "active" ? "Ativo" : "Inativo"}
                                                </Badge>
                                            </TableCell>
                                            <TableCell className="pr-6 py-4 whitespace-nowrap text-right text-sm font-medium">
                                                <div className="flex justify-end items-center space-x-1">
                                                    <Button variant="ghost" size="icon" className="text-gray-400 hover:text-blue-600 h-8 w-8" onClick={() => setLocation(`/alunos/${student._id}`)} title="Visualizar">
                                                        <Eye className="h-4 w-4" />
                                                    </Button>
                                                    <Link href={`/alunos/editar/${student._id}`}>
                                                        <Button variant="ghost" size="icon" asChild className="text-gray-400 hover:text-yellow-600 h-8 w-8" title="Editar">
                                                            <a><Pencil className="h-4 w-4" /></a>
                                                        </Button>
                                                    </Link>
                                                    <Button variant="ghost" size="icon" className="text-gray-400 hover:text-red-600 h-8 w-8" onClick={() => handleDeleteClick(student)} title="Remover">
                                                        <UserX className="h-4 w-4" /> {/* Ícone mais apropriado para excluir usuário */}
                                                    </Button>
                                                </div>
                                            </TableCell>
                                        </TableRow>
                                    ))}
                            </TableBody>
                        </Table>
                    </div>
                </CardContent>
            </Card>

            <ModalConfirmacao
                isOpen={isConfirmOpen}
                onClose={closeConfirmDialog}
                onConfirm={confirmAction} // confirmAction já chama deleteStudentMutation.mutate
                titulo={confirmOptions.titulo}
                mensagem={confirmOptions.mensagem}
                textoConfirmar={confirmOptions.textoConfirmar}
                textoCancelar={confirmOptions.textoCancelar}
                isLoadingConfirm={deleteStudentMutation.isPending}
            />
        </div>
    );
}
