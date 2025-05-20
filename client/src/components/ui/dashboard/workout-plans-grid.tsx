// client/src/components/ui/dashboard/workout-plans-grid.tsx
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Dumbbell, Users, Plus } from "lucide-react";
import { useQuery } from "@tanstack/react-query";
import { Button } from "@/components/ui/button";
import { Link, useLocation } from "wouter";
import { apiRequest } from "@/lib/queryClient"; // Importar apiRequest

// Interface para os dados de plano de treino esperados da API
// Esta interface deve corresponder à estrutura de uma Ficha de Treino do tipo 'modelo'
interface WorkoutPlanModelo {
  id: string; // ou _id, dependendo da sua API/modelo Treino
  _id: string;
  name: string; // Deve ser 'titulo' do modelo Treino
  titulo: string;
  status?: "active" | "draft" | "archived" | string; // 'status' do modelo Treino
  description?: string; // 'descricao' do modelo Treino
  duration?: number; // semanas - Este campo pode não existir no modelo Treino
  // Adicionar campos que você realmente tem no modelo Treino e quer exibir
  exerciseCount?: number; // Pode ser calculado a partir de ficha.exercicios.length
  assignedStudentCount?: number; // Esta informação pode não estar diretamente na ficha modelo
  studentAvatars?: string[];
  tipo?: "modelo" | "individual";
}

interface WorkoutPlansGridProps {
  trainerId: string; // Já ajustado para string
}

export function WorkoutPlansGrid({ trainerId }: WorkoutPlansGridProps) {
  const [, navigate] = useLocation();

  // Ajustado para chamar /api/treinos com filtros
  const { data: workoutPlans, isLoading } = useQuery<WorkoutPlanModelo[], Error>({
    queryKey: ["/api/treinos", { criadorId: trainerId, tipo: 'modelo', limit: 4, forComponent: "WorkoutPlansGridDashboard" }],
    queryFn: async () => {
      if (!trainerId) throw new Error("Trainer ID não fornecido para buscar planos de treino modelo.");
      // Chama /api/treinos, o backend deve filtrar por criadorId (do token) e tipo=modelo
      return apiRequest<WorkoutPlanModelo[]>("GET", `/api/treinos?tipo=modelo&limit=4`);
    },
    enabled: !!trainerId,
  });

  const getStatusBadge = (status?: string) => {
    switch (status) {
      case "ativo": // Ajustado para corresponder ao status do modelo Treino
        return <Badge className="bg-green-100 text-green-800 hover:bg-green-200 dark:bg-green-700/30 dark:text-green-300">Ativo</Badge>;
      case "rascunho":
        return <Badge className="bg-yellow-100 text-yellow-800 hover:bg-yellow-200 dark:bg-yellow-700/30 dark:text-yellow-300">Rascunho</Badge>;
      case "arquivado":
        return <Badge className="bg-gray-100 text-gray-800 hover:bg-gray-200 dark:bg-gray-700/30 dark:text-gray-400">Arquivado</Badge>;
      default:
        return <Badge variant="outline" className="dark:text-gray-400">{status || "Indefinido"}</Badge>;
    }
  };

  const renderWorkoutSkeleton = (count = 2) => (
    <>
      {[...Array(count)].map((_, i) => (
        <div key={i} className="border border-gray-200 dark:border-gray-700 rounded-lg p-4 shadow-sm animate-pulse">
          <div className="flex items-center justify-between mb-3">
            <div className="h-5 bg-gray-300 dark:bg-gray-600 rounded w-32"></div>
            <div className="h-6 bg-gray-300 dark:bg-gray-600 rounded w-16"></div>
          </div>
          <div className="h-4 bg-gray-300 dark:bg-gray-600 rounded w-full mb-3"></div>
          <div className="flex items-center text-xs text-gray-500 dark:text-gray-400 mb-4">
            <div className="h-3 bg-gray-300 dark:bg-gray-600 rounded w-20 mr-4"></div>
            <div className="h-3 bg-gray-300 dark:bg-gray-600 rounded w-20"></div>
          </div>
          <div className="flex justify-between items-center">
            <div className="flex -space-x-2">
              {[1,2,3].map(s => <div key={s} className="w-6 h-6 rounded-full bg-gray-400 dark:bg-gray-500 border-2 border-white dark:border-gray-800"></div>)}
            </div>
            <div className="h-8 bg-gray-300 dark:bg-gray-600 rounded w-20"></div>
          </div>
        </div>
      ))}
    </>
  );

  return (
    <Card className="border border-gray-100 dark:border-gray-800 overflow-hidden shadow-sm">
      <CardHeader className="px-6 py-4 border-b border-gray-200 dark:border-gray-700 flex flex-row items-center justify-between">
        <CardTitle className="font-semibold text-gray-900 dark:text-gray-100">Planos de Treino Modelo</CardTitle>
        <div className="flex items-center space-x-2">
          <Link href="/treinos" className="text-sm text-primary hover:text-primary/90 dark:hover:text-primary/70">
            Ver todos
          </Link>
          <Button size="sm" variant="outline" onClick={() => navigate("/treinos")}> {/* Navega para /treinos onde pode criar novo */}
            <Plus className="w-4 h-4 mr-1.5" />
            Novo Plano
          </Button>
        </div>
      </CardHeader>
      <CardContent className="p-4 md:p-6">
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4 md:gap-6">
          {isLoading ? (
            renderWorkoutSkeleton()
          ) : (
            <>
              {workoutPlans && workoutPlans.length > 0 ? workoutPlans.map((plan) => (
                <div key={plan._id} className="border border-gray-200 dark:border-gray-700 rounded-lg p-4 hover:shadow-md transition-shadow duration-150 flex flex-col justify-between">
                  <div>
                    <div className="flex items-start justify-between mb-2">
                      <h4 className="font-medium text-gray-800 dark:text-gray-200 truncate" title={plan.titulo}>{plan.titulo}</h4>
                      {getStatusBadge(plan.status)}
                    </div>
                    <p className="text-sm text-gray-500 dark:text-gray-400 mb-3 line-clamp-2" title={plan.description}>
                      {plan.description || (plan.duration ? `Programa de ${plan.duration} semanas` : "Sem descrição")}
                    </p>
                    <div className="flex items-center text-xs text-gray-500 dark:text-gray-400 mb-4 space-x-3">
                      {plan.exerciseCount !== undefined && (
                        <span className="flex items-center">
                          <Dumbbell className="w-3 h-3 mr-1" /> {plan.exerciseCount} exercícios
                        </span>
                      )}
                      {/* assignedStudentCount e studentAvatars podem não vir diretamente do modelo Treino tipo 'modelo' */}
                      {/* Você pode precisar de outra lógica se quiser exibir isso */}
                    </div>
                  </div>
                  <div className="flex justify-between items-center mt-auto pt-3 border-t border-gray-100 dark:border-gray-700">
                    <div className="flex -space-x-2 overflow-hidden">
                      {/* Lógica para avatares de alunos, se aplicável a planos modelo */}
                    </div>
                    <Button 
                      variant="link" 
                      size="sm" 
                      className="text-primary hover:text-primary/90 dark:hover:text-primary/70 font-medium p-0 h-auto"
                      onClick={() => navigate(`/treinos`)} // Idealmente, navegar para o detalhe do plano/ficha: /treinos/${plan._id}
                    >
                      Ver Detalhes
                    </Button>
                  </div>
                </div>
              )) : (
                <div className="md:col-span-2 text-center py-8 text-sm text-gray-500 dark:text-gray-400">
                  Nenhum plano de treino modelo encontrado. <Link href="/treinos" className="text-primary hover:underline">Crie seu primeiro plano!</Link>
                </div>
              )}
            </>
          )}
        </div>
      </CardContent>
    </Card>
  );
}
