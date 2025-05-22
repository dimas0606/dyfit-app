// client/src/pages/alunos/AlunoDashboardPage.tsx
import React from 'react';
import { useAluno } from '@/context/AlunoContext';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle, CardDescription, CardFooter } from '@/components/ui/card';
import { Progress } from '@/components/ui/progress';
import { Accordion, AccordionContent, AccordionItem, AccordionTrigger } from "@/components/ui/accordion";
import { useQuery } from '@tanstack/react-query';
import { apiRequest } from '@/lib/queryClient';
import { Loader2, ListChecks, Eye, AlertTriangle, CalendarClock, PlayCircle, ChevronRight, Zap } from 'lucide-react';
import { Link as WouterLink, useLocation } from 'wouter';
import { format, parseISO, isValid as isDateValidFn } from 'date-fns';
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
  progressoPercentual?: number; 
}

interface SessaoConcluidaParaFrequencia {
  _id: string;
  sessionDate: string | Date;
  tipoCompromisso?: string;
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
      const rotinasDoAluno = await apiRequest<RotinaDeTreinoAluno[]>('GET', '/api/aluno/meus-treinos');
      return rotinasDoAluno.sort((a, b) => 
        new Date(b.atualizadoEm || b.criadoEm).getTime() - new Date(a.atualizadoEm || a.criadoEm).getTime()
      );
    },
    enabled: !!aluno && !!tokenAluno,
    staleTime: 1000 * 60 * 5,
  });

  const {
    data: sessoesConcluidasNaSemana,
    isLoading: isLoadingFrequencia,
  } = useQuery<SessaoConcluidaParaFrequencia[], Error>({
    queryKey: ['frequenciaSemanalAluno', aluno?.id],
    queryFn: async () => {
      if (!aluno?.id) throw new Error("Aluno não autenticado para buscar frequência.");
      return apiRequest<SessaoConcluidaParaFrequencia[]>('GET', '/api/aluno/minhas-sessoes-concluidas-na-semana');
    },
    enabled: !!aluno && !!tokenAluno,
    staleTime: 1000 * 60 * 1,
  });

  const rotinaAtiva = minhasRotinas && minhasRotinas.length > 0 ? minhasRotinas[0] : null;

  const formatarDataSimples = (dataISO?: string | null): string => {
    if (!dataISO) return 'N/A';
    try { 
      const dateObj = parseISO(dataISO);
      if (!isDateValidFn(dateObj)) return 'Data inválida';
      return format(dateObj, "dd/MM/yyyy", { locale: ptBR }); 
    }
    catch (e) { return 'Data inválida'; }
  };
  
  if (isLoadingRotinas || isLoadingFrequencia ) {
    return (
      <div className="flex h-screen w-full items-center justify-center">
        <Loader2 className="h-10 w-10 animate-spin text-primary" />
        <span className="ml-3">A carregar seus dados...</span>
      </div>
    );
  }
  
  if (!aluno && !tokenAluno && !isLoadingRotinas && !isLoadingFrequencia) {
      return (
          <div className="flex h-screen w-full items-center justify-center">
              <p>Sessão inválida ou expirada. Por favor, <WouterLink href="/aluno/login" className="text-primary hover:underline">faça login</WouterLink> novamente.</p>
          </div>
      );
  }
  
  if (errorRotinas) {
      return (
        <div className="container mx-auto p-4 md:p-6 lg:p-8">
          <div className="text-red-600 dark:text-red-400 bg-red-50 dark:bg-red-900/20 p-4 rounded-md flex items-center">
            <AlertTriangle className="w-5 h-5 mr-2" />
            <span>Erro ao carregar suas rotinas: {errorRotinas.message}</span>
          </div>
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
      />

      {rotinaAtiva ? (
        <Card className="shadow-md">
          <CardHeader>
            <CardTitle className="flex items-center text-xl">
              <Zap className="w-5 h-5 mr-2 text-primary" />
              Minha Rotina Ativa: {rotinaAtiva.titulo}
            </CardTitle>
            {rotinaAtiva.descricao && <CardDescription>{rotinaAtiva.descricao}</CardDescription>}
          </CardHeader>
          <CardContent className="space-y-4">
            <div className="text-sm text-muted-foreground space-y-1">
              {rotinaAtiva.dataValidade && (
                <p>Válida até: {formatarDataSimples(rotinaAtiva.dataValidade)}</p>
              )}
              {rotinaAtiva.totalSessoesRotinaPlanejadas !== undefined && rotinaAtiva.totalSessoesRotinaPlanejadas !== null && (
                <>
                  <p>
                    Progresso: {rotinaAtiva.sessoesRotinaConcluidas} de {rotinaAtiva.totalSessoesRotinaPlanejadas} sessões concluídas.
                  </p>
                  <Progress 
                    value={(rotinaAtiva.totalSessoesRotinaPlanejadas > 0 ? (rotinaAtiva.sessoesRotinaConcluidas / rotinaAtiva.totalSessoesRotinaPlanejadas) * 100 : 0)} 
                    className="h-2" 
                  />
                </>
              )}
            </div>

            {rotinaAtiva.diasDeTreino && rotinaAtiva.diasDeTreino.length > 0 ? (
              <div>
                <h4 className="text-md font-semibold mb-3 mt-4 text-gray-700 dark:text-gray-300">Próximos Treinos da Rotina:</h4>
                <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
                  {rotinaAtiva.diasDeTreino.sort((a,b) => a.ordemNaRotina - b.ordemNaRotina).map((dia) => {
                    // <<< ADICIONADO CONSOLE.LOG AQUI >>>
                    console.log(`[AlunoDashboardPage] Mapeando dia de treino: ID=${dia._id}, Identificador=${dia.identificadorDia}`);
                    const targetUrl = `/aluno/ficha/${rotinaAtiva._id}?diaId=${dia._id}`;
                    return (
                      <Card key={dia._id} className="flex flex-col">
                        <CardHeader className="pb-2">
                          <CardTitle className="text-lg">
                            {dia.identificadorDia}
                            {dia.nomeSubFicha && <span className="block text-sm font-normal text-muted-foreground">{dia.nomeSubFicha}</span>}
                          </CardTitle>
                        </CardHeader>
                        <CardContent className="flex-grow">
                          <p className="text-xs text-muted-foreground mb-3">
                            {dia.exerciciosDoDia.length} exercício(s) neste dia.
                          </p>
                        </CardContent>
                        <CardFooter>
                          <Button 
                            className="w-full"
                            onClick={() => {
                              // <<< ADICIONADO CONSOLE.LOG AQUI >>>
                              console.log(`[AlunoDashboardPage] Botão "Iniciar Treino" clicado. Navegando para: ${targetUrl}`);
                              if (!dia._id) {
                                console.error("[AlunoDashboardPage] ERRO: dia._id está indefinido ao tentar navegar!");
                                toast({ title: "Erro interno", description: "Não foi possível identificar o dia de treino.", variant: "destructive"});
                                return;
                              }
                              navigate(targetUrl);
                            }}
                          >
                            <PlayCircle className="w-4 h-4 mr-2" />
                            Iniciar Treino
                          </Button>
                        </CardFooter>
                      </Card>
                    );
                  })}
                </div>
              </div>
            ) : (
              <p className="text-sm text-muted-foreground">Esta rotina não possui dias de treino definidos.</p>
            )}
          </CardContent>
        </Card>
      ) : (
        !isLoadingRotinas && (
            <Card className="shadow-md">
                <CardHeader>
                    <CardTitle className="flex items-center text-xl"><Zap className="w-5 h-5 mr-2 text-gray-400" />Minha Rotina Ativa</CardTitle>
                </CardHeader>
                <CardContent>
                    <p className="text-sm text-muted-foreground text-center py-6">Você não tem nenhuma rotina de treino ativa no momento.</p>
                </CardContent>
            </Card>
        )
      )}

      {minhasRotinas && minhasRotinas.length > 1 && (
        <Card className="shadow-lg">
          <CardHeader>
            <CardTitle className="flex items-center"><ListChecks className="w-6 h-6 mr-3 text-primary" />Outras Rotinas</CardTitle>
            <CardDescription>Demais programas de treino atribuídos a você.</CardDescription>
          </CardHeader>
          <CardContent>
            <div className="space-y-4">
              {minhasRotinas.filter(r => r._id !== rotinaAtiva?._id).map((rotina) => (
                <Card key={rotina._id} className="bg-slate-50 dark:bg-slate-800/50">
                  <CardHeader className="pb-3">
                    <CardTitle className="text-lg">{rotina.titulo}</CardTitle>
                    {rotina.descricao && <CardDescription className="text-sm">{rotina.descricao}</CardDescription>}
                  </CardHeader>
                  <CardContent className="text-xs text-muted-foreground">
                    <p>Criada por: {typeof rotina.criadorId === 'object' && rotina.criadorId?.nome ? rotina.criadorId.nome : 'Personal'}</p>
                    {rotina.totalSessoesRotinaPlanejadas !== undefined && rotina.totalSessoesRotinaPlanejadas !== null && (
                       <p>Progresso: {rotina.sessoesRotinaConcluidas} / {rotina.totalSessoesRotinaPlanejadas} sessões</p>
                    )}
                    {rotina.dataValidade && <p>Válida até: {formatarDataSimples(rotina.dataValidade)}</p>}
                  </CardContent>
                  <CardFooter className="flex justify-end pt-3">
                    <WouterLink href={`/aluno/ficha/${rotina._id}`}>
                      <Button variant="outline" size="sm"><Eye className="w-4 h-4 mr-2" />Ver Detalhes</Button>
                    </WouterLink>
                  </CardFooter>
                </Card>
              ))}
            </div>
          </CardContent>
        </Card>
      )}
    </div>
  );
};

export default AlunoDashboardPage;