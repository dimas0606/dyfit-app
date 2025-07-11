// client/src/components/dialogs/RotinaFormModal.tsx
import React, { useEffect, useState, useMemo } from 'react';
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter, DialogDescription } from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Button } from "@/components/ui/button";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Textarea } from "@/components/ui/textarea";
import { useToast } from "@/hooks/use-toast";
import { apiRequest } from '@/lib/queryClient';
import { Loader2, ArrowLeft, ArrowRight, PlusCircle, Edit, Trash2, ListPlus, XCircle } from "lucide-react";
import { Aluno } from '@/types/aluno';
import type { RotinaListagemItem, DiaDeTreinoDetalhado, ExercicioEmDiaDeTreinoDetalhado } from '@/types/treinoOuRotinaTypes';
import SelectExerciseModal, { BibliotecaExercicio } from './SelectExerciseModal';
import { Card, CardContent } from '../ui/card';

type TipoOrganizacaoRotinaBackend = 'diasDaSemana' | 'numerico' | 'livre';
const OPCOES_TIPO_DOS_TREINOS: { value: TipoOrganizacaoRotinaBackend; label: string }[] = [ { value: 'diasDaSemana', label: 'Dia da Semana' }, { value: 'numerico', label: 'Numérico (A, B, C...)' }, { value: 'livre', label: 'Livre (Nomes)' } ];
const diasDaSemanaOptions = ["Segunda-feira", "Terça-feira", "Quarta-feira", "Quinta-feira", "Sexta-feira", "Sábado", "Domingo"];
export interface RotinaParaEditar { _id?: string; titulo?: string; descricao?: string | null; tipo?: "modelo" | "individual"; statusModelo?: "ativo" | "rascunho" | "arquivado" | null; tipoOrganizacaoRotina?: TipoOrganizacaoRotinaBackend; alunoId?: string | { _id: string; nome: string; } | null; pastaId?: string | { _id: string; nome: string; } | null; diasDeTreino?: DiaDeTreinoDetalhado[]; dataValidade?: string | Date | null; totalSessoesRotinaPlanejadas?: number | null; }
interface DiaDeTreinoState { tempId: string; ordemNaRotina: number; identificadorDia: string; nomeSubFicha?: string | null; exerciciosDoDia: ExercicioEmDiaDeTreinoDetalhado[]; _id?: string; }
interface Step1Data { titulo: string; descricao: string | null; tipo: 'modelo' | 'individual'; alunoId: string | null; }
interface DiaDeTreinoFormData { identificadorDia: string; nomeSubFicha: string | null; }
interface RotinaFormModalProps { open: boolean; onClose: () => void; onSuccess: (rotinaSalva: RotinaListagemItem) => void; alunos: Aluno[]; rotinaParaEditar?: RotinaParaEditar | null; }

const Stepper = ({ currentStep }: { currentStep: number }) => ( <div className="flex items-center w-full mb-8 px-2"> {[ {num: 1, label: "Detalhes"}, {num: 2, label: "Dias"}, {num: 3, label: "Exercícios"} ].map(({num, label}, index, arr) => ( <React.Fragment key={num}> <div className="flex flex-col items-center shrink-0 text-center"> <div className={`w-10 h-10 rounded-full flex items-center justify-center font-bold text-lg transition-all duration-300 ${currentStep >= num ? 'bg-primary text-primary-foreground scale-110 shadow-lg' : 'bg-slate-200 dark:bg-slate-700 text-slate-500'}`}> {num} </div> <p className={`text-xs mt-2 font-semibold transition-colors w-20 ${currentStep >= num ? 'text-primary' : 'text-slate-500'}`}>{label}</p> </div> {index < arr.length - 1 && <div className={`flex-auto border-t-2 mx-2 transition-colors ${currentStep > num ? 'border-primary' : 'border-slate-200 dark:border-slate-700'}`}></div>} </React.Fragment> ))} </div> );

export default function RotinaFormModal({ open, onClose, onSuccess, alunos: alunosProp, rotinaParaEditar }: RotinaFormModalProps) {
  const [step, setStep] = useState(1);
  const { toast } = useToast();
  const queryClient = useQueryClient();
  const isEditing = !!rotinaParaEditar?._id;

  const [step1Data, setStep1Data] = useState<Step1Data>({ titulo: '', descricao: null, tipo: 'modelo', alunoId: null });
  const [step2Data, setStep2Data] = useState<{ tipoOrganizacaoRotina: TipoOrganizacaoRotinaBackend }>({ tipoOrganizacaoRotina: 'numerico' });
  const [diasDeTreino, setDiasDeTreino] = useState<DiaDeTreinoState[]>([]);
  const [showDiaForm, setShowDiaForm] = useState(false);
  const [editingDiaTempId, setEditingDiaTempId] = useState<string | null>(null);
  const [diaFormValues, setDiaFormValues] = useState<DiaDeTreinoFormData>({ identificadorDia: '', nomeSubFicha: null });
  const [isSelectExerciseModalOpen, setIsSelectExerciseModalOpen] = useState(false);
  const [diaAtivo, setDiaAtivo] = useState<string | null>(null);

  useEffect(() => {
    if (open) {
      if (isEditing && rotinaParaEditar) {
        const alunoId = typeof rotinaParaEditar.alunoId === 'object' && rotinaParaEditar.alunoId !== null ? rotinaParaEditar.alunoId._id : rotinaParaEditar.alunoId as string | null;
        setStep1Data({ titulo: rotinaParaEditar.titulo || '', descricao: rotinaParaEditar.descricao || null, tipo: rotinaParaEditar.tipo || 'modelo', alunoId });
        setStep2Data({ tipoOrganizacaoRotina: rotinaParaEditar.tipoOrganizacaoRotina || 'numerico' });
        const diasEdit = (rotinaParaEditar.diasDeTreino || []).map((dia, i) => ({ ...dia, tempId: dia._id || `edit-dia-${i}-${Date.now()}`, exerciciosDoDia: (dia.exerciciosDoDia || []).map((ex, j) => ({ ...ex, tempIdExercicio: (ex as any)._id || `edit-ex-${i}-${j}-${Date.now()}` })) } as unknown as DiaDeTreinoState));
        setDiasDeTreino(diasEdit);
        if (diasEdit.length > 0) setDiaAtivo(diasEdit[0].tempId);
      } else {
        setStep1Data({ titulo: '', descricao: null, tipo: 'modelo', alunoId: null }); setStep2Data({ tipoOrganizacaoRotina: 'numerico' }); setDiasDeTreino([]); setDiaAtivo(null);
      }
      setStep(1); setShowDiaForm(false); setEditingDiaTempId(null);
    }
  }, [open, isEditing, rotinaParaEditar]);

  const { data: alunosFetched = [] } = useQuery<Aluno[]>({ queryKey: ["alunosParaRotinaForm"], queryFn: () => apiRequest<Aluno[]>("GET", "/api/alunos"), enabled: open && step1Data.tipo === 'individual', initialData: alunosProp });

  const nextStep = () => {
    if (step === 1 && !step1Data.titulo.trim()) { toast({ variant: "destructive", title: "Campo obrigatório", description: "O título da rotina é obrigatório." }); return; }
    if (step === 1 && step1Data.tipo === 'individual' && !step1Data.alunoId) { toast({ variant: "destructive", title: "Campo obrigatório", description: "Selecione um aluno." }); return; }
    if (step === 2 && diasDeTreino.length === 0) { toast({ variant: "destructive", title: "Atenção", description: "Adicione pelo menos um dia de treino." }); return; }
    if (step === 2 && diasDeTreino.length > 0 && !diaAtivo) setDiaAtivo(diasDeTreino[0].tempId);
    setStep(s => Math.min(s + 1, 3));
  };
  const prevStep = () => setStep(s => Math.max(s - 1, 1));
  
  const mutation = useMutation<RotinaListagemItem, Error, any>({
    mutationFn: (payload) => apiRequest(isEditing ? "PUT" : "POST", isEditing ? `/api/treinos/${rotinaParaEditar?._id}` : "/api/treinos", payload),
    onSuccess: (savedRotina) => {
        toast({ title: "Sucesso!", description: `Rotina "${savedRotina.titulo}" salva.` });
        queryClient.invalidateQueries({ queryKey: ["/api/treinos"] });
        onSuccess(savedRotina); onClose();
    },
    onError: (error) => toast({ variant: "destructive", title: "Erro ao Salvar", description: error.message }),
  });

  const handleFinalSubmit = () => {
    const payload = {
        ...step1Data, ...step2Data,
        diasDeTreino: diasDeTreino.map(dia => ({
            _id: dia._id, identificadorDia: dia.identificadorDia, nomeSubFicha: dia.nomeSubFicha, ordemNaRotina: dia.ordemNaRotina,
            exerciciosDoDia: dia.exerciciosDoDia.map(ex => ({
                _id: (ex as any)._idSubDocExercicio,
                exercicioId: typeof ex.exercicioId === 'object' ? ex.exercicioId._id : ex.exercicioId,
                series: ex.series, repeticoes: ex.repeticoes, carga: ex.carga, descanso: ex.descanso, observacoes: ex.observacoes, ordemNoDia: ex.ordemNoDia
            }))
        }))
    };
    mutation.mutate(payload);
  };
  
  const handleAddOrUpdateDia = () => {
    if (!diaFormValues.identificadorDia.trim()) { toast({ variant: "destructive", title: "Erro", description: "O identificador do dia é obrigatório." }); return; }
    const diaJaExiste = diasDeTreino.some(dia => dia.identificadorDia.toLowerCase() === diaFormValues.identificadorDia.toLowerCase() && dia.tempId !== editingDiaTempId);
    if (diaJaExiste) { toast({ variant: "destructive", title: "Erro", description: `O identificador "${diaFormValues.identificadorDia}" já foi usado.` }); return; }
    setDiasDeTreino(prev => {
        let novosDias = [...prev];
        if (editingDiaTempId) { novosDias = novosDias.map(d => d.tempId === editingDiaTempId ? {...d, ...diaFormValues, nomeSubFicha: diaFormValues.nomeSubFicha || null} : d); } 
        else { novosDias.push({ ...diaFormValues, nomeSubFicha: diaFormValues.nomeSubFicha || null, tempId: `new-${Date.now()}`, ordemNaRotina: prev.length, exerciciosDoDia: [] }); }
        return novosDias;
    });
    setShowDiaForm(false); setEditingDiaTempId(null); setDiaFormValues({ identificadorDia: '', nomeSubFicha: null });
  };
  
  const handleEditDia = (dia: DiaDeTreinoState) => { setDiaFormValues({ identificadorDia: dia.identificadorDia, nomeSubFicha: dia.nomeSubFicha || null }); setEditingDiaTempId(dia.tempId); setShowDiaForm(true); };
  const handleRemoveDia = (tempId: string) => { setDiasDeTreino(prev => prev.filter(d => d.tempId !== tempId).map((d, i) => ({...d, ordemNaRotina: i}))); };
  const handleShowDiaForm = () => { setEditingDiaTempId(null); setDiaFormValues({ identificadorDia: '', nomeSubFicha: null }); setShowDiaForm(true); };
  
  const handleOpenSelectExerciseModal = (diaTempId: string) => { setDiaAtivo(diaTempId); setIsSelectExerciseModalOpen(true); };
  const handleExercisesSelected = (selecionados: BibliotecaExercicio[]) => {
      if (!diaAtivo) return;
      setDiasDeTreino(prev => prev.map(dia => {
          if (dia.tempId === diaAtivo) {
              const novosExercicios = selecionados.map((ex, i) => ({
                  _id: `new-ex-${Date.now()}-${i}`,
                  exercicioId: { _id: ex._id, nome: ex.nome, grupoMuscular: ex.grupoMuscular, categoria: ex.categoria },
                  ordemNoDia: (dia.exerciciosDoDia?.length || 0) + i,
              } as unknown as ExercicioEmDiaDeTreinoDetalhado));
              return { ...dia, exerciciosDoDia: [...(dia.exerciciosDoDia || []), ...novosExercicios] };
          }
          return dia;
      }));
      setIsSelectExerciseModalOpen(false);
  };
  
  const handleExercicioDetailChange = (diaTempId: string, exIndex: number, field: keyof ExercicioEmDiaDeTreinoDetalhado, value: string) => {
    setDiasDeTreino(prev => prev.map(dia => {
        if (dia.tempId === diaTempId) {
            const exerciciosAtualizados = [...dia.exerciciosDoDia];
            (exerciciosAtualizados[exIndex] as any)[field] = value;
            return { ...dia, exerciciosDoDia: exerciciosAtualizados };
        }
        return dia;
    }));
  };
  const handleRemoveExercicio = (diaTempId: string, exIndex: number) => {
    setDiasDeTreino(prev => prev.map(dia => {
        if (dia.tempId === diaTempId) {
            const exerciciosAtualizados = dia.exerciciosDoDia.filter((_, index) => index !== exIndex);
            return { ...dia, exerciciosDoDia: exerciciosAtualizados.map((ex, i) => ({ ...ex, ordemNoDia: i })) };
        }
        return dia;
    }));
  };

  const diasDaSemanaUtilizados = useMemo(() => diasDeTreino.map(d => d.identificadorDia), [diasDeTreino]);

  return (
    <Dialog open={open} onOpenChange={onClose}>
      <DialogContent className="sm:max-w-4xl w-[95vw] h-[90vh] flex flex-col p-0">
        <DialogHeader className="p-6 pb-4 border-b shrink-0">
          <DialogTitle>{isEditing ? "Editar Rotina" : "Nova Rotina"}</DialogTitle>
          <DialogDescription>Siga os passos para configurar a rotina de treino.</DialogDescription>
        </DialogHeader>
        <div className="flex-grow overflow-y-auto p-6">
          <Stepper currentStep={step} />
          {step === 1 && <div className="space-y-4 animate-in fade-in-50">
              <div><Label className="font-semibold">Título da Rotina*</Label><Input value={step1Data.titulo} onChange={e => setStep1Data(s => ({...s, titulo: e.target.value}))} /></div>
              <div><Label className="font-semibold">Descrição (Opcional)</Label><Textarea value={step1Data.descricao || ''} onChange={e => setStep1Data(s => ({...s, descricao: e.target.value}))} /></div>
              <div><Label className="font-semibold">Tipo de Rotina</Label><Select value={step1Data.tipo} onValueChange={(v: any) => setStep1Data(s => ({...s, tipo: v, alunoId: null}))} disabled={isEditing}><SelectTrigger><SelectValue/></SelectTrigger><SelectContent><SelectItem value="modelo">Modelo</SelectItem><SelectItem value="individual">Individual</SelectItem></SelectContent></Select></div>
              {step1Data.tipo === 'individual' && (<div><Label className="font-semibold">Aluno*</Label><Select value={step1Data.alunoId || ''} onValueChange={(v) => setStep1Data(s => ({...s, alunoId: v}))} disabled={isEditing}><SelectTrigger><SelectValue placeholder="Selecione um aluno..."/></SelectTrigger><SelectContent>{alunosFetched.map(aluno => <SelectItem key={aluno._id} value={aluno._id}>{aluno.nome}</SelectItem>)}</SelectContent></Select></div>)}
          </div>}
          {step === 2 && <div className="space-y-6 animate-in fade-in-50">
             <div><Label className="font-semibold">Organização dos Dias*</Label><Select value={step2Data.tipoOrganizacaoRotina} onValueChange={(v:any) => setStep2Data(s => ({...s, tipoOrganizacaoRotina: v}))}><SelectTrigger><SelectValue/></SelectTrigger><SelectContent>{OPCOES_TIPO_DOS_TREINOS.map(opt => <SelectItem key={opt.value} value={opt.value}>{opt.label}</SelectItem>)}</SelectContent></Select></div>
             <div className="space-y-2">{diasDeTreino.map(dia => (<Card key={dia.tempId} className="flex items-center justify-between p-3 bg-slate-50 dark:bg-slate-800 border-l-4 border-l-primary"><div><p className="font-medium">{dia.identificadorDia}</p>{dia.nomeSubFicha && <p className="text-xs text-muted-foreground">{dia.nomeSubFicha}</p>}</div><div className="flex items-center gap-1"><Button variant="ghost" size="icon" className="h-7 w-7" onClick={() => handleEditDia(dia)}><Edit className="h-4 w-4 text-slate-500"/></Button><Button variant="ghost" size="icon" className="h-7 w-7 text-red-500" onClick={() => handleRemoveDia(dia.tempId)}><Trash2 className="h-4 w-4"/></Button></div></Card>))}</div>
             {showDiaForm && (<Card className="p-4 border-dashed"><CardContent className="p-0 space-y-4"><h4 className="font-medium text-sm">{editingDiaTempId ? 'Editando Dia' : 'Novo Dia de Treino'}</h4><div><Label>Identificador do Dia*</Label>{step2Data.tipoOrganizacaoRotina === 'diasDaSemana' ? (<Select value={diaFormValues.identificadorDia} onValueChange={(v) => setDiaFormValues(s => ({...s, identificadorDia: v}))}><SelectTrigger><SelectValue placeholder="Selecione um dia..." /></SelectTrigger><SelectContent>{diasDaSemanaOptions.map(opt => <SelectItem key={opt} value={opt} disabled={diasDaSemanaUtilizados.includes(opt)}>{opt}</SelectItem>)}</SelectContent></Select>) : (<Input value={diaFormValues.identificadorDia} onChange={e => setDiaFormValues(s => ({...s, identificadorDia: e.target.value}))} placeholder={step2Data.tipoOrganizacaoRotina === 'numerico' ? `Ex: Treino ${diasDeTreino.length + 1}` : 'Ex: Peito & Tríceps'} />)}</div><div><Label>Nome Específico (Opcional)</Label><Input value={diaFormValues.nomeSubFicha || ''} onChange={e => setDiaFormValues(s => ({...s, nomeSubFicha: e.target.value}))} placeholder="Ex: Foco em Força" /></div><div className="flex justify-end gap-2 pt-2"><Button variant="ghost" onClick={() => setShowDiaForm(false)}>Cancelar</Button><Button onClick={handleAddOrUpdateDia}>{editingDiaTempId ? 'Atualizar' : 'Adicionar'}</Button></div></CardContent></Card>)}
             {!showDiaForm && (<Button variant="outline" className="w-full border-dashed border-primary text-primary hover:text-primary hover:bg-primary/5" onClick={handleShowDiaForm}><PlusCircle className="mr-2 h-4 w-4"/> Adicionar Dia de Treino</Button>)}
          </div>}
          {step === 3 && (
            <div className="grid grid-cols-1 md:grid-cols-3 h-full max-h-full overflow-hidden animate-in fade-in-50">
              <div className="md:col-span-1 border-r dark:border-slate-800 bg-slate-50 dark:bg-slate-900/50 p-4 overflow-y-auto">
                <h3 className="font-semibold mb-3">Dias de Treino</h3><div className="space-y-2">{diasDeTreino.map(dia => (<Button key={dia.tempId} variant={diaAtivo === dia.tempId ? 'secondary' : 'ghost'} className="w-full justify-start text-left h-auto py-2" onClick={() => setDiaAtivo(dia.tempId)}><span className="flex flex-col"><span>{dia.identificadorDia}</span>{dia.nomeSubFicha && <span className="text-xs font-normal opacity-70">{dia.nomeSubFicha}</span>}</span></Button>))}</div>
              </div>
              <div className="md:col-span-2 p-4 overflow-y-auto">
                {diaAtivo && diasDeTreino.find(d => d.tempId === diaAtivo) ? ( <div className="space-y-4"><h3 className="font-semibold">Exercícios do Dia: {diasDeTreino.find(d => d.tempId === diaAtivo)?.identificadorDia}</h3>{(diasDeTreino.find(d => d.tempId === diaAtivo)?.exerciciosDoDia || []).map((ex, index) => ( <Card key={(ex as any)._id || (ex as any).tempIdExercicio || index} className="p-3 bg-white dark:bg-slate-800/60 shadow-sm border-l-4 border-primary/50"><div className="flex justify-between items-start mb-2"><p className="font-medium text-sm">{(typeof ex.exercicioId === 'object' && ex.exercicioId.nome) || 'Exercício'}</p><Button variant="ghost" size="icon" className="h-6 w-6 text-destructive/70 hover:text-destructive shrink-0" onClick={() => handleRemoveExercicio(diaAtivo, index)}><XCircle className="w-4 h-4" /></Button></div><div className="grid grid-cols-2 sm:grid-cols-4 gap-2"><Input placeholder="Séries" value={ex.series || ''} onChange={e => handleExercicioDetailChange(diaAtivo, index, 'series', e.target.value)} /><Input placeholder="Reps" value={ex.repeticoes || ''} onChange={e => handleExercicioDetailChange(diaAtivo, index, 'repeticoes', e.target.value)} /><Input placeholder="Carga" value={ex.carga || ''} onChange={e => handleExercicioDetailChange(diaAtivo, index, 'carga', e.target.value)} /><Input placeholder="Descanso" value={ex.descanso || ''} onChange={e => handleExercicioDetailChange(diaAtivo, index, 'descanso', e.target.value)} /></div><Textarea placeholder="Observações..." value={ex.observacoes || ''} onChange={e => handleExercicioDetailChange(diaAtivo, index, 'observacoes', e.target.value)} className="mt-2 text-xs" rows={1} /></Card>))}<Button variant="outline" className="w-full border-dashed" onClick={() => handleOpenSelectExerciseModal(diaAtivo)}><ListPlus className="mr-2 h-4 w-4" />Adicionar Exercício</Button></div>) : <div className="text-center text-muted-foreground pt-20 flex flex-col items-center"><p className="font-semibold">Nenhum dia selecionado</p><p className="text-sm">Selecione um dia de treino à esquerda.</p></div>}
              </div>
            </div>
          )}
        </div>
        <DialogFooter className="p-4 border-t flex justify-between shrink-0">
          <div>{step > 1 && <Button variant="outline" onClick={prevStep}><ArrowLeft className="mr-2 h-4 w-4"/> Voltar</Button>}</div>
          <div>
            {step < 3 && <Button onClick={nextStep} disabled={step === 2 && diasDeTreino.length === 0}>Próximo <ArrowRight className="ml-2 h-4 w-4"/></Button>}
            {step === 3 && <Button onClick={handleFinalSubmit} disabled={mutation.isPending}>{mutation.isPending && <Loader2 className="mr-2 h-4 w-4 animate-spin" />} {isEditing ? "Salvar Alterações" : "Criar Rotina"}</Button>}
          </div>
        </DialogFooter>
      </DialogContent>
      {isSelectExerciseModalOpen && <SelectExerciseModal isOpen={isSelectExerciseModalOpen} onClose={() => setIsSelectExerciseModalOpen(false)} onExercisesSelect={handleExercisesSelected} />}
    </Dialog>
  );
}
