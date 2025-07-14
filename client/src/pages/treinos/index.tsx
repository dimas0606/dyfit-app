// client/src/pages/treinos/index.tsx
import { useState } from "react";
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

export interface Pasta { _id: string; nome: string; ordem?: number; }

export default function TreinosPage() {
    const [isRotinaModalOpen, setIsRotinaModalOpen] = useState(false);
    const [rotinaParaEditar, setRotinaParaEditar] = useState<RotinaParaEditar | null>(null); 
    const [isViewModalOpen, setIsViewModalOpen] = useState(false);
    const [rotinaParaVisualizar, setRotinaParaVisualizar] = useState<RotinaListagemItem | null>(null);
    const [isAssociarModeloModalOpen, setIsAssociarModeloModalOpen] = useState(false);
    const [rotinaModeloParaAssociar, setRotinaModeloParaAssociar] = useState<{id: string; titulo: string} | null>(null);
    const [aba, setAba] = useState<'modelos' | 'individuais'>('modelos');
    const [isPastaModalOpen, setIsPastaModalOpen] = useState(false);
    const [pastaParaEditar, setPastaParaEditar] = useState<PastaExistente | null>(null);
    const [isDeleteAlertOpen, setIsDeleteAlertOpen] = useState(false);
    const [itemParaExcluir, setItemParaExcluir] = useState<{ id: string; nome: string; tipo: 'rotina' | 'pasta' } | null>(null);
    
    const queryClient = useQueryClient();
    const { toast } = useToast();

    const { data: rotinas = [], isLoading: isLoadingRotinas, error: errorRotinas } = useQuery<RotinaListagemItem[], Error>({ queryKey: ["/api/treinos"], queryFn: () => apiRequest("GET", "/api/treinos") });
    const { data: alunos = [] } = useQuery<Aluno[], Error>({ queryKey: ["/api/alunos"], queryFn: () => apiRequest("GET", "/api/alunos"), staleTime: 1000 * 60 * 5 });
    const { data: pastas = [], isLoading: isLoadingPastas } = useQuery<Pasta[], Error>({ queryKey: ["/api/pastas/treinos"], queryFn: () => apiRequest("GET", "/api/pastas/treinos")});
    
    const deleteMutation = useMutation<any, Error, { id: string; tipo: 'rotina' | 'pasta' }>({
        mutationFn: ({ id, tipo }) => apiRequest("DELETE", tipo === 'rotina' ? `/api/treinos/${id}` : `/api/pastas/treinos/${id}`),
        onSuccess: (_, variables) => {
            const itemTipo = variables.tipo === 'rotina' ? 'Rotina' : 'Pasta';
            toast({ title: "Sucesso!", description: `${itemTipo} excluída com sucesso.` });
            queryClient.invalidateQueries({ queryKey: ["/api/treinos"] });
            queryClient.invalidateQueries({ queryKey: ["/api/pastas/treinos"] });
        },
        onError: (err) => toast({ variant: "destructive", title: "Erro ao Excluir", description: err.message }),
        onSettled: () => setIsDeleteAlertOpen(false),
    });

    const moveRotinaMutation = useMutation<RotinaListagemItem, Error, { rotinaId: string; pastaId: string | null }>({
        mutationFn: ({ rotinaId, pastaId }) => apiRequest("PUT", `/api/treinos/${rotinaId}/pasta`, { pastaId }),
        onSuccess: (updatedRotina) => {
            toast({ title: "Sucesso!", description: `Rotina "${updatedRotina.titulo}" movida.` });
            queryClient.setQueryData<RotinaListagemItem[]>(["/api/treinos"], (oldData) => {
                if (!oldData) return [updatedRotina];
                return oldData.map(r => r._id === updatedRotina._id ? updatedRotina : r);
            });
        },
        onError: (err) => toast({ variant: "destructive", title: "Erro ao Mover", description: err.message }),
    });

    const handleOpenCreateModal = () => { setRotinaParaEditar(null); setIsRotinaModalOpen(true); };
    const handleOpenEditModal = (r: RotinaListagemItem) => { setIsViewModalOpen(false); setRotinaParaEditar(r); setIsRotinaModalOpen(true); };
    const handleOpenViewModal = (r: RotinaListagemItem) => { setRotinaParaVisualizar(r); setIsViewModalOpen(true); };
    const handleAssignClick = (id: string, t: string) => { setIsViewModalOpen(false); setRotinaModeloParaAssociar({ id, titulo: t }); setIsAssociarModeloModalOpen(true); };
    const handleOpenPastaModal = (p?: PastaExistente) => { setPastaParaEditar(p || null); setIsPastaModalOpen(true); };
    
    const handleDeleteRotinaClick = (rotina: RotinaListagemItem) => {
        setItemParaExcluir({ id: rotina._id, nome: rotina.titulo, tipo: 'rotina' });
        setIsDeleteAlertOpen(true);
    };

    const handleDeletePastaClick = (pasta: Pasta) => {
        setItemParaExcluir({ id: pasta._id, nome: pasta.nome, tipo: 'pasta' });
        setIsDeleteAlertOpen(true);
    };
    
    const handleConfirmDelete = () => { if (itemParaExcluir) deleteMutation.mutate(itemParaExcluir); };

    const handleMoveToFolder = (rotinaId: string, pastaId: string) => {
        moveRotinaMutation.mutate({ rotinaId, pastaId });
    };

    const handleRemoveFromFolder = (rotinaId: string) => {
        moveRotinaMutation.mutate({ rotinaId, pastaId: null });
    };

    // --- FUNÇÃO DE CALLBACK PARA O MODAL ---
    const handlePastaSuccess = () => {
        queryClient.invalidateQueries({ queryKey: ["/api/pastas/treinos"] });
        setIsPastaModalOpen(false);
        setPastaParaEditar(null);
    };

    if (isLoadingRotinas || isLoadingPastas) return <LoadingSpinner text="Carregando dados..." />;
    if (errorRotinas) return <ErrorMessage title="Erro ao Carregar Dados" message={errorRotinas.message} />;

    const rotinasModelo = rotinas.filter(r => r.tipo === 'modelo');
    const rotinasIndividuais = rotinas.filter(r => r.tipo === 'individual');
    const rotinasPorPasta = pastas.sort((a, b) => (a.ordem || 0) - (b.ordem || 0)).map(p => ({ ...p, rotinas: rotinasModelo.filter(r => (typeof r.pastaId === 'string' ? r.pastaId : r.pastaId?._id) === p._id) }));
    const rotinasSemPasta = rotinasModelo.filter(r => !r.pastaId);

    const cardHandlers = {
        onView: handleOpenViewModal,
        onEdit: handleOpenEditModal,
        onDelete: handleDeleteRotinaClick,
        onAssign: handleAssignClick,
        onMoveToFolder: handleMoveToFolder,
        onRemoveFromFolder: handleRemoveFromFolder,
    };

    return (
        <div className="container mx-auto py-8 px-4">
            <div className="flex justify-between items-center mb-6">
                <h1 className="text-3xl font-bold text-gray-800 dark:text-gray-100 flex items-center"><Dumbbell className="mr-3 h-8 w-8 text-primary"/>Gerenciar Rotinas</h1>
                <div className="flex gap-2"><Button variant="outline" onClick={() => handleOpenPastaModal()}><FolderPlus className="mr-2 h-4 w-4"/> Nova Pasta</Button><Button onClick={handleOpenCreateModal}><Plus className="mr-2 h-4 w-4" /> Nova Rotina</Button></div>
            </div>
            <Tabs value={aba} onValueChange={(v) => setAba(v as any)} className="mb-6"><TabsList className="grid w-full grid-cols-2"><TabsTrigger value="modelos">Rotinas Modelo</TabsTrigger><TabsTrigger value="individuais">Rotinas Individuais</TabsTrigger></TabsList></Tabs>

            {aba === 'modelos' && (
                <div className="space-y-6">
                    <Accordion type="multiple" className="w-full space-y-3" defaultValue={pastas.map(p => p._id)}>
                        {rotinasPorPasta.map(pasta => (
                            <AccordionItem value={pasta._id} key={pasta._id} className="border dark:border-slate-700 rounded-lg bg-white dark:bg-slate-800/50 shadow-sm">
                                <AccordionTrigger className="px-4 py-3 hover:no-underline font-semibold text-lg">
                                    <div className="flex-grow flex items-center gap-3"><Folder className="h-5 w-5 text-primary"/> {pasta.nome} <Badge variant="secondary">{pasta.rotinas.length}</Badge></div>
                                    <div className="flex-shrink-0 flex items-center gap-1"><Button variant="ghost" size="icon" className="h-7 w-7" onClick={(e) => { e.stopPropagation(); handleOpenPastaModal(pasta); }}><Edit className="h-4 w-4"/></Button><Button variant="ghost" size="icon" className="h-7 w-7 text-red-500" onClick={(e) => { e.stopPropagation(); handleDeletePastaClick(pasta); }}><Trash2 className="h-4 w-4"/></Button></div>
                                </AccordionTrigger>
                                <AccordionContent className="p-4 border-t dark:border-slate-700">
                                    <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6 min-h-[50px]">
                                        {pasta.rotinas.map(rotina => <RotinaCard key={rotina._id} rotina={rotina} pastas={pastas} {...cardHandlers} />)}
                                    </div>
                                </AccordionContent>
                            </AccordionItem>
                        ))}
                    </Accordion>
                    {rotinasSemPasta.length > 0 && (<div><h3 className="text-lg font-semibold mb-4 pt-4 border-t dark:border-slate-700">Rotinas Sem Pasta</h3><div className="p-4 border-2 border-dashed dark:border-slate-700 rounded-lg min-h-[100px]"><div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-6">{rotinasSemPasta.map(rotina => <RotinaCard key={rotina._id} rotina={rotina} pastas={pastas} {...cardHandlers} />)}</div></div></div>)}
                </div>
            )}
            {aba === 'individuais' && (<div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-6">{rotinasIndividuais.map(rotina => {const aluno = alunos.find(a => a._id === (typeof rotina.alunoId === 'string' ? rotina.alunoId : rotina.alunoId?._id)); return (<RotinaCard key={rotina._id} rotina={rotina} pastas={[]} alunoNome={aluno?.nome} {...cardHandlers} />)})}</div>)}
            
            <RotinaFormModal open={isRotinaModalOpen} onClose={() => setIsRotinaModalOpen(false)} onSuccess={() => {}} alunos={alunos} rotinaParaEditar={rotinaParaEditar} />
            <RotinaViewModal isOpen={isViewModalOpen} onClose={() => setIsViewModalOpen(false)} rotina={rotinaParaVisualizar} onEdit={handleOpenEditModal} onAssign={handleAssignClick} />
            {isAssociarModeloModalOpen && rotinaModeloParaAssociar && <AssociarModeloAlunoModal isOpen={isAssociarModeloModalOpen} onClose={() => setIsAssociarModeloModalOpen(false)} fichaModeloId={rotinaModeloParaAssociar.id} fichaModeloTitulo={rotinaModeloParaAssociar.titulo}/>}
            
            {/* CORREÇÃO: Passando a função de callback necessária para o modal */}
            <PastaFormModal 
                isOpen={isPastaModalOpen} 
                onClose={() => {setIsPastaModalOpen(false); setPastaParaEditar(null);}} 
                onSuccessCallback={handlePastaSuccess} 
                initialData={pastaParaEditar} 
            />

            <AlertDialog open={isDeleteAlertOpen} onOpenChange={(open) => !open && setIsDeleteAlertOpen(false)}><AlertDialogContent><AlertDialogHeader><AlertDialogTitle>Confirmar Exclusão</AlertDialogTitle><AlertDialogDescription>Tem certeza que deseja excluir "{itemParaExcluir?.nome}"?</AlertDialogDescription></AlertDialogHeader><AlertDialogFooter><AlertDialogCancel>Cancelar</AlertDialogCancel><AlertDialogAction onClick={handleConfirmDelete} disabled={deleteMutation.isPending} className="bg-red-600 hover:bg-red-700">Confirmar</AlertDialogAction></AlertDialogFooter></AlertDialogContent></AlertDialog>
        </div>
    );
}