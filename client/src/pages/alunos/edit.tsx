    // client/src/pages/alunos/edit.tsx
    import React from 'react';
    import { useLocation, Link } from 'wouter'; // useParams não é mais necessário aqui se id vem via prop
    import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
    import { StudentForm, StudentFormDataProcessed } from '@/forms/student-form';
    import { Loader2, ChevronLeft } from 'lucide-react';
    // import { Button } from '@/components/ui/button'; // Não usado diretamente aqui
    import { useToast } from '@/hooks/use-toast';
    import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
    import { fetchWithAuth } from '@/lib/apiClient';
    import { Aluno } from '@/types/aluno';
    import ErrorMessage from '@/components/ErrorMessage';

    // <<< NOVA INTERFACE PARA PROPS >>>
    interface EditStudentPageProps {
      id?: string; // O ID virá dos parâmetros da rota, passado como prop pelo App.tsx
    }

    // <<< COMPONENTE AGORA ACEITA PROPS >>>
    const EditStudentPage: React.FC<EditStudentPageProps> = ({ id }) => {
        const [, setLocation] = useLocation();
        const queryClient = useQueryClient();
        const { toast } = useToast();
        const studentId = id; // Usa o ID da prop

        const { data: studentData, isLoading, isError, error } = useQuery<Aluno, Error>({
            queryKey: ['student', studentId],
            queryFn: async (): Promise<Aluno> => {
                if (!studentId) throw new Error("ID do aluno não fornecido.");
                const data = await fetchWithAuth<Aluno>(`/api/alunos/${studentId}`);
                if (!data) throw new Error("Aluno não encontrado ou resposta vazia.");
                return data;
            },
            enabled: !!studentId,
            retry: 1,
        });

        const mutation = useMutation<Aluno, Error, StudentFormDataProcessed>({
            mutationFn: async (updatedData: StudentFormDataProcessed): Promise<Aluno> => {
                if (!studentId) throw new Error("ID do aluno não fornecido para atualização.");
                return fetchWithAuth<Aluno>(`/api/alunos/${studentId}`, {
                    method: 'PUT',
                    body: JSON.stringify(updatedData),
                });
            },
            onSuccess: (updatedStudent) => {
                toast({ title: "Sucesso!", description: `${updatedStudent.nome} atualizado com sucesso.` });
                queryClient.invalidateQueries({ queryKey: ['alunos'] });
                queryClient.invalidateQueries({ queryKey: ['student', studentId] });
                setLocation('/alunos');
            },
            onError: (error) => {
                console.error("Erro na mutação de atualização:", error);
                toast({ variant: "destructive", title: "Erro ao atualizar", description: error.message || "Não foi possível salvar as alterações." });
            },
        });

        if (isLoading) {
            return <div className="flex justify-center items-center min-h-[calc(100vh-200px)]"><Loader2 className="h-10 w-10 animate-spin text-primary" /></div>;
        }

        if (isError || !studentData) {
            return (
                <div className="p-4 md:p-6 lg:p-8 text-center">
                    <Link href="/alunos" className="inline-flex items-center mb-4 text-sm text-primary hover:text-primary/90 dark:text-blue-400 dark:hover:text-blue-300">
                        <ChevronLeft className="w-4 h-4 mr-1" /> Voltar para Alunos
                    </Link>
                    <Card className="max-w-xl mx-auto mt-4 border-red-200 dark:border-red-800 bg-red-50 dark:bg-red-900/20">
                        <CardHeader>
                             <CardTitle className="text-xl text-red-700 dark:text-red-300">Erro ao Carregar Aluno</CardTitle>
                        </CardHeader>
                        <CardContent>
                             <ErrorMessage message={error?.message || `Não foi possível buscar os dados do aluno com ID ${studentId || 'desconhecido'}. Verifique o ID ou tente novamente.`} />
                        </CardContent>
                    </Card>
                </div>
            );
        }

        return (
            <div className="p-4 md:p-6 lg:p-8">
                <Link href="/alunos" className="inline-flex items-center mb-4 text-sm text-primary hover:text-primary/90 dark:text-blue-400 dark:hover:text-blue-300">
                    <ChevronLeft className="w-4 h-4 mr-1" /> Voltar para Alunos
                </Link>

                 <Card className="max-w-3xl mx-auto border border-gray-200 dark:border-gray-700 shadow-sm bg-white dark:bg-gray-900">
                     <CardHeader className="px-6 pt-6 pb-4 border-b dark:border-gray-700">
                        <CardTitle className="text-xl font-semibold text-gray-900 dark:text-gray-100">Editar Aluno</CardTitle>
                        <CardDescription className="text-gray-500 dark:text-gray-400">Atualize os dados de {studentData.nome}.</CardDescription>
                    </CardHeader>
                     <CardContent className="px-6 py-6">
                        <StudentForm
                            initialData={studentData}
                            isEditing={true}
                            onSubmit={(processedFormData: StudentFormDataProcessed) => {
                                mutation.mutate(processedFormData);
                            }}
                            isLoading={mutation.isPending}
                        />
                     </CardContent>
                 </Card>
            </div>
        );
    }

    export default EditStudentPage;
    