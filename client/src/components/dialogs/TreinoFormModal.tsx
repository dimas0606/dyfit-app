// client/src/components/dialogs/TreinoFormModal.tsx
import React, { useEffect, useState, useMemo, useCallback } from 'react';
import {
  Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter, DialogDescription, DialogClose,
} from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Button } from "@/components/ui/button";
import {
  Select, SelectContent, SelectItem, SelectTrigger, SelectValue,
} from "@/components/ui/select";
import { Textarea } from "@/components/ui/textarea";
import { Popover, PopoverContent, PopoverTrigger } from "@/components/ui/popover";
import { Calendar } from "@/components/ui/calendar";
import { useToast } from "@/hooks/use-toast";
import { apiRequest } from '@/lib/queryClient';
import { useMutation, useQuery, useQueryClient, QueryKey } from "@tanstack/react-query";
import { Loader2, CalendarIcon, Folder as FolderIcon, Activity, PlusCircle, Trash2, GripVertical, Edit, ListPlus, XCircle } from "lucide-react";
import { Card, CardContent } from "@/components/ui/card";
import { Aluno } from '@/types/aluno';

import type { RotinaListagemItem, DiaDeTreinoDetalhado } from '@/types/treinoOuRotinaTypes';
import SelectExerciseModal, { BibliotecaExercicio } from './SelectExerciseModal';

import { format, parseISO, isValid as isDateValid, startOfToday } from 'date-fns';
import { ptBR } from 'date-fns/locale';
import * as z from 'zod';
import { zodResolver } from '@hookform/resolvers/zod';
import { useForm } from 'react-hook-form';
import { Form, FormControl, FormField, FormItem, FormLabel, FormMessage, FormDescription } from "@/components/ui/form";
import { Accordion, AccordionContent, AccordionItem, AccordionTrigger } from "@/components/ui/accordion";

const TIPOS_ORGANIZACAO_ROTINA_BACKEND = ['diasDaSemana', 'numerico', 'livre'] as const;
type TipoOrganizacaoRotinaBackend = typeof TIPOS_ORGANIZACAO_ROTINA_BACKEND[number];

const OPCOES_TIPO_DOS_TREINOS: { value: TipoOrganizacaoRotinaBackend; label: string }[] = [
    { value: 'diasDaSemana', label: 'Dia da Semana (Ex: Segunda, Terça...)' },
    { value: 'numerico', label: 'Numérico (Ex: Treino 1, Treino 2...)' },
    { value: 'livre', label: 'Livre (Nomes personalizados)' }
];

const diasDaSemanaOptions = [
    { value: "Segunda-feira", label: "Segunda-feira" }, { value: "Terça-feira", label: "Terça-feira" },
    { value: "Quarta-feira", label: "Quarta-feira" }, { value: "Quinta-feira", label: "Quinta-feira" },
    { value: "Sexta-feira", label: "Sexta-feira" }, { value: "Sábado", label: "Sábado" }, { value: "Domingo", label: "Domingo" },
];

const diaDeTreinoFormSchema = z.object({
    identificadorDia: z.string().min(1, "Identificador do dia é obrigatório.").max(50),
    nomeSubFicha: z.string().max(100).optional().nullable(),
});
type DiaDeTreinoFormValues = z.infer<typeof diaDeTreinoFormSchema>;

interface ExercicioNoDiaState {
  tempIdExercicio: string;
  exercicioId: string;
  nomeExercicio: string;
  grupoMuscular?: string;
  categoria?: string;
  series?: string;
  repeticoes?: string;
  carga?: string;
  descanso?: string;
  observacoes?: string;
  ordemNoDia: number;
  _idSubDocExercicio?: string;
}

interface DiaDeTreinoStateItem extends DiaDeTreinoFormValues {
    tempId: string;
    ordemNaRotina: number;
    exerciciosDoDia: ExercicioNoDiaState[];
    _id?: string;
}

const rotinaMetadataSchema = z.object({
  titulo: z.string().min(1, { message: "Título da rotina é obrigatório." }).max(100),
  descricao: z.string().max(500).optional().nullable(),
  tipo: z.enum(["modelo", "individual"]),
  tipoOrganizacaoRotina: z.enum(TIPOS_ORGANIZACAO_ROTINA_BACKEND, { errorMap: () => ({ message: "Selecione como os treinos são divididos." }) }).default('numerico'),
  alunoId: z.string().optional().nullable(),
  pastaId: z.string().nullable().optional(),
  statusModelo: z.enum(["ativo", "rascunho", "arquivado"]).optional().nullable(),
  dataValidade: z.date().optional().nullable(),
  totalSessoesRotinaPlanejadas: z.preprocess( (val) => (String(val ?? '').trim() === "" ? null : Number(String(val ?? '').trim())), z.number().int().min(0, "Deve ser 0 ou maior.").nullable().optional() ),
}).refine(data => !(data.tipo === 'individual' && (!data.alunoId || data.alunoId.trim() === '')), { message: "Aluno é obrigatório para rotinas individuais.", path: ["alunoId"] })
  .refine(data => !(data.tipo === 'modelo' && !data.statusModelo), { message: "Status é obrigatório para rotinas modelo.", path: ["statusModelo"] });

type RotinaMetadataFormValues = z.infer<typeof rotinaMetadataSchema>;

export interface RotinaParaEditar {
  _id?: string;
  titulo?: string;
  descricao?: string | null;
  tipo?: "modelo" | "individual";
  tipoOrganizacaoRotina?: TipoOrganizacaoRotinaBackend;
  alunoId?: string | { _id: string; nome: string; } | null;
  pastaId?: string | { _id: string; nome: string; } | null;
  statusModelo?: "ativo" | "rascunho" | "arquivado" | null;
  dataValidade?: string | Date | null;
  totalSessoesRotinaPlanejadas?: number | null;
  diasDeTreino?: Array<{
    _id?: string;
    identificadorDia: string;
    nomeSubFicha?: string | null;
    ordemNaRotina: number;
    exerciciosDoDia?: Array<{
      _id?: string;
      exercicioId: string | { _id: string; nome: string; grupoMuscular?: string; categoria?: string; tipo?: string; urlVideo?: string; descricao?: string; };
      series?: string; repeticoes?: string; carga?: string; descanso?: string; observacoes?: string; ordemNoDia: number;
    }>;
  }>;
  exercicios?: Array<{
    _id?: string;
    exercicioId: string | { _id: string; nome: string; grupoMuscular?: string; };
    series?: string; repeticoes?: string; carga?: string; descanso?: string; observacoes?: string; ordem?: number;
  }>;
}

interface Pasta {
    _id: string;
    nome: string;
}

interface RotinaFormModalProps {
  open: boolean;
  onClose: () => void;
  onSuccess: (rotinaSalva: RotinaListagemItem) => void;
  alunos: Aluno[];
  rotinaParaEditar?: RotinaParaEditar | null;
  alunoId?: string;
}

type RotinaApiPayload = RotinaMetadataFormValues & {
  diasDeTreino: Array<{
    _id?: string;
    identificadorDia: string;
    nomeSubFicha?: string | null;
    ordemNaRotina: number;
    exerciciosDoDia: Array<{
      _id?: string;
      exercicioId: string;
      series?: string;
      repeticoes?: string;
      carga?: string;
      descanso?: string;
      observacoes?: string;
      ordemNoDia: number;
    }>;
  }>;
  criadorId?: string;
};

const TREINOS_QUERY_KEY: QueryKey = ["/api/treinos"];

export default function TreinoFormModal({
  open, onClose, onSuccess, alunos: alunosProp, rotinaParaEditar, alunoId: alunoIdProp,
}: RotinaFormModalProps) {

  const { toast } = useToast();
  const queryClientHook = useQueryClient();

  const isEditing = !!(rotinaParaEditar && rotinaParaEditar._id);

  const [diasDeTreinoState, setDiasDeTreinoState] = useState<DiaDeTreinoStateItem[]>([]);
  const [showDiaForm, setShowDiaForm] = useState(false);
  const [diaFormValues, setDiaFormValues] = useState<DiaDeTreinoFormValues>({ identificadorDia: '', nomeSubFicha: '' });
  const [editingDiaTempId, setEditingDiaTempId] = useState<string | null>(null);

  const [isSelectExerciseModalOpen, setIsSelectExerciseModalOpen] = useState(false);
  const [diaAtivoParaAdicionarExercicio, setDiaAtivoParaAdicionarExercicio] = useState<string | null>(null);

  const form = useForm<RotinaMetadataFormValues>({
    resolver: zodResolver(rotinaMetadataSchema),
    defaultValues: {
      titulo: "", descricao: null, tipo: "modelo", tipoOrganizacaoRotina: "numerico",
      alunoId: null, pastaId: null, statusModelo: "rascunho",
      dataValidade: null, totalSessoesRotinaPlanejadas: null,
    },
  });

  const watchedTipoOrganizacao = form.watch('tipoOrganizacaoRotina');
  const watchedTipoRotina = form.watch('tipo');

  useEffect(() => { if (showDiaForm) { setDiaFormValues(prev => ({ ...prev, identificadorDia: '' })); } }, [watchedTipoOrganizacao, showDiaForm]);

  const { data: pastas = [], isLoading: isLoadingPastas } = useQuery<Pasta[], Error>({ queryKey: ["pastasParaRotinaForm", watchedTipoRotina], queryFn: () => apiRequest<Pasta[]>("GET", "/api/pastas/treinos"), enabled: open && watchedTipoRotina === "modelo", });
  const { data: alunosFetched = [], isLoading: isLoadingAlunos } = useQuery<Aluno[], Error>({ queryKey: ["alunosParaRotinaForm", watchedTipoRotina], queryFn: async () => apiRequest<Aluno[]>("GET", "/api/alunos").then(data => Array.isArray(data) ? data : []), enabled: open && watchedTipoRotina === 'individual', initialData: watchedTipoRotina === 'individual' ? alunosProp : undefined, });
  const alunosDisponiveis = watchedTipoRotina === 'individual' ? (alunosFetched.length > 0 ? alunosFetched : alunosProp) : alunosProp;

  useEffect(() => {
    // console.log("[TreinoFormModal useEffect] Iniciando. Props:", { open, rotinaParaEditar: rotinaParaEditar ? JSON.parse(JSON.stringify(rotinaParaEditar)) : null, alunoIdProp });
    const currentIsEditing = !!(rotinaParaEditar && rotinaParaEditar._id);
    // console.log("[TreinoFormModal useEffect] currentIsEditing:", currentIsEditing);

    if (open) {
      // console.log("[TreinoFormModal useEffect] Modal está ABERTO.");
      if (currentIsEditing && rotinaParaEditar) {
        // console.log("[TreinoFormModal useEffect] MODO EDIÇÃO DETECTADO. Rotina para editar:", JSON.parse(JSON.stringify(rotinaParaEditar)));
        
        let dataValidadeDate: Date | null = null;
        if (rotinaParaEditar.dataValidade) {
            if (typeof rotinaParaEditar.dataValidade === 'string') { const parsed = parseISO(rotinaParaEditar.dataValidade); if (isDateValid(parsed)) dataValidadeDate = parsed; }
            else if (rotinaParaEditar.dataValidade instanceof Date && isDateValid(rotinaParaEditar.dataValidade)) { dataValidadeDate = rotinaParaEditar.dataValidade; }
        }
        const tipoDaRotinaParaForm = rotinaParaEditar.tipo || "modelo";
        const alunoIdParaForm = tipoDaRotinaParaForm === 'individual' ? (typeof rotinaParaEditar.alunoId === 'object' && rotinaParaEditar.alunoId ? rotinaParaEditar.alunoId._id : (rotinaParaEditar.alunoId as string | null)) : null;
        
        let finalAlunoIdParaReset = alunoIdParaForm; 
        if (tipoDaRotinaParaForm === 'individual') {
            if (alunoIdProp && !currentIsEditing) { 
                finalAlunoIdParaReset = alunoIdProp;
            } else { 
                finalAlunoIdParaReset = alunoIdParaForm;
            }
        } else {
            finalAlunoIdParaReset = null; 
        }
        
        const pastaIdParaForm = tipoDaRotinaParaForm === 'modelo' ? (typeof rotinaParaEditar.pastaId === 'object' && rotinaParaEditar.pastaId ? rotinaParaEditar.pastaId._id : (rotinaParaEditar.pastaId as string | null)) : null;

        const valoresParaReset: RotinaMetadataFormValues = { // Especificar o tipo aqui
          titulo: rotinaParaEditar.titulo || "",
          descricao: rotinaParaEditar.descricao || null,
          tipo: tipoDaRotinaParaForm,
          tipoOrganizacaoRotina: rotinaParaEditar.tipoOrganizacaoRotina || "numerico",
          alunoId: finalAlunoIdParaReset,
          pastaId: pastaIdParaForm,
          statusModelo: tipoDaRotinaParaForm === 'modelo' ? (rotinaParaEditar.statusModelo || "rascunho") : null,
          dataValidade: tipoDaRotinaParaForm === 'individual' ? dataValidadeDate : null,
          totalSessoesRotinaPlanejadas: tipoDaRotinaParaForm === 'individual' ? (rotinaParaEditar.totalSessoesRotinaPlanejadas ?? null) : null,
        };
        // console.log("[TreinoFormModal useEffect] Valores para form.reset (EDIÇÃO):", JSON.parse(JSON.stringify(valoresParaReset)));
        form.reset(valoresParaReset);

        let diasParaEstado: DiaDeTreinoStateItem[] = [];
        if (rotinaParaEditar.diasDeTreino && rotinaParaEditar.diasDeTreino.length > 0) {
            diasParaEstado = rotinaParaEditar.diasDeTreino.map((diaApi, index) => {
                const exerciciosFormatados: ExercicioNoDiaState[] = (diaApi.exerciciosDoDia || []).map((exApi, exIndex) => {
                    const exercicioData = exApi.exercicioId;
                    let idDoEx: string = '';
                    let nomeDoEx: string = 'Exercício não carregado';
                    let grupoDoEx: string | undefined;
                    let categoriaDoEx: string | undefined;

                    if (typeof exercicioData === 'string') {
                        idDoEx = exercicioData;
                        nomeDoEx = `Exercício (ID: ${idDoEx.substring(0,6)}...)`;
                    } else if (exercicioData && typeof exercicioData === 'object' && '_id' in exercicioData) {
                        idDoEx = exercicioData._id;
                        nomeDoEx = exercicioData.nome;
                        grupoDoEx = exercicioData.grupoMuscular;
                        categoriaDoEx = exercicioData.categoria || exercicioData.tipo;
                    }
                    return {
                        tempIdExercicio: exApi._id || `edit-ex-${index}-${exIndex}-${Date.now()}`,
                        exercicioId: idDoEx, nomeExercicio: nomeDoEx, grupoMuscular: grupoDoEx, categoria: categoriaDoEx,
                        series: exApi.series, repeticoes: exApi.repeticoes, carga: exApi.carga,
                        descanso: exApi.descanso, observacoes: exApi.observacoes,
                        ordemNoDia: exApi.ordemNoDia ?? exIndex, _idSubDocExercicio: exApi._id,
                    };
                });
                return {
                    _id: diaApi._id, identificadorDia: diaApi.identificadorDia, nomeSubFicha: diaApi.nomeSubFicha || null,
                    tempId: diaApi._id || `edit-dia-${index}-${Date.now()}`, ordemNaRotina: diaApi.ordemNaRotina ?? index,
                    exerciciosDoDia: exerciciosFormatados
                };
            });
        } else if (rotinaParaEditar.exercicios && rotinaParaEditar.exercicios.length > 0 && tipoDaRotinaParaForm === 'individual') {
            const exerciciosLegadosFormatados: ExercicioNoDiaState[] = rotinaParaEditar.exercicios.map((exApi: any, index) => {
                const exercicioData = exApi.exercicioId;
                let idDoEx: string = '';
                let nomeDoEx: string = 'Exercício legado não carregado';
                let grupoDoEx: string | undefined;

                if (typeof exercicioData === 'string') {
                    idDoEx = exercicioData;
                    nomeDoEx = `Exercício Legado (ID: ${idDoEx.substring(0,6)}...)`;
                } else if (exercicioData && typeof exercicioData === 'object' && '_id' in exercicioData) {
                    idDoEx = (exercicioData as any)._id;
                    nomeDoEx = (exercicioData as any).nome;
                    grupoDoEx = (exercicioData as any).grupoMuscular;
                }
                return {
                    tempIdExercicio: exApi._id || `legacy-ex-${index}-${Date.now()}`,
                    exercicioId: idDoEx, nomeExercicio: nomeDoEx, grupoMuscular: grupoDoEx,
                    series: exApi.series, repeticoes: exApi.repeticoes, carga: exApi.carga,
                    descanso: exApi.descanso, observacoes: exApi.observacoes,
                    ordemNoDia: exApi.ordem ?? index, _idSubDocExercicio: exApi._id,
                };
            });
            diasParaEstado = [{
                _id: undefined, tempId: `legacy-dia-${Date.now()}`,
                identificadorDia: form.getValues('tipoOrganizacaoRotina') === 'numerico' ? "1" : (form.getValues('tipoOrganizacaoRotina') === 'diasDaSemana' ? "Segunda-feira" : "Treino Principal"),
                nomeSubFicha: "Exercícios da ficha original", ordemNaRotina: 0,
                exerciciosDoDia: exerciciosLegadosFormatados,
            }];
        }
        setDiasDeTreinoState(diasParaEstado);
      } else { 
        // console.log("[TreinoFormModal useEffect] MODO CRIAÇÃO DETECTADO.");
        const defaultTipoForm: "modelo" | "individual" = alunoIdProp ? "individual" : "modelo";
        const defaultStatusModelo: "rascunho" | "ativo" | "arquivado" | null = defaultTipoForm === 'modelo' ? "rascunho" : null;

        const valoresParaReset: RotinaMetadataFormValues = { // Especificar o tipo aqui
            titulo: "", 
            descricao: null, 
            tipo: defaultTipoForm, 
            tipoOrganizacaoRotina: "numerico",
            alunoId: alunoIdProp || null, 
            pastaId: null, 
            statusModelo: defaultStatusModelo,
            dataValidade: null, 
            totalSessoesRotinaPlanejadas: null,
        };
        // console.log("[TreinoFormModal useEffect] Valores para form.reset (CRIAÇÃO):", JSON.parse(JSON.stringify(valoresParaReset)));
        form.reset(valoresParaReset);
        setDiasDeTreinoState([]);
      }
      setShowDiaForm(false); setDiaFormValues({ identificadorDia: '', nomeSubFicha: '' }); setEditingDiaTempId(null);
      setIsSelectExerciseModalOpen(false); setDiaAtivoParaAdicionarExercicio(null);
    } else {
        // console.log("[TreinoFormModal useEffect] Modal FECHADO, não faz nada no form.reset.");
    }
  }, [open, rotinaParaEditar, form, alunoIdProp]);


  const currentWatchedTipo = form.watch("tipo");
  useEffect(() => {
    const currentIsEditingHook = !!(rotinaParaEditar && rotinaParaEditar._id);
    const currentFormValues = form.getValues();
    
    let targetTipo: "modelo" | "individual" | undefined = currentWatchedTipo;

    if (currentIsEditingHook && rotinaParaEditar?.tipo === 'individual') {
        targetTipo = "individual";
    } else if (!currentIsEditingHook && alunoIdProp) {
        targetTipo = "individual";
    }

    if (targetTipo && targetTipo !== currentFormValues.tipo) {
        form.setValue("tipo", targetTipo, { shouldValidate: true, shouldDirty: true });
        // Não precisa retornar aqui, pois o setValue acima irá disparar um novo ciclo deste useEffect
        // se o valor realmente mudar. E o useEffect principal (de [open, rotinaParaEditar...])
        // lida com o reset inicial. Este useEffect é mais para consistência pós-inicialização.
    }
    
    // Após a possível atualização do 'tipo', pegue o valor mais recente para as lógicas seguintes.
    const finalTipo = form.getValues("tipo");

    if (finalTipo === 'modelo') {
        if (currentFormValues.alunoId !== null) form.setValue('alunoId', null, { shouldDirty: true });
        if (currentFormValues.dataValidade !== null) form.setValue('dataValidade', null, { shouldDirty: true });
        if (currentFormValues.totalSessoesRotinaPlanejadas !== null) form.setValue('totalSessoesRotinaPlanejadas', null, { shouldDirty: true });
        if (form.getValues('statusModelo') === null) { // Somente seta se estiver null, para não sobrescrever um valor já existente da edição
             form.setValue('statusModelo', 'rascunho', { shouldDirty: true }); 
        }
    } else if (finalTipo === 'individual') {
        if (currentFormValues.pastaId !== null) form.setValue('pastaId', null, { shouldDirty: true });
        if (currentFormValues.statusModelo !== null) form.setValue('statusModelo', null, { shouldDirty: true });
        
        if (!currentIsEditingHook && alunoIdProp && form.getValues('alunoId') !== alunoIdProp) {
            form.setValue('alunoId', alunoIdProp, { shouldDirty: true, shouldValidate: true });
        }
    }
    if (!form.getValues('tipoOrganizacaoRotina')) { 
        form.setValue('tipoOrganizacaoRotina', 'numerico', { shouldDirty: true }); 
    }

  }, [currentWatchedTipo, rotinaParaEditar, alunoIdProp, form]);


  const handleDiaInputChange = (e: React.ChangeEvent<HTMLInputElement | HTMLTextAreaElement>) => { const { name, value } = e.target; setDiaFormValues(prev => ({ ...prev, [name]: value })); };

  const handleAddOrUpdateDia = () => {
    if (!diaFormValues.identificadorDia || !diaFormValues.identificadorDia.trim()) { toast({ title: "Erro", description: "O identificador do dia é obrigatório.", variant: "destructive" }); return; }
    if (form.getValues('tipoOrganizacaoRotina') === 'diasDaSemana' && (!editingDiaTempId || diasDeTreinoState.find(d => d.tempId === editingDiaTempId)?.identificadorDia !== diaFormValues.identificadorDia) ) {
        const diaJaExiste = diasDeTreinoState.some(dia => dia.identificadorDia.toLowerCase() === diaFormValues.identificadorDia.toLowerCase());
        if (diaJaExiste) { toast({ title: "Erro", description: `O dia "${diaFormValues.identificadorDia}" já foi adicionado.`, variant: "destructive" }); return; }
    }
    setDiasDeTreinoState(prevDias => {
        const newOrUpdatedDias = [...prevDias];
        if (editingDiaTempId) {
            const index = newOrUpdatedDias.findIndex(d => d.tempId === editingDiaTempId);
            if (index > -1) { newOrUpdatedDias[index] = { ...newOrUpdatedDias[index], identificadorDia: diaFormValues.identificadorDia, nomeSubFicha: diaFormValues.nomeSubFicha || null }; }
        } else {
            newOrUpdatedDias.push({ ...diaFormValues, tempId: `new-dia-${Date.now()}-${Math.random().toString(36).substr(2, 9)}`, ordemNaRotina: newOrUpdatedDias.length, exerciciosDoDia: [] });
        }
        return newOrUpdatedDias.map((d, i) => ({ ...d, ordemNaRotina: i }));
    });
    setShowDiaForm(false); setDiaFormValues({ identificadorDia: '', nomeSubFicha: '' }); setEditingDiaTempId(null);
  };

  const handleEditDia = (dia: DiaDeTreinoStateItem) => { setDiaFormValues({ identificadorDia: dia.identificadorDia, nomeSubFicha: dia.nomeSubFicha || '' }); setEditingDiaTempId(dia.tempId); setShowDiaForm(true); };
  const handleRemoveDia = (tempIdToRemove: string) => { setDiasDeTreinoState(prevDias => prevDias.filter(d => d.tempId !== tempIdToRemove).map((d, index) => ({ ...d, ordemNaRotina: index }))); };
  const handleOpenSelectExerciseModal = (diaTempId: string) => { setDiaAtivoParaAdicionarExercicio(diaTempId); setIsSelectExerciseModalOpen(true); };

  const handleExercisesSelected = useCallback((exerciciosSelecionadosDaLib: BibliotecaExercicio[]) => {
    if (!diaAtivoParaAdicionarExercicio) return;
    setDiasDeTreinoState(prevDias =>
        prevDias.map(dia => {
            if (dia.tempId === diaAtivoParaAdicionarExercicio) {
                const novosExercicios: ExercicioNoDiaState[] = exerciciosSelecionadosDaLib.map((exLib, index) => ({
                    tempIdExercicio: `new-ex-${dia.tempId}-${Date.now()}-${index}`,
                    exercicioId: exLib._id, nomeExercicio: exLib.nome, grupoMuscular: exLib.grupoMuscular,
                    categoria: exLib.categoria, ordemNoDia: dia.exerciciosDoDia.length + index,
                    series: '', repeticoes: '', carga: '', descanso: '', observacoes: '',
                }));
                return { ...dia, exerciciosDoDia: [...dia.exerciciosDoDia, ...novosExercicios] };
            }
            return dia;
        })
    );
    setIsSelectExerciseModalOpen(false); setDiaAtivoParaAdicionarExercicio(null);
  }, [diaAtivoParaAdicionarExercicio]);

  const handleExercicioDetailChange = ( diaTempId: string, exercicioTempId: string, fieldName: 'series' | 'repeticoes' | 'carga' | 'descanso' | 'observacoes', value: string ) => {
    setDiasDeTreinoState(prevDias => prevDias.map(dia => dia.tempId === diaTempId ? { ...dia, exerciciosDoDia: dia.exerciciosDoDia.map(ex => ex.tempIdExercicio === exercicioTempId ? { ...ex, [fieldName]: value } : ex )} : dia ));
  };
  const handleRemoveExercicioFromDia = (diaTempId: string, exercicioTempId: string) => {
    setDiasDeTreinoState(prevDias => prevDias.map(dia => dia.tempId === diaTempId ? { ...dia, exerciciosDoDia: dia.exerciciosDoDia.filter(ex => ex.tempIdExercicio !== exercicioTempId).map((ex, index) => ({ ...ex, ordemNoDia: index }))} : dia ));
  };

  const mutation = useMutation<RotinaListagemItem, Error, RotinaMetadataFormValues>({
    mutationFn: async (formDataFromHook) => {
      const payload: Partial<RotinaApiPayload> = { ...formDataFromHook };
      payload.dataValidade = formDataFromHook.dataValidade ? formDataFromHook.dataValidade : null;
      if (formDataFromHook.tipo === 'modelo') { payload.alunoId = undefined; payload.totalSessoesRotinaPlanejadas = undefined; if (!payload.statusModelo) payload.statusModelo = "rascunho"; }
      else { payload.pastaId = undefined; payload.statusModelo = undefined; if (!payload.alunoId) { throw new Error("Aluno é obrigatório para rotinas individuais."); } }
      payload.diasDeTreino = diasDeTreinoState.map(dia => ({
          _id: dia._id, identificadorDia: dia.identificadorDia, nomeSubFicha: dia.nomeSubFicha || undefined,
          ordemNaRotina: dia.ordemNaRotina,
          exerciciosDoDia: (dia.exerciciosDoDia || []).map(exState => ({
              _id: exState._idSubDocExercicio, exercicioId: exState.exercicioId,
              series: exState.series, repeticoes: exState.repeticoes, carga: exState.carga,
              descanso: exState.descanso, observacoes: exState.observacoes, ordemNoDia: exState.ordemNoDia,
          })),
      }));
      delete (payload as any).exercicios;
      const currentIsEditingForMutation = !!(rotinaParaEditar && rotinaParaEditar._id);
      const endpoint = currentIsEditingForMutation ? `/api/treinos/${rotinaParaEditar!._id}` : "/api/treinos";
      const method = currentIsEditingForMutation ? "PUT" : "POST";
      return apiRequest<RotinaListagemItem>(method, endpoint, payload as RotinaApiPayload);
    },
    onSuccess: (savedRotina) => {
        const currentIsEditingOnSuccess = !!(rotinaParaEditar && rotinaParaEditar._id);
        toast({ title: "Sucesso!", description: `Rotina "${savedRotina.titulo}" ${currentIsEditingOnSuccess ? 'atualizada' : 'criada'} com sucesso.`});
        queryClientHook.invalidateQueries({ queryKey: TREINOS_QUERY_KEY });
        if (currentIsEditingOnSuccess && rotinaParaEditar?._id) { queryClientHook.invalidateQueries({ queryKey: [`/api/treinos/${rotinaParaEditar._id}`] }); }
        if (form.getValues("tipo") === 'modelo') { queryClientHook.invalidateQueries({ queryKey: ["pastasParaRotinaForm"] }); queryClientHook.invalidateQueries({ queryKey: ["/api/pastas/treinos"] });}
        const alunoIdAfetado = form.getValues("alunoId") || (typeof rotinaParaEditar?.alunoId === 'object' && rotinaParaEditar.alunoId?._id) || (typeof rotinaParaEditar?.alunoId === 'string' ? rotinaParaEditar.alunoId : null);
        if (alunoIdAfetado) { queryClientHook.invalidateQueries({ queryKey: ["fichasAluno", alunoIdAfetado] }); }
        onSuccess(savedRotina);
        onClose();
    },
    onError: (error: Error) => {
        const currentIsEditingOnError = !!(rotinaParaEditar && rotinaParaEditar._id);
        console.error("Erro ao salvar rotina:", error);
        toast({ variant: "destructive", title: `Erro ao ${currentIsEditingOnError ? 'Atualizar' : 'Criar'} Rotina`, description: error.message || "Ocorreu um problema." });
    },
  });

  function onSubmit(data: RotinaMetadataFormValues) {
    mutation.mutate(data);
  }
  const diasDaSemanaUtilizados = useMemo(() => { if (watchedTipoOrganizacao === 'diasDaSemana') { return diasDeTreinoState.filter(dia => !editingDiaTempId || dia.tempId !== editingDiaTempId).map(dia => dia.identificadorDia); } return []; }, [diasDeTreinoState, editingDiaTempId, watchedTipoOrganizacao]);

  if (!open) {
    return null;
  }

  return (
    <Dialog open={open} onOpenChange={(openStatus) => { if (!openStatus) onClose(); }}>
      <DialogContent className="sm:max-w-3xl w-[95vw] md:w-[80vw] lg:w-[70vw] xl:w-[60vw] max-h-[95vh] flex flex-col p-0">
        <DialogHeader className="p-4 md:p-6 pb-4 border-b bg-background z-10 shrink-0">
          <DialogTitle>{isEditing ? "Editar Rotina de Treino" : "Nova Rotina de Treino"}</DialogTitle>
          <DialogDescription>{isEditing ? "Atualize os detalhes da rotina e seus dias de treino." : "Defina os detalhes da rotina e adicione os dias de treino."}</DialogDescription>
        </DialogHeader>
        <div className="flex-grow overflow-y-auto">
            <Form {...form}>
            <form id="rotinaFormHandler" onSubmit={form.handleSubmit(onSubmit)} className="px-4 md:px-6 py-4 space-y-6">
                {/* Campos de metadados da rotina */}
                <FormField control={form.control} name="titulo" render={({ field }) => ( <FormItem><FormLabel>Nome da Rotina*</FormLabel><FormControl><Input placeholder="Ex: Programa de Hipertrofia Semanal" {...field} /></FormControl><FormMessage /></FormItem> )}/>
                <FormField control={form.control} name="tipoOrganizacaoRotina" render={({ field }) => ( <FormItem><FormLabel>Organização dos Dias de Treino*</FormLabel><Select onValueChange={(value) => { field.onChange(value); if (showDiaForm) { setDiaFormValues(prev => ({...prev, identificadorDia: ''})); } }} value={field.value ?? "numerico"} > <FormControl><SelectTrigger><SelectValue placeholder="Como os treinos serão divididos?" /></SelectTrigger></FormControl> <SelectContent> {OPCOES_TIPO_DOS_TREINOS.map(opcao => ( <SelectItem key={opcao.value} value={opcao.value}>{opcao.label}</SelectItem> ))} </SelectContent> </Select> <FormDescription className="text-xs">Define como os dias (Ex: A, B, C ou Seg, Ter, Qua) são gerenciados.</FormDescription> <FormMessage /> </FormItem> )}/>
                <FormField control={form.control} name="descricao" render={({ field }) => ( <FormItem><FormLabel>Observações/Instruções Gerais</FormLabel><FormControl><Textarea placeholder="Detalhes adicionais sobre a rotina, recomendações, etc." {...field} value={field.value ?? ""} rows={2} /></FormControl><FormMessage /></FormItem> )}/>
                <FormField control={form.control} name="tipo" render={({ field }) => ( <FormItem><FormLabel>Tipo de Rotina*</FormLabel><Select onValueChange={field.onChange} value={field.value} disabled={(isEditing && rotinaParaEditar?.tipo === 'individual') || !!alunoIdProp}><FormControl><SelectTrigger><SelectValue placeholder="Selecione o tipo" /></SelectTrigger></FormControl><SelectContent><SelectItem value="modelo">Modelo (Template)</SelectItem><SelectItem value="individual">Individual (Para um aluno)</SelectItem></SelectContent></Select>{((isEditing && rotinaParaEditar?.tipo === 'individual') || !!alunoIdProp) && <FormDescription className="text-xs">O tipo da rotina não pode ser alterado neste contexto.</FormDescription>}<FormMessage /></FormItem> )}/>
                
                {watchedTipoRotina === 'modelo' && ( <> <FormField control={form.control} name="pastaId" render={({ field }) => ( <FormItem><FormLabel className="flex items-center"><FolderIcon className="w-4 h-4 mr-1.5 text-gray-500" /> Pasta de Modelos</FormLabel><Select  onValueChange={(value) => field.onChange(value === "nenhuma" ? null : value)}  value={field.value ?? "nenhuma"} disabled={isLoadingPastas} > <FormControl><SelectTrigger><SelectValue placeholder="Opcional: organizar em uma pasta" /></SelectTrigger></FormControl> <SelectContent> <SelectItem value="nenhuma">Nenhuma (Fora de pastas)</SelectItem> {isLoadingPastas && <div className="p-2 text-sm text-muted-foreground">Carregando pastas...</div>} {!isLoadingPastas && pastas.map(pasta => (<SelectItem key={pasta._id} value={pasta._id}>{pasta.nome}</SelectItem>))} </SelectContent> </Select> <FormMessage /> </FormItem> )}/> <FormField control={form.control} name="statusModelo" render={({ field }) => (  <FormItem> <FormLabel className="flex items-center"><Activity className="w-4 h-4 mr-1.5 text-gray-500" /> Status do Modelo*</FormLabel> <Select onValueChange={field.onChange} value={field.value ?? "rascunho"}> <FormControl><SelectTrigger><SelectValue placeholder="Status da rotina modelo" /></SelectTrigger></FormControl> <SelectContent> <SelectItem value="rascunho">Rascunho (Não visível para alunos)</SelectItem> <SelectItem value="ativo">Ativo (Pronto para uso)</SelectItem> <SelectItem value="arquivado">Arquivado (Antigo, não listado)</SelectItem> </SelectContent> </Select> <FormMessage /> </FormItem>  )}/> </> )}
                
                {watchedTipoRotina === 'individual' && (
                <>
                  <FormField control={form.control} name="alunoId" render={({ field }) => ( 
                      <FormItem> 
                          <FormLabel>Aluno*</FormLabel> 
                          <Select  onValueChange={field.onChange}  value={field.value ?? undefined}  
                                  disabled={(isEditing && !!rotinaParaEditar?.alunoId) || !!alunoIdProp || isLoadingAlunos} 
                          > 
                              <FormControl><SelectTrigger><SelectValue placeholder={isLoadingAlunos ? "Carregando..." : "Selecione o aluno"} /></SelectTrigger></FormControl> 
                              <SelectContent> 
                                  {isLoadingAlunos && <div className="p-2 text-sm text-muted-foreground">Carregando alunos...</div>} 
                                  {!isLoadingAlunos && alunosDisponiveis.length === 0 && <div className="p-2 text-sm text-muted-foreground">Nenhum aluno encontrado.</div>} 
                                  {!isLoadingAlunos && alunosDisponiveis.map((aluno: Aluno) => (<SelectItem key={aluno._id} value={aluno._id}>{aluno.nome}</SelectItem>))} 
                              </SelectContent> 
                          </Select> 
                          {((isEditing && !!rotinaParaEditar?.alunoId) || !!alunoIdProp) && 
                              <FormDescription className="text-xs">O aluno não pode ser alterado neste contexto.</FormDescription>
                          }
                          <FormMessage /> 
                      </FormItem> 
                  )}/>
                  <FormField control={form.control} name="dataValidade" render={({ field }) => (
                      <FormItem className="flex flex-col">
                          <FormLabel>Válido Até</FormLabel>
                          <FormControl>
                              <Popover>
                                  <PopoverTrigger asChild>
                                      <Button variant="outline" className={`w-full justify-start pl-3 text-left font-normal ${!field.value && "text-muted-foreground"}`} ref={field.ref} >
                                          <span className="flex items-center w-full">
                                              <span className="flex-grow">
                                                  {field.value ? format(field.value, "PPP", { locale: ptBR }) : <span>Data de expiração (opcional)</span>}
                                              </span>
                                              <CalendarIcon className="ml-auto h-4 w-4 opacity-50 flex-shrink-0" />
                                          </span>
                                      </Button>
                                  </PopoverTrigger>
                                  <PopoverContent className="w-auto p-0" align="start">
                                      <Calendar mode="single" selected={field.value ?? undefined} onSelect={field.onChange}  disabled={(date) => date < startOfToday()} initialFocus />
                                  </PopoverContent>
                              </Popover>
                          </FormControl>
                          <FormMessage />
                      </FormItem>
                  )}/>
                  <FormField control={form.control} name="totalSessoesRotinaPlanejadas" render={({ field }) => (
                      <FormItem>
                        <FormLabel>Nº de Sessões Planejadas</FormLabel>
                        <FormControl>
                          <Input
                            type="number"
                            placeholder="Ex: 12 (opcional)"
                            {...field} 
                            value={field.value === null || field.value === undefined ? "" : String(field.value)} 
                            onChange={e => {
                              const rawValue = e.target.value;
                              if (rawValue.trim() === '') {
                                field.onChange(null); 
                              } else {
                                const numValue = parseInt(rawValue, 10);
                                if (!isNaN(numValue)) {
                                  field.onChange(numValue); 
                                }
                              }
                            }}
                            min="0"
                          />
                        </FormControl>
                        <FormDescription className="text-xs">Opcional. Defina um limite de sessões para esta rotina.</FormDescription>
                        <FormMessage />
                      </FormItem>
                    )}
                  />
                </> 
                )}
                
                {/* Seção de Dias de Treino */}
                <div className="pt-6 mt-6 border-t dark:border-gray-700">
                    <div className="flex justify-between items-center mb-4"> <h3 className="text-lg font-semibold">Dias de Treino da Rotina</h3> <Button type="button" size="sm" variant="outline" onClick={() => { setDiaFormValues({ identificadorDia: '', nomeSubFicha: '' }); setEditingDiaTempId(null); setShowDiaForm(true); }}> <PlusCircle className="w-4 h-4 mr-2"/> Adicionar Dia de Treino </Button> </div>
                    {showDiaForm && ( <Card className="p-4 mb-4 border-dashed dark:border-gray-600 bg-slate-50 dark:bg-slate-800/30"> <CardContent className="p-0 space-y-4"> <div> <Label htmlFor="identificadorDiaForm" className="text-sm font-medium"> {watchedTipoOrganizacao === 'diasDaSemana' && "Selecione o Dia da Semana*"} {watchedTipoOrganizacao === 'numerico' && "Número do Dia* (Ex: 1)"} {watchedTipoOrganizacao === 'livre' && "Identificador do Dia* (Ex: Peito/Tríceps)"} </Label> {watchedTipoOrganizacao === 'diasDaSemana' ? ( <Select value={diaFormValues.identificadorDia} onValueChange={(value) => { setDiaFormValues(prev => ({ ...prev, identificadorDia: value })); }} > <SelectTrigger className="mt-1"> <SelectValue placeholder="Selecione o dia" /> </SelectTrigger> <SelectContent> {diasDaSemanaOptions.map(opt => ( <SelectItem key={opt.value} value={opt.value} disabled={diasDaSemanaUtilizados.includes(opt.value) && diaFormValues.identificadorDia !== opt.value} > {opt.label} </SelectItem> ))} </SelectContent> </Select> ) : watchedTipoOrganizacao === 'numerico' ? ( <Input id="identificadorDiaForm" name="identificadorDia" type="number" value={diaFormValues.identificadorDia} onChange={handleDiaInputChange} placeholder={`Ex: ${diasDeTreinoState.filter(d => !editingDiaTempId || d.tempId !== editingDiaTempId).length + 1}`} className="mt-1" min="1" /> ) : ( <Input id="identificadorDiaForm" name="identificadorDia" value={diaFormValues.identificadorDia} onChange={handleDiaInputChange} placeholder="Ex: Peito e Tríceps, Dia de Força" className="mt-1" /> )} <p className="text-xs text-muted-foreground mt-1"> {watchedTipoOrganizacao === 'diasDaSemana' && "Selecione um dia da semana."} {watchedTipoOrganizacao === 'numerico' && `Sugestão para próximo dia: ${diasDeTreinoState.filter(d => !editingDiaTempId || d.tempId !== editingDiaTempId).length + 1}`} {watchedTipoOrganizacao === 'livre' && "Use um nome curto e descritivo."} </p> </div> <div> <Label htmlFor="nomeSubFichaForm" className="text-sm font-medium">Nome Específico do Treino (Opcional)</Label> <Input id="nomeSubFichaForm" name="nomeSubFicha" value={diaFormValues.nomeSubFicha ?? ""} onChange={handleDiaInputChange} placeholder="Ex: Foco em Peito e Tríceps" className="mt-1" /> </div> <div className="flex justify-end gap-2 pt-2"> <Button type="button" variant="ghost" onClick={() => {setShowDiaForm(false); setEditingDiaTempId(null); setDiaFormValues({identificadorDia: '', nomeSubFicha: ''});}}>Cancelar</Button> <Button type="button" onClick={handleAddOrUpdateDia}>{editingDiaTempId ? "Atualizar Dia" : "Confirmar Dia"}</Button> </div> </CardContent> </Card> )}
                    {diasDeTreinoState.length === 0 && !showDiaForm && ( <div className="text-center py-6"> <Activity className="mx-auto h-12 w-12 text-gray-400" /> <h3 className="mt-2 text-sm font-medium text-gray-900 dark:text-gray-100">Nenhum dia de treino adicionado</h3> <p className="mt-1 text-sm text-gray-500 dark:text-gray-400">Comece adicionando o primeiro dia de treino da rotina.</p> </div> )}
                    
                    {diasDeTreinoState.length > 0 && (
                        <Accordion type="multiple" className="w-full space-y-2" defaultValue={diasDeTreinoState.map(d => d.tempId)}>
                            {diasDeTreinoState.map((dia) => (
                                <AccordionItem key={dia.tempId} value={dia.tempId} className="border rounded-md bg-white dark:bg-slate-800/70 shadow-sm">
                                    <div className="flex items-center justify-between px-3 py-2 group hover:bg-muted/20 dark:hover:bg-slate-700/30 rounded-t-md">
                                        <AccordionTrigger className="flex-1 p-0 hover:no-underline focus-visible:ring-1 focus-visible:ring-ring ">
                                            <div className="flex items-center gap-2 text-sm">
                                                <GripVertical className="w-4 h-4 text-muted-foreground cursor-grab group-data-[state=open]:text-primary transition-colors" />
                                                <span className="font-medium text-gray-700 dark:text-gray-200">{dia.identificadorDia}</span>
                                                {dia.nomeSubFicha && <span className="text-xs text-gray-500 dark:text-gray-400">- {dia.nomeSubFicha}</span>}
                                            </div>
                                        </AccordionTrigger>
                                        <div className="flex items-center gap-1 opacity-100 md:opacity-0 md:group-hover:opacity-100 md:focus-within:opacity-100 transition-opacity shrink-0">
                                            <Button type="button" variant="ghost" size="icon" className="h-7 w-7" onClick={(e) => {e.stopPropagation(); handleEditDia(dia);}} title="Editar dia"> <Edit className="w-3.5 h-3.5"/> </Button>
                                            <Button type="button" variant="ghost" size="icon" className="h-7 w-7 text-destructive hover:text-destructive" onClick={(e) => {e.stopPropagation(); handleRemoveDia(dia.tempId);}} title="Remover dia"> <Trash2 className="w-3.5 h-3.5"/> </Button>
                                        </div>
                                    </div>
                                    <AccordionContent className="px-4 pb-3 pt-0 border-t border-gray-200 dark:border-slate-700/50">
                                        <div className="pt-3 space-y-3">
                                            {dia.exerciciosDoDia && dia.exerciciosDoDia.length > 0 ? (
                                                dia.exerciciosDoDia.map(ex => (
                                                    <Card key={ex.tempIdExercicio} className="p-3 bg-slate-50 dark:bg-slate-700/50">
                                                        <div className="flex justify-between items-start mb-2">
                                                            <div>
                                                                <p className="text-sm font-medium">{ex.nomeExercicio}</p>
                                                                <p className="text-xs text-muted-foreground"> {ex.grupoMuscular}{ex.categoria && ` - ${ex.categoria}`} </p>
                                                            </div>
                                                            <Button type="button" variant="ghost" size="icon" className="h-6 w-6 text-destructive hover:text-destructive shrink-0" onClick={() => handleRemoveExercicioFromDia(dia.tempId, ex.tempIdExercicio)} title="Remover exercício do dia" > <XCircle className="w-4 h-4" /> </Button>
                                                        </div>
                                                        <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-5 gap-x-2 gap-y-3 items-end">
                                                            <FormItem className="flex-grow"> <FormLabel htmlFor={`${ex.tempIdExercicio}-series`} className="text-xs mb-1 block">Séries</FormLabel> <Input id={`${ex.tempIdExercicio}-series`} value={ex.series || ''} onChange={(e) => handleExercicioDetailChange(dia.tempId, ex.tempIdExercicio, 'series', e.target.value)} placeholder="Ex: 3" className="text-xs h-8" /> </FormItem>
                                                            <FormItem className="flex-grow"> <FormLabel htmlFor={`${ex.tempIdExercicio}-repeticoes`} className="text-xs mb-1 block">Repetições</FormLabel> <Input id={`${ex.tempIdExercicio}-repeticoes`} value={ex.repeticoes || ''} onChange={(e) => handleExercicioDetailChange(dia.tempId, ex.tempIdExercicio, 'repeticoes', e.target.value)} placeholder="Ex: 10-12" className="text-xs h-8" /> </FormItem>
                                                            <FormItem className="flex-grow"> <FormLabel htmlFor={`${ex.tempIdExercicio}-carga`} className="text-xs mb-1 block">Carga</FormLabel> <Input id={`${ex.tempIdExercicio}-carga`} value={ex.carga || ''} onChange={(e) => handleExercicioDetailChange(dia.tempId, ex.tempIdExercicio, 'carga', e.target.value)} placeholder="Ex: 20kg" className="text-xs h-8" /> </FormItem>
                                                            <FormItem className="flex-grow"> <FormLabel htmlFor={`${ex.tempIdExercicio}-descanso`} className="text-xs mb-1 block">Descanso</FormLabel> <Input id={`${ex.tempIdExercicio}-descanso`} value={ex.descanso || ''} onChange={(e) => handleExercicioDetailChange(dia.tempId, ex.tempIdExercicio, 'descanso', e.target.value)} placeholder="Ex: 60s" className="text-xs h-8" /> </FormItem>
                                                            <FormItem className="col-span-2 sm:col-span-3 md:col-span-5"> <FormLabel htmlFor={`${ex.tempIdExercicio}-observacoes`} className="text-xs mb-1 block">Obs.</FormLabel> <Textarea id={`${ex.tempIdExercicio}-observacoes`} value={ex.observacoes || ''} onChange={(e) => handleExercicioDetailChange(dia.tempId, ex.tempIdExercicio, 'observacoes', e.target.value)} placeholder="Ex: Cadência 2020, até a falha..." className="text-xs min-h-[32px] py-1" rows={1} /> </FormItem>
                                                        </div>
                                                    </Card>
                                                ))
                                            ) : ( <p className="text-xs text-muted-foreground italic text-center py-2"> Nenhum exercício adicionado a este dia. </p> )}
                                            <Button type="button" variant="outline" size="sm" className="w-full mt-2 border-dashed hover:border-solid" onClick={() => handleOpenSelectExerciseModal(dia.tempId)} > <ListPlus className="w-4 h-4 mr-2" /> Adicionar Exercício ao Dia: {dia.identificadorDia} </Button>
                                        </div>
                                    </AccordionContent>
                                </AccordionItem>
                            ))}
                        </Accordion>
                    )}
                </div>
            </form>
            </Form>
        </div>
        <DialogFooter className="p-4 md:p-6 pt-4 border-t bg-background z-10 shrink-0">
          <DialogClose asChild><Button variant="outline" type="button" disabled={mutation.isPending}>Cancelar</Button></DialogClose>
          <Button type="submit" form="rotinaFormHandler" disabled={mutation.isPending || (form.getValues("tipo") === "individual" && !form.getValues("alunoId") && !isEditing )}>
            {mutation.isPending && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
            {isEditing ? "Salvar Alterações" : "Criar Rotina"}
          </Button>
        </DialogFooter>
      </DialogContent>
      {isSelectExerciseModalOpen && diaAtivoParaAdicionarExercicio && ( <SelectExerciseModal isOpen={isSelectExerciseModalOpen} onClose={() => { setIsSelectExerciseModalOpen(false); setDiaAtivoParaAdicionarExercicio(null); }} onExercisesSelect={handleExercisesSelected} /> )}
    </Dialog>
  );
}