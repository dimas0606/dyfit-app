// client/src/pages/treinos/index.tsx
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import React, { useState, useEffect, useMemo } from "react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Dumbbell, Edit, Trash2, Loader2, User, Eye, CopyPlus, Users, FolderPlus, Folder, FolderOpen, GripVertical } from "lucide-react";
import RotinaFormModal, { RotinaParaEditar } from "@/components/dialogs/RotinaFormModal"; 
import LoadingSpinner from "@/components/LoadingSpinner";
import ErrorMessage from "@/components/ErrorMessage";
import { Aluno } from "@/types/aluno";
import { useToast } from "@/hooks/use-toast";
import {
    AlertDialog,
    AlertDialogAction,
    AlertDialogCancel,
    AlertDialogContent,
    AlertDialogDescription,
    AlertDialogFooter,
    AlertDialogHeader,
    AlertDialogTitle,
    AlertDialogTrigger, // <<< ADICIONADO AlertDialogTrigger AQUI
} from "@/components/ui/alert-dialog";
import {
    Accordion,
    AccordionContent,
    AccordionItem,
    AccordionTrigger,
} from "@/components/ui/accordion";
import { Badge } from "@/components/ui/badge";
import { apiRequest } from "@/lib/queryClient";
// O FichaViewModal será renomeado para RotinaViewModal em um passo futuro
import FichaViewModal, { FichaTreinoView } from "@/components/dialogs/FichaViewModal"; 
import AssociarModeloAlunoModal from "@/components/dialogs/AssociarModeloAlunoModal";
import { Tooltip, TooltipProvider, TooltipContent, TooltipTrigger } from "@/components/ui/tooltip";
import PastaFormModal, { PastaFormData, PastaExistente } from "@/components/dialogs/PastaFormModal";
import { ModalConfirmacao } from "@/components/ui/modal-confirmacao";
import { useConfirmDialog } from "@/hooks/useConfirmDialog";

import {
    DndContext,
    closestCenter,
    KeyboardSensor,
    PointerSensor,
    useSensor,
    useSensors,
    DragEndEvent,
    UniqueIdentifier,
} from '@dnd-kit/core';
import {
    arrayMove,
    SortableContext,
    sortableKeyboardCoordinates,
    verticalListSortingStrategy,
    useSortable,
} from '@dnd-kit/sortable';
import { CSS } from '@dnd-kit/utilities';

import type { RotinaListagemItem, DiaDeTreinoDetalhado, ExercicioEmDiaDeTreinoDetalhado } from '@/types/treinoOuRotinaTypes'; 

// --- TIPOS E INTERFACES ---
type DraggableItemType = "pasta" | "ficha_modelo_em_pasta" | "ficha_modelo_sem_pasta";

interface DraggableItemData {
    type: DraggableItemType;
    pastaId?: string | null;
    ficha?: RotinaListagemItem; // 'ficha' aqui se refere a uma RotinaListagemItem
    pasta?: Pasta;
}

export interface Pasta {
    _id: string;
    nome: string;
    criadorId: string;
    ordem?: number;
    createdAt?: string;
    updatedAt?: string;
}

interface SortableItemProps {
    id: UniqueIdentifier;
    children: React.ReactNode;
    data?: DraggableItemData;
    isDraggingOverlay?: boolean;
}

const SortablePastaItem: React.FC<SortableItemProps> = ({ id, children, data, isDraggingOverlay }) => {
    const { attributes, listeners, setNodeRef, transform, transition, isDragging } = useSortable({ id, data });
    const style: React.CSSProperties = { transform: CSS.Transform.toString(transform), transition: transition || undefined, zIndex: isDragging || isDraggingOverlay ? 100 : (isDragging ? 50 : undefined), opacity: isDraggingOverlay ? 0.5 : (isDragging ? 0.8 : 1) };
    return (<div ref={setNodeRef} style={style} {...attributes} >{React.Children.map(children, child => React.isValidElement(child) ? React.cloneElement(child as React.ReactElement<any>, { dndListeners: listeners }) : child)}</div>);
};

interface SortableFichaItemProps {
    rotina: RotinaListagemItem;
    pastaIdContext: string | null;
    children: React.ReactNode;
    isDraggingOverlay?: boolean;
}
const SortableFichaItem: React.FC<SortableFichaItemProps> = ({ rotina, pastaIdContext, children, isDraggingOverlay }) => {
    const { attributes, listeners, setNodeRef, transform, transition, isDragging } = useSortable({ id: rotina._id, data: { type: pastaIdContext ? "ficha_modelo_em_pasta" : "ficha_modelo_sem_pasta", pastaId: pastaIdContext, ficha: rotina } as DraggableItemData });
    const style: React.CSSProperties = { transform: CSS.Transform.toString(transform), transition: transition || undefined, zIndex: isDragging || isDraggingOverlay ? 200 : (isDragging ? 150 : undefined), opacity: isDraggingOverlay ? 0.5 : (isDragging ? 0.8 : 1), cursor: isDragging ? 'grabbing' : 'grab' };
    return (<div ref={setNodeRef} style={style} {...attributes} {...listeners}>{children}</div>);
};


export default function TreinosPage() {
    const [isRotinaModalOpen, setIsRotinaModalOpen] = useState(false);
    const [rotinaParaEditar, setRotinaParaEditar] = useState<RotinaParaEditar | null>(null); 
    
    const [rotinaParaExcluirState, setRotinaParaExcluirState] = useState<RotinaListagemItem | null>(null);
    const [isViewModalOpen, setIsViewModalOpen] = useState(false);
    const [rotinaParaVisualizar, setRotinaParaVisualizar] = useState<FichaTreinoView | null>(null); // FichaTreinoView será RotinaTreinoView
    const [isAssociarModeloModalOpen, setIsAssociarModeloModalOpen] = useState(false);
    const [rotinaModeloParaAssociar, setRotinaModeloParaAssociar] = useState<{id: string; titulo: string} | null>(null); // Renomeado de fichaModelo...
    const [openAccordionAlunoItems, setOpenAccordionAlunoItems] = useState<string[]>([]);
    const [openAccordionPastaItems, setOpenAccordionPastaItems] = useState<string[]>([]);

    const [isPastaModalOpen, setIsPastaModalOpen] = useState(false);
    const [pastaParaEditarState, setPastaParaEditarState] = useState<PastaExistente | null>(null);
    const [isLoadingSavePasta, setIsLoadingSavePasta] = useState(false);

    const { isOpen: isConfirmDeletePastaOpen, options: confirmDeletePastaOptions, openConfirmDialog: openDeletePastaDialog, closeConfirmDialog: closeDeletePastaDialog, confirm: confirmDeletePastaAction } = useConfirmDialog();
    const [pastaParaExcluir, setPastaParaExcluir] = useState<Pasta | null>(null);

    const [orderedPastas, setOrderedPastas] = useState<Pasta[]>([]);
    const [orderedRotinasModelo, setOrderedRotinasModelo] = useState<RotinaListagemItem[]>([]);

    const queryClient = useQueryClient();
    const { toast } = useToast();
    const sensors = useSensors(useSensor(PointerSensor, { activationConstraint: { distance: 5 } }), useSensor(KeyboardSensor, { coordinateGetter: sortableKeyboardCoordinates }));

    const {
        data: rotinas = [], // 'rotinas' já é o nome correto aqui
        isLoading: isLoadingRotinas,
        error: errorRotinas,
        isFetching: isFetchingRotinas,
    } = useQuery<RotinaListagemItem[], Error>({
        queryKey: ["/api/treinos"], 
        queryFn: async () => {
            try {
                const data = await apiRequest<RotinaListagemItem[]>("GET", "/api/treinos");
                return Array.isArray(data) ? data : [];
            } catch (e) {
                throw e;
            }
        },
        retry: 1,
    });
    
    useEffect(() => {
        const modelos = rotinas
            .filter(r => r.tipo === 'modelo')
            .sort((a, b) => (a.ordemNaPasta ?? 0) - (b.ordemNaPasta ?? 0)); 
        
        if (JSON.stringify(modelos) !== JSON.stringify(orderedRotinasModelo)) {
            setOrderedRotinasModelo(modelos);
        }
    }, [rotinas, orderedRotinasModelo]);

    const { data: alunos = [], isLoading: isLoadingAlunos, error: errorAlunosHook } = useQuery<Aluno[], Error>({
        queryKey: ["/api/alunos"], staleTime: 1000 * 60 * 5, refetchOnWindowFocus: false,
        queryFn: async () => apiRequest<Aluno[]>("GET", "/api/alunos").then(data => Array.isArray(data) ? data : [])
    });

    const { data: pastasFromAPI = [], isLoading: isLoadingPastas, error: errorPastasHook } = useQuery<Pasta[], Error>({
        queryKey: ["/api/pastas/treinos"],
        queryFn: async () => apiRequest<Pasta[]>("GET", "/api/pastas/treinos").then(data => Array.isArray(data) ? data.sort((a, b) => (a.ordem ?? 0) - (b.ordem ?? 0)) : []).catch(() => { console.warn("Falha ao buscar pastas."); return [];})
    });

    useEffect(() => {
        if (pastasFromAPI) {
            const sortedPastas = [...pastasFromAPI].sort((a, b) => (a.ordem ?? 0) - (b.ordem ?? 0));
            if (JSON.stringify(sortedPastas) !== JSON.stringify(orderedPastas)) {
                setOrderedPastas(sortedPastas);
            }
        }
    }, [pastasFromAPI, orderedPastas]);

    const deleteRotinaMutation = useMutation<{ message: string }, Error, string>({
        mutationFn: (rotinaId: string) => apiRequest<{ message: string }>("DELETE", `/api/treinos/${rotinaId}`),
        onSuccess: (data, deletedRotinaId) => {
            toast({ title: "Sucesso!", description: data.message || "Rotina excluída." });
            queryClient.invalidateQueries({ queryKey: ["/api/treinos"] }); 
            queryClient.invalidateQueries({ queryKey: ["/api/treinos", deletedRotinaId] }); 

            const rotinaExcluida = rotinas.find(r => r._id === deletedRotinaId);
            if (rotinaExcluida?.tipo === 'individual' && rotinaExcluida.alunoId) {
                const alunoId = typeof rotinaExcluida.alunoId === 'object' ? rotinaExcluida.alunoId._id : rotinaExcluida.alunoId;
                if (alunoId) queryClient.invalidateQueries({ queryKey: ["fichasAluno", alunoId] }); // Manter "fichasAluno" por enquanto
            }
            setRotinaParaExcluirState(null); 
        },
        onError: (error) => {
            toast({ variant: "destructive", title: "Erro ao Excluir Rotina", description: error.message });
            setRotinaParaExcluirState(null);
        },
    });

    const deletePastaMutation = useMutation<{ message: string }, Error, string>({ 
        mutationFn: (pastaId: string) => apiRequest<{ message: string }>("DELETE", `/api/pastas/treinos/${pastaId}`),
        onSuccess: (data) => { toast({ title: "Pasta Excluída!", description: data.message || `A pasta "${pastaParaExcluir?.nome}" foi excluída.` }); queryClient.invalidateQueries({ queryKey: ["/api/pastas/treinos"] }); queryClient.invalidateQueries({ queryKey: ["/api/treinos"] }); setPastaParaExcluir(null); closeDeletePastaDialog(); },
        onError: (error) => { toast({ variant: "destructive", title: "Erro ao Excluir Pasta", description: error.message || "Não foi possível excluir a pasta." }); closeDeletePastaDialog(); },
    });
    const reorderPastasMutation = useMutation<{ message: string }, Error, { novaOrdemIds: string[] }>({ 
        mutationFn: (payload) => apiRequest<{ message: string }>("PUT", "/api/pastas/treinos/reordenar", payload),
        onSuccess: () => { toast({ title: "Ordem Salva!", description: "A nova ordem das pastas foi salva." }); queryClient.invalidateQueries({ queryKey: ["/api/pastas/treinos"] });  },
        onError: (error) => { toast({ variant: "destructive", title: "Erro ao Reordenar", description: `Não foi possível: ${error.message}` }); queryClient.refetchQueries({ queryKey: ["/api/pastas/treinos"] }); }
    });
    const reorderFichasMutation = useMutation< { message: string }, Error, { idContexto: string | null; novaOrdemFichaIds: string[] } >({ 
        mutationFn: (payload) => apiRequest<{ message: string }>("PUT", "/api/treinos/reordenar", payload),
        onSuccess: () => { toast({ title: "Ordem das Rotinas Salva!", description: "A nova ordem das rotinas foi salva." }); queryClient.invalidateQueries({ queryKey: ["/api/treinos"] });  },
        onError: (error) => { toast({ variant: "destructive", title: "Erro ao Reordenar Rotinas", description: `Não foi possível: ${error.message}` }); queryClient.refetchQueries({ queryKey: ["/api/treinos"] }); }
    });

    const handleDragEnd = (event: DragEndEvent) => {
        const { active, over } = event;
        if (!over || !active || active.id === over.id) return;
        const activeData = active.data.current as DraggableItemData | undefined;
        const overData = over.data.current as DraggableItemData | undefined;
        if (activeData?.type === "pasta" && overData?.type === "pasta") {
            setOrderedPastas((prev) => { const oldIndex = prev.findIndex(p => p._id === active.id); const newIndex = prev.findIndex(p => p._id === over.id); if (oldIndex === -1 || newIndex === -1) return prev; const newArray = arrayMove(prev, oldIndex, newIndex); reorderPastasMutation.mutate({ novaOrdemIds: newArray.map(p => p._id) }); return newArray; });
        } else if (activeData?.type === "ficha_modelo_em_pasta" && overData?.type === "ficha_modelo_em_pasta" && activeData.pastaId === overData.pastaId) {
            const pastaIdDoContexto = activeData.pastaId;
            if (!pastaIdDoContexto) return;
            setOrderedRotinasModelo((prevGlobal) => {
                let fichasNestaPasta = prevGlobal.filter(f => (typeof f.pastaId === 'string' && f.pastaId === pastaIdDoContexto) || (typeof f.pastaId === 'object' && f.pastaId?._id === pastaIdDoContexto));
                const oldIndexInPasta = fichasNestaPasta.findIndex(f => f._id === active.id);
                const newIndexInPasta = fichasNestaPasta.findIndex(f => f._id === over.id);
                if (oldIndexInPasta === -1 || newIndexInPasta === -1) return prevGlobal;
                fichasNestaPasta = arrayMove(fichasNestaPasta, oldIndexInPasta, newIndexInPasta);
                const outrasRotinasModelo = prevGlobal.filter(f => !((typeof f.pastaId === 'string' && f.pastaId === pastaIdDoContexto) || (typeof f.pastaId === 'object' && f.pastaId?._id === pastaIdDoContexto)));
                const novaOrdemFichaIdsParaBackend = fichasNestaPasta.map(f => f._id);
                reorderFichasMutation.mutate({ idContexto: pastaIdDoContexto, novaOrdemFichaIds: novaOrdemFichaIdsParaBackend });
                return [...outrasRotinasModelo, ...fichasNestaPasta].sort((a,b) => (a.ordemNaPasta ?? 0) - (b.ordemNaPasta ?? 0));
            });
        }
    };

    const handleOpenCreateRotinaModal = () => { setRotinaParaEditar(null); setIsRotinaModalOpen(true); };
    
    const handleOpenEditRotinaModal = (rotina: RotinaListagemItem) => {
        const rotinaEditFormat: RotinaParaEditar = {
            _id: rotina._id, 
            titulo: rotina.titulo,
            descricao: rotina.descricao,
            tipo: rotina.tipo,
            statusModelo: rotina.statusModelo,
            alunoId: typeof rotina.alunoId === 'object' && rotina.alunoId !== null ? rotina.alunoId._id : (rotina.alunoId as string | null),
            pastaId: typeof rotina.pastaId === 'object' && rotina.pastaId !== null ? rotina.pastaId._id : (rotina.pastaId as string | null),
            tipoOrganizacaoRotina: rotina.tipoOrganizacaoRotina,
            diasDeTreino: rotina.diasDeTreino,
            dataValidade: rotina.dataValidade, 
            totalSessoesRotinaPlanejadas: rotina.totalSessoesRotinaPlanejadas,
        };
        setRotinaParaEditar(rotinaEditFormat);
        setIsRotinaModalOpen(true);
    };
    
    const handleCloseRotinaModal = () => { setIsRotinaModalOpen(false); setRotinaParaEditar(null); };
    const handleSuccessRotinaModal = (savedRotina: RotinaListagemItem) => { handleCloseRotinaModal(); }; 

    const handleOpenViewModal = (rotina: RotinaListagemItem) => {
        const exerciciosPlanosParaView: ExercicioEmDiaDeTreinoDetalhado[] = (rotina.diasDeTreino || []).flatMap(dia => 
            (dia.exerciciosDoDia || []).map(ex => ({
                ...ex, 
            }))
        );

        const rotinaViewDataParaModal: FichaTreinoView = { // FichaTreinoView será RotinaTreinoView
            _id: rotina._id,
            titulo: rotina.titulo,
            descricao: rotina.descricao ?? undefined,
            tipo: rotina.tipo,
            alunoId: rotina.alunoId, 
            criadorId: rotina.criadorId, 
            criadoEm: rotina.criadoEm,
            atualizadoEm: rotina.atualizadoEm,
            statusModelo: rotina.statusModelo ?? undefined, 
            tipoOrganizacaoRotina: rotina.tipoOrganizacaoRotina,
            diasDeTreino: rotina.diasDeTreino, 
            exercicios: exerciciosPlanosParaView,
        };
        setRotinaParaVisualizar(rotinaViewDataParaModal);
        setIsRotinaModalOpen(false);
        setIsViewModalOpen(true);
    };
    
    const handleTriggerEditRotinaFromView = (rotinaFromView: FichaTreinoView) => { // FichaTreinoView será RotinaTreinoView
        setIsViewModalOpen(false);
        const rotinaOriginal = rotinas.find(r => r._id === rotinaFromView._id);
        if (rotinaOriginal) {
            handleOpenEditRotinaModal(rotinaOriginal);
        } else {
            toast({ title: "Erro", description: "Não foi possível encontrar dados da rotina para edição.", variant: "destructive"});
        }
    };

    const handleTriggerUseOrCopyRotina = (rotinaId: string, rotinaTitulo: string) => { // Renomeado de Ficha
        setIsViewModalOpen(false); 
        setRotinaModeloParaAssociar({ id: rotinaId, titulo: rotinaTitulo }); 
        setIsAssociarModeloModalOpen(true); 
    };
    const handleConfirmDeleteRotina = () => { // Renomeado de Ficha
        if (rotinaParaExcluirState) { 
            deleteRotinaMutation.mutate(rotinaParaExcluirState._id); 
        }
    };
    const handleDeletePastaClick = (pasta: Pasta) => { 
        setPastaParaExcluir(pasta); 
        openDeletePastaDialog({ 
            titulo: "Excluir Pasta de Rotinas", // Renomeado
            mensagem: (<span>Tem certeza que deseja excluir a pasta "<strong>{pasta.nome}</strong>"? <br /> Todas as rotinas modelo dentro dela ficarão sem pasta. Esta ação não pode ser desfeita.</span>), 
            textoConfirmar: "Excluir Pasta", 
            textoCancelar: "Cancelar", 
            onConfirm: () => { if (pasta._id) { deletePastaMutation.mutate(pasta._id); } } 
        }); 
    };
    const handleOpenPastaModal = (pasta?: PastaExistente) => { setPastaParaEditarState(pasta || null); setIsPastaModalOpen(true); };
    const handleSavePasta = async (data: PastaFormData, pastaId?: string) => { 
        setIsLoadingSavePasta(true); 
        const endpoint = pastaId ? `/api/pastas/treinos/${pastaId}` : "/api/pastas/treinos"; 
        const method = pastaId ? "PUT" : "POST"; 
        try { 
            await apiRequest<Pasta>(method, endpoint, data); 
            toast({ title: `Pasta ${pastaId ? 'Atualizada' : 'Criada'}!`, description: `Pasta "${data.nome}" ${pastaId ? 'atualizada' : 'criada'} com sucesso.` }); 
            queryClient.invalidateQueries({ queryKey: ["/api/pastas/treinos"] }); 
            setIsPastaModalOpen(false); 
            setPastaParaEditarState(null); 
        } catch (error: any) { 
            toast({ variant: "destructive", title: `Erro ao ${pastaId ? 'Atualizar' : 'Criar'} Pasta`, description: error.message || "Ocorreu um erro inesperado.", }); 
        } finally { 
            setIsLoadingSavePasta(false); 
        } 
    };
    
    if (isLoadingRotinas || isLoadingAlunos || isLoadingPastas) { return <LoadingSpinner text="Carregando dados de treinos..." />; }
    const combinedError = errorRotinas || errorAlunosHook || errorPastasHook; 
    if (combinedError) { return <ErrorMessage title="Erro ao Carregar Dados" message={combinedError.message} />; }

    const rotinasModeloSemPasta = orderedRotinasModelo.filter(r => !r.pastaId || (typeof r.pastaId === 'object' && !r.pastaId?._id) && typeof r.pastaId !== 'string' );
    const rotinasIndividuais = rotinas.filter(r => r.tipo === 'individual');

    interface RotinasAgrupadasPorAlunoTipoLocal { [alunoId: string]: { alunoNome: string; rotinas: RotinaListagemItem[]; } } // Renomeado de Fichas
    const getNomeAluno = (alunoData?: { _id: string; nome: string; } | string | null): string => { if (!alunoData) return "Aluno não vinculado"; if (typeof alunoData === 'object' && alunoData !== null && alunoData.nome) return alunoData.nome; if (typeof alunoData === 'string') { const alunoEncontrado = alunos?.find(a => a._id === alunoData); return alunoEncontrado ? alunoEncontrado.nome : `ID: ${alunoData.substring(0,6)}..`; } return "Nome Indisp."; };
    const rotinasIndividuaisAgrupadas: RotinasAgrupadasPorAlunoTipoLocal = rotinasIndividuais.reduce((acc, rotina) => { const alunoId = typeof rotina.alunoId === 'object' && rotina.alunoId !== null ? rotina.alunoId._id : (typeof rotina.alunoId === 'string' ? rotina.alunoId : 'sem_aluno'); const alunoNome = getNomeAluno(rotina.alunoId); if (!acc[alunoId]) acc[alunoId] = { alunoNome: alunoNome, rotinas: [] }; acc[alunoId].rotinas.push(rotina); return acc; }, {} as RotinasAgrupadasPorAlunoTipoLocal); // Renomeado de fichas

    const renderRotinaIndividualItem = (rotina: RotinaListagemItem, alunoIdContext: string): JSX.Element => ( <div key={rotina._id} className="border-t first:border-t-0 dark:border-slate-700 p-3 flex flex-col sm:flex-row justify-between items-start sm:items-center gap-2 hover:bg-slate-100 dark:hover:bg-slate-800/60 transition-colors"> <div className="flex-grow"> <h4 className="font-medium text-sm text-slate-800 dark:text-slate-100">{rotina.titulo}</h4> {rotina.descricao && <p className="text-xs text-slate-500 dark:text-slate-400 line-clamp-1">{rotina.descricao}</p>} <p className="text-xs text-slate-400 dark:text-slate-500 mt-0.5"> Criada em: {new Date(rotina.criadoEm).toLocaleDateString('pt-BR')} </p> </div> <div className="flex-shrink-0 flex gap-1 self-start sm:self-center mt-1 sm:mt-0"> <TooltipProvider delayDuration={100}><Tooltip><TooltipTrigger asChild><Button variant="ghost" size="icon" title="Visualizar Rotina" onClick={(e) => { e.stopPropagation(); handleOpenViewModal(rotina);}} className="h-7 w-7 text-blue-600 hover:text-blue-700 dark:text-sky-400 dark:hover:text-sky-300"><Eye className="w-4 h-4" /></Button></TooltipTrigger><TooltipContent><p>Visualizar Rotina</p></TooltipContent></Tooltip></TooltipProvider> <TooltipProvider delayDuration={100}><Tooltip><TooltipTrigger asChild><Button variant="ghost" size="icon" title="Editar Rotina" onClick={(e) => { e.stopPropagation(); handleOpenEditRotinaModal(rotina);}} disabled={deleteRotinaMutation.isPending} className="h-7 w-7 text-yellow-500 hover:text-yellow-600 dark:text-amber-400 dark:hover:text-amber-300"><Edit className="w-4 h-4" /></Button></TooltipTrigger><TooltipContent><p>Editar Rotina</p></TooltipContent></Tooltip></TooltipProvider> <AlertDialog> <TooltipProvider delayDuration={100}><Tooltip><TooltipTrigger asChild><AlertDialogTrigger asChild><Button variant="ghost" size="icon" title="Excluir Rotina" onClick={(e) => {e.stopPropagation(); setRotinaParaExcluirState(rotina);}} disabled={deleteRotinaMutation.isPending && deleteRotinaMutation.variables === rotina._id} className="h-7 w-7 text-red-600 hover:text-red-700 dark:text-rose-500 dark:hover:text-rose-400">{deleteRotinaMutation.isPending && deleteRotinaMutation.variables === rotina._id ? ( <Loader2 className="w-4 h-4 animate-spin" /> ) : ( <Trash2 className="w-4 h-4" /> )}</Button></AlertDialogTrigger></TooltipTrigger><TooltipContent><p>Excluir Rotina</p></TooltipContent></Tooltip></TooltipProvider> {rotinaParaExcluirState?._id === rotina._id && (<AlertDialogContent><AlertDialogHeader><AlertDialogTitle>Confirmar Exclusão</AlertDialogTitle><AlertDialogDescription>Tem certeza que deseja excluir a rotina "{rotinaParaExcluirState?.titulo}"? Esta ação não pode ser desfeita.</AlertDialogDescription></AlertDialogHeader><AlertDialogFooter><AlertDialogCancel onClick={(e) => {e.stopPropagation(); setRotinaParaExcluirState(null);}} disabled={deleteRotinaMutation.isPending}>Cancelar</AlertDialogCancel><AlertDialogAction onClick={(e) => {e.stopPropagation(); handleConfirmDeleteRotina();}} disabled={deleteRotinaMutation.isPending} className="bg-red-600 hover:bg-red-700 dark:bg-red-700 dark:hover:bg-red-800">{deleteRotinaMutation.isPending ? (<><Loader2 className="mr-2 h-4 w-4 animate-spin" /> Excluindo...</>) : "Confirmar Exclusão"}</AlertDialogAction></AlertDialogFooter></AlertDialogContent>)} </AlertDialog> </div> </div> );
    const renderRotinaModeloCard = (rotina: RotinaListagemItem, pastaIdContext: string | null): JSX.Element => ( <SortableFichaItem rotina={rotina} pastaIdContext={pastaIdContext} key={rotina._id}> <div className="border rounded-lg p-4 shadow-sm dark:border-slate-700 bg-white dark:bg-slate-800/90 flex flex-col md:flex-row justify-between items-start md:items-center gap-4 hover:shadow-md transition-shadow"> <div className="flex items-center flex-grow min-w-0">  <GripVertical className="w-5 h-5 text-slate-400 dark:text-slate-500 mr-2 cursor-grab shrink-0" /> <div className="flex-grow truncate"> <h3 className="font-semibold text-lg mb-1 text-slate-800 dark:text-slate-100 truncate" title={rotina.titulo}>{rotina.titulo}</h3> {rotina.descricao && <p className="text-sm text-slate-600 dark:text-slate-400 mb-2 truncate" title={rotina.descricao}>{rotina.descricao}</p>} <p className="text-xs text-slate-500 dark:text-slate-400"> Criada em: {new Date(rotina.criadoEm).toLocaleDateString('pt-BR')} </p> </div> </div> <div className="flex-shrink-0 flex flex-wrap gap-1 self-start md:self-center mt-2 md:mt-0"> <TooltipProvider delayDuration={100}><Tooltip><TooltipTrigger asChild><Button variant="ghost" size="icon" title="Visualizar Rotina" onClick={() => handleOpenViewModal(rotina)} className="h-8 w-8 text-blue-600 hover:text-blue-700 dark:text-sky-400 dark:hover:text-sky-300"><Eye className="w-4 h-4" /></Button></TooltipTrigger><TooltipContent><p>Visualizar Rotina</p></TooltipContent></Tooltip></TooltipProvider> <TooltipProvider delayDuration={100}><Tooltip><TooltipTrigger asChild><Button variant="ghost" size="icon" title="Copiar para Aluno" onClick={() => handleTriggerUseOrCopyRotina(rotina._id, rotina.titulo)} className="h-8 w-8 text-green-600 hover:text-green-700 dark:text-emerald-500 dark:hover:text-emerald-400"><CopyPlus className="w-4 h-4" /></Button></TooltipTrigger><TooltipContent><p>Copiar para Aluno</p></TooltipContent></Tooltip></TooltipProvider> <TooltipProvider delayDuration={100}><Tooltip><TooltipTrigger asChild><Button variant="ghost" size="icon" title="Editar Rotina" onClick={() => handleOpenEditRotinaModal(rotina)} disabled={deleteRotinaMutation.isPending} className="h-8 w-8 text-yellow-500 hover:text-yellow-600 dark:text-amber-400 dark:hover:text-amber-300"><Edit className="w-4 h-4" /></Button></TooltipTrigger><TooltipContent><p>Editar Rotina</p></TooltipContent></Tooltip></TooltipProvider> <AlertDialog> <TooltipProvider delayDuration={100}><Tooltip><TooltipTrigger asChild><AlertDialogTrigger asChild><Button variant="ghost" size="icon" title="Excluir Rotina" onClick={() => {setRotinaParaExcluirState(rotina);}} disabled={deleteRotinaMutation.isPending && deleteRotinaMutation.variables === rotina._id} className="h-8 w-8 text-red-600 hover:text-red-700 dark:text-rose-500 dark:hover:text-rose-400">{deleteRotinaMutation.isPending && deleteRotinaMutation.variables === rotina._id ? ( <Loader2 className="w-4 h-4 animate-spin" /> ) : ( <Trash2 className="w-4 h-4" /> )}</Button></AlertDialogTrigger></TooltipTrigger><TooltipContent><p>Excluir Rotina</p></TooltipContent></Tooltip></TooltipProvider> {rotinaParaExcluirState?._id === rotina._id && ( <AlertDialogContent><AlertDialogHeader> <AlertDialogTitle>Confirmar Exclusão</AlertDialogTitle> <AlertDialogDescription> Tem certeza que deseja excluir a rotina "{rotinaParaExcluirState?.titulo}"? Esta ação não pode ser desfeita. </AlertDialogDescription> </AlertDialogHeader><AlertDialogFooter> <AlertDialogCancel onClick={() => setRotinaParaExcluirState(null)} disabled={deleteRotinaMutation.isPending}>Cancelar</AlertDialogCancel> <AlertDialogAction onClick={handleConfirmDeleteRotina} disabled={deleteRotinaMutation.isPending} className="bg-red-600 hover:bg-red-700 dark:bg-red-700 dark:hover:bg-red-800"> {deleteRotinaMutation.isPending ? (<><Loader2 className="mr-2 h-4 w-4 animate-spin" /> Excluindo...</>) : "Confirmar Exclusão"} </AlertDialogAction> </AlertDialogFooter></AlertDialogContent>)} </AlertDialog> </div> </div> </SortableFichaItem> );
    interface DraggablePastaAccordionItemProps { pasta: Pasta; fichasNestaPasta: RotinaListagemItem[]; dndListeners?: any; } // Renomeado fichasNestaPasta
    const DraggablePastaAccordionItem: React.FC<DraggablePastaAccordionItemProps> = ({ pasta, fichasNestaPasta: rotinasNestaPasta, dndListeners }) => { const rotinasOrdenadasNaPasta = useMemo(() => [...rotinasNestaPasta].sort((a, b) => (a.ordemNaPasta ?? 0) - (b.ordemNaPasta ?? 0)), [rotinasNestaPasta]); return ( <AccordionItem value={pasta._id} key={pasta._id} className="border dark:border-slate-700 rounded-lg shadow-sm bg-white dark:bg-slate-800/50 overflow-hidden"> <div className="flex items-center justify-between px-4 py-1 hover:bg-slate-100 dark:hover:bg-slate-700/80 rounded-t-lg transition-colors"> <AccordionTrigger className="flex-grow py-2 px-0 hover:no-underline text-slate-800 dark:text-slate-100"> <div className="flex items-center gap-2"> <span {...dndListeners} className="p-1.5 cursor-grab touch-none" title="Reordenar Pasta"><GripVertical className="w-4 h-4 text-slate-400 hover:text-slate-600 dark:text-slate-500 dark:hover:text-slate-300" /></span> <FolderOpen className="w-5 h-5 text-blue-500 dark:text-sky-500" /> <span className="font-medium text-left">{pasta.nome}</span> <Badge variant="secondary" className="ml-2 bg-blue-100 text-blue-700 dark:bg-sky-700 dark:text-sky-100">{rotinasOrdenadasNaPasta.length} rotina(s)</Badge> </div> </AccordionTrigger> <div className="flex items-center gap-1 flex-shrink-0 ml-2"> <TooltipProvider delayDuration={100}><Tooltip><TooltipTrigger asChild><Button variant="ghost" size="icon" className="h-7 w-7 text-slate-500 hover:text-yellow-600 dark:text-slate-400 dark:hover:text-amber-400" onClick={(e) => { e.stopPropagation(); handleOpenPastaModal(pasta);}} title="Editar Pasta"> <Edit className="w-4 h-4"/> </Button></TooltipTrigger><TooltipContent><p>Editar Pasta</p></TooltipContent></Tooltip></TooltipProvider> <TooltipProvider delayDuration={100}><Tooltip><TooltipTrigger asChild><Button variant="ghost" size="icon" className="h-7 w-7 text-slate-500 hover:text-red-600 dark:text-slate-400 dark:hover:text-rose-500" onClick={(e) => { e.stopPropagation(); handleDeletePastaClick(pasta);}} title="Excluir Pasta" disabled={deletePastaMutation.isPending && pastaParaExcluir?._id === pasta._id}>{deletePastaMutation.isPending && pastaParaExcluir?._id === pasta._id ? (<Loader2 className="w-4 h-4 animate-spin" />) : (<Trash2 className="w-4 h-4"/>)}</Button></TooltipTrigger><TooltipContent><p>Excluir Pasta</p></TooltipContent></Tooltip></TooltipProvider> </div> </div> <AccordionContent className="px-4 py-3 border-t dark:border-slate-700 bg-slate-50 dark:bg-slate-800/30"> {rotinasOrdenadasNaPasta.length > 0 ? ( <SortableContext items={rotinasOrdenadasNaPasta.map(r => r._id)} strategy={verticalListSortingStrategy}> <div className="space-y-3"> {rotinasOrdenadasNaPasta.map(rotina => renderRotinaModeloCard(rotina, pasta._id))} </div> </SortableContext> ) : ( <p className="text-sm text-center text-slate-500 dark:text-slate-400 py-3">Nenhuma rotina modelo nesta pasta.</p> )} </AccordionContent> </AccordionItem> ); };

    return (
        <TooltipProvider>
            <DndContext sensors={sensors} collisionDetection={closestCenter} onDragEnd={handleDragEnd}>
                <div className="container mx-auto py-8 px-4 bg-slate-50 dark:bg-slate-900 min-h-screen">
                    <Card className="mb-8 shadow-lg dark:bg-slate-800">
                        <CardHeader className="border-b dark:border-slate-700 bg-slate-100 dark:bg-slate-700/50 p-4 rounded-t-lg">
                            <CardTitle className="flex flex-col sm:flex-row items-start sm:items-center justify-between text-xl font-semibold text-slate-800 dark:text-slate-100 gap-2">
                                <span className="flex items-center"><Folder className="w-6 h-6 mr-2 text-blue-600 dark:text-sky-500"/>Rotinas de Treino Modelo</span>
                                <div className="flex items-center gap-2 self-start sm:self-center">
                                    <Button size="sm" variant="outline" onClick={() => handleOpenPastaModal()} className="border-blue-500 text-blue-600 hover:bg-blue-50 dark:border-sky-500 dark:text-sky-400 dark:hover:bg-sky-900/50 text-sm"><FolderPlus className="w-4 h-4 mr-2" /> Nova Pasta</Button>
                                    <Button size="sm" onClick={handleOpenCreateRotinaModal} className="bg-blue-600 hover:bg-blue-700 dark:bg-sky-600 dark:hover:dark:bg-sky-700 text-white text-sm"> <Dumbbell className="w-4 h-4 mr-2" /> Nova Rotina Modelo </Button>
                                </div>
                            </CardTitle>
                        </CardHeader>
                        <CardContent className="pt-6">
                             {isLoadingPastas && <LoadingSpinner text="Carregando pastas..." />}
                            {!isLoadingPastas && orderedPastas.length > 0 && ( <SortableContext items={orderedPastas.map(p => p._id)} strategy={verticalListSortingStrategy}> <Accordion type="multiple" className="w-full space-y-3 mb-6" value={openAccordionPastaItems} onValueChange={setOpenAccordionPastaItems}> {orderedPastas.map(pasta => { const rotinasNestaPasta = orderedRotinasModelo.filter(r => (typeof r.pastaId === 'string' && r.pastaId === pasta._id) || (typeof r.pastaId === 'object' && r.pastaId !== null && r.pastaId._id === pasta._id) ); return ( <SortablePastaItem key={pasta._id} id={pasta._id} data={{ type: "pasta", pasta: pasta }}> <DraggablePastaAccordionItem pasta={pasta} fichasNestaPasta={rotinasNestaPasta} /> </SortablePastaItem> ); })} </Accordion> </SortableContext> )}
                            {rotinasModeloSemPasta.length > 0 && ( <><h4 className="text-md font-semibold text-slate-700 dark:text-slate-300 mb-3 mt-4 pt-4 border-t dark:border-slate-700">Rotinas Sem Pasta</h4> <div className="space-y-4"> {rotinasModeloSemPasta.map(rotina => renderRotinaModeloCard(rotina, null))} </div></> )}
                            {!isLoadingPastas && orderedRotinasModelo.length === 0 && orderedPastas.length === 0 && (<p className="text-center text-slate-500 dark:text-slate-400 py-6">Nenhuma rotina modelo ou pasta cadastrada.</p>)}
                        </CardContent>
                    </Card>
                    <Card className="shadow-lg dark:bg-slate-800">
                        <CardHeader className="border-b dark:border-slate-700 bg-slate-100 dark:bg-slate-700/50 p-4 rounded-t-lg">
                            <CardTitle className="text-xl font-semibold text-slate-800 dark:text-slate-100 flex items-center"><Users className="w-5 h-5 mr-2 text-teal-600 dark:text-teal-500"/>Rotinas de Treino Individuais</CardTitle>
                        </CardHeader>
                        <CardContent className="pt-2 px-0 sm:px-2 md:px-4">
                            {Object.keys(rotinasIndividuaisAgrupadas).length > 0 ? ( <Accordion type="multiple" className="w-full" value={openAccordionAlunoItems} onValueChange={setOpenAccordionAlunoItems}> {Object.entries(rotinasIndividuaisAgrupadas) .sort(([, dataA], [, dataB]) => dataA.alunoNome.localeCompare(dataB.alunoNome)) .map(([alunoId, data]) => ( <AccordionItem value={alunoId} key={alunoId} className="border-b dark:border-slate-700 last:border-b-0"> <AccordionTrigger className="py-4 px-3 hover:bg-slate-100 dark:hover:bg-slate-700/80 rounded-t-md text-left text-slate-700 dark:text-slate-200 transition-colors"> <div className="flex items-center gap-2"> <User className="w-4 h-4 text-teal-600 dark:text-teal-500" /> <span className="font-medium ">{data.alunoNome}</span> <Badge variant="outline" className="ml-2 border-teal-500 text-teal-600 dark:border-teal-600 dark:text-teal-400">{data.rotinas.length} rotina(s)</Badge> </div> </AccordionTrigger> <AccordionContent className="bg-slate-50 dark:bg-slate-800/30 px-0 py-0 rounded-b-md"> {data.rotinas.sort((a,b) => new Date(b.criadoEm).getTime() - new Date(a.criadoEm).getTime()).map(rotina => renderRotinaIndividualItem(rotina, alunoId))} </AccordionContent> </AccordionItem> ))} </Accordion> ) : (<p className="text-center text-slate-500 dark:text-slate-400 py-6">Nenhuma rotina individual atribuída.</p>)}
                        </CardContent>
                    </Card>
                    {isRotinaModalOpen && ( <RotinaFormModal open={isRotinaModalOpen} onClose={handleCloseRotinaModal} onSuccess={handleSuccessRotinaModal} alunos={alunos || []} rotinaParaEditar={rotinaParaEditar} /> )}
                    {isViewModalOpen && rotinaParaVisualizar && ( <FichaViewModal isOpen={isViewModalOpen} onClose={() => { setIsViewModalOpen(false); setRotinaParaVisualizar(null); }} ficha={rotinaParaVisualizar} onUseOuCopiarFicha={handleTriggerUseOrCopyRotina} onEditFicha={handleTriggerEditRotinaFromView}/> )}
                    {isAssociarModeloModalOpen && rotinaModeloParaAssociar && ( <AssociarModeloAlunoModal isOpen={isAssociarModeloModalOpen} onClose={() => setIsAssociarModeloModalOpen(false)} fichaModeloId={rotinaModeloParaAssociar.id} fichaModeloTitulo={rotinaModeloParaAssociar.titulo}/> )}
                    {isPastaModalOpen && ( <PastaFormModal isOpen={isPastaModalOpen} onClose={() => { setIsPastaModalOpen(false); setPastaParaEditarState(null); }} onSave={handleSavePasta} initialData={pastaParaEditarState} isLoading={isLoadingSavePasta}/> )}
                    <ModalConfirmacao isOpen={isConfirmDeletePastaOpen} onClose={closeDeletePastaDialog} onConfirm={confirmDeletePastaAction} titulo={confirmDeletePastaOptions.titulo} mensagem={confirmDeletePastaOptions.mensagem} textoConfirmar={confirmDeletePastaOptions.textoConfirmar} textoCancelar={confirmDeletePastaOptions.textoCancelar} isLoadingConfirm={deletePastaMutation.isPending}/>
                </div>
            </DndContext>
        </TooltipProvider>
    );
}

