// client/src/pages/alunos/edit.tsx
import React from 'react';
import { Link, useLocation, useParams } from 'wouter'; 
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { StudentForm, StudentFormDataProcessed } from '@/forms/student-form';
import { ChevronLeft } from 'lucide-react';
import { useToast } from '@/hooks/use-toast';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { fetchWithAuth } from '@/lib/apiClient';
import { Aluno } from '@/types/aluno';
import ErrorMessage from '@/components/ErrorMessage';
import LoadingSpinner from '@/components/LoadingSpinner';

const EditStudentPage: React.FC = () => {
    const params = useParams<{ id: string }>();
    const studentId = params.id;
    const [, setLocation] = useLocation();
    const queryClient = useQueryClient();
    const { toast } = useToast();

    // <<< CORREÇÃO AQUI: Atualizado o caminho da API e a queryKey >>>
    const { data: studentData, isLoading, isError, error } = useQuery<Aluno, Error>({
        queryKey: ['aluno', studentId], // Chave mais específica
        queryFn: () => fetchWithAuth<Aluno>(`/api/aluno/gerenciar/${studentId}`),
        enabled: !!studentId,
    });

    // <<< CORREÇÃO AQUI: Atualizado o caminho da API >>>
    const mutation = useMutation<Aluno, Error, StudentFormDataProcessed>({
        mutationFn: (updatedData) => fetchWithAuth<Aluno>(`/api/aluno/gerenciar/${studentId}`, {
            method: 'PUT',
            body: JSON.stringify(updatedData),
        }),
        onSuccess: (updatedStudent) => {
            toast({ title: "Sucesso!", description: `${updatedStudent.nome} atualizado com sucesso.` });
            queryClient.invalidateQueries({ queryKey: ['/api/aluno/gerenciar'] });
            queryClient.invalidateQueries({ queryKey: ['aluno', studentId] });
            setLocation('/alunos');
        },
        onError: (error) => {
            toast({ variant: "destructive", title: "Erro ao atualizar", description: error.message });
        },
    });

    if (isLoading) return <LoadingSpinner text="Carregando dados do aluno..." />;
    if (isError) return <ErrorMessage title="Erro ao carregar" message={error?.message || "Não foi possível encontrar o aluno."} />;

    return (
        <div className="p-4 md:p-6 lg:p-8">
            <Link href="/alunos" className="inline-flex items-center mb-4 text-sm text-primary hover:text-primary/90">
                <ChevronLeft className="w-4 h-4 mr-1" /> Voltar para Alunos
            </Link>

            <Card className="max-w-3xl mx-auto">
                <CardHeader>
                    <CardTitle>Editar Aluno</CardTitle>
                    <CardDescription>Atualize os dados de {studentData?.nome}.</CardDescription>
                </CardHeader>
                <CardContent>
                    <StudentForm
                        initialData={studentData}
                        isEditing={true}
                        onSubmit={(formData) => mutation.mutate(formData)}
                        isLoading={mutation.isPending}
                    />
                </CardContent>
            </Card>
        </div>
    );
}

export default EditStudentPage;