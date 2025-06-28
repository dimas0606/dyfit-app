// Caminho: ./client/src/pages/alunos/AlunoFichaDetalhePage.tsx
import React, { useState, useEffect, useMemo } from 'react';
import { useParams, Link as WouterLink, useLocation } from 'wouter';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { apiRequest } from '@/lib/queryClient';
import { useAluno } from '@/context/AlunoContext';
import { Card, CardContent, CardHeader, CardTitle, CardDescription, CardFooter } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Accordion, AccordionContent, AccordionItem, AccordionTrigger } from "@/components/ui/accordion";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription, DialogFooter, DialogClose } from "@/components/ui/dialog";
import { Loader2, ArrowLeft, ListChecks, Dumbbell, CheckSquare, Square, AlertTriangle, PlayCircle, VideoOff, RefreshCw, Zap, MessageSquare, Smile, Info as InfoIcon } from 'lucide-react';
import { format, parseISO, isValid as isDateValidFn } from 'date-fns';
import { ptBR } from 'date-fns/locale';
import VideoPlayerModal from '@/components/dialogs/VideoPlayerModal';
import { useToast } from '@/hooks/use-toast';

// --- Interfaces ---
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
  criadorId?: { _id: string; nome?: string; } | string | null;
  tipoOrganizacaoRotina: 'diasDaSemana' | 'numerico' | 'livre';
  diasDeTreino: DiaDeTreinoPopulado[];
  criadoEm: string;
  atualizadoEm?: string;
  dataValidade?: string | null;
  totalSessoesRotinaPlanejadas?: number | null;
  sessoesRotinaConcluidas: number;
}

type ExercicioRenderizavel = Omit<ExercicioEmDiaDeTreinoPopulado, 'exercicioId' | '_id'> & { 
  _id: string; 
  exercicioDetalhes: ExercicioDetalhePopulado; 
  concluido: boolean;
};

const OPCOES_PSE_FRONTEND = [ 'Muito Leve', 'Leve', 'Moderado', 'Intenso', 'Muito Intenso', 'Máximo Esforço'] as const;
type OpcaoPSEFrontend = typeof OPCOES_PSE_FRONTEND[number];

interface ConcluirSessaoPayload {
  rotinaId: string;
  diaDeTreinoId: string;
  pseAluno?: OpcaoPSEFrontend | null;
  comentarioAluno?: string | null;
  sessaoId?: string; 
}
interface ConcluirSessaoResponse {
  _id: string; 
  status: string;
  concluidaEm: string;
  pseAluno?: OpcaoPSEFrontend | null;
  comentarioAluno?: string | null;
  message?: string;
}


const AlunoFichaDetalhePage: React.FC = () => {
  const params = useParams<{ fichaId?: string }>(); 
  const rotinaIdUrl = params.fichaId;
  
  const [locationWouter, navigateWouter] = useLocation();
  const [diaIdUrl, setDiaIdUrl] = useState<string | null>(null);

  useEffect(() => {
    const searchParams = new URLSearchParams(window.location.search);
    setDiaIdUrl(searchParams.get('diaId'));
  }, [locationWouter]);

  const { aluno, tokenAluno } = useAluno();
  const { toast } = useToast();
  const queryClientHook = useQueryClient();

  const [videoModalUrl, setVideoModalUrl] = useState<string | null>(null);
  const [exerciciosDoDiaParaRenderizar, setExerciciosDoDiaParaRenderizar] = useState<ExercicioRenderizavel[]>([]);
  const [diaDeTreinoAtivo, setDiaDeTreinoAtivo] = useState<DiaDeTreinoPopulado | null>(null);
  
  const [mostrarModalFeedback, setMostrarModalFeedback] = useState(false);
  const [novaSessaoConcluidaId, setNovaSessaoConcluidaId] = useState<string | null>(null);
  const [pseSelecionado, setPseSelecionado] = useState<OpcaoPSEFrontend | ''>('');
  const [comentarioAlunoModal, setComentarioAlunoModal] = useState('');

  const queryEnabled = !!rotinaIdUrl && !!diaIdUrl && !!aluno && !!tokenAluno;

  const {
    data: rotinaDetalhes, 
    isLoading: isLoadingRotina,
    error: errorRotina,
    refetch: refetchRotina,
  } = useQuery<RotinaDeTreinoAluno, Error>({ 
    queryKey: ['alunoRotinaDetalhe', rotinaIdUrl, aluno?.id, diaIdUrl],
    queryFn: async () => {
      if (!rotinaIdUrl || !aluno?.id) {
        throw new Error("ID da rotina ou do aluno não disponível para a query.");
      }
      try {
        const data = await apiRequest<RotinaDeTreinoAluno>('GET', `/api/aluno/minhas-rotinas/${rotinaIdUrl}`);
        return data;
      } catch (apiError) {
        console.error("[AlunoFichaDetalhePage] Erro na chamada API (apiRequest):", apiError);
        throw apiError;
      }
    },
    enabled: queryEnabled,
    staleTime: 1000 * 60 * 1, 
  });
  
  useEffect(() => {
    if (rotinaDetalhes && diaIdUrl) {
      const diaAtivo = rotinaDetalhes.diasDeTreino.find(d => d._id === diaIdUrl);
      setDiaDeTreinoAtivo(diaAtivo || null);

      if (diaAtivo) {
        const exerciciosFormatados = diaAtivo.exerciciosDoDia
          .filter(ex => ex.exercicioId && typeof ex.exercicioId === 'object') 
          .map((ex): ExercicioRenderizavel => ({
            _id: ex._id, 
            exercicioDetalhes: ex.exercicioId as ExercicioDetalhePopulado,
            series: ex.series,
            repeticoes: ex.repeticoes,
            carga: ex.carga,
            descanso: ex.descanso,
            observacoes: ex.observacoes,
            ordemNoDia: ex.ordemNoDia,
            concluido: false, 
          }))
          .sort((a, b) => a.ordemNoDia - b.ordemNoDia);
        setExerciciosDoDiaParaRenderizar(exerciciosFormatados);
      } else {
        setExerciciosDoDiaParaRenderizar([]);
      }
    }
  }, [rotinaDetalhes, diaIdUrl, rotinaIdUrl]);

  const finalizarDiaDeTreinoMutation = useMutation<ConcluirSessaoResponse, Error, ConcluirSessaoPayload>({
    mutationFn: async (payload) => {
      return apiRequest<ConcluirSessaoResponse>('POST', `/api/aluno/sessoes/concluir-dia`, payload);
    },
    onSuccess: (data) => {
        toast({ title: "Dia de Treino Concluído!", description: "Ótimo trabalho! Agora, conte-nos como foi." });
        setNovaSessaoConcluidaId(data._id);
        setPseSelecionado(data.pseAluno || '');
        setComentarioAlunoModal(data.comentarioAluno || '');
        setMostrarModalFeedback(true);
    },
    onError: (error) => {
      toast({ title: "Erro ao Finalizar Treino", description: error.message, variant: "destructive" });
      setMostrarModalFeedback(false);
    },
  });

  const atualizarFeedbackSessaoMutation = useMutation<ConcluirSessaoResponse, Error, ConcluirSessaoPayload & { sessaoId: string }>({
    mutationFn: async (payload) => {
      return apiRequest<ConcluirSessaoResponse>('PATCH', `/api/aluno/sessoes/${payload.sessaoId}/feedback`, {
        pseAluno: payload.pseAluno,
        comentarioAluno: payload.comentarioAluno,
      });
    },
    onSuccess: () => {
        toast({ title: "Feedback Enviado!", description: "Obrigado pelo seu feedback!" });
        setMostrarModalFeedback(false);
        queryClientHook.invalidateQueries({ queryKey: ['frequenciaSemanalAluno', aluno?.id] });
        queryClientHook.invalidateQueries({ queryKey: ['minhasRotinasAluno', aluno?.id] }); 
        queryClientHook.invalidateQueries({ queryKey: ['alunoRotinaDetalhe', rotinaIdUrl, aluno?.id] });
        queryClientHook.invalidateQueries({ queryKey: ['meuHistoricoSessoes', aluno?.id] }); 
        setTimeout(() => { navigateWouter('/aluno/dashboard'); }, 1500);
    },
    onError: (error) => {
        toast({ title: "Erro ao Enviar Feedback", description: error.message, variant: "destructive"});
    }
  });

  const handleToggleExercicioConcluido = (exercicioRenderizavelId: string) => {
    setExerciciosDoDiaParaRenderizar(prevExercicios =>
      prevExercicios.map(ex =>
        ex._id === exercicioRenderizavelId
          ? { ...ex, concluido: !ex.concluido }
          : ex
      )
    );
  };

  const totalExercicios = exerciciosDoDiaParaRenderizar.length;
  const exerciciosConcluidosCount = exerciciosDoDiaParaRenderizar.filter(ex => ex.concluido).length;

  const handleFinalizarTreinoDia = () => {
    if (!rotinaIdUrl || !diaIdUrl) {
      toast({ title: "Erro", description: "Informações da rotina ou dia de treino ausentes."});
      return;
    }
    if (totalExercicios > 0 && exerciciosConcluidosCount < totalExercicios) {
        const confirmar = window.confirm(`Você ainda não marcou todos os exercícios como concluídos (${exerciciosConcluidosCount}/${totalExercicios}). Deseja finalizar o treino do dia mesmo assim?`);
        if (!confirmar) return;
    }
    finalizarDiaDeTreinoMutation.mutate({ rotinaId: rotinaIdUrl, diaDeTreinoId: diaIdUrl });
  };

  const handleEnviarFeedback = () => {
    if (!novaSessaoConcluidaId) { 
        toast({ title: "Erro", description: "Não foi possível identificar a sessão para adicionar feedback."});
        return;
    }
    atualizarFeedbackSessaoMutation.mutate({ 
        sessaoId: novaSessaoConcluidaId,
        rotinaId: rotinaIdUrl!, 
        diaDeTreinoId: diaIdUrl!,
        pseAluno: pseSelecionado || null,
        comentarioAluno: comentarioAlunoModal.trim() || null,
    });
  };

  const abrirVideo = (url?: string) => {
    if (url) {
      let videoUrlParaModal = url;
      if (url.includes("youtube.com/watch?v=")) {
        videoUrlParaModal = url.replace("watch?v=", "embed/");
      } else if (url.includes("youtu.be/")) {
         const videoId = url.split("youtu.be/")[1]?.split("?")[0];
         if (videoId) videoUrlParaModal = `https://www.youtube.com/embed/${videoId}`;
      } else if (url.includes("drive.google.com/file/d/")) {
        const id = url.split("/d/")[1]?.split("/")[0];
        if (id) videoUrlParaModal = `https://drive.google.com/file/d/${id}/preview`;
      }
      setVideoModalUrl(videoUrlParaModal);
    } else {
      toast({ title: "Vídeo não disponível", description: "Não há URL de vídeo para este exercício." });
    }
  };

  if (isLoadingRotina && queryEnabled) { 
    return ( <div className="flex flex-col items-center justify-center min-h-[calc(100vh-200px)] p-4"> <Loader2 className="h-12 w-12 animate-spin text-primary mb-4" /> <p className="text-lg text-gray-700 dark:text-gray-300">A carregar detalhes da rotina...</p> </div> );
  }
  if (queryEnabled && errorRotina) { 
    return ( <div className="container mx-auto p-4 md:p-6 lg:p-8 text-center"> <WouterLink href="/aluno/dashboard"> <Button variant="outline" className="mb-6"> <ArrowLeft className="w-4 h-4 mr-2" /> Voltar para o Painel </Button> </WouterLink> <Card className="max-w-2xl mx-auto border-red-200 dark:border-red-700 bg-red-50 dark:bg-red-900/30"> <CardHeader> <CardTitle className="text-xl text-red-700 dark:text-red-400 flex items-center justify-center"> <AlertTriangle className="w-6 h-6 mr-2"/> Erro ao Carregar Rotina </CardTitle> </CardHeader> <CardContent> <p>{errorRotina.message || "Não foi possível carregar os detalhes desta rotina de treino."}</p> <Button onClick={() => refetchRotina()} className="mt-4"> <RefreshCw className="w-4 h-4 mr-2"/> Tentar Novamente </Button> </CardContent> </Card> </div> );
  }
  if ((!queryEnabled && !isLoadingRotina) || (queryEnabled && !isLoadingRotina && !rotinaDetalhes)) { 
    return ( <div className="container mx-auto p-4 md:p-6 lg:p-8 text-center"> <WouterLink href="/aluno/dashboard"> <Button variant="outline" className="mb-6"> <ArrowLeft className="w-4 h-4 mr-2" /> Voltar para o Painel </Button> </WouterLink> <p className="text-lg text-muted-foreground py-10"> {!queryEnabled ? "Não foi possível iniciar o carregamento da rotina/dia." : "Rotina de treino não encontrada."} </p> </div> );
  }
  if (rotinaDetalhes && diaIdUrl && !diaDeTreinoAtivo) {
     return ( <div className="container mx-auto p-4 md:p-6 lg:p-8 text-center"> <WouterLink href="/aluno/dashboard"> <Button variant="outline" className="mb-6"> <ArrowLeft className="w-4 h-4 mr-2" /> Voltar para o Painel </Button> </WouterLink> <Card className="max-w-2xl mx-auto border-orange-200 dark:border-orange-700 bg-orange-50 dark:bg-orange-900/30"> <CardHeader> <CardTitle className="text-xl text-orange-700 dark:text-orange-400 flex items-center justify-center"> <InfoIcon className="w-6 h-6 mr-2"/> Dia de Treino Inválido </CardTitle> </CardHeader> <CardContent> <p>O dia de treino especificado (ID: {diaIdUrl}) não foi encontrado nesta rotina. Verifique o link ou selecione outro dia no painel.</p> </CardContent> </Card> </div> );
  }
  if (!rotinaDetalhes || !diaDeTreinoAtivo) {
    return ( <div className="container mx-auto p-4 md:p-6 lg:p-8 text-center"> <WouterLink href="/aluno/dashboard"> <Button variant="outline" className="mb-6"> <ArrowLeft className="w-4 h-4 mr-2" /> Voltar para o Painel </Button> </WouterLink> <p className="text-lg text-muted-foreground py-10"> Aguardando dados... </p> </div> );
  }

  const progressoPercentual = totalExercicios > 0 ? Math.round((exerciciosConcluidosCount / totalExercicios) * 100) : 0;

  return (
    <div className="container mx-auto py-6 px-2 sm:px-4 md:px-6 lg:px-8">
      <div className="mb-6 flex justify-between items-center">
        <WouterLink href="/aluno/dashboard">
          <Button variant="outline" size="sm" className="text-sm"> <ArrowLeft className="w-4 h-4 mr-2" /> Voltar </Button>
        </WouterLink>
      </div>

      <Card className="shadow-xl border dark:border-gray-700">
        <CardHeader className="pb-4">
          <CardTitle className="text-2xl sm:text-3xl font-bold text-primary flex items-center gap-3"> 
            <ListChecks className="w-8 h-8" /> 
            {rotinaDetalhes.titulo}
          </CardTitle>
          <CardDescription className="pt-1 text-lg">
            Dia: <strong>{diaDeTreinoAtivo.identificadorDia}</strong>
            {diaDeTreinoAtivo.nomeSubFicha && ` - ${diaDeTreinoAtivo.nomeSubFicha}`}
          </CardDescription>
          {rotinaDetalhes.descricao && (<p className="pt-1 text-sm text-muted-foreground"> {rotinaDetalhes.descricao} </p>)}
          
          {totalExercicios > 0 && (
            <div className="mt-4">
                <Label className="text-sm font-medium">Progresso do Dia: {progressoPercentual}% ({exerciciosConcluidosCount}/{totalExercicios})</Label>
                <div className="w-full bg-gray-200 dark:bg-gray-700 rounded-full h-2.5 mt-1">
                    <div className="bg-green-500 h-2.5 rounded-full transition-all duration-300 ease-out" style={{ width: `${progressoPercentual}%` }}></div>
                </div>
            </div>
          )}
        </CardHeader>

        <CardContent className="pt-2">
          <h3 className="text-xl font-semibold mb-4 mt-2 text-gray-700 dark:text-gray-300 flex items-center"> <Dumbbell className="w-5 h-5 mr-2" /> Exercícios do Dia </h3>
          {exerciciosDoDiaParaRenderizar.length > 0 ? (
            <Accordion type="multiple" className="w-full space-y-3">
              {exerciciosDoDiaParaRenderizar.map((ex) => {
                  const nomeEx = ex.exercicioDetalhes.nome;
                  const grupoMuscular = ex.exercicioDetalhes.grupoMuscular;
                  const urlVideo = ex.exercicioDetalhes.urlVideo;
                  const descricaoGeralExercicio = ex.exercicioDetalhes.descricao;
                  return ( <AccordionItem key={ex._id} value={ex._id} className={`border rounded-lg shadow-sm transition-all overflow-hidden ${ ex.concluido ? 'opacity-90 dark:opacity-80 border-green-500 dark:border-green-600 bg-green-50 dark:bg-green-900/30' : 'bg-white dark:bg-gray-800/60 dark:border-gray-700' }`}> <AccordionTrigger className={`px-4 py-3 hover:no-underline text-sm w-full ${ ex.concluido ? 'hover:bg-green-100/70 dark:hover:bg-green-800/50' : 'hover:bg-slate-50 dark:hover:bg-gray-700/70' } rounded-none`}> <div className="flex items-center justify-between w-full"> <div className="flex items-center flex-1 min-w-0"> <Button variant="ghost" size="icon" className={`h-8 w-8 mr-3 shrink-0 ${ ex.concluido ? 'text-green-700 dark:text-green-400 hover:text-green-800 dark:hover:text-green-300' : 'text-gray-400 hover:text-primary dark:hover:text-sky-400' }`} onClick={(e) => { e.stopPropagation(); handleToggleExercicioConcluido(ex._id);}} title={ex.concluido ? "Desmarcar como feito" : "Marcar como feito"} > {ex.concluido ? <CheckSquare className="w-5 h-5" /> : <Square className="w-5 h-5" />} </Button> <div className="flex-1 truncate"> <span className={`font-medium ${ ex.concluido ? 'line-through text-gray-600 dark:text-gray-400' : 'text-gray-800 dark:text-gray-100' }`}> {nomeEx} </span> {(ex.series || ex.repeticoes) && ( <span className={`ml-2 text-xs ${ ex.concluido ? 'text-gray-500 dark:text-gray-500' : 'text-blue-600 dark:text-blue-400' }`}> ({ex.series || '?'}{ex.series && ex.repeticoes ? 'x' : ''}{ex.repeticoes || '?'}) </span> )} </div> </div> {urlVideo ? ( <Button variant="ghost" size="icon" className="h-8 w-8 text-red-500 hover:text-red-600 mx-2 shrink-0" onClick={(e) => { e.stopPropagation(); abrirVideo(urlVideo); }} title="Ver vídeo"> <PlayCircle className="w-5 h-5" /> </Button> ) : ( <Button variant="ghost" size="icon" className="h-8 w-8 text-gray-400 cursor-not-allowed mx-2 shrink-0" title="Vídeo não disponível" disabled> <VideoOff className="w-5 h-5" /> </Button> )} </div> </AccordionTrigger> <AccordionContent className={`px-4 pt-0 pb-4 ${ex.concluido ? 'bg-green-50/50 dark:bg-green-900/10' : 'bg-transparent'}`}> <div className="pt-3 border-t dark:border-gray-600 space-y-1.5 text-xs text-muted-foreground dark:text-gray-400"> {grupoMuscular && <p><strong>Grupo Muscular:</strong> {grupoMuscular}</p>} {descricaoGeralExercicio && <p><strong>Descrição do Exercício:</strong> {descricaoGeralExercicio}</p>} {ex.series && <p><strong>Séries:</strong> {ex.series}</p>} {ex.repeticoes && <p><strong>Repetições:</strong> {ex.repeticoes}</p>} {ex.carga && <p><strong>Carga:</strong> {ex.carga}</p>} {ex.descanso && <p><strong>Descanso:</strong> {ex.descanso}</p>} {ex.observacoes && <p className="mt-1 pt-1 border-t dark:border-gray-700"><strong>Obs. para esta ficha:</strong> {ex.observacoes}</p>} {(!grupoMuscular && !descricaoGeralExercicio && !ex.series && !ex.repeticoes && !ex.carga && !ex.descanso && !ex.observacoes) && ( <p className="italic">Nenhum detalhe adicional para este exercício.</p> )} </div> </AccordionContent> </AccordionItem> );
              })}
            </Accordion>
          ) : ( <p className="text-sm text-muted-foreground text-center py-6"> {isLoadingRotina ? "A carregar exercícios..." : (diaDeTreinoAtivo ? "Nenhum exercício encontrado para este dia de treino." : "Selecione um dia de treino.") } </p> )}
        </CardContent>

        <CardFooter className="pt-6 border-t dark:border-gray-700 flex flex-col sm:flex-row justify-center items-center gap-2">
            <Button 
                onClick={handleFinalizarTreinoDia} 
                disabled={finalizarDiaDeTreinoMutation.isPending || atualizarFeedbackSessaoMutation.isPending}
                className="w-full sm:w-auto bg-green-600 hover:bg-green-700 text-white"
                size="lg"
            >
                {(finalizarDiaDeTreinoMutation.isPending && !(finalizarDiaDeTreinoMutation.variables?.pseAluno || finalizarDiaDeTreinoMutation.variables?.comentarioAluno)) 
                    ? <Loader2 className="w-5 h-5 mr-2 animate-spin" /> 
                    : <Zap className="w-5 h-5 mr-2" />
                }
                Finalizar Treino do Dia
            </Button>
        </CardFooter>
      </Card>
      <VideoPlayerModal videoUrl={videoModalUrl} onClose={() => setVideoModalUrl(null)} />

      <Dialog open={mostrarModalFeedback} onOpenChange={(isOpen) => {
        if (!isOpen && !atualizarFeedbackSessaoMutation.isPending && novaSessaoConcluidaId) { 
            setMostrarModalFeedback(false); 
            setPseSelecionado('');
            setComentarioAlunoModal('');
            setNovaSessaoConcluidaId(null); 
            queryClientHook.invalidateQueries({ queryKey: ['frequenciaSemanalAluno', aluno?.id] });
            queryClientHook.invalidateQueries({ queryKey: ['minhasRotinasAluno', aluno?.id] });
            queryClientHook.invalidateQueries({ queryKey: ['meuHistoricoSessoes', aluno?.id] });
            setTimeout(() => { navigateWouter('/aluno/dashboard'); }, 300);
        } else if (isOpen) {
            setMostrarModalFeedback(true);
        }
      }}>
        <DialogContent className="sm:max-w-[480px]">
          <DialogHeader>
            <DialogTitle className="flex items-center"> <Smile className="w-6 h-6 mr-2 text-primary" /> Feedback do Treino </DialogTitle>
            <DialogDescription> Parabéns por concluir seu treino! Como você se sentiu? Seu feedback é importante. </DialogDescription>
          </DialogHeader>
          <div className="grid gap-4 py-4">
            <div className="grid grid-cols-4 items-center gap-4">
              <Label htmlFor="pse" className="text-right col-span-1">PSE</Label>
              <Select value={pseSelecionado} onValueChange={(value) => setPseSelecionado(value as OpcaoPSEFrontend)}>
                <SelectTrigger className="col-span-3" id="pse"> <SelectValue placeholder="Como se sentiu?" /> </SelectTrigger>
                <SelectContent> {OPCOES_PSE_FRONTEND.map(opcao => ( <SelectItem key={opcao} value={opcao}>{opcao}</SelectItem> ))} </SelectContent>
              </Select>
            </div>
            <div className="grid grid-cols-4 items-center gap-4">
              <Label htmlFor="comentario" className="text-right col-span-1 self-start pt-2">Comentários</Label>
              <Textarea id="comentario" placeholder="Deixe aqui suas observações..." className="col-span-3 min-h-[100px]" value={comentarioAlunoModal} onChange={(e) => setComentarioAlunoModal(e.target.value)} />
            </div>
          </div>
          <DialogFooter className="gap-2 sm:gap-0">
            <DialogClose asChild>
                <Button type="button" variant="outline" disabled={atualizarFeedbackSessaoMutation.isPending}>
                    Pular
                </Button>
            </DialogClose>
            <Button type="button" onClick={handleEnviarFeedback} disabled={atualizarFeedbackSessaoMutation.isPending}>
              {atualizarFeedbackSessaoMutation.isPending ? <Loader2 className="w-4 h-4 mr-2 animate-spin" /> : <MessageSquare className="w-4 h-4 mr-2" />}
              Enviar Feedback
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
};

export default AlunoFichaDetalhePage;