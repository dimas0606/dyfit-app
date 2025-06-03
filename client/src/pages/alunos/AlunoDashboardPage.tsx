// client/src/pages/alunos/AlunoDashboardPage.tsx
import React, { useMemo } from 'react';
import { useAluno } from '@/context/AlunoContext';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle, CardDescription, CardFooter } from '@/components/ui/card';
import { Progress } from '@/components/ui/progress';
import { useQuery } from '@tanstack/react-query';
import { apiRequest } from '@/lib/queryClient';
import { Loader2, ListChecks, Eye, AlertTriangle, CalendarClock, PlayCircle, Zap, CheckCircle2, RotateCcw, Calendar as CalendarIcon } from 'lucide-react'; // Adicionado CalendarIcon
import { Link as WouterLink, useLocation } from 'wouter';
import { format, parseISO, isValid as isDateValidFn, isSameWeek, startOfWeek as dateFnsStartOfWeek, endOfWeek as dateFnsEndOfWeek, getDay, addDays, nextDay, Day } from 'date-fns';
import { ptBR } from 'date-fns/locale';

import FrequenciaSemanal from '@/components/alunos/FrequenciaSemanal';

// --- Interfaces ---
// ... (Interfaces existentes mantidas) ...
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
  identificadorDia: string; // Ex: "Segunda-feira", "1", "Peito e Tríceps"
  nomeSubFicha?: string;    // Ex: "Foco em Ombros", "Treino A"
  ordemNaRotina: number;
  exerciciosDoDia: ExercicioEmDiaDeTreinoPopulado[];
  dataSugeridaFormatada?: string; // <<< NOVO CAMPO OPCIONAL
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
}
interface SessaoConcluidaParaFrequencia {
  _id: string;
  sessionDate: string | Date;
  tipoCompromisso?: string; 
}
interface SessaoConcluidaRotina {
    _id: string;
    diaDeTreinoId: string | null;
    concluidaEm: string; 
}

// Mapeamento de nomes de dias da semana para o índice de date-fns (0=Dom, 1=Seg, ...)
const weekDayMap: { [key: string]: Day } = {
    'domingo': 0, 'segunda-feira': 1, 'terça-feira': 2, 'quarta-feira': 3,
    'quinta-feira': 4, 'sexta-feira': 5, 'sábado': 6
};

const getNextDateForWeekday = (weekdayName: string): Date | null => {
    const lowerWeekdayName = weekdayName.toLowerCase().normalize("NFD").replace(/[\u0300-\u036f]/g, ""); // Normaliza e remove acentos
    const targetDayIndex = weekDayMap[lowerWeekdayName];

    if (targetDayIndex === undefined) {
        console.warn(`[getNextDateForWeekday] Nome do dia da semana inválido ou não mapeado: ${weekdayName}`);
        return null; 
    }
    const today = new Date();
    return nextDay(today, targetDayIndex as Day);
};


const AlunoDashboardPage: React.FC = () => {
  const { aluno, logoutAluno, tokenAluno } = useAluno();
  const [, navigate] = useLocation();

  const {
    data: minhasRotinas, 
    isLoading: isLoadingRotinas, 
    error: errorRotinas, 
  } = useQuery<RotinaDeTreinoAluno[], Error>({ /* ... query existente ... */ 
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
    data: sessoesConcluidasNaSemanaGeral,
    isLoading: isLoadingFrequencia,
  } = useQuery<SessaoConcluidaParaFrequencia[], Error>({ /* ... query existente ... */ 
    queryKey: ['frequenciaSemanalAluno', aluno?.id],
    queryFn: async () => { 
      if (!aluno?.id) throw new Error("Aluno não autenticado para buscar frequência.");
      return apiRequest<SessaoConcluidaParaFrequencia[]>('GET', '/api/aluno/minhas-sessoes-concluidas-na-semana');
    },
    enabled: !!aluno && !!tokenAluno,
    staleTime: 1000 * 60 * 1,
  });

  const rotinaAtiva = useMemo(() => {
      if (!minhasRotinas || minhasRotinas.length === 0) return null;
      return minhasRotinas[0];
  }, [minhasRotinas]);


  const { data: sessoesConcluidasDaRotinaAtiva, isLoading: isLoadingSessoesRotina } = useQuery<SessaoConcluidaRotina[], Error>({ /* ... query existente ... */ 
    queryKey: ['sessoesConcluidasRotinaAtiva', aluno?.id, rotinaAtiva?._id],
    queryFn: async () => {
        if (!aluno?.id || !rotinaAtiva?._id) throw new Error("Aluno ou rotina ativa não definidos para buscar sessões.");
        return apiRequest<SessaoConcluidaRotina[]>('GET', `/api/aluno/rotinas/${rotinaAtiva._id}/sessoes-concluidas`);
    },
    enabled: !!aluno && !!tokenAluno && !!rotinaAtiva,
    staleTime: 1000 * 30, 
  });

  const formatarDataSimples = (dataISO?: string | null): string => { /* ... como antes ... */ 
    if (!dataISO) return 'N/A';
    try { 
      const dateObj = parseISO(dataISO);
      if (!isDateValidFn(dateObj)) return 'Data inválida';
      return format(dateObj, "dd/MM/yyyy", { locale: ptBR }); 
    }
    catch (e) { return 'Data inválida'; }
  };

  const { proximoDiaSugerido, diasCompletosDaRotinaComData } = useMemo(() => {
    if (!rotinaAtiva || !rotinaAtiva.diasDeTreino || rotinaAtiva.diasDeTreino.length === 0) {
        return { proximoDiaSugerido: null, diasCompletosDaRotinaComData: [] };
    }

    const diasDaRotinaOrdenados = [...rotinaAtiva.diasDeTreino]
        .map(dia => ({
            ...dia,
            dataSugeridaFormatada: rotinaAtiva.tipoOrganizacaoRotina === 'diasDaSemana' 
                                    ? format(getNextDateForWeekday(dia.identificadorDia) || new Date(), "dd/MM (EEE)", { locale: ptBR })
                                    : undefined
        }))
        .sort((a, b) => a.ordemNaRotina - b.ordemNaRotina);
    
    const hoje = new Date();
    const diasConcluidosNestaSemanaSet = new Set<string>();
    if (sessoesConcluidasDaRotinaAtiva) {
        sessoesConcluidasDaRotinaAtiva.forEach(sessao => {
            if (sessao.diaDeTreinoId && sessao.concluidaEm) {
                const dataConclusao = parseISO(sessao.concluidaEm);
                if (isDateValidFn(dataConclusao) && isSameWeek(dataConclusao, hoje, { weekStartsOn: 1 })) {
                     diasConcluidosNestaSemanaSet.add(sessao.diaDeTreinoId);
                }
            }
        });
    }

    if (rotinaAtiva.totalSessoesRotinaPlanejadas && rotinaAtiva.sessoesRotinaConcluidas >= rotinaAtiva.totalSessoesRotinaPlanejadas) {
        return { proximoDiaSugerido: null, diasCompletosDaRotinaComData: diasDaRotinaOrdenados.map(d => ({...d, concluidoNestaSemana: diasConcluidosNestaSemanaSet.has(d._id)})) }; 
    }

    let ultimoDiaConcluidoId: string | null = null;
    if (sessoesConcluidasDaRotinaAtiva && sessoesConcluidasDaRotinaAtiva.length > 0) {
        const sessoesOrdenadas = [...sessoesConcluidasDaRotinaAtiva].sort((a,b) => new Date(b.concluidaEm).getTime() - new Date(a.concluidaEm).getTime());
        ultimoDiaConcluidoId = sessoesOrdenadas[0].diaDeTreinoId;
    }

    let proximoDia: DiaDeTreinoPopulado | null = null;
    if (!ultimoDiaConcluidoId) {
        proximoDia = diasDaRotinaOrdenados[0] || null;
    } else {
        const indiceUltimoDiaConcluidoNaRotina = diasDaRotinaOrdenados.findIndex(dia => dia._id === ultimoDiaConcluidoId);
        if (indiceUltimoDiaConcluidoNaRotina !== -1) {
            if (indiceUltimoDiaConcluidoNaRotina + 1 < diasDaRotinaOrdenados.length) {
                proximoDia = diasDaRotinaOrdenados[indiceUltimoDiaConcluidoNaRotina + 1];
            } else {
                proximoDia = diasDaRotinaOrdenados[0] || null;
            }
        } else {
            proximoDia = diasDaRotinaOrdenados[0] || null;
        }
    }
    
    const diasFormatados = diasDaRotinaOrdenados.map(dia => ({
        ...dia,
        concluidoNestaSemana: diasConcluidosNestaSemanaSet.has(dia._id)
    }));

    return { proximoDiaSugerido: proximoDia, diasCompletosDaRotinaComData: diasFormatados };

  }, [rotinaAtiva, sessoesConcluidasDaRotinaAtiva]);


  if (isLoadingRotinas || isLoadingFrequencia || (!!rotinaAtiva && isLoadingSessoesRotina)) { /* ... */ }
  if (!aluno && !tokenAluno && !isLoadingRotinas && !isLoadingFrequencia && !(!!rotinaAtiva && isLoadingSessoesRotina)) { /* ... */ }
  if (errorRotinas) { /* ... */ }

  return (
    <div className="container mx-auto p-4 md:p-6 lg:p-8 space-y-8">
      {/* Saudação e Frequência Semanal (como antes) */}
      <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4">
        <div>
          <h1 className="text-3xl font-bold text-gray-800 dark:text-gray-100">Painel do Aluno</h1>
          {aluno && (<p className="text-lg text-muted-foreground">Bem-vindo(a) de volta, {aluno.nome || aluno.email}!</p>)}
        </div>
        <Button variant="outline" onClick={logoutAluno} className="w-full sm:w-auto">Sair</Button>
      </div>
      <FrequenciaSemanal 
        sessoesConcluidasNaSemana={sessoesConcluidasNaSemanaGeral || []}
        isLoading={isLoadingFrequencia}
      />

      {/* Minha Rotina Ativa */}
      {rotinaAtiva ? (
        <Card className="shadow-lg border border-primary/30">
          <CardHeader className="bg-primary/5 dark:bg-primary/10">
            <CardTitle className="flex items-center text-xl text-primary dark:text-sky-400">
              <Zap className="w-6 h-6 mr-2" />
              Minha Rotina Ativa: {rotinaAtiva.titulo}
            </CardTitle>
            {rotinaAtiva.descricao && <CardDescription className="text-sm">{rotinaAtiva.descricao}</CardDescription>}
          </CardHeader>
          <CardContent className="pt-4 space-y-6">
            {/* Progresso Total */}
            <div className="text-sm text-muted-foreground space-y-1">
              {rotinaAtiva.dataValidade && ( <p>Válida até: {formatarDataSimples(rotinaAtiva.dataValidade)}</p> )}
              {rotinaAtiva.totalSessoesRotinaPlanejadas !== undefined && rotinaAtiva.totalSessoesRotinaPlanejadas !== null && (
                <>
                  <p className="font-medium"> Progresso Total da Rotina: <strong>{rotinaAtiva.sessoesRotinaConcluidas}</strong> de <strong>{rotinaAtiva.totalSessoesRotinaPlanejadas}</strong> {rotinaAtiva.totalSessoesRotinaPlanejadas === 1 ? 'sessão' : 'sessões'}.</p>
                  <Progress value={(rotinaAtiva.totalSessoesRotinaPlanejadas > 0 ? (rotinaAtiva.sessoesRotinaConcluidas / rotinaAtiva.totalSessoesRotinaPlanejadas) * 100 : 0)} className="h-3" />
                </>
              )}
            </div>

            {/* Próximo Treino Sugerido */}
            {proximoDiaSugerido ? (
                <Card className="border-blue-500 dark:border-blue-400 shadow-md bg-blue-50 dark:bg-blue-900/30">
                    <CardHeader className="pb-2">
                        <CardTitle className="text-lg text-blue-700 dark:text-blue-300">Próximo Treino Sugerido</CardTitle>
                         {/* <<< EXIBIR DATA SUGERIDA AQUI >>> */}
                        {proximoDiaSugerido.dataSugeridaFormatada && (
                            <CardDescription className="text-xs text-blue-600 dark:text-blue-400">
                                Programado para: {proximoDiaSugerido.dataSugeridaFormatada}
                            </CardDescription>
                        )}
                    </CardHeader>
                    <CardContent className="space-y-1">
                        <p className="font-semibold">
                            {proximoDiaSugerido.identificadorDia}
                            {proximoDiaSugerido.nomeSubFicha && ` - ${proximoDiaSugerido.nomeSubFicha}`}
                        </p>
                         <p className="text-xs text-muted-foreground mb-3">
                            {proximoDiaSugerido.exerciciosDoDia.length} exercício(s) neste dia.
                        </p>
                    </CardContent>
                    <CardFooter>
                        <Button className="w-full bg-blue-600 hover:bg-blue-700 dark:bg-blue-500 dark:hover:bg-blue-600" onClick={() => { if (!proximoDiaSugerido._id) return; navigate(`/aluno/ficha/${rotinaAtiva._id}?diaId=${proximoDiaSugerido._id}`) }}>
                            <PlayCircle className="w-4 h-4 mr-2" />
                            Iniciar Treino Sugerido
                        </Button>
                    </CardFooter>
                </Card>
            ) : ( /* ... Mensagem de rotina concluída ou sem próximo ... */ 
                rotinaAtiva.totalSessoesRotinaPlanejadas && rotinaAtiva.sessoesRotinaConcluidas >= rotinaAtiva.totalSessoesRotinaPlanejadas ? (
                 <div className="p-4 text-center bg-green-100 dark:bg-green-800/40 border border-green-300 dark:border-green-600 rounded-md">
                    <CheckCircle2 className="w-10 h-10 text-green-600 dark:text-green-400 mx-auto mb-2" />
                    <p className="font-semibold text-green-700 dark:text-green-300">Parabéns! Você concluiu todas as sessões planejadas para esta rotina!</p>
                    <p className="text-xs text-muted-foreground mt-1">Fale com seu personal para os próximos passos.</p>
                 </div>
              ) : (
                 <p className="text-sm text-muted-foreground text-center py-4">Não há próximo treino sugerido ou a rotina está completa.</p>
              )
            )}

            {/* Outros Dias da Rotina */}
            {diasCompletosDaRotinaComData && diasCompletosDaRotinaComData.length > 0 && (
              <div className="pt-4">
                <h4 className="text-md font-semibold mb-3 text-gray-700 dark:text-gray-300">Dias da Rotina:</h4>
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                  {diasCompletosDaRotinaComData
                    .filter(dia => dia._id !== proximoDiaSugerido?._id) 
                    .map((dia) => {
                    const concluidoNestaSemana = (dia as any).concluidoNestaSemana; // Cast para acessar a prop adicionada
                    const targetUrl = `/aluno/ficha/${rotinaAtiva._id}?diaId=${dia._id}`;
                    return (
                      <Card key={dia._id} className={`flex flex-col p-3 rounded-md transition-all hover:shadow-md 
                                                    ${concluidoNestaSemana ? 'bg-green-50 dark:bg-green-900/20 border-green-200 dark:border-green-700' 
                                                                         : 'bg-slate-50 dark:bg-slate-800/40'}`}>
                        <div className="flex-grow mb-2">
                          <p className="font-medium text-sm">
                            {dia.identificadorDia}
                            {dia.nomeSubFicha && <span className="text-xs text-muted-foreground"> - {dia.nomeSubFicha}</span>}
                          </p>
                          {/* <<< EXIBIR DATA SUGERIDA AQUI >>> */}
                          {dia.dataSugeridaFormatada && (
                            <p className="text-xs text-gray-500 dark:text-gray-400">
                                <CalendarIcon className="w-3 h-3 inline-block mr-1" /> {dia.dataSugeridaFormatada}
                            </p>
                          )}
                          <p className="text-xs text-muted-foreground mt-1">
                            {dia.exerciciosDoDia.length} exercício(s).
                            {concluidoNestaSemana && <span className="ml-2 text-green-600 dark:text-green-400 font-semibold">(Feito!)</span>}
                          </p>
                        </div>
                        <Button 
                          size="sm" 
                          variant={concluidoNestaSemana ? "outline" : "secondary"}
                          className="w-full"
                          onClick={() => { if (!dia._id) return; navigate(targetUrl); }}
                        >
                          {concluidoNestaSemana ? <RotateCcw className="w-4 h-4 mr-2" /> : <PlayCircle className="w-4 h-4 mr-2" />}
                          {concluidoNestaSemana ? "Ver/Repetir" : "Iniciar Treino"}
                        </Button>
                      </Card>
                    );
                  })}
                </div>
              </div>
            )}
          </CardContent>
        </Card>
      ) : ( /* ... como antes ... */ 
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

      {/* SEÇÃO LISTA GERAL DE ROTINAS */}
      {minhasRotinas && minhasRotinas.length > 1 && ( /* ... como antes ... */ 
        <Card className="shadow-lg mt-8">
          <CardHeader>
            <CardTitle className="flex items-center"><ListChecks className="w-6 h-6 mr-3 text-primary" />Outras Rotinas Disponíveis</CardTitle>
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