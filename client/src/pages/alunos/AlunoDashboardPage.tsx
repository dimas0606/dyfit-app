// client/src/pages/alunos/AlunoDashboardPage.tsx
import React from 'react';
import { useAluno } from '@/context/AlunoContext';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle, CardDescription, CardFooter } from '@/components/ui/card';
import { Progress } from '@/components/ui/progress';
import { Accordion, AccordionContent, AccordionItem, AccordionTrigger } from "@/components/ui/accordion";
import { useQuery } from '@tanstack/react-query';
import { apiRequest } from '@/lib/queryClient';
import { Loader2, ListChecks, Eye, AlertTriangle, CalendarClock, PlayCircle, ChevronRight } from 'lucide-react'; // Removido Dumbbell se não usado diretamente no JSX desta página
import { Link as WouterLink, useLocation } from 'wouter';
import { format, parseISO, isToday, isTomorrow, formatRelative } from 'date-fns';
import { ptBR } from 'date-fns/locale';

import FrequenciaSemanal from '@/components/alunos/FrequenciaSemanal';

// --- Interfaces ATUALIZADAS para refletir a estrutura da ROTINA ---
interface ExercicioDetalhePopulado {
  _id: string;
  nome: string;
  grupoMuscular?: string;
  urlVideo?: string;
  descricao?: string;
  categoria?: string;
  tipo?: string;
}

interface ExercicioEmDiaDeTreinoPopulado {
  _id: string;
  exercicioId: ExercicioDetalhePopulado | string; 
  series?: string;
  repeticoes?: string;
  carga?: string;
  descanso?: string;
  observacoes?: string;
  ordemNoDia: number;
  concluido?: boolean;
}

interface DiaDeTreinoPopulado {
  _id: string;
  identificadorDia: string;
  nomeSubFicha?: string;
  ordemNaRotina: number;
  exerciciosDoDia: ExercicioEmDiaDeTreinoPopulado[];
}

interface RotinaDeTreinoAluno {
  _id: string;
  titulo: string;
  descricao?: string;
  tipo: "modelo" | "individual"; 
  alunoId?: { _id: string; nome: string; email?: string; } | string | null;
  criadorId?: { _id: string; nome: string; email?: string; } | string;
  tipoOrganizacaoRotina: 'diasDaSemana' | 'numerico' | 'livre';
  diasDeTreino: DiaDeTreinoPopulado[]; 
  pastaId?: { _id: string; nome: string; } | string | null;
  statusModelo?: "ativo" | "rascunho" | "arquivado";
  ordemNaPasta?: number;
  dataValidade?: string | null; 
  totalSessoesRotinaPlanejadas?: number | null;
  sessoesRotinaConcluidas: number;
  criadoEm: string; 
  atualizadoEm?: string; 
  isExpirada?: boolean; 
  progressoRotina?: string; 
}

interface SessaoConcluidaParaFrequencia {
  _id: string;
  sessionDate: string | Date;
  tipoCompromisso?: string;
}

interface SessaoAgendada {
  _id: string;
  sessionDate: string;
  status: 'pending' | 'confirmed';
  tipoCompromisso: string;
  notes?: string;
  rotinaId?: { _id: string; titulo: string; } | null; 
  diaDeTreinoId?: string | null; 
  diaDeTreinoIdentificador?: string | null; 
  personalId?: { _id: string; nome: string; } | null; 
}

const AlunoDashboardPage: React.FC = () => {
  const { aluno, logoutAluno, tokenAluno } = useAluno();
  const [, navigate] = useLocation();

  const {
    data: minhasRotinas, 
    isLoading: isLoadingRotinas, 
    error: errorRotinas, 
  } = useQuery<RotinaDeTreinoAluno[], Error>({ 
    queryKey: ['minhasRotinasAluno', aluno?.id], 
    queryFn: async () => {
      if (!aluno?.id) throw new Error("Aluno não autenticado para buscar rotinas.");
      return apiRequest<RotinaDeTreinoAluno[]>('GET', '/api/aluno/meus-treinos');
    },
    enabled: !!aluno && !!tokenAluno,
    staleTime: 1000 * 60 * 5,
  });

  const {
    data: sessoesConcluidasNaSemana,
    isLoading: isLoadingFrequencia,
    error: errorFrequencia,
  } = useQuery<SessaoConcluidaParaFrequencia[], Error>({
    queryKey: ['frequenciaSemanalAluno', aluno?.id],
    queryFn: async () => {
      if (!aluno?.id) throw new Error("Aluno não autenticado para buscar frequência.");
      return apiRequest<SessaoConcluidaParaFrequencia[]>('GET', '/api/aluno/minhas-sessoes-concluidas-na-semana');
    },
    enabled: !!aluno && !!tokenAluno,
    staleTime: 1000 * 60 * 1,
  });

  const {
    data: sessoesAgendadas,
    isLoading: isLoadingSessoesAgendadas,
    error: errorSessoesAgendadas,
  } = useQuery<SessaoAgendada[], Error>({
    queryKey: ['sessoesAgendadasAluno', aluno?.id],
    queryFn: async () => {
      if (!aluno?.id) throw new Error("Aluno não autenticado para buscar sessões agendadas.");
      return apiRequest<SessaoAgendada[]>('GET', '/api/aluno/minhas-sessoes-agendadas');
    },
    enabled: !!aluno && !!tokenAluno,
    staleTime: 1000 * 60 * 2,
  });

  const formatarDataSimples = (dataISO?: string): string => {
    if (!dataISO) return 'N/A';
    try { return format(parseISO(dataISO), "dd/MM/yyyy", { locale: ptBR }); }
    catch (e) { return 'Data inválida'; }
  };
  
  const formatarDataHoraSessao = (dataISO?: string): string => {
    if (!dataISO) return 'N/A';
    try {
      const data = parseISO(dataISO);
      if (isToday(data)) return `Hoje às ${format(data, 'HH:mm')}`;
      if (isTomorrow(data)) return `Amanhã às ${format(data, 'HH:mm')}`;
      const relativo = formatRelative(data, new Date(), { locale: ptBR });
      return relativo.charAt(0).toUpperCase() + relativo.slice(1) + ` (${format(data, 'HH:mm')})`;
    } catch (e) { return 'Data/hora inválida'; }
  };

  if (isLoadingRotinas || isLoadingFrequencia || (isLoadingSessoesAgendadas && !sessoesAgendadas && !aluno)) {
    return (
      <div className="flex h-screen w-full items-center justify-center">
        <Loader2 className="h-10 w-10 animate-spin text-primary" />
        <span className="ml-3">A carregar dados do aluno...</span>
      </div>
    );
  }
  
  if (!aluno && !tokenAluno) {
      return (
          <div className="flex h-screen w-full items-center justify-center">
              <p>Sessão inválida ou expirada. Por favor, <WouterLink href="/aluno/login" className="text-primary hover:underline">faça login</WouterLink> novamente.</p>
          </div>
      );
  }

  return (
    <div className="container mx-auto p-4 md:p-6 lg:p-8 space-y-8">
      <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4">
        <div>
          <h1 className="text-3xl font-bold text-gray-800 dark:text-gray-100">Painel do Aluno</h1>
          {aluno && (<p className="text-lg text-muted-foreground">Bem-vindo(a) de volta, {aluno.nome || aluno.email}!</p>)}
        </div>
        <Button variant="outline" onClick={logoutAluno} className="w-full sm:w-auto">Sair</Button>
      </div>

      <FrequenciaSemanal 
        sessoesConcluidasNaSemana={sessoesConcluidasNaSemana || []}
        isLoading={isLoadingFrequencia}
        error={errorFrequencia}
      />

      <Card className="shadow-md">
        <CardHeader>
          <CardTitle className="flex items-center text-lg">
            <CalendarClock className="w-5 h-5 mr-2 text-primary" />
            Meus Próximos Treinos
          </CardTitle>
          <CardDescription>Seus treinos e compromissos agendados.</CardDescription>
        </CardHeader>
        <CardContent>
          {isLoadingSessoesAgendadas && ( 
            <div className="flex justify-center items-center py-6">
              <Loader2 className="h-6 w-6 animate-spin text-primary" />
              <p className="ml-2 text-sm text-muted-foreground">Carregando treinos agendados...</p>
            </div>
          )}
          {errorSessoesAgendadas && ( 
            <div className="text-red-500 p-3 bg-red-50 dark:bg-red-900/20 rounded-md text-sm flex items-center">
              <AlertTriangle className="inline w-4 h-4 mr-2 shrink-0" /> 
              <span>Erro ao carregar treinos agendados: {errorSessoesAgendadas.message}</span>
            </div>
          )}
          {!isLoadingSessoesAgendadas && !errorSessoesAgendadas && (!sessoesAgendadas || sessoesAgendadas.length === 0) && (
            <p className="text-sm text-muted-foreground text-center py-6">Você não tem nenhum treino ou compromisso programado.</p>
          )}
          {!isLoadingSessoesAgendadas && !errorSessoesAgendadas && sessoesAgendadas && sessoesAgendadas.length > 0 && (
            <div className="space-y-4">
              {sessoesAgendadas.map((sessao) => (
                <Card key={sessao._id} className="bg-slate-50 dark:bg-slate-800/60 hover:shadow-lg transition-shadow">
                  <CardContent className="pt-4 space-y-2">
                    <div className="flex justify-between items-start">
                      <div>
                        <p className="font-semibold text-md">
                          {sessao.rotinaId?.titulo ? `Rotina: ${sessao.rotinaId.titulo}` : sessao.tipoCompromisso.replace('_', ' ')}
                          {sessao.diaDeTreinoIdentificador && ` - Dia: ${sessao.diaDeTreinoIdentificador}`}
                        </p>
                        <p className="text-xs text-muted-foreground">
                          {formatarDataHoraSessao(sessao.sessionDate)}
                        </p>
                      </div>
                      {sessao.rotinaId && sessao.diaDeTreinoId && (
                        <WouterLink href={`/aluno/rotina/${sessao.rotinaId._id}/dia/${sessao.diaDeTreinoId}?sessaoId=${sessao._id}`}>
                          <Button size="sm" variant="default">
                            <PlayCircle className="w-4 h-4 mr-2" />
                            Iniciar Treino
                          </Button>
                        </WouterLink>
                      )}
                    </div>
                    {sessao.notes && <p className="text-xs text-muted-foreground italic">Nota: {sessao.notes}</p>}
                     <p className="text-xs">
                      <span className={`capitalize px-2 py-0.5 rounded-full text-xs font-medium ${
                        sessao.status === 'confirmed' ? 'bg-green-100 text-green-700 dark:bg-green-800/50 dark:text-green-300' : 
                        sessao.status === 'pending' ? 'bg-yellow-100 text-yellow-700 dark:bg-yellow-800/50 dark:text-yellow-300' :
                        'bg-gray-100 text-gray-700 dark:bg-gray-700/50 dark:text-gray-300'
                      }`}>
                        {sessao.status === 'pending' ? 'Pendente' : sessao.status === 'confirmed' ? 'Confirmado' : sessao.status}
                      </span>
                      {sessao.personalId?.nome && (
                        <span className="text-muted-foreground"> por {sessao.personalId.nome}</span>
                      )}
                    </p>
                  </CardContent>
                </Card>
              ))}
            </div>
          )}
        </CardContent>
      </Card>

      {/* SEÇÃO MINHAS ROTINAS DE TREINO */}
      <Card className="shadow-lg">
        <CardHeader>
          <CardTitle className="flex items-center"><ListChecks className="w-6 h-6 mr-3 text-primary" />Minhas Rotinas de Treino</CardTitle>
          <CardDescription>Seus programas de treino ativos e recentes.</CardDescription>
        </CardHeader>
        <CardContent>
          {isLoadingRotinas && ( 
            <div className="flex justify-center items-center py-10">
              <Loader2 className="h-8 w-8 animate-spin text-primary" />
              <p className="ml-3 text-sm text-muted-foreground">A carregar suas rotinas...</p>
            </div>
          )}
          {errorRotinas && ( 
            <div className="text-red-600 dark:text-red-400 bg-red-50 dark:bg-red-900/20 p-4 rounded-md flex items-center">
              <AlertTriangle className="w-5 h-5 mr-2" />
              <span>Erro ao carregar rotinas: {errorRotinas.message}</span>
            </div>
          )}
          {!isLoadingRotinas && !errorRotinas && (!minhasRotinas || minhasRotinas.length === 0) && (
            <p className="text-sm text-muted-foreground text-center py-10">Você ainda não tem nenhuma rotina de treino atribuída.</p>
          )}
          {!isLoadingRotinas && !errorRotinas && minhasRotinas && minhasRotinas.length > 0 && (
            <div className="space-y-6">
              {minhasRotinas.map((rotina) => (
                <Card key={rotina._id} className="bg-slate-50 dark:bg-slate-800/50">
                  <CardHeader>
                    <CardTitle className="text-xl">{rotina.titulo}</CardTitle>
                    {rotina.descricao && <CardDescription>{rotina.descricao}</CardDescription>}
                  </CardHeader>
                  <CardContent>
                    <div className="space-y-3">
                      <div className="flex justify-between items-center text-xs text-muted-foreground">
                        <span>Criada por: {typeof rotina.criadorId === 'object' && rotina.criadorId?.nome ? rotina.criadorId.nome : 'Personal'}</span>
                        <span>Atualizada: {formatarDataSimples(rotina.atualizadoEm || rotina.criadoEm)}</span>
                      </div>
                      {rotina.totalSessoesRotinaPlanejadas !== undefined && rotina.totalSessoesRotinaPlanejadas !== null ? (
                        <div>
                          <div className="flex justify-between items-center mb-1">
                            <p className="text-sm">
                              Progresso: <strong>{rotina.sessoesRotinaConcluidas}</strong> de <strong>{rotina.totalSessoesRotinaPlanejadas}</strong> sessões
                            </p>
                            {/* CORREÇÃO: Removido   e garantido que calculo é feito ou usa 0 */}
                            <span className="text-sm font-semibold text-primary">
                              {rotina.progressoRotina && rotina.progressoRotina.includes('/') ? 
                                `${(parseFloat(rotina.progressoRotina.split('/')[0]) / parseFloat(rotina.progressoRotina.split('/')[1]) * 100).toFixed(0)}%` 
                                : (rotina.totalSessoesRotinaPlanejadas === 0 && rotina.sessoesRotinaConcluidas === 0 ? 'N/A' : '0%')
                              }
                            </span>
                          </div>
                          <Progress 
                            value={rotina.totalSessoesRotinaPlanejadas && rotina.totalSessoesRotinaPlanejadas > 0 ? (rotina.sessoesRotinaConcluidas / rotina.totalSessoesRotinaPlanejadas) * 100 : 0} 
                            className="h-2" 
                          />
                        </div>
                      ) : rotina.dataValidade ? (
                        <p className="text-sm text-muted-foreground">
                          Válida até: {formatarDataSimples(rotina.dataValidade)}
                          {rotina.isExpirada && <span className="ml-2 text-red-500">(Expirada)</span>}
                        </p>
                      ) : (
                        <p className="text-sm text-muted-foreground italic">Esta rotina não tem validade definida.</p>
                      )}

                      {rotina.diasDeTreino && rotina.diasDeTreino.length > 0 && (
                        <div className="mt-4 pt-3 border-t dark:border-gray-700">
                          <h4 className="text-md font-semibold mb-2 text-gray-700 dark:text-gray-300">Dias de Treino:</h4>
                          <Accordion type="multiple" className="w-full space-y-2">
                            {rotina.diasDeTreino.sort((a,b) => a.ordemNaRotina - b.ordemNaRotina).map((dia, index) => (
                              <AccordionItem key={dia._id || `dia-${index}`} value={dia._id || `dia-item-${index}`} className="border dark:border-gray-600 rounded-md">
                                <AccordionTrigger className="px-4 py-3 hover:no-underline text-sm">
                                  <div className="flex items-center justify-between w-full">
                                    <span className="font-medium text-gray-800 dark:text-gray-200">
                                      {dia.identificadorDia}{dia.nomeSubFicha ? `: ${dia.nomeSubFicha}` : ''}
                                    </span>
                                    <ChevronRight className="h-4 w-4 text-muted-foreground transition-transform duration-200 group-data-[state=open]:rotate-90" />
                                  </div>
                                </AccordionTrigger>
                                <AccordionContent className="px-4 pb-3 pt-0">
                                  <div className="text-xs text-muted-foreground space-y-1 pt-2 border-t dark:border-gray-700">
                                    {dia.exerciciosDoDia.length > 0 ?
                                      dia.exerciciosDoDia.sort((a,b) => a.ordemNoDia - b.ordemNoDia).map(ex => (
                                        <p key={ex._id || (typeof ex.exercicioId === 'object' && ex.exercicioId?._id) || (ex.exercicioId as string) || `ex-${Math.random()}`}>
                                          {/* CORREÇÃO: Removido   */}
                                          - {typeof ex.exercicioId === 'object' && ex.exercicioId !== null ? ex.exercicioId.nome : 'Exercício não carregado'}
                                          {(ex.series || ex.repeticoes) && ` (${ex.series || '?'}/${ex.repeticoes || '?'})`}
                                        </p>
                                      ))
                                      : <p className="italic">Nenhum exercício neste dia.</p>
                                    }
                                  </div>
                                  <Button 
                                      size="sm" 
                                      className="mt-3 w-full sm:w-auto"
                                      onClick={() => navigate(`/aluno/rotina/${rotina._id}/dia/${dia._id}`)}
                                  >
                                    <PlayCircle className="w-4 h-4 mr-2" />
                                    Iniciar Treino do Dia
                                  </Button>
                                </AccordionContent>
                              </AccordionItem>
                            ))}
                          </Accordion>
                        </div>
                      )}
                    </div>
                  </CardContent>
                  <CardFooter className="flex justify-end">
                    <WouterLink href={`/aluno/rotina/${rotina._id}`}>
                      <Button className="w-full sm:w-auto"><Eye className="w-4 h-4 mr-2" />Ver Detalhes da Rotina</Button>
                    </WouterLink>
                  </CardFooter>
                </Card>
              ))}
            </div>
          )}
        </CardContent>
      </Card>
    </div>
  );
};

export default AlunoDashboardPage;