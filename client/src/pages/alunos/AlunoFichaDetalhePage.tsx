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
import { Textarea } from "@/components/ui/textarea"; // IMPORTADO
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select"; // IMPORTADO
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription, DialogFooter, DialogClose } from "@/components/ui/dialog"; // IMPORTADO
import { Loader2, ArrowLeft, ListChecks, Dumbbell, CheckSquare, Square, AlertTriangle, PlayCircle, VideoOff, RefreshCw, Zap, MessageSquare, Smile } from 'lucide-react'; // IMPORTADO MessageSquare, Smile
import { format, parseISO } from 'date-fns';
import { ptBR } from 'date-fns/locale';
import VideoPlayerModal from '@/components/dialogs/VideoPlayerModal';
import { useToast } from '@/hooks/use-toast';

// Definição das opções de PSE para o frontend
const OPCOES_PSE_FRONTEND = [
    'Muito Leve', 
    'Leve', 
    'Moderado', 
    'Intenso', 
    'Muito Intenso', 
    'Máximo Esforço'
] as const;
type OpcaoPSEFrontend = typeof OPCOES_PSE_FRONTEND[number];

interface ExercicioPopulado {
  _id: string;
  nome: string;
  grupoMuscular?: string;
  urlVideo?: string;
  descricao?: string;
  categoria?: string;
  tipo?: string;
}

interface ExercicioDetalhado {
  _id?: string;
  exercicioId: ExercicioPopulado | string | null;
  series?: string;
  repeticoes?: string;
  carga?: string;
  descanso?: string;
  observacoes?: string;
  ordem?: number;
  concluido?: boolean;
}

interface FichaTreinoDetalhada {
  _id: string;
  titulo: string;
  descricao?: string;
  criadorId?: { _id: string; nome?: string; } | null;
  exercicios: ExercicioDetalhado[];
  criadoEm: string;
  atualizadoEm?: string;
  status?: "ativo" | "rascunho" | "arquivado";
}

type ExercicioRenderizavel = Omit<ExercicioDetalhado, 'exercicioId' | '_id'> & { 
  _id: string; 
  exercicioId: ExercicioPopulado; 
  concluido: boolean;
};

interface ToggleExercicioPayload {
  fichaId: string;
  exercicioFichaId: string;
}

// Interface para a resposta da API de concluir sessão, incluindo feedback opcional
interface ConcluirSessaoResponse {
  _id: string;
  status: string;
  concluidaEm: string;
  pseAluno?: OpcaoPSEFrontend | null;
  comentarioAluno?: string | null;
  message?: string; // Para mensagens como "Feedback atualizado"
  sessao?: ConcluirSessaoResponse; // Para quando a sessão já estava concluída
}

// Payload para a mutação de concluir sessão, agora com campos de feedback opcionais
interface ConcluirSessaoPayload {
  sessaoId: string;
  pseAluno?: OpcaoPSEFrontend | null;
  comentarioAluno?: string | null;
}


const AlunoFichaDetalhePage: React.FC = () => {
  const params = useParams<{ fichaId?: string }>();
  const fichaIdUrl = params.fichaId;
  const { aluno, tokenAluno } = useAluno();
  const { toast } = useToast();
  const queryClientHook = useQueryClient();
  const [location, navigate] = useLocation();

  const [videoModalUrl, setVideoModalUrl] = useState<string | null>(null);
  const [exerciciosParaRenderizar, setExerciciosParaRenderizar] = useState<ExercicioRenderizavel[]>([]);
  
  // Estados para o modal de feedback
  const [mostrarModalFeedback, setMostrarModalFeedback] = useState(false);
  const [sessaoConcluidaIdParaFeedback, setSessaoConcluidaIdParaFeedback] = useState<string | null>(null);
  const [pseSelecionado, setPseSelecionado] = useState<OpcaoPSEFrontend | ''>('');
  const [comentarioAlunoModal, setComentarioAlunoModal] = useState('');


  const sessaoId = useMemo(() => {
    const searchParams = new URLSearchParams(window.location.search);
    return searchParams.get('sessaoId');
  }, [location]);

  const queryEnabled = !!fichaIdUrl && !!aluno && !!tokenAluno;

  const {
    data: fichaDetalhes,
    isLoading: isLoadingFicha,
    error: errorFicha,
    refetch: refetchFicha
  } = useQuery<FichaTreinoDetalhada, Error, FichaTreinoDetalhada, readonly ['minhaFichaDetalhe', string | undefined, string | undefined]>({
    queryKey: ['minhaFichaDetalhe', fichaIdUrl, aluno?.id],
    queryFn: async () => {
      if (!fichaIdUrl || !aluno?.id) {
        throw new Error("ID da ficha ou do aluno não disponível para a query.");
      }
      return apiRequest<FichaTreinoDetalhada>('GET', `/api/aluno/minha-ficha/${fichaIdUrl}`);
    },
    enabled: queryEnabled,
    staleTime: 1000 * 60 * 1,
  });

  const toggleExercicioMutation = useMutation<
    { message: string; exercicioAtualizado: ExercicioRenderizavel },
    Error,
    ToggleExercicioPayload
  >({
    mutationFn: async (payload) => {
      return apiRequest<{ message: string; exercicioAtualizado: ExercicioRenderizavel }>(
        'PATCH',
        `/api/aluno/ficha/${payload.fichaId}/exercicio/${payload.exercicioFichaId}/toggle-concluido`
      );
    },
    onSuccess: (data, variables) => {
      toast({ title: "Sucesso!", description: data.message });
      setExerciciosParaRenderizar(prevExercicios =>
        prevExercicios.map(ex =>
          ex._id === variables.exercicioFichaId
            ? { ...ex, concluido: data.exercicioAtualizado.concluido }
            : ex
        )
      );
      queryClientHook.invalidateQueries({ queryKey: ['meusTreinosAluno', aluno?.id] });
    },
    onError: (error) => {
      toast({
        title: "Erro ao atualizar exercício",
        description: error.message || "Não foi possível atualizar o status do exercício.",
        variant: "destructive",
      });
    },
  });
  
  const concluirSessaoMutation = useMutation<ConcluirSessaoResponse, Error, ConcluirSessaoPayload>({
    mutationFn: async (payload) => {
      if (!payload.sessaoId) throw new Error("ID da sessão não fornecido.");
      const body: Partial<ConcluirSessaoPayload> = {}; // Enviar apenas os campos de feedback se existirem
      if (payload.pseAluno !== undefined) body.pseAluno = payload.pseAluno;
      if (payload.comentarioAluno !== undefined) body.comentarioAluno = payload.comentarioAluno;
      
      return apiRequest<ConcluirSessaoResponse>('PATCH', `/api/aluno/sessoes/${payload.sessaoId}/concluir`, body);
    },
    onSuccess: (data, variables) => {
      // Se foi a primeira chamada (payload não continha feedback), então abre o modal
      if (variables.pseAluno === undefined && variables.comentarioAluno === undefined) {
        if (data.message === 'Sessão já estava concluída.' && data.sessao) { // Se já estava concluída, mas queremos dar feedback
             toast({ title: "Sessão já concluída", description: "Você pode adicionar ou atualizar seu feedback."});
             setSessaoConcluidaIdParaFeedback(variables.sessaoId);
             setPseSelecionado(data.sessao.pseAluno || '');
             setComentarioAlunoModal(data.sessao.comentarioAluno || '');
             setMostrarModalFeedback(true);
        } else if (data.status === 'completed') {
            toast({ title: "Treino Marcado como Concluído!", description: "Agora, conte-nos como foi." });
            setSessaoConcluidaIdParaFeedback(variables.sessaoId);
            setPseSelecionado(''); // Limpa campos para novo feedback
            setComentarioAlunoModal('');
            setMostrarModalFeedback(true);
        }
      } else { // Se foi a chamada COM feedback (do modal)
        toast({
          title: "Feedback Enviado!",
          description: data.message || "Seu feedback foi registrado com sucesso.",
        });
        setMostrarModalFeedback(false);
        queryClientHook.invalidateQueries({ queryKey: ['sessoesAgendadasAluno', aluno?.id] });
        queryClientHook.invalidateQueries({ queryKey: ['frequenciaSemanalAluno', aluno?.id] });
        setTimeout(() => { navigate('/aluno/dashboard'); }, 1500);
      }
    },
    onError: (error) => {
      toast({
        title: "Erro",
        description: error.message || "Não foi possível atualizar a sessão.",
        variant: "destructive",
      });
      setMostrarModalFeedback(false);
    },
  });

  useEffect(() => {
    if (fichaDetalhes && fichaDetalhes.exercicios) {
      const exerciciosValidos = fichaDetalhes.exercicios
        .filter((ex): ex is Omit<ExercicioDetalhado, 'exercicioId' | '_id'> & { _id: string; exercicioId: ExercicioPopulado; } => {
          return !!ex._id && ex.exercicioId !== null && typeof ex.exercicioId === 'object' && '_id' in ex.exercicioId && 'nome' in ex.exercicioId;
        })
        .map((ex): ExercicioRenderizavel => ({
          ...ex,
          exercicioId: ex.exercicioId as ExercicioPopulado,
          concluido: ex.concluido ?? false,
        }));
      setExerciciosParaRenderizar(exerciciosValidos);
    } else if (fichaDetalhes && (!fichaDetalhes.exercicios || fichaDetalhes.exercicios.length === 0)) {
      setExerciciosParaRenderizar([]);
    }
  }, [fichaDetalhes]);

  const handleToggleExercicioConcluido = (exercicioFichaItemId?: string) => {
    if (!exercicioFichaItemId || !fichaIdUrl) return;
    toggleExercicioMutation.mutate({ fichaId: fichaIdUrl, exercicioFichaId: exercicioFichaItemId });
  };

  const totalExercicios = exerciciosParaRenderizar.length;
  const exerciciosConcluidosCount = exerciciosParaRenderizar.filter(ex => ex.concluido).length;

  const handleFinalizarTreino = () => {
    if (!sessaoId) {
      toast({ title: "Ação não disponível", description: "Não há uma sessão ativa associada a este treino para finalizar."});
      return;
    }
    if (totalExercicios > 0 && exerciciosConcluidosCount < totalExercicios) {
        const confirmar = window.confirm(`Você ainda não marcou todos os exercícios como concluídos (${exerciciosConcluidosCount}/${totalExercicios}). Deseja finalizar o treino mesmo assim?`);
        if (!confirmar) return;
    }
    // Primeira chamada: apenas para marcar como concluído, sem enviar dados de feedback no payload inicial
    concluirSessaoMutation.mutate({ sessaoId });
  };

  const handleEnviarFeedback = () => {
    if (!sessaoConcluidaIdParaFeedback) return;
    concluirSessaoMutation.mutate({
      sessaoId: sessaoConcluidaIdParaFeedback,
      pseAluno: pseSelecionado || null,
      comentarioAluno: comentarioAlunoModal.trim() || null,
    });
  };

  const formatarDataSimples = (dataISO?: string): string => {
    if (!dataISO) return 'N/A';
    try { return format(parseISO(dataISO), "dd/MM/yyyy", { locale: ptBR }); }
    catch (e) { return 'Data inválida'; }
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

  if (isLoadingFicha) { /* ... JSX do Loading ... */ 
    return ( <div className="flex flex-col items-center justify-center min-h-[calc(100vh-200px)] p-4"> <Loader2 className="h-12 w-12 animate-spin text-primary mb-4" /> <p className="text-lg text-gray-700 dark:text-gray-300">A carregar detalhes da ficha...</p> </div> );
  }
  if (errorFicha) { /* ... JSX do Erro ... */ 
    return ( <div className="container mx-auto p-4 md:p-6 lg:p-8 text-center"> <WouterLink href="/aluno/dashboard"> <Button variant="outline" className="mb-6"> <ArrowLeft className="w-4 h-4 mr-2" /> Voltar para o Painel </Button> </WouterLink> <Card className="max-w-2xl mx-auto border-red-200 dark:border-red-700 bg-red-50 dark:bg-red-900/30"> <CardHeader> <CardTitle className="text-xl text-red-700 dark:text-red-400 flex items-center justify-center"> <AlertTriangle className="w-6 h-6 mr-2"/> Erro ao Carregar Ficha </CardTitle> </CardHeader> <CardContent> <p>{errorFicha.message || "Não foi possível carregar os detalhes desta ficha de treino."}</p> <Button onClick={() => refetchFicha()} className="mt-4"> <RefreshCw className="w-4 h-4 mr-2"/> Tentar Novamente </Button> </CardContent> </Card> </div> );
  }
  if (!fichaDetalhes) { /* ... JSX Ficha não encontrada ... */ 
    return ( <div className="container mx-auto p-4 md:p-6 lg:p-8 text-center"> <WouterLink href="/aluno/dashboard"> <Button variant="outline" className="mb-6"> <ArrowLeft className="w-4 h-4 mr-2" /> Voltar para o Painel </Button> </WouterLink> <p className="text-lg text-muted-foreground py-10"> {queryEnabled ? "Ficha de treino não encontrada ou dados ainda a carregar." : "Não foi possível iniciar o carregamento da ficha."} </p> </div> );
  }

  const progressoPercentual = totalExercicios > 0 ? Math.round((exerciciosConcluidosCount / totalExercicios) * 100) : 0;
  const podeFinalizarTreino = !!sessaoId && !concluirSessaoMutation.isPending;

  return (
    <div className="container mx-auto py-6 px-2 sm:px-4 md:px-6 lg:px-8">
      <div className="mb-6 flex justify-between items-center">
        <WouterLink href="/aluno/dashboard">
          <Button variant="outline" size="sm" className="text-sm"> <ArrowLeft className="w-4 h-4 mr-2" /> Voltar </Button>
        </WouterLink>
        <Button variant="outline" size="sm" onClick={() => refetchFicha()} disabled={isLoadingFicha || toggleExercicioMutation.isPending} title="Atualizar dados da ficha">
            <RefreshCw className={`w-4 h-4 mr-2 ${isLoadingFicha || toggleExercicioMutation.isPending ? 'animate-spin' : ''}`} /> Atualizar Ficha
        </Button>
      </div>

      <Card className="shadow-xl border dark:border-gray-700">
        <CardHeader className="pb-4">
          <CardTitle className="text-2xl sm:text-3xl font-bold text-primary flex items-center gap-3"> <ListChecks className="w-8 h-8" /> {fichaDetalhes.titulo} </CardTitle>
          {fichaDetalhes.descricao && (<CardDescription className="pt-1 text-base"> {fichaDetalhes.descricao} </CardDescription>)}
          <div className="text-xs text-muted-foreground pt-2 space-y-1">
            <p>Criada por: {fichaDetalhes.criadorId && typeof fichaDetalhes.criadorId === 'object' ? fichaDetalhes.criadorId.nome : 'Personal Trainer'}</p>
            <p>Última atualização: {formatarDataSimples(fichaDetalhes.atualizadoEm || fichaDetalhes.criadoEm)}</p>
          </div>
          {totalExercicios > 0 && (
            <div className="mt-3">
                <Label className="text-sm font-medium">Progresso da Ficha: {progressoPercentual}% ({exerciciosConcluidosCount}/{totalExercicios})</Label>
                <div className="w-full bg-gray-200 dark:bg-gray-700 rounded-full h-2.5 mt-1">
                    <div className="bg-green-500 h-2.5 rounded-full transition-all duration-300 ease-out" style={{ width: `${progressoPercentual}%` }}></div>
                </div>
            </div>
          )}
        </CardHeader>

        <CardContent className="pt-2">
          <h3 className="text-xl font-semibold mb-4 mt-2 text-gray-700 dark:text-gray-300 flex items-center"> <Dumbbell className="w-5 h-5 mr-2" /> Exercícios </h3>
          {exerciciosParaRenderizar.length > 0 ? (
            <Accordion type="multiple" className="w-full space-y-3">
              {exerciciosParaRenderizar.sort((a, b) => (a.ordem ?? Infinity) - (b.ordem ?? Infinity)).map((ex) => {
                  // ... (JSX do AccordionItem para cada exercício - sem alterações)
                  const nomeEx = ex.exercicioId.nome;
                  const grupoMuscular = ex.exercicioId.grupoMuscular;
                  const urlVideo = ex.exercicioId.urlVideo;
                  const descricaoGeralExercicio = ex.exercicioId.descricao;
                  return ( <AccordionItem key={ex._id} value={ex._id} className={`border rounded-lg shadow-sm transition-all overflow-hidden ${ ex.concluido ? 'opacity-90 dark:opacity-80 border-green-500 dark:border-green-600 bg-green-50 dark:bg-green-900/30' : 'bg-white dark:bg-gray-800/60 dark:border-gray-700' }`}> <AccordionTrigger className={`px-4 py-3 hover:no-underline text-sm w-full ${ ex.concluido ? 'hover:bg-green-100/70 dark:hover:bg-green-800/50' : 'hover:bg-slate-50 dark:hover:bg-gray-700/70' } rounded-none`}> <div className="flex items-center justify-between w-full"> <div className="flex items-center flex-1 min-w-0"> <Button variant="ghost" size="icon" className={`h-8 w-8 mr-3 shrink-0 ${ ex.concluido ? 'text-green-700 dark:text-green-400 hover:text-green-800 dark:hover:text-green-300' : 'text-gray-400 hover:text-primary dark:hover:text-sky-400' } ${toggleExercicioMutation.isPending && toggleExercicioMutation.variables?.exercicioFichaId === ex._id ? 'animate-pulse' : ''}`} onClick={(e) => { e.stopPropagation(); handleToggleExercicioConcluido(ex._id);}} title={ex.concluido ? "Desmarcar como feito" : "Marcar como feito"} disabled={toggleExercicioMutation.isPending && toggleExercicioMutation.variables?.exercicioFichaId === ex._id} > {toggleExercicioMutation.isPending && toggleExercicioMutation.variables?.exercicioFichaId === ex._id ? <Loader2 className="w-5 h-5 animate-spin"/> : (ex.concluido ? <CheckSquare className="w-5 h-5" /> : <Square className="w-5 h-5" /> )} </Button> <div className="flex-1 truncate"> <span className={`font-medium ${ ex.concluido ? 'line-through text-gray-600 dark:text-gray-400' : 'text-gray-800 dark:text-gray-100' }`}> {nomeEx} </span> {(ex.series || ex.repeticoes) && ( <span className={`ml-2 text-xs ${ ex.concluido ? 'text-gray-500 dark:text-gray-500' : 'text-blue-600 dark:text-blue-400' }`}> ({ex.series || '?'}{ex.series && ex.repeticoes ? 'x' : ''}{ex.repeticoes || '?'}) </span> )} </div> </div> {urlVideo ? ( <Button variant="ghost" size="icon" className="h-8 w-8 text-red-500 hover:text-red-600 mx-2 shrink-0" onClick={(e) => { e.stopPropagation(); abrirVideo(urlVideo); }} title="Ver vídeo"> <PlayCircle className="w-5 h-5" /> </Button> ) : ( <Button variant="ghost" size="icon" className="h-8 w-8 text-gray-400 cursor-not-allowed mx-2 shrink-0" title="Vídeo não disponível" disabled> <VideoOff className="w-5 h-5" /> </Button> )} </div> </AccordionTrigger> <AccordionContent className={`px-4 pt-0 pb-4 ${ex.concluido ? 'bg-green-50/50 dark:bg-green-900/10' : 'bg-transparent'}`}> <div className="pt-3 border-t dark:border-gray-600 space-y-1.5 text-xs text-muted-foreground dark:text-gray-400"> {grupoMuscular && <p><strong>Grupo Muscular:</strong> {grupoMuscular}</p>} {descricaoGeralExercicio && <p><strong>Descrição do Exercício:</strong> {descricaoGeralExercicio}</p>} {ex.series && <p><strong>Séries:</strong> {ex.series}</p>} {ex.repeticoes && <p><strong>Repetições:</strong> {ex.repeticoes}</p>} {ex.carga && <p><strong>Carga:</strong> {ex.carga}</p>} {ex.descanso && <p><strong>Descanso:</strong> {ex.descanso}</p>} {ex.observacoes && <p className="mt-1 pt-1 border-t dark:border-gray-700"><strong>Obs. para esta ficha:</strong> {ex.observacoes}</p>} {(!grupoMuscular && !descricaoGeralExercicio && !ex.series && !ex.repeticoes && !ex.carga && !ex.descanso && !ex.observacoes) && ( <p className="italic">Nenhum detalhe adicional para este exercício.</p> )} </div> </AccordionContent> </AccordionItem> );
              })}
            </Accordion>
          ) : ( <p className="text-sm text-muted-foreground text-center py-6"> {isLoadingFicha ? "A carregar exercícios..." : "Nenhum exercício encontrado nesta ficha."} </p> )}
        </CardContent>

        {sessaoId && (
            <CardFooter className="pt-6 border-t dark:border-gray-700 flex flex-col sm:flex-row justify-center items-center gap-2">
                <Button 
                    onClick={handleFinalizarTreino} 
                    disabled={!podeFinalizarTreino}
                    className="w-full sm:w-auto bg-green-600 hover:bg-green-700 text-white"
                    size="lg"
                >
                    {concluirSessaoMutation.isPending && 
                     (!concluirSessaoMutation.variables?.pseAluno && !concluirSessaoMutation.variables?.comentarioAluno) 
                        ? <Loader2 className="w-5 h-5 mr-2 animate-spin" />
                        : <Zap className="w-5 h-5 mr-2" />
                    }
                    Finalizar Treino
                </Button>
            </CardFooter>
        )}
      </Card>
      <VideoPlayerModal videoUrl={videoModalUrl} onClose={() => setVideoModalUrl(null)} />

      <Dialog open={mostrarModalFeedback} onOpenChange={(isOpen) => {
        if (!isOpen && !concluirSessaoMutation.isSuccess) { // Se fechar sem ter enviado o feedback com sucesso
            setMostrarModalFeedback(false);
            setPseSelecionado('');
            setComentarioAlunoModal('');
            // Considerar se deve invalidar queries ou redirecionar aqui caso o usuário pule o feedback mas o treino já foi concluído
             queryClientHook.invalidateQueries({ queryKey: ['sessoesAgendadasAluno', aluno?.id] });
             queryClientHook.invalidateQueries({ queryKey: ['frequenciaSemanalAluno', aluno?.id] });
            setTimeout(() => { navigate('/aluno/dashboard'); }, 300);
        } else {
            // Se a mutação de feedback foi sucesso, o onSuccess dela já cuida do redirecionamento
            // e de fechar o modal. Só precisa controlar o estado de abertura aqui.
            setMostrarModalFeedback(isOpen); 
            if (!isOpen) { // Limpar campos se fechar após um envio bem sucedido
                setPseSelecionado('');
                setComentarioAlunoModal('');
            }
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
                <Button type="button" variant="outline">
                    {/* Se a mutação estiver carregando devido ao envio de feedback, não mostrar "Pular" */}
                    {!(concluirSessaoMutation.isPending && (concluirSessaoMutation.variables?.pseAluno || concluirSessaoMutation.variables?.comentarioAluno)) 
                        ? "Pular" 
                        : "Fechar"}
                </Button>
            </DialogClose>
            <Button type="button" onClick={handleEnviarFeedback} disabled={concluirSessaoMutation.isPending}>
              {concluirSessaoMutation.isPending && (concluirSessaoMutation.variables?.pseAluno || concluirSessaoMutation.variables?.comentarioAluno) 
                ? <Loader2 className="w-4 h-4 mr-2 animate-spin" /> : <MessageSquare className="w-4 h-4 mr-2" />
              }
              Enviar Feedback
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
};

export default AlunoFichaDetalhePage;