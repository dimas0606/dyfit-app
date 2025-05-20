// client/src/pages/alunos/new.tsx
import { useMutation, useQueryClient } from "@tanstack/react-query";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
// Importa StudentForm e o tipo de dados processado que ele envia
import { StudentForm, StudentFormDataProcessed } from "@/forms/student-form";
import { Link, useLocation } from "wouter";
import { ChevronLeft } from "lucide-react";
import { useToast } from "@/hooks/use-toast";
import { fetchWithAuth } from "@/lib/apiClient"; // <<< Substitui apiRequest
import { Aluno } from "@/types/aluno"; // <<< Usa o tipo Aluno importado
import { User } from "@/context/UserContext"; // <<< Usa o tipo User do contexto

export default function NewStudent() {
    const [, navigate] = useLocation();
    const queryClient = useQueryClient();
    const { toast } = useToast();

    // Função para obter o ID do treinador logado (do localStorage)
    const getTrainerId = (): string | undefined => {
        const savedUserData = localStorage.getItem("userData"); // Usa a chave 'userData'
        if (savedUserData) {
            try {
                // Assume que 'userData' contém um objeto User com id (string)
                const user: User = JSON.parse(savedUserData);
                // Retorna o ID como string, ou undefined se não existir
                return user?.id ?? undefined;
            } catch (e) {
                console.error("Erro ao obter trainerId do localStorage:", e);
                return undefined;
            }
        }
        return undefined;
    }
    const trainerId = getTrainerId(); // Obtém o ID do treinador ao renderizar

    // Mutation para criar um novo aluno
    // Espera StudentFormDataProcessed (com números) do formulário
    const mutation = useMutation<Aluno, Error, StudentFormDataProcessed>({
        mutationFn: async (newStudentData: StudentFormDataProcessed): Promise<Aluno> => {
            // Pega o trainerId obtido anteriormente
            const currentTrainerId = getTrainerId(); // Re-verifica caso algo mude
            if (!currentTrainerId) {
                // Idealmente, o usuário nem deveria estar nesta página sem estar logado
                // Mas é bom ter uma verificação defensiva
                throw new Error("ID do treinador não encontrado. Faça login novamente.");
            }

            // Monta o payload final para a API
            const dataToSend = {
                 ...newStudentData,
                 trainerId: currentTrainerId // Inclui o ID do treinador
                };

            console.log("Dados enviados para criação:", JSON.stringify(dataToSend, null, 2)); // Log para depuração

            // Usa fetchWithAuth para enviar os dados via POST
            // Espera receber o objeto Aluno criado como resposta
            return fetchWithAuth<Aluno>("/api/alunos", {
                method: 'POST',
                body: JSON.stringify(dataToSend), // Envia os dados processados
            });
        },
        onSuccess: (createdStudent) => {
            toast({ title: "Aluno Cadastrado!", description: `${createdStudent?.nome || 'Aluno'} adicionado com sucesso.` });
            // Invalida a query 'alunos' para atualizar a lista na página principal
            queryClient.invalidateQueries({ queryKey: ['alunos'] });
            navigate("/alunos"); // Redireciona para a lista de alunos
        },
        onError: (error) => {
            console.error("Erro na mutação de criação:", error);
            // Mostra a mensagem de erro vinda do fetchWithAuth (ou uma padrão)
            toast({ variant: "destructive", title: "Erro ao Cadastrar", description: error.message || "Não foi possível adicionar o aluno." });
        },
    });

    // Função chamada pelo onSubmit do StudentForm
    const handleCreateStudent = (formData: StudentFormDataProcessed) => {
        // Os dados já estão processados (com números) pelo StudentForm
        mutation.mutate(formData); // Dispara a mutation
    };

    return (
        <div className="p-4 md:p-6 lg:p-8">
            {/* Link de Voltar */}
            <Link href="/alunos" className="inline-flex items-center mb-4 text-sm text-primary hover:text-primary/90 dark:text-blue-400 dark:hover:text-blue-300">
                <ChevronLeft className="w-4 h-4 mr-1" /> Voltar para Alunos
            </Link>

            {/* Card do Formulário */}
            <Card className="max-w-3xl mx-auto border border-gray-200 dark:border-gray-700 shadow-sm bg-white dark:bg-gray-900">
                <CardHeader className="px-6 pt-6 pb-4 border-b dark:border-gray-700">
                    <CardTitle className="text-xl font-semibold text-gray-900 dark:text-gray-100">Adicionar Novo Aluno</CardTitle>
                    <CardDescription className="text-gray-500 dark:text-gray-400">Insira os dados do novo aluno para começar.</CardDescription>
                </CardHeader>
                <CardContent className="px-6 py-6">
                    {/* Renderiza o formulário, passando a função de submit e o estado de loading */}
                    <StudentForm
                        onSubmit={handleCreateStudent}
                        isLoading={mutation.isPending} // Passa o estado de loading da mutation
                        isEditing={false} // Indica que é modo de criação
                    />
                </CardContent>
            </Card>
        </div>
    );
}