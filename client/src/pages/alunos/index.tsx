// client/src/pages/alunos/index.tsx
import { useState } from "react"; // 'React' foi removido
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { Link } from "wouter";

import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Badge } from "@/components/ui/badge";
import { Skeleton } from "@/components/ui/skeleton";
import { Eye, Pencil, Plus, Search, UserX } from "lucide-react";
import { fetchWithAuth } from "@/lib/apiClient";
import { useToast } from "@/hooks/use-toast";
import { ModalConfirmacao } from "@/components/ui/modal-confirmacao";
import { useConfirmDialog } from "@/hooks/useConfirmDialog";
import ErrorMessage from "@/components/ErrorMessage";
import { Aluno } from "@/types/aluno";
import AlunoViewModal from "@/components/dialogs/AlunoViewModal";

export default function StudentsIndex() {
    const { toast } = useToast();
    const queryClient = useQueryClient();
    const { isOpen: isConfirmOpen, options: confirmOptions, openConfirmDialog, closeConfirmDialog, confirm: confirmAction } = useConfirmDialog();
    const [searchQuery, setSearchQuery] = useState("");
    const [selectedStudent, setSelectedStudent] = useState<Aluno | null>(null);
    const [isViewModalOpen, setIsViewModalOpen] = useState(false);

    const { data: students = [], isLoading, isError, error } = useQuery<Aluno[], Error>({
        queryKey: ['/api/alunos'],
        queryFn: async (): Promise<Aluno[]> => {
            const data = await fetchWithAuth<Aluno[]>("/api/alunos");
            return Array.isArray(data) ? data : [];
        },
        retry: 1,
    });

    const deleteStudentMutation = useMutation<any, Error, string>({
        mutationFn: (alunoId: string) => fetchWithAuth(`/api/alunos/${alunoId}`, { method: 'DELETE' }),
        onSuccess: () => {
            toast({ title: "Aluno Removido", description: `O aluno foi removido com sucesso.` });
            queryClient.invalidateQueries({ queryKey: ['/api/alunos'] });
        },
        onError: (error) => {
            toast({ variant: "destructive", title: "Erro ao Remover", description: error.message || "Não foi possível remover o aluno." });
        },
        onSettled: () => {
            closeConfirmDialog();
        }
    });

    const filteredStudents = students.filter((student) => {
        const fullName = (student.nome || "").toLowerCase();
        const email = (student.email || "").toLowerCase();
        const query = searchQuery.toLowerCase();
        return fullName.includes(query) || email.includes(query);
    });

    const handleDeleteClick = (aluno: Aluno) => {
        if (!aluno._id || !aluno.nome) return;
        openConfirmDialog({
            titulo: "Remover Aluno",
            mensagem: `Tem certeza que deseja remover o aluno ${aluno.nome}?`,
            onConfirm: () => {
                if (aluno._id) deleteStudentMutation.mutate(aluno._id);
            },
        });
    };

    const handleViewClick = (student: Aluno) => {
        setSelectedStudent(student);
        setIsViewModalOpen(true);
    };

    return (
        <div className="p-4 md:p-6 lg:p-8">
            <Card className="border shadow-sm overflow-hidden bg-white dark:bg-gray-900">
                <CardHeader className="flex flex-col sm:flex-row sm:items-center sm:justify-between px-6 py-4 border-b">
                    <CardTitle className="text-xl font-semibold">Alunos</CardTitle>
                    <div className="flex flex-col sm:flex-row gap-2">
                        <div className="relative">
                            <Search className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-400 h-4 w-4" />
                            <Input type="search" placeholder="Pesquisar..." className="pl-9 w-full sm:w-64" value={searchQuery} onChange={(e) => setSearchQuery(e.target.value)} />
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
                                    <TableHead className="pl-6">Aluno</TableHead>
                                    <TableHead>Email</TableHead>
                                    <TableHead>Status</TableHead>
                                    <TableHead className="text-right pr-6">Ações</TableHead>
                                </TableRow>
                            </TableHeader>
                            <TableBody className="divide-y">
                                {isLoading && [...Array(5)].map((_, i) => (
                                    <TableRow key={`skeleton-${i}`}>
                                        <TableCell className="pl-6 py-4"><Skeleton className="h-4 w-32" /></TableCell>
                                        <TableCell><Skeleton className="h-4 w-48" /></TableCell>
                                        <TableCell><Skeleton className="h-6 w-16" /></TableCell>
                                        <TableCell className="text-right pr-6"><Skeleton className="h-8 w-24" /></TableCell>
                                    </TableRow>
                                ))}
                                {isError && !isLoading && (
                                    <TableRow><TableCell colSpan={4}><ErrorMessage title="Erro ao Carregar" message={error.message} /></TableCell></TableRow>
                                )}
                                {!isLoading && !isError && filteredStudents.map((student) => (
                                    <TableRow key={student._id} className="hover:bg-gray-50/50">
                                        <TableCell className="pl-6 font-medium">{student.nome}</TableCell>
                                        <TableCell className="text-muted-foreground">{student.email}</TableCell>
                                        <TableCell>
                                            <Badge variant={student.status === "active" ? "success" : "destructive"}>
                                                {student.status === "active" ? "Ativo" : "Inativo"}
                                            </Badge>
                                        </TableCell>
                                        <TableCell className="pr-6 text-right">
                                            <div className="flex justify-end items-center space-x-1">
                                                <Button variant="ghost" size="icon" onClick={() => handleViewClick(student)} title="Visualizar"><Eye className="h-4 w-4" /></Button>
                                                <Link href={`/alunos/editar/${student._id}`}>
                                                    <Button variant="ghost" size="icon" asChild title="Editar"><a><Pencil className="h-4 w-4" /></a></Button>
                                                </Link>
                                                <Button variant="ghost" size="icon" className="text-destructive" onClick={() => handleDeleteClick(student)} title="Remover"><UserX className="h-4 w-4" /></Button>
                                            </div>
                                        </TableCell>
                                    </TableRow>
                                ))}
                            </TableBody>
                        </Table>
                    </div>
                </CardContent>
            </Card>

            <AlunoViewModal aluno={selectedStudent} open={isViewModalOpen} onOpenChange={setIsViewModalOpen} />
            <ModalConfirmacao isOpen={isConfirmOpen} onClose={closeConfirmDialog} onConfirm={confirmAction} titulo={confirmOptions.titulo} mensagem={confirmOptions.mensagem} isLoadingConfirm={deleteStudentMutation.isPending}/>
        </div>
    );
}
