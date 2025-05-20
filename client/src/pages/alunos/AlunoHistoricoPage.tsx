// Caminho: ./client/src/pages/alunos/AlunoHistoricoPage.tsx
import React, { useState } from 'react'; // Adicionado useState para paginação
import { useAluno } from '@/context/AlunoContext';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle, CardDescription, CardFooter } from '@/components/ui/card'; // Adicionado CardFooter para paginação
import { useQuery } from '@tanstack/react-query';
import { apiRequest } from '@/lib/queryClient';
import { Loader2, ArrowLeft, ListChecks, MessageSquareText, Star, CalendarDays, AlertTriangle, ChevronLeft, ChevronRight, ExternalLink } from 'lucide-react'; // Adicionado ChevronLeft, ChevronRight, ExternalLink
import { Link as WouterLink } from 'wouter';
import { format, parseISO } from 'date-fns';
import { ptBR } from 'date-fns/locale';

// Mantendo a definição de OPCOES_PSE_FRONTEND aqui por enquanto
const OPCOES_PSE_FRONTEND = ['Muito Leve', 'Leve', 'Moderado', 'Intenso', 'Muito Intenso', 'Máximo Esforço'] as const;
type OpcaoPSEFrontend = typeof OPCOES_PSE_FRONTEND[number];

interface SessaoHistorico {
  _id: string;
  sessionDate: string;
  concluidaEm: string;
  tipoCompromisso: string;
  status: string;
  workoutPlanId?: {
    _id: string;
    titulo: string;
  } | null;
  trainerId?: {
    _id: string;
    nome: string;
  } | null;
  pseAluno?: OpcaoPSEFrontend | null;
  comentarioAluno?: string | null;
  notes?: string;
}

interface HistoricoSessoesResponse {
  sessoes: SessaoHistorico[];
  currentPage: number;
  totalPages: number;
  totalSessoes: number;
}

const AlunoHistoricoPage: React.FC = () => {
  const { aluno, tokenAluno } = useAluno();
  const [currentPage, setCurrentPage] = useState(1);
  const SESSIONS_PER_PAGE = 5; // Quantas sessões mostrar por página

  const queryEnabled = !!aluno && !!tokenAluno;

  const { 
    data: historicoData, 
    isLoading: isLoadingHistorico, 
    error: errorHistorico,
    isFetching: isFetchingHistorico, // Para feedback de loading em mudanças de página
    refetch: refetchHistorico // Para um botão de atualizar, se desejado
  } = useQuery<HistoricoSessoesResponse, Error>({
    queryKey: ['alunoHistoricoSessoes', aluno?.id, currentPage, SESSIONS_PER_PAGE], // Incluir página e limite na chave
    queryFn: async () => {
      if (!aluno?.id) {
        throw new Error("Aluno não autenticado para buscar histórico.");
      }
      return apiRequest<HistoricoSessoesResponse>(
        'GET', 
        `/api/aluno/meu-historico-sessoes?page=${currentPage}&limit=${SESSIONS_PER_PAGE}`
      );
    },
    enabled: queryEnabled,
    placeholderData: (previousData) => previousData, // Mantém dados antigos enquanto busca novos
    // staleTime: 1000 * 60 * 2, // Cache de 2 minutos
  });

  if (!aluno && queryEnabled && (isLoadingHistorico || isFetchingHistorico)) { 
    return (
        <div className="flex flex-col items-center justify-center min-h-[calc(100vh-200px)] p-4">
            <Loader2 className="h-10 w-10 animate-spin text-primary mb-3" />
            <p className="text-muted-foreground">Carregando dados do aluno...</p>
        </div>
    );
  }
  if (!aluno && !tokenAluno && !queryEnabled) {
      return ( <div className="flex h-screen w-full items-center justify-center"> <p>Sessão inválida ou expirada. Por favor, <WouterLink href="/aluno/login" className="text-primary hover:underline">faça login</WouterLink> novamente.</p> </div> );
  }
  

  const formatarDataHora = (dataISO?: string): string => {
    if (!dataISO) return 'N/A';
    try { return format(parseISO(dataISO), "dd/MM/yy 'às' HH:mm", { locale: ptBR }); }
    catch (e) { return 'Data inválida'; }
  };

  return (
    <div className="container mx-auto py-6 px-2 sm:px-4 md:px-6 lg:px-8">
      <div className="mb-6 flex items-center">
        <WouterLink href="/aluno/dashboard">
          <Button variant="outline" size="sm" className="text-sm">
            <ArrowLeft className="w-4 h-4 mr-2" />
            Voltar ao Painel
          </Button>
        </WouterLink>
      </div>

      <Card className="shadow-xl">
        <CardHeader>
          <CardTitle className="text-2xl sm:text-3xl font-bold text-primary flex items-center gap-3">
            <ListChecks className="w-8 h-8" />
            Meu Histórico de Treinos
          </CardTitle>
          <CardDescription>Revise seus treinos concluídos e seu feedback.</CardDescription>
        </CardHeader>
        <CardContent>
          {isLoadingHistorico && !historicoData && ( // Mostrar loading inicial apenas se não houver dados prévios
            <div className="flex flex-col items-center justify-center py-10">
              <Loader2 className="h-10 w-10 animate-spin text-primary mb-3" />
              <p className="text-muted-foreground">Carregando seu histórico...</p>
            </div>
          )}
          {errorHistorico && (
            <div className="text-red-500 p-4 bg-red-50 dark:bg-red-900/20 rounded-md text-sm flex items-center">
              <AlertTriangle className="inline w-5 h-5 mr-2 shrink-0" />
              <span>Erro ao carregar histórico: {errorHistorico.message}</span>
            </div>
          )}
          {!isLoadingHistorico && !errorHistorico && (!historicoData || historicoData.sessoes.length === 0) && (
            <p className="text-center text-muted-foreground py-10">
              Você ainda não concluiu nenhum treino. Assim que concluir, eles aparecerão aqui!
            </p>
          )}

          {historicoData && historicoData.sessoes.length > 0 && (
            <div className="space-y-4 mt-4">
              {historicoData.sessoes.map(sessao => (
                <Card key={sessao._id} className="bg-slate-50 dark:bg-slate-800/60">
                  <CardHeader className="pb-3">
                    <div className="flex justify-between items-start">
                        <div>
                            <CardTitle className="text-lg">
                                {sessao.workoutPlanId ? sessao.workoutPlanId.titulo : `Sessão de ${sessao.tipoCompromisso.replace('_', ' ')}`}
                            </CardTitle>
                            <CardDescription className="text-xs">
                                Concluído em: {formatarDataHora(sessao.concluidaEm)} <br />
                                (Sessão originalmente para: {formatarDataHora(sessao.sessionDate)})
                            </CardDescription>
                        </div>
                        {sessao.workoutPlanId && (
                             <WouterLink href={`/aluno/ficha/${sessao.workoutPlanId._id}`}>
                                <Button variant="outline" size="sm" className="text-xs">
                                    Ver Ficha <ExternalLink className="w-3 h-3 ml-1.5"/>
                                </Button>
                            </WouterLink>
                        )}
                    </div>
                  </CardHeader>
                  <CardContent className="text-sm space-y-2">
                    {sessao.pseAluno && (
                      <div className="flex items-center gap-2">
                        <Star className="w-4 h-4 text-yellow-500" /> 
                        <strong>PSE:</strong> {sessao.pseAluno}
                      </div>
                    )}
                    {sessao.comentarioAluno && (
                      <div className="flex items-start gap-2">
                        <MessageSquareText className="w-4 h-4 text-blue-500 mt-0.5 shrink-0" />
                        <div>
                            <strong>Seu Comentário:</strong>
                            <p className="text-muted-foreground text-xs italic pl-1 whitespace-pre-wrap">{sessao.comentarioAluno}</p>
                        </div>
                      </div>
                    )}
                    {(!sessao.pseAluno && !sessao.comentarioAluno) && (
                        <p className="text-xs text-muted-foreground italic">Nenhum feedback fornecido para esta sessão.</p>
                    )}
                  </CardContent>
                </Card>
              ))}
            </div>
          )}

          {/* Controles de Paginação */}
          {historicoData && historicoData.totalPages > 1 && (
            <CardFooter className="pt-6 flex items-center justify-between border-t mt-6">
              <Button
                variant="outline"
                size="sm"
                onClick={() => setCurrentPage(prev => Math.max(1, prev - 1))}
                disabled={currentPage === 1 || isFetchingHistorico}
              >
                <ChevronLeft className="w-4 h-4 mr-1" /> Anterior
              </Button>
              <span className="text-sm text-muted-foreground">
                Página {historicoData.currentPage} de {historicoData.totalPages}
              </span>
              <Button
                variant="outline"
                size="sm"
                onClick={() => setCurrentPage(prev => Math.min(historicoData.totalPages, prev + 1))}
                disabled={currentPage === historicoData.totalPages || isFetchingHistorico}
              >
                Próxima <ChevronRight className="w-4 h-4 ml-1" />
              </Button>
            </CardFooter>
          )}
        </CardContent>
      </Card>
    </div>
  );
};

export default AlunoHistoricoPage;