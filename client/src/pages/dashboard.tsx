// client/src/pages/dashboard.tsx
import { useQuery } from "@tanstack/react-query";
import { Link } from "wouter";
import { useUser } from "@/context/UserContext";
import { apiRequest } from "@/lib/queryClient"; 

import { StatsCard } from "@/components/ui/dashboard/stats-card";
import { SessionsCard } from "@/components/ui/dashboard/sessions-card";
// import { ActivityCard } from "@/components/ui/dashboard/activity-card"; // <<<< REMOVER IMPORTAÇÃO
import { WorkoutPlansGrid } from "@/components/ui/dashboard/workout-plans-grid";
import { StudentsTable } from "@/components/ui/dashboard/students-table"; 

import { Button } from "@/components/ui/button";
import { Plus } from "lucide-react";
import LoadingSpinner from "@/components/LoadingSpinner"; 
import ErrorMessage from "@/components/ErrorMessage"; 

interface DashboardStatsData {
  totalAlunos: number;
  treinosAtivos: number;
  sessoesHojeCount: number;
  taxaConclusaoGeral: number; 
}

export default function Dashboard() {
  const { user } = useUser();
  const trainerId = user?.id; 

  const saudacaoNome = user?.firstName || user?.username || "Personal";

  const { 
    data: dashboardStats, 
    isLoading: isLoadingStats, 
    error: errorStats 
  } = useQuery<DashboardStatsData, Error>({
    queryKey: ["/api/dashboard/geral", trainerId], 
    queryFn: async () => {
      if (!trainerId) throw new Error("Trainer ID não encontrado para buscar estatísticas.");
      return apiRequest<DashboardStatsData>("GET", `/api/dashboard/geral?trainerId=${trainerId}`);
    },
    enabled: !!trainerId, 
  });

  const sessoesHojeTexto = isLoadingStats 
    ? "Carregando informações de compromissos..." 
    : dashboardStats?.sessoesHojeCount !== undefined
      ? `Você tem ${dashboardStats.sessoesHojeCount} ${dashboardStats.sessoesHojeCount === 1 ? 'compromisso agendado' : 'compromissos agendados'} para hoje.`
      : "Verifique seus compromissos agendados para hoje.";

  if (!trainerId && !user) {
    return <LoadingSpinner text="Carregando dados do usuário..." />;
  }
  if (!trainerId) {
    return <ErrorMessage title="Erro" message="Não foi possível identificar o treinador. Tente fazer login novamente." />;
  }

  const taxaConclusaoFormatada = isLoadingStats || dashboardStats?.taxaConclusaoGeral === undefined
    ? "Calculando..." 
    : `${Math.round((dashboardStats.taxaConclusaoGeral) * 100)}%`;

  return (
    <div className="flex flex-col h-full overflow-y-auto p-4 md:p-6 lg:p-8 space-y-8">

      <header className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-2">
        <div>
          <h1 className="text-2xl md:text-3xl font-bold text-gray-800 dark:text-gray-100">
            Bem-vindo(a) de volta, {saudacaoNome}! 👋
          </h1>
          <p className="text-gray-500 dark:text-gray-400 text-sm mt-1">
            {sessoesHojeTexto}
          </p>
        </div>
      </header>

      {errorStats && (
        <ErrorMessage title="Erro ao Carregar Estatísticas" message={errorStats.message} />
      )}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4 md:gap-6">
        <StatsCard
          title="Total de Alunos"
          value={isLoadingStats ? "..." : (dashboardStats?.totalAlunos ?? 0).toString()}
          icon="students"
          isLoading={isLoadingStats}
        />
        <StatsCard
          title="Treinos Ativos"
          value={isLoadingStats ? "..." : (dashboardStats?.treinosAtivos ?? 0).toString()}
          icon="workouts"
          isLoading={isLoadingStats}
        />
        <StatsCard
          title="Compromissos Hoje"
          value={isLoadingStats ? "..." : (dashboardStats?.sessoesHojeCount ?? 0).toString()}
          icon="sessions"
          isLoading={isLoadingStats}
        />
        <StatsCard
          title="Taxa de Conclusão"
          value={taxaConclusaoFormatada}
          icon="completion"
          isLoading={isLoadingStats}
        />
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        <div className="lg:col-span-2 space-y-6">
          <WorkoutPlansGrid trainerId={trainerId} />
          <StudentsTable trainerId={trainerId} /> 
        </div>

        <div className="lg:col-span-1 space-y-6">
          <SessionsCard trainerId={trainerId} /> 
          {/* <ActivityCard trainerId={trainerId} /> */} {/* <<<< REMOVIDO ActivityCard DAQUI >>>> */}
        </div>
      </div>
      
      <div>
        <h2 className="text-xl font-semibold text-gray-700 dark:text-gray-300 mb-3">Ações Rápidas</h2>
        <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-4 gap-4">
          <Link href="/alunos/novo">
            <Button variant="secondary" className="w-full py-3 text-sm">
              <Plus className="mr-2 w-4 h-4" /> Adicionar Aluno
            </Button>
          </Link>
          <Link href="/treinos"> 
            <Button variant="secondary" className="w-full py-3 text-sm">
              <Plus className="mr-2 w-4 h-4" /> Criar Ficha Modelo
            </Button>
          </Link>
          <Link href="/exercises">
            <Button variant="secondary" className="w-full py-3 text-sm">
              <Plus className="mr-2 w-4 h-4" /> Novo Exercício
            </Button>
          </Link>
          <Button variant="secondary" className="w-full py-3 text-sm" disabled>
            <Plus className="mr-2 w-4 h-4" /> Nova Avaliação (Em breve)
          </Button>
        </div>
      </div>
    </div>
  );
}