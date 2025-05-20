// Caminho: ./client/src/components/alunos/FrequenciaSemanal.tsx
import React from 'react';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card';
import { CheckCircle2, AlertCircle, CalendarDays } from 'lucide-react';
import { format, getDay, isSameDay, startOfWeek, addDays, isToday as dateIsToday } from 'date-fns';
import { ptBR } from 'date-fns/locale';

// Interface para a sessão como recebida da API (apenas os campos que usaremos)
interface SessaoConcluida {
  _id: string;
  sessionDate: string | Date; // Pode vir como string ISO ou já como objeto Date
  tipoCompromisso?: string; // Opcional, caso queira diferenciar tipos de sessão no futuro
}

interface FrequenciaSemanalProps {
  sessoesConcluidasNaSemana: SessaoConcluida[];
  isLoading?: boolean;
  error?: Error | null;
}

const DIAS_DA_SEMANA_ABREVIADOS = ['Dom', 'Seg', 'Ter', 'Qua', 'Qui', 'Sex', 'Sáb'];
// Para a lógica de 'weekStartsOn: 1' (Segunda como início)
const DIAS_DA_SEMANA_LABEL_ORDENADO = ['Seg', 'Ter', 'Qua', 'Qui', 'Sex', 'Sáb', 'Dom'];

const FrequenciaSemanal: React.FC<FrequenciaSemanalProps> = ({ 
  sessoesConcluidasNaSemana,
  isLoading = false,
  error = null 
}) => {
  
  const hoje = new Date();
  // Segunda-feira como início da semana
  const inicioDaSemanaAtual = startOfWeek(hoje, { weekStartsOn: 1 });

  const diasParaRenderizar = DIAS_DA_SEMANA_LABEL_ORDENADO.map((_, index) => {
    // Se o início da semana é Segunda (index 0 do nosso array ordenado),
    // e addDays(inicioDaSemanaAtual, 0) é Segunda,
    // addDays(inicioDaSemanaAtual, 1) é Terça, etc.
    return addDays(inicioDaSemanaAtual, index);
  });

  const foiDiaTreinado = (dia: Date): boolean => {
    return sessoesConcluidasNaSemana.some(sessao => 
      isSameDay(new Date(sessao.sessionDate), dia)
    );
  };

  if (isLoading) {
    return (
      <Card className="shadow">
        <CardHeader>
          <CardTitle className="flex items-center text-lg">
            <CalendarDays className="w-5 h-5 mr-2 text-primary" />
            Frequência Semanal
          </CardTitle>
        </CardHeader>
        <CardContent className="text-center py-6">
          <p className="text-sm text-muted-foreground">Carregando frequência...</p>
        </CardContent>
      </Card>
    );
  }

  if (error) {
    return (
      <Card className="shadow border-destructive/50">
        <CardHeader>
          <CardTitle className="flex items-center text-lg text-destructive">
            <AlertCircle className="w-5 h-5 mr-2" />
            Frequência Semanal
          </CardTitle>
        </CardHeader>
        <CardContent className="text-center py-6">
          <p className="text-sm text-destructive">Erro ao carregar frequência.</p>
          {/* <p className="text-xs text-muted-foreground">{error.message}</p> */}
        </CardContent>
      </Card>
    );
  }

  return (
    <Card className="shadow-md">
      <CardHeader>
        <CardTitle className="flex items-center text-lg">
          <CalendarDays className="w-5 h-5 mr-2 text-primary" />
          Frequência Semanal
        </CardTitle>
        <CardDescription>Seus treinos concluídos nesta semana.</CardDescription>
      </CardHeader>
      <CardContent>
        <div className="flex justify-around items-center py-2">
          {diasParaRenderizar.map((dia, index) => {
            const treinou = foiDiaTreinado(dia);
            const ehHoje = dateIsToday(dia);
            const diaLabel = DIAS_DA_SEMANA_LABEL_ORDENADO[index];

            return (
              <div key={diaLabel} className="flex flex-col items-center space-y-1">
                <span className={`text-xs font-medium ${ehHoje ? 'text-primary dark:text-sky-400' : 'text-muted-foreground'}`}>
                  {diaLabel}
                </span>
                <div 
                  className={`
                    w-8 h-8 rounded-full flex items-center justify-center border-2
                    ${treinou 
                      ? 'bg-green-500 border-green-600 dark:bg-green-600 dark:border-green-700' 
                      : 'bg-gray-100 border-gray-300 dark:bg-gray-700 dark:border-gray-600'}
                    ${ehHoje && !treinou ? 'border-primary dark:border-sky-500 ring-2 ring-primary/50 dark:ring-sky-500/50' : ''}
                    ${ehHoje && treinou ? 'ring-2 ring-green-500/50 dark:ring-green-600/50' : ''}
                  `}
                  title={treinou ? `Treino concluído em ${format(dia, 'dd/MM')}` : `Sem treino concluído em ${format(dia, 'dd/MM')}`}
                >
                  {treinou && <CheckCircle2 className="w-4 h-4 text-white" />}
                </div>
                <span className={`text-xs font-bold ${ehHoje ? 'text-primary dark:text-sky-400' : 'text-foreground'}`}>
                  {format(dia, 'dd')}
                </span>
              </div>
            );
          })}
        </div>
        {sessoesConcluidasNaSemana.length === 0 && (
          <p className="text-center text-sm text-muted-foreground mt-3">
            Nenhum treino concluído esta semana ainda. Vamos lá!
          </p>
        )}
      </CardContent>
    </Card>
  );
};

export default FrequenciaSemanal;