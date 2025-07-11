// client/src/pages/treinos/index.tsx
import React, { useState } from "react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { Button } from "@/components/ui/button";
import { Dumbbell, Plus, Folder, FolderPlus, Edit, Trash2 } from "lucide-react";
import RotinaFormModal, { RotinaParaEditar } from "@/components/dialogs/RotinaFormModal"; 
import LoadingSpinner from "@/components/LoadingSpinner";
import ErrorMessage from "@/components/ErrorMessage";
import { Aluno } from "@/types/aluno";
import { useToast } from "@/hooks/use-toast";
import { AlertDialog, AlertDialogAction, AlertDialogCancel, AlertDialogContent, AlertDialogDescription, AlertDialogFooter, AlertDialogHeader, AlertDialogTitle } from "@/components/ui/alert-dialog";
import { Accordion, AccordionContent, AccordionItem, AccordionTrigger } from "@/components/ui/accordion";
import { apiRequest } from "@/lib/queryClient";
import AssociarModeloAlunoModal from "@/components/dialogs/AssociarModeloAlunoModal";
import type { RotinaListagemItem } from '@/types/treinoOuRotinaTypes'; 
import { RotinaCard } from '@/components/rotinas/RotinaCard';
import { Tabs, TabsList, TabsTrigger } from "@/components/ui/tabs";
import RotinaViewModal from "@/components/dialogs/RotinaViewModal";
import PastaFormModal, { PastaExistente } from "@/components/dialogs/PastaFormModal";
import { Badge } from "@/components/ui/badge";
import { DndContext, closestCenter, DragEndEvent, useSensor, useSensors, PointerSensor } from '@dnd-kit/core';
import { SortableContext, useSortable, verticalListSortingStrategy } from '@dnd-kit/sortable';
import { CSS } from '@dnd-kit/utilities';

export interface Pasta { _id: string; nome: string; ordem?: number; }

const SortableRotinaCard = ({ rotina, ...props }: { rotina: RotinaListagemItem } & Omit<React.ComponentProps<typeof RotinaCard>, 'rotina'>) => {
    const { attributes, listeners, setNodeRef, transform, isDragging } = useSortable({ id: rotina._id, data: { type: 'rotina', rotina } });
    const style: React.CSSProperties = { transform: CSS.Translate.toString(transform), zIndex: isDragging ? 10 : undefined, opacity: isDragging ? 0.5 : 1 };
    return ( <div ref={setNodeRef} style={style}> <RotinaCard rotina={rotina} dndHandleProps={{...attributes, ...listeners}} {...props} /> </div> );
};

const DroppableArea = ({ id, children }: { id: string, children: React.ReactNode }) => {
    const { setNodeRef } = useSortable({ id });
    return <div ref={setNodeRef}>{children}</div>;
}

export default function TreinosPage() {
    const [isRotinaModalOpen, setIsRotinaModalOpen] = useState(false);
    const [rotinaParaEditar, setRotinaParaEditar] = useState<RotinaParaEditar | null>(null); 
    const [rotinaParaExcluir, setRotinaParaExcluir] = useState<RotinaListagemItem | null>(null);
    const [isViewModalOpen, setIsViewModalOpen] = useState(false);
    const [rotinaParaVisualizar, setRotinaParaVisualizar] = useState<RotinaListagemItem | null>(null);
    const [isAssociarModeloModalOpen, setIsAssociarModeloModalOpen] = useState(false);
    const [rotinaModeloParaAssociar, setRotinaModeloParaAssociar] = useState<{id: string; titulo: string} | null>(null);
    const [aba, setAba] = useState<'modelos' | 'individuais'>('modelos');
    const [isPastaModalOpen, setIsPastaModalOpen] = useState(false);
    const [pastaParaEditar, setPastaParaEditar] = useState<PastaExistente | null>(null);
    
    const queryClient = useQueryClient();
    const { toast } = useToast();
    const sensors = useSensors(useSensor(PointerSensor, { activationConstraint: { distance: 8 } }));

    const { data: rotinas = [], isLoading: isLoadingRotinas, error: errorRotinas } = useQuery<RotinaListagemItem[], Error>({ queryKey: ["/api/treinos"], queryFn: () => apiRequest("GET", "/api/treinos") });
    const { data: alunos = [] } = useQuery<Aluno[], Error>({ queryKey: ["/api/alunos"], queryFn: () => apiRequest("GET", "/api/alunos"), staleTime: 1000 * 60 * 5 });
    const { data: pastas = [], isLoading: isLoadingPastas } = useQuery<Pasta[], Error>({ queryKey: ["/api/pastas/treinos"], queryFn: () => apiRequest("GET", "/api/pastas/treinos")});

    const updateRotinaPastaMutation = useMutation<any, Error, { rotinaId: string; pastaId: string | null }>({
        mutationFn: ({ rotinaId, pastaId }) => apiRequest("PUT", `/api/treinos/${rotinaId}/pasta`, { pastaId }),
        onSuccess: () => { toast({ title: "Sucesso!", description: "Rotina movida." }); queryClient.invalidateQueries({ queryKey: ["/api/treinos"] }); },
        onError: (error) => toast({ variant: "destructive", title: "Erro", description: error.message }),
    });

    const handleDragEnd = (event: DragEndEvent) => {
        const { over, active } = event;
        if (over && active.data.current?.type === 'rotina') {
            const rotina = active.data.current.rotina as RotinaListagemItem;
            const rotinaId = active.id as string;
            const pastaDestinoId = over.id === 'sem-pasta-droppable' ? null : over.id as string;
            const pastaOrigemId = rotina.pastaId ? (typeof rotina.pastaId === 'string' ? rotina.pastaId : rotina.pastaId._id) : null;
            if (pastaDestinoId !== pastaOrigemId) {
                updateRotinaPastaMutation.mutate({ rotinaId, pastaId: pastaDestinoId });
            }
        }
    };
    
    const deleteRotinaMutation = useMutation<any, Error, string>({ mutationFn: (id) => apiRequest("DELETE", `/api/treinos/${id}`), onSuccess: () => { toast({ title: "Sucesso!", description: "Rotina excluída."}); queryClient.invalidateQueries({ queryKey: ["/api/treinos"] }); setRotinaParaExcluir(null); }, onError: (err) => toast({ variant: "destructive", title: "Erro", description: err.message }) });
    const deletePastaMutation = useMutation<any, Error, string>({ mutationFn: (id) => apiRequest("DELETE", `/api/pastas/treinos/${id}`), onSuccess: () => { toast({ title: "Sucesso!", description: "Pasta excluída."}); queryClient.invalidateQueries({ queryKey: ["/api/pastas/treinos", "/api/treinos"] }); }, onError: (err) => toast({ variant: "destructive", title: "Erro", description: err.message }) });
    const handleOpenCreateModal = () => { setRotinaParaEditar(null); setIsRotinaModalOpen(true); };
    const handleOpenEditModal = (r: RotinaListagemItem) => { setIsViewModalOpen(false); setRotinaParaEditar(r); setIsRotinaModalOpen(true); };
    const handleDeleteClick = (r: RotinaListagemItem) => setRotinaParaExcluir(r);
    const handleConfirmDelete = () => { if (rotinaParaExcluir) deleteRotinaMutation.mutate(rotinaParaExcluir._id); };
    const handleOpenViewModal = (r: RotinaListagemItem) => { setRotinaParaVisualizar(r); setIsViewModalOpen(true); };
    const handleAssignClick = (id: string, t: string) => { setIsViewModalOpen(false); setRotinaModeloParaAssociar({ id, titulo: t }); setIsAssociarModeloModalOpen(true); };
    const handleOpenPastaModal = (p?: PastaExistente) => { setPastaParaEditar(p || null); setIsPastaModalOpen(true); };
    const handleDeletePastaClick = (id: string) => deletePastaMutation.mutate(id);

    if (isLoadingRotinas || isLoadingPastas) return <LoadingSpinner text="Carregando dados de treinos..." />;
    if (errorRotinas) return <ErrorMessage title="Erro ao Carregar Dados" message={errorRotinas.message} />;

    const rotinasModelo = rotinas.filter(r => r.tipo === 'modelo');
    const rotinasIndividuais = rotinas.filter(r => r.tipo === 'individual');
    const rotinasPorPasta = pastas.sort((a, b) => (a.ordem || 0) - (b.ordem || 0)).map(p => ({ ...p, rotinas: rotinasModelo.filter(r => (typeof r.pastaId === 'string' ? r.pastaId : r.pastaId?._id) === p._id) }));
    const rotinasSemPasta = rotinasModelo.filter(r => !r.pastaId);

    return (
      <DndContext sensors={sensors} collisionDetection={closestCenter} onDragEnd={handleDragEnd}>
        <div className="container mx-auto py-8 px-4">
            <div className="flex justify-between items-center mb-6">
                <h1 className="text-3xl font-bold text-gray-800 dark:text-gray-100 flex items-center"><Dumbbell className="mr-3 h-8 w-8 text-primary"/>Gerenciar Rotinas</h1>
                <div className="flex gap-2"><Button variant="outline" onClick={() => handleOpenPastaModal()}><FolderPlus className="mr-2 h-4 w-4"/> Nova Pasta</Button><Button onClick={handleOpenCreateModal}><Plus className="mr-2 h-4 w-4" /> Nova Rotina</Button></div>
            </div>
            <Tabs value={aba} onValueChange={(v) => setAba(v as any)} className="mb-6"><TabsList className="grid w-full grid-cols-2"><TabsTrigger value="modelos">Rotinas Modelo</TabsTrigger><TabsTrigger value="individuais">Rotinas Individuais</TabsTrigger></TabsList></Tabs>

            {aba === 'modelos' && (
                <div className="space-y-6">
                    <Accordion type="multiple" className="w-full space-y-3">
                        {rotinasPorPasta.map(pasta => (
                            <DroppableArea key={pasta._id} id={pasta._id}>
                                <AccordionItem value={pasta._id} className="border dark:border-slate-700 rounded-lg bg-white dark:bg-slate-800/50 shadow-sm">
                                    <AccordionTrigger className="px-4 py-3 hover:no-underline font-semibold text-lg">
                                        <div className="flex-grow flex items-center gap-3"><Folder className="h-5 w-5 text-primary"/>{pasta.nome}<Badge variant="secondary">{pasta.rotinas.length}</Badge></div>
                                        <div className="flex-shrink-0 flex items-center gap-1"><Button variant="ghost" size="icon" className="h-7 w-7" onClick={(e) => { e.stopPropagation(); handleOpenPastaModal(pasta); }}><Edit className="h-4 w-4"/></Button><Button variant="ghost" size="icon" className="h-7 w-7 text-red-500" onClick={(e) => { e.stopPropagation(); handleDeletePastaClick(pasta._id); }}><Trash2 className="h-4 w-4"/></Button></div>
                                    </AccordionTrigger>
                                    <AccordionContent className="p-4 border-t dark:border-slate-700">
                                        <SortableContext items={pasta.rotinas.map(r => r._id)} strategy={verticalListSortingStrategy}>
                                            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6 min-h-[50px]">
                                                {pasta.rotinas.map(rotina => <SortableRotinaCard key={rotina._id} rotina={rotina} onView={handleOpenViewModal} onEdit={handleOpenEditModal} onDelete={handleDeleteClick} onAssign={handleAssignClick} />)}
                                            </div>
                                        </SortableContext>
                                    </AccordionContent>
                                </AccordionItem>
                            </DroppableArea>
                        ))}
                    </Accordion>
                    {rotinasSemPasta.length > 0 && (<div><h3 className="text-lg font-semibold mb-4 pt-4 border-t dark:border-slate-700">Rotinas Sem Pasta</h3>
                        <DroppableArea id="sem-pasta-droppable">
                            <div className="p-4 border-2 border-dashed dark:border-slate-700 rounded-lg min-h-[100px]">
                                <SortableContext items={rotinasSemPasta.map(r => r._id)} strategy={verticalListSortingStrategy}>
                                    <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-6">
                                        {rotinasSemPasta.map(rotina => <SortableRotinaCard key={rotina._id} rotina={rotina} onView={handleOpenViewModal} onEdit={handleOpenEditModal} onDelete={handleDeleteClick} onAssign={handleAssignClick} />)}
                                    </div>
                                </SortableContext>
                            </div>
                        </DroppableArea>
                    </div>)}
                </div>
            )}
            
            {aba === 'individuais' && (<div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-6">{rotinasIndividuais.map(rotina => {const aluno = alunos.find(a => a._id === (typeof rotina.alunoId === 'string' ? rotina.alunoId : rotina.alunoId?._id)); return (<RotinaCard key={rotina._id} rotina={rotina} alunoNome={aluno?.nome} onView={handleOpenViewModal} onEdit={handleOpenEditModal} onDelete={handleDeleteClick} onAssign={handleAssignClick} />)})}</div>)}
            
            {isRotinaModalOpen && <RotinaFormModal open={isRotinaModalOpen} onClose={() => setIsRotinaModalOpen(false)} onSuccess={() => {}} alunos={alunos} rotinaParaEditar={rotinaParaEditar} />}
            <RotinaViewModal isOpen={isViewModalOpen} onClose={() => setIsViewModalOpen(false)} rotina={rotinaParaVisualizar} onEdit={handleOpenEditModal} onAssign={handleAssignClick} />
            {isAssociarModeloModalOpen && rotinaModeloParaAssociar && <AssociarModeloAlunoModal isOpen={isAssociarModeloModalOpen} onClose={() => setIsAssociarModeloModalOpen(false)} fichaModeloId={rotinaModeloParaAssociar.id} fichaModeloTitulo={rotinaModeloParaAssociar.titulo}/>}
            {isPastaModalOpen && <PastaFormModal isOpen={isPastaModalOpen} onClose={() => {setIsPastaModalOpen(false); setPastaParaEditar(null);}} onSave={async () => { await queryClient.invalidateQueries({ queryKey: ["/api/pastas/treinos"] }); setIsPastaModalOpen(false); }} initialData={pastaParaEditar} />}
            <AlertDialog open={!!rotinaParaExcluir} onOpenChange={(open) => !open && setRotinaParaExcluir(null)}><AlertDialogContent><AlertDialogHeader><AlertDialogTitle>Confirmar Exclusão</AlertDialogTitle><AlertDialogDescription>Tem certeza que deseja excluir a rotina "{rotinaParaExcluir?.titulo}"?</AlertDialogDescription></AlertDialogHeader><AlertDialogFooter><AlertDialogCancel onClick={() => setRotinaParaExcluir(null)}>Cancelar</AlertDialogCancel><AlertDialogAction onClick={handleConfirmDelete} disabled={deleteRotinaMutation.isPending} className="bg-red-600 hover:bg-red-700">Confirmar</AlertDialogAction></AlertDialogFooter></AlertDialogContent></AlertDialog>
        </div>
      </DndContext>
    );
}