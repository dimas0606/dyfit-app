import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Check, MessageSquare, UserPlus, Dumbbell } from "lucide-react";
import { useQuery } from "@tanstack/react-query";
import { formatDistanceToNow } from "date-fns";
import { ptBR } from "date-fns/locale";
import { apiRequest } from "@/lib/queryClient"; // Importar apiRequest

// Interface para os dados de atividade esperados da API
interface ActivityLog {
  id: string; // ou number, dependendo da sua API
  activityType: string;
  details: any; // Seja mais específico se possível, ex: { name: string; workoutPlanName?: string; studentName?: string; progress?: number }
  timestamp: string; // ou Date
}

interface ActivityProps {
  trainerId: string; // Alterado para string para corresponder ao user.id
}

export function ActivityCard({ trainerId }: ActivityProps) {
  const { data: activities, isLoading } = useQuery<ActivityLog[], Error>({
    queryKey: ["/api/activity-logs", { trainerId, limit: 4 }], // Chave da query mais específica
    queryFn: async () => {
      if (!trainerId) throw new Error("Trainer ID não fornecido para buscar atividades.");
      // Usando apiRequest para chamadas autenticadas
      return apiRequest<ActivityLog[]>("GET", `/api/activity-logs?trainerId=${trainerId}&limit=4`);
    },
    enabled: !!trainerId, // Só executa se trainerId existir
  });

  const getActivityIcon = (activityType: string) => {
    switch (activityType) {
      case "student-added":
        return (
          <div className="w-10 h-10 rounded-full bg-primary/10 flex items-center justify-center text-primary">
            <UserPlus className="h-5 w-5" />
          </div>
        );
      case "workout-created":
      case "workout-updated":
      case "workout-assigned":
        return (
          <div className="w-10 h-10 rounded-full bg-secondary/10 flex items-center justify-center text-secondary">
            <Dumbbell className="h-5 w-5" />
          </div>
        );
      case "session-completed":
        return (
          <div className="w-10 h-10 rounded-full bg-green-500/10 flex items-center justify-center text-green-600"> {/* Corrigido para verde */}
            <Check className="h-5 w-5" />
          </div>
        );
      default:
        return (
          <div className="w-10 h-10 rounded-full bg-accent/10 flex items-center justify-center text-accent">
            <MessageSquare className="h-5 w-5" />
          </div>
        );
    }
  };

  const getActivityTitle = (activity: ActivityLog) => {
    switch (activity.activityType) {
      case "student-added":
        return `Novo aluno cadastrado`;
      case "workout-created":
        return `Plano de treino criado`;
      case "workout-updated":
        return `Plano de treino atualizado`;
      case "workout-assigned":
        return `Plano de treino atribuído`;
      case "workout-progress-updated":
        return `Progresso do treino atualizado`;
      case "session-scheduled":
        return `Nova sessão agendada`;
      case "session-confirmed":
        return `Sessão confirmada`;
      case "session-completed":
        return `Sessão concluída`;
      case "session-cancelled":
        return `Sessão cancelada`;
      default:
        return `Atividade registrada`;
    }
  };

  const getActivityDescription = (activity: ActivityLog) => {
    // Adicionar verificações para activity.details para evitar erros se não existir
    const details = activity.details || {};
    switch (activity.activityType) {
      case "student-added":
        return `${details.name || 'Aluno'} foi adicionado à sua lista de alunos`;
      case "workout-created":
        return `Você criou o plano de treino "${details.name || 'desconhecido'}"`;
      case "workout-updated":
        return `Você atualizou o plano de treino "${details.name || 'desconhecido'}"`;
      case "workout-assigned":
        return `Você atribuiu "${details.workoutPlanName || 'plano desconhecido'}" para ${details.studentName || 'aluno desconhecido'}`;
      case "workout-progress-updated":
        return `Progresso de ${details.studentName || 'aluno desconhecido'} no plano "${details.workoutPlanName || 'desconhecido'}" atualizado para ${details.progress || 0}%`;
      case "session-scheduled":
        return `Nova sessão agendada com ${details.studentName || 'aluno desconhecido'}`;
      case "session-confirmed":
        return `Sessão com ${details.studentName || 'aluno desconhecido'} confirmada`;
      case "session-completed":
        return `${details.studentName || 'Aluno desconhecido'} concluiu a sessão`;
      case "session-cancelled":
        return `Sessão com ${details.studentName || 'aluno desconhecido'} foi cancelada`;
      default:
        return `Detalhes da atividade não disponíveis`;
    }
  };

  const renderActivitySkeleton = () => (
    <>
      {[1, 2, 3, 4].map((i) => (
        <div key={i} className="p-4 flex items-start border-b border-gray-100 dark:border-gray-700 last:border-0">
          <div className="flex-shrink-0 mr-4">
            <div className="w-10 h-10 rounded-full bg-gray-200 dark:bg-gray-700 animate-pulse"></div>
          </div>
          <div className="w-full">
            <div className="h-4 bg-gray-200 dark:bg-gray-700 rounded w-3/4 animate-pulse"></div>
            <div className="h-3 bg-gray-200 dark:bg-gray-700 rounded w-full mt-2 animate-pulse"></div>
            <div className="h-3 bg-gray-200 dark:bg-gray-700 rounded w-1/4 mt-2 animate-pulse"></div>
          </div>
        </div>
      ))}
    </>
  );

  return (
    <Card className="border border-gray-100 dark:border-gray-800 overflow-hidden shadow-sm">
      <CardHeader className="px-6 py-4 border-b border-gray-200 dark:border-gray-700 flex flex-row items-center justify-between">
        <CardTitle className="font-semibold text-gray-900 dark:text-gray-100">Atividade Recente</CardTitle>
        {/* <button className="text-sm text-primary hover:text-primary-dark">Ver tudo</button> */}
      </CardHeader>
      <CardContent className="p-0 divide-y divide-gray-100 dark:divide-gray-700">
        {isLoading ? (
          renderActivitySkeleton()
        ) : (
          <>
            {activities && activities.length > 0 ? activities.map((activity: ActivityLog) => (
              <div key={activity.id} className="p-4 flex items-start hover:bg-muted/30 dark:hover:bg-muted/10">
                <div className="flex-shrink-0 mr-4">
                  {getActivityIcon(activity.activityType)}
                </div>
                <div>
                  <p className="text-sm font-medium text-gray-800 dark:text-gray-200">{getActivityTitle(activity)}</p>
                  <p className="text-xs text-gray-500 dark:text-gray-400 mt-1">{getActivityDescription(activity)}</p>
                  <p className="text-xs text-gray-400 dark:text-gray-500 mt-1">
                    {formatDistanceToNow(new Date(activity.timestamp), {
                      addSuffix: true,
                      locale: ptBR
                    })}
                  </p>
                </div>
              </div>
            )) : (
              <div className="p-6 text-center text-sm text-gray-500 dark:text-gray-400">Nenhuma atividade recente.</div>
            )}
          </>
        )}
      </CardContent>
    </Card>
  );
}
