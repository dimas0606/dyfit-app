// client/src/components/dialogs/TreinoFormModal.tsx
import React, { useEffect, useState, useCallback } from "react";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogFooter,
  DialogDescription,
} from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Button } from "@/components/ui/button";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Textarea } from "@/components/ui/textarea";
import { Accordion, AccordionContent, AccordionItem, AccordionTrigger } from "@/components/ui/accordion";
import { Popover, PopoverContent, PopoverTrigger } from "@/components/ui/popover";
import { Calendar } from "@/components/ui/calendar";
import { Aluno } from "@/types/aluno"; // Ajuste o caminho se necessário
import { useToast } from "@/hooks/use-toast"; // Ajuste o caminho se necessário
import { apiRequest } from "@/lib/queryClient"; // Ajuste o caminho se necessário
import { useMutation, useQueryClient, useQuery } from "@tanstack/react-query";
import { PlusCircle, Trash2, Loader2, Folder as FolderIcon, Activity, Search, XCircle, CalendarIcon } from "lucide-react";
import SelectExerciseModal, { BibliotecaExercicio } from './SelectExerciseModal'; // Ajuste o caminho se necessário
import { useUser } from "@/context/UserContext"; // Ajuste o caminho se necessário
import { Pasta } from "@/pages/treinos"; // Ajuste o caminho se necessário
import { Badge } from "@/components/ui/badge";
import { format, parseISO, isValid as isDateValid, startOfToday } from 'date-fns';
import { ptBR } from 'date-fns/locale';

interface ExercicioAutocompleteItem {
  _id: string;
  nome: string;
  grupoMuscular?: string;
  isCustom: boolean;
}

export interface ExercicioItemFicha {
  exercicioId: string | { _id: string; nome: string; grupoMuscular?: string; } | null;
  nomeExercicio?: string;
  series?: string;
  repeticoes?: string;
  carga?: string;
  descanso?: string;
  observacoes?: string;
  ordem?: number;
  tempId?: string;
  _id?: string;
}

// Interface para a ficha/rotina como recebida da API ou para edição
interface FichaTreino {
  _id: string;
  titulo: string;
  descricao?: string;
  tipo: "modelo" | "individual";
  alunoId?: string | { _id: string; nome: string; } | null; // Pode ser objeto populado ou string
  criadorId?: string | { _id: string; nome: string; } | null; // Pode ser objeto populado ou string
  pastaId?: string | null; // Pode ser objeto populado ou string
  status?: "ativo" | "rascunho" | "arquivado";
  exercicios?: Array<{
    exercicioId: string | { _id: string; nome: string; grupoMuscular?: string; [key: string]: any; } | null; // Pode ser objeto populado ou string
    series?: string;
    repeticoes?: string;
    carga?: string;
    descanso?: string;
    observacoes?: string;
    ordem?: number;
    _id?: string; // ID do subdocumento exercício na ficha
  }>;
  dataValidade?: string | null; // ISO string
  numeroSessoesPlanejadas?: number | null;
  tipoOrganizacaoRotina?: 'diasDaSemana' | 'numerico' | 'livre'; // Campo para organização
  // diasDeTreino?: any[]; // Se for usar a estrutura completa de diasDeTreino, defina a interface aqui
  criadoEm?: string; // ISO string
  atualizadoEm?: string; // ISO string
}

interface TreinoFormModalProps {
  open: boolean;
  onClose: () => void;
  onSuccess: (fichaSalva: SavedFichaResponse) => void;
  alunos: Aluno[]; // Lista de alunos disponíveis
  fichaParaEditar?: FichaTreino | null;
  alunoId?: string; // ID do aluno se o modal for aberto no contexto de um aluno específico
}

// Interface para a resposta da API ao salvar/atualizar (pode ser mais específica)
interface SavedFichaResponse extends Omit<FichaTreino, 'exercicios' | 'alunoId' | 'criadorId' | 'pastaId'> {
  alunoId?: { _id: string; nome: string; } | null; // Espera-se que venha populado
  criadorId?: { _id: string; nome: string; } | null; // Espera-se que venha populado
  pastaId?: { _id: string; nome: string; } | null; // Espera-se que venha populado
  // tipoOrganizacaoRotina já está em FichaTreino
  exercicios: Array<{ // Garante que exercicioId dentro de exercicios seja um objeto populado
    exercicioId: { _id: string; nome: string; grupoMuscular?: string };
    series?: string; repeticoes?: string; carga?: string; descanso?: string; observacoes?: string; ordem?: number; _id?: string;
  }>;
}

// Interface para o payload enviado para a API
type FichaTreinoPayload = {
  titulo: string;
  descricao?: string;
  tipo: "modelo" | "individual";
  alunoId?: string; // Apenas ID
  criadorId: string; // Apenas ID
  pastaId?: string | null; // Apenas ID ou null
  status?: "ativo" | "rascunho" | "arquivado";
  dataValidade?: string | null; // ISO string ou null
  numeroSessoesPlanejadas?: number | null;
  tipoOrganizacaoRotina: 'diasDaSemana' | 'numerico' | 'livre'; // Obrigatório
  exercicios: Array<{ // Array de exercícios para a estrutura antiga (lista simples)
    exercicioId: string; // Apenas ID
    series?: string;
    repeticoes?: string;
    carga?: string;
    descanso?: string;
    observacoes?: string;
    ordem?: number;
  }>;
  // Se for implementar a estrutura de diasDeTreino diretamente aqui:
  // diasDeTreino?: Array<{
  //   identificadorDia: string;
  //   nomeSubFicha?: string;
  //   ordemNaRotina?: number;
  //   exerciciosDoDia: Array<{
  //     exercicioId: string; // Apenas ID
  //     series?: string;
  //     // ... outros campos do exercício no dia
  //   }>;
  // }>;
};


export default function TreinoFormModal(props: TreinoFormModalProps) {
  const {
    open,
    onClose,
    onSuccess,
    alunos: alunosProp, // Renomeado para evitar conflito com estado
    fichaParaEditar,
    alunoId: alunoIdInicial, // ID do aluno vindo das props (contexto)
  } = props;

  const { user } = useUser();
  const { toast } = useToast();
  const queryClient = useQueryClient();

  // Estados do formulário
  const [titulo, setTitulo] = useState("");
  const [descricao, setDescricao] = useState("");
  const [tipo, setTipo] = useState<"modelo" | "individual">("modelo");
  const [selectedAlunoId, setSelectedAlunoId] = useState<string | undefined>(undefined); // Para o select de aluno
  const [selectedPastaId, setSelectedPastaId] = useState<string | undefined | null>(undefined);
  const [statusFicha, setStatusFicha] = useState<"ativo" | "rascunho" | "arquivado">("rascunho");
  const [exerciciosDaFicha, setExerciciosDaFicha] = useState<ExercicioItemFicha[]>([]);
  
  const [dataValidade, setDataValidade] = useState<Date | undefined>(undefined);
  const [numeroSessoes, setNumeroSessoes] = useState<string>(""); // Mantido como string para input number
  
  // NOVO ESTADO PARA tipoOrganizacaoRotina
  const [tipoOrganizacaoRotina, setTipoOrganizacaoRotina] = useState<'diasDaSemana' | 'numerico' | 'livre'>('numerico');

  // Estados de UI e controle
  const [isSelectExerciseModalOpen, setIsSelectExerciseModalOpen] = useState(false);
  const [searchTermAutocomplete, setSearchTermAutocomplete] = useState("");
  const [sugestoesExercicios, setSugestoesExercicios] = useState<ExercicioAutocompleteItem[]>([]);
  const [isLoadingSugestoes, setIsLoadingSugestoes] = useState(false);
  const [showSugestoes, setShowSugestoes] = useState(false);

  const isEditing = !!fichaParaEditar;

  // Query para buscar alunos (se não vierem por prop ou se precisar de lista completa)
  const { data: alunosFetched = [], isLoading: isLoadingAlunosLista } = useQuery<Aluno[], Error>({
    queryKey: ["/api/alunos/treino-form-modal", tipo, alunoIdInicial],
    queryFn: async () => {
      // Se alunosProp já tem a lista e não estamos editando uma ficha individual de outro aluno, usa props.
      if (alunosProp && alunosProp.length > 0 && (!isEditing || tipo !== 'individual')) {
          return alunosProp;
      }
      // Senão, busca na API.
      const data = await apiRequest<Aluno[]>("GET", "/api/alunos");
      return Array.isArray(data) ? data : [];
    },
    enabled: props.open && tipo === 'individual' && !alunoIdInicial, // Habilita se for individual e não tiver alunoIdInicial
    staleTime: 1000 * 60 * 5, // 5 minutos
  });

  // Query para buscar pastas
  const { data: pastas = [], isLoading: isLoadingPastas } = useQuery<Pasta[], Error>({
    queryKey: ["/api/pastas/treinos"],
    queryFn: async () => {
      try {
        const data = await apiRequest<Pasta[]>("GET", "/api/pastas/treinos");
        return Array.isArray(data) ? data : [];
      } catch (e) {
        console.error("Erro ao buscar pastas no TreinoFormModal:", e);
        return [];
      }
    },
    enabled: props.open && tipo === 'modelo', // Habilita se for do tipo modelo
  });

  // Determina a lista de alunos a ser usada no select
  const alunosDisponiveis = alunoIdInicial ? alunosProp.filter(a => a._id === alunoIdInicial) : (alunosFetched.length > 0 ? alunosFetched : alunosProp);


  useEffect(() => {
    console.log("[TreinoFormModal Dialogs] Modal aberto/props mudaram. Ficha para editar:", fichaParaEditar, "AlunoIdInicial:", alunoIdInicial);
    if (props.open) {
      if (isEditing && fichaParaEditar) {
        setTitulo(fichaParaEditar.titulo);
        setDescricao(fichaParaEditar.descricao || "");
        setTipo(fichaParaEditar.tipo);
        
        // Tratar pastaId - pode ser string ou null
        setSelectedPastaId(fichaParaEditar.pastaId || null);

        setStatusFicha(fichaParaEditar.status || "rascunho");
        
        // Tratar dataValidade
        setDataValidade(fichaParaEditar.dataValidade && isDateValid(parseISO(fichaParaEditar.dataValidade)) ? parseISO(fichaParaEditar.dataValidade) : undefined);
        setNumeroSessoes(fichaParaEditar.numeroSessoesPlanejadas != null ? String(fichaParaEditar.numeroSessoesPlanejadas) : "");
        
        setTipoOrganizacaoRotina(fichaParaEditar.tipoOrganizacaoRotina || 'numerico');
        console.log("[TreinoFormModal Dialogs] Editando. tipoOrganizacaoRotina definido para:", fichaParaEditar.tipoOrganizacaoRotina || 'numerico');

        // Tratar alunoId - pode ser objeto populado ou string
        if (fichaParaEditar.alunoId) {
            setSelectedAlunoId(typeof fichaParaEditar.alunoId === 'object' ? fichaParaEditar.alunoId._id : fichaParaEditar.alunoId);
        } else {
            setSelectedAlunoId(undefined);
        }

        const exerciciosFormatados = (fichaParaEditar.exercicios || []).map((exApi, index: number) => {
          let nomeEx: string | undefined;
          let exIdObj: string | { _id: string; nome: string; grupoMuscular?: string; } | null = null;

          if (exApi.exercicioId && typeof exApi.exercicioId === 'object') {
            nomeEx = exApi.exercicioId.nome;
            exIdObj = exApi.exercicioId; // Mantém o objeto se já estiver populado
          } else if (typeof exApi.exercicioId === 'string') {
            // Se for string, tentamos encontrar na lista de sugestões (se disponível) ou usamos placeholder
            // Idealmente, o backend deveria sempre retornar populado ou teríamos uma query para buscar detalhes
            nomeEx = `Exercício (ID: ${exApi.exercicioId.slice(-4)})`; // Placeholder
            exIdObj = exApi.exercicioId; // Mantém como string se não puder popular
          } else {
            nomeEx = "Exercício não especificado";
          }
          return {
            _id: exApi._id, // ID do exercício DENTRO da ficha
            tempId: exApi._id || `temp-${Date.now()}-${index}`,
            exercicioId: exIdObj, // Pode ser string ou objeto
            nomeExercicio: nomeEx,
            series: String(exApi.series || ""),
            repeticoes: String(exApi.repeticoes || ""),
            carga: String(exApi.carga || ""),
            descanso: String(exApi.descanso || ""),
            observacoes: String(exApi.observacoes || ""),
            ordem: exApi.ordem ?? index,
          };
        });
        setExerciciosDaFicha(exerciciosFormatados);

      } else {
        // Reset para criação
        setTitulo("");
        setDescricao("");
        setSelectedPastaId(null);
        setStatusFicha("rascunho");
        if (alunoIdInicial) { // Se estiver criando ficha já para um aluno específico
          setTipo("individual");
          setSelectedAlunoId(alunoIdInicial);
        } else {
          setTipo("modelo");
          setSelectedAlunoId(undefined);
        }
        setExerciciosDaFicha([]);
        setDataValidade(undefined);
        setNumeroSessoes("");
        setTipoOrganizacaoRotina('numerico'); // Padrão para novas
        console.log("[TreinoFormModal Dialogs] Criando nova. tipoOrganizacaoRotina definido para: 'numerico'");
      }
      // Reset comum para autocomplete
      setSearchTermAutocomplete("");
      setSugestoesExercicios([]);
      setShowSugestoes(false);
    }
  }, [props.open, isEditing, fichaParaEditar, alunoIdInicial]);


  useEffect(() => {
    if (searchTermAutocomplete.trim().length < 2) {
      setSugestoesExercicios([]);
      setShowSugestoes(false);
      return;
    }
    setIsLoadingSugestoes(true);
    const timerId = setTimeout(async () => {
      try {
        const resultados = await apiRequest<ExercicioAutocompleteItem[]>(
          "GET",
          `/api/exercicios/autocomplete?nome=${encodeURIComponent(searchTermAutocomplete.trim())}&limit=7`
        );
        setSugestoesExercicios(resultados || []);
        setShowSugestoes(true);
      } catch (error) {
        console.error("Erro ao buscar sugestões de exercícios:", error);
        setSugestoesExercicios([]);
        setShowSugestoes(false); // Garante que sugestões fechem em caso de erro
      } finally {
        setIsLoadingSugestoes(false);
      }
    }, 500); // Debounce
    return () => clearTimeout(timerId);
  }, [searchTermAutocomplete]);

  const handleExercicioChange = (
    identifier: string, // tempId ou _id do exercício na ficha
    campo: keyof Omit<ExercicioItemFicha, 'exercicioId' | 'nomeExercicio' | 'ordem' | 'tempId' | '_id'>,
    valor: string
  ) => {
    setExerciciosDaFicha(prevExercicios =>
      prevExercicios.map(ex => {
        if ((ex.tempId || ex._id) === identifier) {
          return { ...ex, [campo]: valor };
        }
        return ex;
      })
    );
  };

  const mutation = useMutation<SavedFichaResponse, Error, { id?: string; payload: FichaTreinoPayload }>({
    mutationFn: async ({ id, payload }) => {
      console.log("[TreinoFormModal Dialogs] Payload que será enviado para a API:", JSON.parse(JSON.stringify(payload)));
      const method = id ? "PUT" : "POST";
      const endpoint = id ? `/api/treinos/${id}` : "/api/treinos";
      return await apiRequest<SavedFichaResponse>(method, endpoint, payload);
    },
    onSuccess: (savedFicha) => {
      toast({
        title: "Sucesso!",
        description: `Ficha "${savedFicha.titulo}" ${isEditing ? 'atualizada' : 'salva'} com sucesso.`,
      });
      queryClient.invalidateQueries({ queryKey: ["/api/treinos"] }); // Invalida lista geral de treinos/fichas modelo
      if (savedFicha.tipo === 'modelo' || (fichaParaEditar && fichaParaEditar.tipo === 'modelo')) {
        queryClient.invalidateQueries({ queryKey: ["/api/pastas/treinos"] }); // Se for modelo, invalida pastas
      }
      const alunoIdAfetado = savedFicha.alunoId?._id || selectedAlunoId || alunoIdInicial;
      if (alunoIdAfetado) {
        // Invalida queries específicas do aluno
        queryClient.invalidateQueries({ queryKey: ["fichasAluno", alunoIdAfetado] }); 
        queryClient.invalidateQueries({ queryKey: ['aluno', alunoIdAfetado, 'fichas'] });
        queryClient.invalidateQueries({ queryKey: ['aluno', alunoIdAfetado] }); // Para AlunoDetalhesPage
      }
      onSuccess(savedFicha); // Chama o callback de sucesso (provavelmente fecha o modal e atualiza UI)
    },
    onError: (error: any) => {
      const errorMessage = error?.response?.data?.message || error.message || `Não foi possível ${isEditing ? 'atualizar' : 'salvar'} a ficha.`;
      toast({
        variant: "destructive",
        title: `Erro ao ${isEditing ? 'Atualizar' : 'Salvar'}`,
        description: errorMessage,
      });
      console.error(`[TreinoFormModal Dialogs] Erro na mutação:`, error);
    },
  });

  const handleSubmit = () => {
    console.log("[TreinoFormModal Dialogs] handleSubmit chamado. Estado atual de tipoOrganizacaoRotina:", tipoOrganizacaoRotina);

    if (!user?.id) {
      toast({ variant: "destructive", title: "Erro de Autenticação", description: "Usuário não identificado. Faça login novamente." });
      return;
    }
    if (!titulo.trim()) {
      toast({ variant: "destructive", title: "Campo Obrigatório", description: "O título da ficha é obrigatório." });
      return;
    }
    if (tipo === "individual" && !selectedAlunoId) {
      toast({ variant: "destructive", title: "Campo Obrigatório", description: "Selecione um aluno para fichas individuais." });
      return;
    }

    let dataValidadePayload: string | null = null;
    if (tipo === "individual" && dataValidade) {
      if (!isDateValid(dataValidade)) {
        toast({ variant: "destructive", title: "Data Inválida", description: "A data de validade fornecida é inválida." });
        return;
      }
      dataValidadePayload = dataValidade.toISOString();
    }

    let numeroSessoesPayload: number | null = null;
    if (tipo === "individual" && numeroSessoes.trim() !== "") {
      const parsedSessoes = parseInt(numeroSessoes, 10);
      if (isNaN(parsedSessoes) || parsedSessoes < 0) {
        toast({ variant: "destructive", title: "Entrada Inválida", description: "Número de sessões planejadas deve ser um número inteiro positivo ou zero." });
        return;
      }
      numeroSessoesPayload = parsedSessoes;
    }

    const exerciciosPayload = exerciciosDaFicha.map((ex, index) => {
      let idDoExercicioAPI: string;
      if (typeof ex.exercicioId === 'object' && ex.exercicioId !== null) {
        idDoExercicioAPI = ex.exercicioId._id; // Pega o _id do objeto
      } else if (typeof ex.exercicioId === 'string') {
        idDoExercicioAPI = ex.exercicioId; // Usa a string diretamente
      } else {
        console.error("Tentativa de salvar exercício com ID nulo ou inválido na ficha:", ex);
        toast({ variant: "destructive", title: "Erro de Dados", description: `Exercício '${ex.nomeExercicio || 'Desconhecido'}' com ID inválido. Verifique.` });
        throw new Error("ID de exercício inválido ou nulo ao preparar payload."); // Interrompe a submissão
      }
      return {
        exercicioId: idDoExercicioAPI,
        series: ex.series || undefined,
        repeticoes: ex.repeticoes || undefined,
        carga: ex.carga || undefined,
        descanso: ex.descanso || undefined,
        observacoes: ex.observacoes || undefined,
        ordem: ex.ordem ?? index,
      };
    }).filter(ex => ex.exercicioId); // Garante que apenas exercícios com ID válido sejam enviados

    const payload: FichaTreinoPayload = {
      titulo: titulo.trim(),
      descricao: descricao.trim() || undefined,
      tipo: tipo,
      alunoId: tipo === "individual" ? selectedAlunoId : undefined,
      criadorId: user.id, // Garante que criadorId (do personal logado) está no payload
      exercicios: exerciciosPayload,
      pastaId: tipo === 'modelo' ? (selectedPastaId || null) : null, // Envia null se não houver pasta selecionada
      status: tipo === 'modelo' ? statusFicha : undefined, // Status só para modelos
      dataValidade: tipo === "individual" ? dataValidadePayload : null,
      numeroSessoesPlanejadas: tipo === "individual" ? numeroSessoesPayload : null,
      tipoOrganizacaoRotina: tipoOrganizacaoRotina, // INCLUÍDO NO PAYLOAD
    };
    mutation.mutate({ id: isEditing ? fichaParaEditar?._id : undefined, payload });
  };

  const handleAbrirModalAdicionarExercicio = () => { setIsSelectExerciseModalOpen(true); };

  const adicionarExercicioNaFicha = useCallback((exercicio: ExercicioAutocompleteItem | BibliotecaExercicio) => {
    setExerciciosDaFicha(prev => {
      const maiorOrdemExistente = prev.reduce((max, ex) => Math.max(max, ex.ordem ?? -1), -1);
      const novoExercicio: ExercicioItemFicha = {
        tempId: `new-${Date.now()}-${Math.random().toString(36).substr(2, 5)}`, // ID temporário mais robusto
        exercicioId: { _id: exercicio._id, nome: exercicio.nome, grupoMuscular: exercicio.grupoMuscular }, // Armazena como objeto
        nomeExercicio: exercicio.nome, // Mantém para exibição fácil
        series: "", repeticoes: "", carga: "", descanso: "", observacoes: "",
        ordem: maiorOrdemExistente + 1,
      };
      setSearchTermAutocomplete(""); // Limpa busca
      setSugestoesExercicios([]);    // Limpa sugestões
      setShowSugestoes(false);       // Esconde lista de sugestões
      return [...prev, novoExercicio].sort((a, b) => (a.ordem ?? Infinity) - (b.ordem ?? Infinity));
    });
  }, []);

  const handleAdicionarExerciciosSelecionados = (selecionados: BibliotecaExercicio[]) => {
    if (!selecionados || selecionados.length === 0) return;
    // Adiciona todos os selecionados de uma vez para melhor performance e estado consistente
    setExerciciosDaFicha(prev => {
        let maiorOrdemExistente = prev.reduce((max, ex) => Math.max(max, ex.ordem ?? -1), -1);
        const novosExercicios = selecionados.map(exercicio => {
            maiorOrdemExistente++;
            return {
                tempId: `new-${Date.now()}-${Math.random().toString(36).substr(2, 5)}-${maiorOrdemExistente}`,
                exercicioId: { _id: exercicio._id, nome: exercicio.nome, grupoMuscular: exercicio.grupoMuscular },
                nomeExercicio: exercicio.nome,
                series: "", repeticoes: "", carga: "", descanso: "", observacoes: "",
                ordem: maiorOrdemExistente,
            };
        });
        return [...prev, ...novosExercicios].sort((a,b) => (a.ordem ?? Infinity) - (b.ordem ?? Infinity));
    });
  };

  const handleRemoverExercicio = (identifier: string) => { // tempId ou _id
    setExerciciosDaFicha(prev =>
      prev.filter(ex => (ex.tempId || ex._id) !== identifier)
        .map((ex, index) => ({ ...ex, ordem: index })) // Reordena após remover
    );
  };

  const isLoadingMutation = mutation.isPending;
  const modalTitle = isEditing ? "Editar Ficha de Treino" : (alunoIdInicial ? `Nova Ficha para ${alunosDisponiveis.find(a => a._id === alunoIdInicial)?.nome || 'Aluno'}` : "Nova Ficha de Treino");
  const submitButtonText = isLoadingMutation ? (isEditing ? "Salvando..." : "Criando Ficha...") : (isEditing ? "Salvar Alterações" : "Criar Ficha");
  // Lógica para mostrar select de aluno:
  // - Se NÃO está editando E tipo é individual E não tem alunoIdInicial (caso geral de criar ficha individual)
  // - OU Se ESTÁ editando E a ficha original era individual E não veio alunoIdInicial (editando ficha individual já existente, mas não pelo contexto do aluno)
  const showAlunoSelect = tipo === 'individual' && !alunoIdInicial;


  return (
    <>
      <Dialog open={props.open} onOpenChange={(openStatus) => {
        if (!openStatus) { // Ao fechar o modal
          props.onClose();
          // Limpar estados relacionados à busca de exercícios para não persistirem entre aberturas
          setSearchTermAutocomplete("");
          setSugestoesExercicios([]);
          setShowSugestoes(false);
        }
      }}>
        <DialogContent className="sm:max-w-2xl w-[95vw] h-[90vh] max-h-[90vh] flex flex-col p-0">
          <DialogHeader className="p-6 pb-4 border-b shrink-0">
            <DialogTitle>{modalTitle}</DialogTitle>
            <DialogDescription>
              {isEditing ? "Edite os detalhes da ficha e gerencie os exercícios." : "Preencha os dados para criar uma nova ficha de treino."}
            </DialogDescription>
          </DialogHeader>

          {/* Conteúdo do Formulário com Scroll */}
          <div className="flex-grow overflow-y-auto px-6 py-4 space-y-4 custom-scrollbar"> {/* Adicionado custom-scrollbar se definido globalmente */}
            {/* Campos Título, Descrição, Tipo, etc. */}
            <div className="grid grid-cols-4 items-center gap-4">
              <Label htmlFor="titulo-ficha" className="text-right col-span-1">Título*</Label>
              <Input id="titulo-ficha" value={titulo} onChange={(e) => setTitulo(e.target.value)} placeholder="Ex: Treino A - Foco Peito" className="col-span-3" disabled={isLoadingMutation} />
            </div>
            <div className="grid grid-cols-4 items-start gap-4">
              <Label htmlFor="descricao-ficha" className="text-right col-span-1 pt-1">Descrição</Label>
              <Textarea id="descricao-ficha" value={descricao} onChange={(e) => setDescricao(e.target.value)} placeholder="Objetivo, observações gerais..." className="col-span-3" rows={2} disabled={isLoadingMutation} />
            </div>

            {/* CAMPO PARA TIPO DE ORGANIZAÇÃO DA ROTINA */}
            {/* Se for sempre 'numerico' por padrão e alterado em outra tela, não precisa ser visível aqui. */}
            {/* Para depuração ou se precisar definir na criação, pode descomentar: */}
            {/* <div className="grid grid-cols-4 items-center gap-4">
              <Label htmlFor="tipo-organizacao-rotina" className="text-right col-span-1">Organização dos Dias</Label>
              <div className="col-span-3">
                <Select 
                    value={tipoOrganizacaoRotina} 
                    onValueChange={(value) => setTipoOrganizacaoRotina(value as 'diasDaSemana' | 'numerico' | 'livre')} 
                    disabled={isLoadingMutation}
                >
                  <SelectTrigger id="tipo-organizacao-rotina">
                    <SelectValue placeholder="Selecione como os dias serão organizados" />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="numerico">Numérico (Dia 1, Dia 2...)</SelectItem>
                    <SelectItem value="diasDaSemana">Dias da Semana (Segunda, Terça...)</SelectItem>
                    <SelectItem value="livre">Livre (Nomes Personalizados)</SelectItem>
                  </SelectContent>
                </Select>
                <p className="text-xs text-muted-foreground mt-1">Define como os "Identificadores de Dia" serão usados na nova estrutura de rotina.</p>
              </div>
            </div>
            */}


            <div className="grid grid-cols-4 items-center gap-4">
              <Label className="text-right col-span-1">Tipo</Label>
              <div className="col-span-3">
                <Select 
                  value={tipo} 
                  onValueChange={(value) => { 
                    // Permite mudar tipo apenas se não estiver editando uma ficha individual já existente
                    // ou se não estiver criando uma ficha a partir do contexto de um aluno.
                    if (!isEditing || (isEditing && fichaParaEditar?.tipo === 'modelo' && !alunoIdInicial)) {
                      setTipo(value as "modelo" | "individual");
                    }
                  }} 
                  // Desabilita se estiver editando uma ficha individual ou se estiver no contexto de alunoIdInicial
                  disabled={isLoadingMutation || (isEditing && fichaParaEditar?.tipo === 'individual') || !!alunoIdInicial}
                >
                  <SelectTrigger><SelectValue placeholder="Selecione o tipo" /></SelectTrigger>
                  <SelectContent>
                    <SelectItem value="modelo">Modelo</SelectItem>
                    <SelectItem value="individual">Individual</SelectItem>
                  </SelectContent>
                </Select>
                {((isEditing && fichaParaEditar?.tipo === 'individual') || !!alunoIdInicial) && 
                  <p className="text-xs text-muted-foreground mt-1">O tipo da ficha não pode ser alterado neste contexto.</p>
                }
              </div>
            </div>

            {/* Select de Aluno: Mostra se tipo é 'individual' E (não está editando OU está editando uma ficha que não tem alunoIdInicial) */}
            {tipo === 'individual' && !alunoIdInicial && (
              <div className="grid grid-cols-4 items-center gap-4">
                <Label htmlFor="aluno-select" className="text-right col-span-1">Aluno*</Label>
                <div className="col-span-3">
                  <Select
                    value={selectedAlunoId}
                    onValueChange={setSelectedAlunoId} // Permite alterar se não estiver editando
                    disabled={isLoadingMutation || isEditing || isLoadingAlunosLista} // Desabilita se editando ou carregando
                  >
                    <SelectTrigger id="aluno-select">
                      <SelectValue placeholder={isLoadingAlunosLista ? "Carregando..." : "Selecione o aluno"} />
                    </SelectTrigger>
                    <SelectContent>
                      {isLoadingAlunosLista ? (
                        <div className="p-4 text-sm text-muted-foreground flex items-center"><Loader2 className="h-4 w-4 mr-2 animate-spin" />Carregando alunos...</div>
                      ) : alunosDisponiveis.length > 0 ? (
                        alunosDisponiveis.map((aluno) => (<SelectItem key={aluno._id} value={aluno._id}>{aluno.nome}</SelectItem>))
                      ) : (<p className="p-4 text-sm text-muted-foreground">Nenhum aluno cadastrado.</p>)}
                    </SelectContent>
                  </Select>
                  {isEditing && <p className="text-xs text-muted-foreground mt-1">O aluno vinculado não pode ser alterado aqui.</p>}
                </div>
              </div>
            )}
            {/* Caso especial: Se tipo é individual E tem alunoIdInicial (criando para aluno específico ou editando ficha de aluno específico) */}
            {tipo === 'individual' && alunoIdInicial && (
                 <div className="grid grid-cols-4 items-center gap-4">
                    <Label className="text-right col-span-1">Aluno</Label>
                    <div className="col-span-3">
                        <Input 
                            value={alunosDisponiveis.find(a => a._id === selectedAlunoId)?.nome || "Aluno não encontrado"} 
                            disabled 
                            className="bg-slate-100 dark:bg-slate-800"
                        />
                         <p className="text-xs text-muted-foreground mt-1">Ficha para aluno específico.</p>
                    </div>
                 </div>
            )}


            {tipo === 'modelo' && (
              <>
                <div className="grid grid-cols-4 items-center gap-4">
                  <Label htmlFor="pasta-select" className="text-right col-span-1 flex items-center"><FolderIcon className="w-4 h-4 mr-1.5 text-gray-500" />Pasta</Label>
                  <div className="col-span-3">
                    <Select value={selectedPastaId || "nenhuma"} onValueChange={(value) => setSelectedPastaId(value === "nenhuma" ? null : value)} disabled={isLoadingMutation || isLoadingPastas}>
                      <SelectTrigger id="pasta-select"><SelectValue placeholder={isLoadingPastas ? "Carregando..." : "Selecione uma pasta (opcional)"} /></SelectTrigger>
                      <SelectContent>
                        <SelectItem value="nenhuma">Nenhuma (Salvar fora de pastas)</SelectItem>
                        {isLoadingPastas ? (<div className="p-4 text-sm text-muted-foreground flex items-center"><Loader2 className="h-4 w-4 mr-2 animate-spin" />Carregando pastas...</div>)
                          : pastas.length > 0 ? (pastas.map((pasta) => (<SelectItem key={pasta._id} value={pasta._id}>{pasta.nome}</SelectItem>)))
                            : (<p className="p-4 text-sm text-muted-foreground">Nenhuma pasta criada.</p>)}
                      </SelectContent>
                    </Select>
                  </div>
                </div>
                <div className="grid grid-cols-4 items-center gap-4">
                  <Label htmlFor="status-ficha" className="text-right col-span-1 flex items-center"><Activity className="w-4 h-4 mr-1.5 text-gray-500" />Status</Label>
                  <div className="col-span-3">
                    <Select value={statusFicha} onValueChange={(value) => setStatusFicha(value as "ativo" | "rascunho" | "arquivado")} disabled={isLoadingMutation}>
                      <SelectTrigger id="status-ficha"><SelectValue placeholder="Defina o status da ficha modelo" /></SelectTrigger>
                      <SelectContent>
                        <SelectItem value="rascunho">Rascunho</SelectItem>
                        <SelectItem value="ativo">Ativo</SelectItem>
                        <SelectItem value="arquivado">Arquivado</SelectItem>
                      </SelectContent>
                    </Select>
                  </div>
                </div>
              </>
            )}

            {/* Campos de Validade (apenas para tipo individual) */}
            {tipo === 'individual' && (
              <>
                <div className="pt-4 border-t mt-4"> {/* Divisor visual */}
                  <Label className="text-sm font-medium text-gray-700 dark:text-gray-300 col-span-4 mb-2 block">
                    Configurações do Programa Individual:
                  </Label>
                </div>
                <div className="grid grid-cols-4 items-center gap-4">
                  <Label htmlFor="data-validade" className="text-right col-span-1">Validade até</Label>
                  <Popover>
                    <PopoverTrigger asChild>
                      <Button
                        id="data-validade"
                        variant={"outline"}
                        className={`col-span-3 justify-start text-left font-normal ${!dataValidade && "text-muted-foreground"}`}
                        disabled={isLoadingMutation}
                      >
                        <CalendarIcon className="mr-2 h-4 w-4" />
                        {dataValidade ? format(dataValidade, "PPP", { locale: ptBR }) : <span>Opcional</span>}
                      </Button>
                    </PopoverTrigger>
                    <PopoverContent className="w-auto p-0" align="start">
                      <Calendar
                        mode="single"
                        selected={dataValidade}
                        onSelect={setDataValidade} // Permite desmarcar (envia undefined)
                        initialFocus
                        disabled={(date) => date < startOfToday()} // Desabilita datas passadas
                      />
                    </PopoverContent>
                  </Popover>
                </div>

                <div className="grid grid-cols-4 items-center gap-4">
                  <Label htmlFor="numero-sessoes" className="text-right col-span-1">Nº de Sessões</Label>
                  <Input
                    id="numero-sessoes"
                    type="number"
                    value={numeroSessoes}
                    onChange={(e) => setNumeroSessoes(e.target.value)}
                    placeholder="Ex: 12 (opcional)"
                    className="col-span-3"
                    min="0" // Permite 0 se for apenas por data
                    disabled={isLoadingMutation}
                  />
                </div>
                <div className="col-start-2 col-span-3 -mt-3 mb-2"> {/* Ajuste para alinhar com input */}
                  <p className="text-xs text-muted-foreground">
                    Opcional: Defina a validade por data ou por nº de treinos.
                  </p>
                </div>
              </>
            )}

            {/* Seção de Exercícios */}
            <div className="space-y-4 pt-4 border-t mt-4">
              <div className="flex justify-between items-center mb-2">
                <h3 className="text-lg font-medium">Exercícios da Ficha</h3>
                <Button type="button" variant="outline" size="sm" onClick={handleAbrirModalAdicionarExercicio} disabled={isLoadingMutation}>
                  <PlusCircle className="w-4 h-4 mr-2" />
                  Biblioteca Completa
                </Button>
              </div>

              {/* Autocomplete para adicionar exercícios */}
              <div className="relative">
                <Label htmlFor="busca-exercicio-autocomplete" className="sr-only">Buscar e adicionar exercício</Label>
                <div className="flex items-center">
                  <Search className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
                  <Input
                    id="busca-exercicio-autocomplete"
                    type="text"
                    placeholder="Buscar e adicionar exercício..."
                    value={searchTermAutocomplete}
                    onChange={(e) => setSearchTermAutocomplete(e.target.value)}
                    onFocus={() => setShowSugestoes(true)}
                    // onBlur={() => setTimeout(() => setShowSugestoes(false), 150)} // Adiar o fechamento para permitir clique
                    className="pl-9 pr-8" // Espaço para ícones
                    disabled={isLoadingMutation}
                  />
                  {searchTermAutocomplete && ( // Botão para limpar busca
                    <Button
                      type="button"
                      variant="ghost"
                      size="icon"
                      className="absolute right-1 top-1/2 h-7 w-7 -translate-y-1/2 text-muted-foreground hover:text-destructive"
                      onClick={() => {
                        setSearchTermAutocomplete("");
                        setSugestoesExercicios([]);
                        setShowSugestoes(false);
                      }}
                    >
                      <XCircle className="h-4 w-4" />
                    </Button>
                  )}
                </div>
                {isLoadingSugestoes && (
                  <div className="absolute z-10 w-full p-2 text-sm text-center text-muted-foreground">Carregando sugestões...</div>
                )}
                {showSugestoes && !isLoadingSugestoes && sugestoesExercicios.length > 0 && (
                  <div className="absolute z-10 w-full mt-1 max-h-60 overflow-y-auto rounded-md border bg-popover text-popover-foreground shadow-lg">
                    <ul className="py-1">
                      {sugestoesExercicios.map((sugestao) => (
                        <li
                          key={sugestao._id}
                          className="px-3 py-2 text-sm hover:bg-accent hover:text-accent-foreground cursor-pointer flex justify-between items-center"
                          onMouseDown={(e) => { // Usar onMouseDown para que o clique seja registrado antes do onBlur do input
                            e.preventDefault(); 
                            adicionarExercicioNaFicha(sugestao);
                          }}
                        >
                          <span>
                            {sugestao.nome}
                            {sugestao.grupoMuscular && <span className="text-xs text-muted-foreground ml-2">({sugestao.grupoMuscular})</span>}
                          </span>
                          {sugestao.isCustom && <Badge variant="outline" className="text-xs">Meu</Badge>}
                        </li>
                      ))}
                    </ul>
                  </div>
                )}
                 {showSugestoes && !isLoadingSugestoes && sugestoesExercicios.length === 0 && searchTermAutocomplete.length >= 2 && (
                  <div className="absolute z-10 w-full p-2 text-sm text-center text-muted-foreground border bg-popover shadow-lg mt-1 rounded-md">
                    Nenhum exercício encontrado para "{searchTermAutocomplete}".
                  </div>
                )}
              </div>

              {/* Lista de exercícios adicionados */}
              {exerciciosDaFicha.length === 0 && !searchTermAutocomplete ? ( 
                <p className="text-sm text-muted-foreground text-center py-4">
                  Nenhum exercício adicionado. Busque acima ou use a "Biblioteca Completa".
                </p>
              ) : (
                <Accordion type="multiple" className="w-full space-y-2 mt-2">
                  {exerciciosDaFicha.map((exItem, index) => {
                    // Usa tempId para novos, _id para existentes, ou fallback para key
                    const identifier = exItem.tempId || exItem._id || `ex-item-${index}`;
                    // Nome para exibição
                    const displayName = exItem.nomeExercicio || (typeof exItem.exercicioId === 'object' && exItem.exercicioId ? exItem.exercicioId.nome : (typeof exItem.exercicioId === 'string' ? `ID: ${exItem.exercicioId.slice(-4)}` : "Exercício Inválido"));
                    
                    return (
                      <AccordionItem key={identifier} value={identifier} className="border rounded-md bg-background dark:bg-gray-800 shadow-sm">
                        <AccordionTrigger className="px-4 py-3 hover:no-underline text-sm hover:bg-muted/50 dark:hover:bg-gray-700/50 rounded-t-md">
                          <div className="flex justify-between items-center w-full">
                            <div className="flex-1 text-left">
                              <span className="font-medium text-gray-800 dark:text-gray-100">{displayName}</span>
                              {(exItem.series || exItem.repeticoes) && (
                                <span className="ml-2 text-xs text-blue-600 dark:text-blue-400">({exItem.series || '?'}{exItem.series && exItem.repeticoes ? 'x' : ''}{exItem.repeticoes || '?'})</span>
                              )}
                            </div>
                            <Button variant="ghost" size="icon" className="text-red-500 hover:text-red-700 hover:bg-red-500/10 h-7 w-7 mr-2 shrink-0"
                              onClick={(e) => { e.stopPropagation(); handleRemoverExercicio(identifier); }}
                              disabled={isLoadingMutation}
                            > <Trash2 className="w-4 h-4" /> </Button>
                          </div>
                        </AccordionTrigger>
                        <AccordionContent className="px-4 pt-0 pb-4">
                          <div className="pt-3 border-t dark:border-gray-700 space-y-3">
                            <div className="grid grid-cols-2 sm:grid-cols-3 gap-3">
                              <div><Label htmlFor={`series-${identifier}`} className="text-xs mb-1 block">Séries</Label><Input id={`series-${identifier}`} value={exItem.series || ''} placeholder="Ex: 3" disabled={isLoadingMutation} onChange={(e) => handleExercicioChange(identifier, 'series', e.target.value)} /></div>
                              <div><Label htmlFor={`reps-${identifier}`} className="text-xs mb-1 block">Repetições</Label><Input id={`reps-${identifier}`} value={exItem.repeticoes || ''} placeholder="Ex: 8-12" disabled={isLoadingMutation} onChange={(e) => handleExercicioChange(identifier, 'repeticoes', e.target.value)} /></div>
                              <div><Label htmlFor={`carga-${identifier}`} className="text-xs mb-1 block">Carga</Label><Input id={`carga-${identifier}`} value={exItem.carga || ''} placeholder="Ex: 70kg" disabled={isLoadingMutation} onChange={(e) => handleExercicioChange(identifier, 'carga', e.target.value)} /></div>
                              <div className="col-span-2 sm:col-span-1"><Label htmlFor={`descanso-${identifier}`} className="text-xs mb-1 block">Descanso</Label><Input id={`descanso-${identifier}`} value={exItem.descanso || ''} placeholder="Ex: 60s" disabled={isLoadingMutation} onChange={(e) => handleExercicioChange(identifier, 'descanso', e.target.value)} /></div>
                            </div>
                            <div>
                              <Label htmlFor={`obs-${identifier}`} className="text-xs mb-1 block">Observações</Label>
                              <Textarea id={`obs-${identifier}`} value={exItem.observacoes || ''} placeholder="Detalhes específicos..." disabled={isLoadingMutation} rows={2} onChange={(e) => handleExercicioChange(identifier, 'observacoes', e.target.value)} />
                            </div>
                          </div>
                        </AccordionContent>
                      </AccordionItem>
                    );
                  })}
                </Accordion>
              )}
            </div>
          </div>

          {/* Footer com botões de ação */}
          <DialogFooter className="p-6 pt-4 border-t shrink-0">
            <Button variant="outline" onClick={() => {
              props.onClose(); // Chama o onClose original
            }} disabled={isLoadingMutation}>Cancelar</Button>
            <Button onClick={handleSubmit} disabled={isLoadingMutation}>
              {isLoadingMutation && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
              {submitButtonText}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Modal para selecionar exercícios da biblioteca completa */}
      {isSelectExerciseModalOpen && (
        <SelectExerciseModal
          isOpen={isSelectExerciseModalOpen}
          onClose={() => setIsSelectExerciseModalOpen(false)}
          onExercisesSelect={handleAdicionarExerciciosSelecionados}
        />
      )}
    </>
  );
}
