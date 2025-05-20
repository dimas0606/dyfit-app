// client/src/components/dialogs/FichaViewModal.tsx
import React from 'react';
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogDescription,
  DialogFooter,
} from "@/components/ui/dialog";
import {
  Accordion,
  AccordionContent,
  AccordionItem,
  AccordionTrigger,
} from "@/components/ui/accordion";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { ScrollArea } from "@/components/ui/scroll-area";
import { 
    CalendarDays, Info, ListChecks, User, Dumbbell, CopyPlus, Edit, 
    CheckCircle, FileText, Archive, Activity, Clock, Hash, AlignLeft 
} from 'lucide-react';

// Importar tipos da estrutura de rotina
import type { 
    RotinaListagemItem, 
    DiaDeTreinoDetalhado, 
    ExercicioEmDiaDeTreinoDetalhado 
} from '@/types/treinoOuRotinaTypes'; // Certifique-se que o caminho está correto

// Interface que o FichaViewModal espera para sua prop 'ficha'.
// Esta interface deve ser compatível com o que a TreinosPage.tsx passa.
export interface FichaTreinoView { 
  _id: string;
  titulo: string;
  descricao?: string | null;
  tipo: "modelo" | "individual";
  alunoId?: { _id: string; nome: string; email?: string; } | string | null; 
  criadorId?: { _id: string; nome: string; email?: string; } | string | null;
  criadoEm?: string;
  atualizadoEm?: string;
  statusModelo?: "ativo" | "rascunho" | "arquivado" | null; // Nome consistente
  tipoOrganizacaoRotina?: RotinaListagemItem['tipoOrganizacaoRotina']; // Campo da Rotina
  diasDeTreino?: DiaDeTreinoDetalhado[]; // Campo da Rotina
  
  // Campo 'exercicios' legado - usado como fallback se diasDeTreino não estiver presente
  exercicios?: ExercicioEmDiaDeTreinoDetalhado[]; 
}

interface FichaViewModalProps {
  isOpen: boolean;
  onClose: () => void;
  ficha: FichaTreinoView | null; 
  onUseOuCopiarFicha?: (fichaId: string, fichaTitulo: string, tipoFichaOriginal: "modelo" | "individual") => void;
  onEditFicha?: (fichaRecebida: FichaTreinoView) => void;
}

const TIPOS_ORGANIZACAO_ROTINA_BACKEND_VIEW = ['diasDaSemana', 'numerico', 'livre'] as const;
const OPCOES_TIPO_DOS_TREINOS_VIEW: { value: typeof TIPOS_ORGANIZACAO_ROTINA_BACKEND_VIEW[number]; label: string }[] = [ 
    { value: 'diasDaSemana', label: 'Dia da Semana' }, 
    { value: 'numerico', label: 'Numérico' }, 
    { value: 'livre', label: 'Livre' } 
];

const FichaViewModal: React.FC<FichaViewModalProps> = ({
  isOpen,
  onClose,
  ficha: rotina, // Usando 'rotina' internamente para clareza, como no seu arquivo original
  onUseOuCopiarFicha,
  onEditFicha,
}) => {
  
  // console.log("[FichaViewModal] Props recebidas, rotina (ficha):", rotina ? JSON.parse(JSON.stringify(rotina)) : null);

  if (!isOpen || !rotina) {
    return null;
  }

  const getNomeExercicio = (ex: ExercicioEmDiaDeTreinoDetalhado): string => {
    if (typeof ex.exercicioId === 'object' && ex.exercicioId && ex.exercicioId.nome) { return ex.exercicioId.nome; }
    if (typeof ex.exercicioId === 'string') { return `Exercício (ID: ${ex.exercicioId.substring(0, 6)}...)`; }
    return 'Exercício Desconhecido';
  };

  const getGrupoMuscularExercicio = (ex: ExercicioEmDiaDeTreinoDetalhado): string | undefined => {
    if (typeof ex.exercicioId === 'object' && ex.exercicioId && ex.exercicioId.grupoMuscular) { return ex.exercicioId.grupoMuscular; }
    return undefined;
  };

  const formatDate = (dateString?: string): string => { if (!dateString) return 'Não informada'; try { return new Date(dateString).toLocaleDateString('pt-BR', { day: '2-digit', month: '2-digit', year: 'numeric', timeZone: 'UTC' }); } catch (e) { return dateString; } };
  const nomeAlunoExibicao = typeof rotina.alunoId === 'object' && rotina.alunoId?.nome ? rotina.alunoId.nome : rotina.tipo === 'individual' && typeof rotina.alunoId === 'string' ? `Aluno (ID: ${rotina.alunoId.substring(0,4)}...)` : rotina.tipo === 'individual' ? 'Aluno (Vazio)' : 'Não aplicável';
  const tituloModal = rotina.titulo.replace(/\s\(Aluno:.*?\)/, '');
  const handleUseOuCopiarClick = () => { if (onUseOuCopiarFicha) { onUseOuCopiarFicha(rotina._id, rotina.titulo, rotina.tipo); } };
  const handleEditFichaClick = () => { if (onEditFicha) { onEditFicha(rotina); } };
  const useCopyButtonText = rotina.tipo === 'modelo' ? "Usar este Modelo" : "Copiar para Aluno";
  
  const getStatusBadgeVisual = (statusParam?: FichaTreinoView['statusModelo']) => { // Renomeado param para evitar conflito
    if (!statusParam) return null; 
    let icon = null; let colorClasses = ""; let text = ""; 
    switch (statusParam) { 
        case "ativo": icon = <CheckCircle className="w-3.5 h-3.5 mr-1.5" />; colorClasses = "bg-green-100 text-green-800 dark:bg-green-800/30 dark:text-green-300 border-green-300 dark:border-green-700"; text = "Ativo"; break; 
        case "rascunho": icon = <FileText className="w-3.5 h-3.5 mr-1.5" />; colorClasses = "bg-yellow-100 text-yellow-800 dark:bg-yellow-800/30 dark:text-yellow-300 border-yellow-300 dark:border-yellow-700"; text = "Rascunho"; break; 
        case "arquivado": icon = <Archive className="w-3.5 h-3.5 mr-1.5" />; colorClasses = "bg-gray-100 text-gray-700 dark:bg-gray-700/30 dark:text-gray-400 border-gray-300 dark:border-gray-600"; text = "Arquivado"; break; 
        default: return <Badge variant="outline" className="text-sm px-2 py-1">{String(statusParam)}</Badge>; 
    } 
    return (<Badge variant="outline" className={`text-sm px-2 py-1 ${colorClasses} inline-flex items-center`}>{icon}{text}</Badge>); 
  };

  const getTipoOrganizacaoLabel = (tipo?: FichaTreinoView['tipoOrganizacaoRotina']): string => { if (!tipo) return 'Não especificado'; const opcao = OPCOES_TIPO_DOS_TREINOS_VIEW.find(op => op.value === tipo); return opcao ? opcao.label.split('(')[0].trim() : tipo; };

  const hasDiasDeTreinoConfigurados = rotina.diasDeTreino && rotina.diasDeTreino.length > 0;
  // console.log("[FichaViewModal] hasDiasDeTreinoConfigurados:", hasDiasDeTreinoConfigurados);
  // if (hasDiasDeTreinoConfigurados && rotina.diasDeTreino) { console.log("[FichaViewModal] rotina.diasDeTreino:", JSON.parse(JSON.stringify(rotina.diasDeTreino))); } 
  // else { console.log("[FichaViewModal] rotina.diasDeTreino NÃO existe ou está vazio. Verificando rotina.exercicios (legado):", rotina.exercicios); }

  return (
    <Dialog open={isOpen} onOpenChange={(openState) => !openState && onClose()}>
      <DialogContent className="sm:max-w-2xl w-[95vw] h-[90vh] max-h-[90vh] flex flex-col p-0">
        <DialogHeader className="p-6 pb-4 border-b shrink-0">
          <DialogTitle className="text-2xl font-semibold text-primary flex items-center"> <ListChecks className="w-7 h-7 mr-3 text-primary" /> Detalhes da Rotina: {tituloModal} {rotina.tipo === 'individual' && nomeAlunoExibicao !== 'Não especificado' && nomeAlunoExibicao !== 'Aluno (Vazio)' && ( <span className="text-lg text-muted-foreground ml-2">(Aluno: {nomeAlunoExibicao})</span> )} </DialogTitle>
          {rotina.descricao && ( <DialogDescription className="pt-1">{rotina.descricao}</DialogDescription> )}
        </DialogHeader>

        <ScrollArea className="flex-grow py-4 px-6">
          <div className="space-y-6">
            <div className="space-y-3 p-4 border rounded-lg bg-muted/30 dark:bg-muted/10">
              <div className="flex items-center text-sm"> <Info className="w-5 h-5 mr-2 text-muted-foreground" /> <span className="font-medium mr-2 text-gray-700 dark:text-gray-300">Tipo:</span> <Badge variant={rotina.tipo === 'modelo' ? 'secondary' : 'default'}> {rotina.tipo === 'modelo' ? 'Modelo de Treino' : 'Treino Individual'} </Badge> </div>
              {rotina.tipoOrganizacaoRotina && ( <div className="flex items-center text-sm"> {rotina.tipoOrganizacaoRotina === 'diasDaSemana' ? <CalendarDays className="w-5 h-5 mr-2 text-muted-foreground" /> : rotina.tipoOrganizacaoRotina === 'numerico' ? <Hash className="w-5 h-5 mr-2 text-muted-foreground" /> : <AlignLeft className="w-5 h-5 mr-2 text-muted-foreground" /> } <span className="font-medium mr-2 text-gray-700 dark:text-gray-300">Organização:</span> <span className="text-gray-600 dark:text-gray-400">{getTipoOrganizacaoLabel(rotina.tipoOrganizacaoRotina)}</span> </div> )}
              {rotina.tipo === 'modelo' && rotina.statusModelo && ( <div className="flex items-center text-sm"> <Activity className="w-5 h-5 mr-2 text-muted-foreground" /> <span className="font-medium mr-2 text-gray-700 dark:text-gray-300">Status:</span> {getStatusBadgeVisual(rotina.statusModelo)} </div> )}
              {rotina.tipo === 'individual' && rotina.alunoId && ( <div className="flex items-center text-sm"> <User className="w-5 h-5 mr-2 text-muted-foreground" /> <span className="font-medium mr-2 text-gray-700 dark:text-gray-300">Aluno:</span> <span className="text-gray-600 dark:text-gray-400">{nomeAlunoExibicao}</span> </div> )}
              {rotina.criadoEm && ( <div className="flex items-center text-sm"> <Clock className="w-5 h-5 mr-2 text-muted-foreground" /> <span className="font-medium mr-2 text-gray-700 dark:text-gray-300">Criação:</span> <span className="text-gray-600 dark:text-gray-400">{formatDate(rotina.criadoEm)}</span> </div> )}
              {rotina.atualizadoEm && rotina.atualizadoEm !== rotina.criadoEm && ( <div className="flex items-center text-sm"> <Clock className="w-5 h-5 mr-2 text-muted-foreground" /> <span className="font-medium mr-2 text-gray-700 dark:text-gray-300">Atualização:</span> <span className="text-gray-600 dark:text-gray-400">{formatDate(rotina.atualizadoEm)}</span> </div> )}
            </div>

            <div>
              <h3 className="text-lg font-semibold mb-3 text-gray-800 dark:text-gray-200 flex items-center"> <Dumbbell className="w-5 h-5 mr-2 text-gray-700 dark:text-gray-300" /> Programação dos Treinos </h3>
              {/* console.log("[FichaViewModal] JSX - Verificando hasDiasDeTreinoConfigurados:", hasDiasDeTreinoConfigurados) */}
              
              {hasDiasDeTreinoConfigurados && rotina.diasDeTreino ? (
                <Accordion type="multiple" className="w-full space-y-3" defaultValue={(rotina.diasDeTreino || []).map((d,i) => d._id || `dia-view-key-${i}` )}>
                  {(rotina.diasDeTreino)
                    .sort((a, b) => a.ordemNaRotina - b.ordemNaRotina)
                    .map((dia, diaIndex) => {
                      // console.log(`[FichaViewModal] Renderizando Dia: ${dia.identificadorDia}`, dia);
                      return (
                        <AccordionItem key={dia._id || `dia-view-${diaIndex}`} value={dia._id || `dia-view-key-${diaIndex}`} className="border rounded-lg bg-card dark:bg-gray-800 shadow-sm" >
                          <AccordionTrigger className="px-4 py-3 hover:no-underline text-base hover:bg-muted/50 dark:hover:bg-gray-700/50 rounded-t-lg">
                            <div className="flex-1 text-left"> <span className="font-semibold text-primary">{dia.identificadorDia}</span> {dia.nomeSubFicha && <span className="ml-2 text-sm text-muted-foreground">- {dia.nomeSubFicha}</span>} </div>
                          </AccordionTrigger>
                          <AccordionContent className="px-4 pt-3 pb-4 border-t dark:border-gray-700">
                            {dia.exerciciosDoDia && dia.exerciciosDoDia.length > 0 ? (
                              <div className="space-y-2">
                                {dia.exerciciosDoDia
                                  .sort((a,b) => a.ordemNoDia - b.ordemNoDia)
                                  .map((ex, exIndex) => {
                                    // CORREÇÃO DA KEY DO EXERCÍCIO:
                                    const exercicioKey = ex._id || (typeof ex.exercicioId === 'object' ? ex.exercicioId._id : ex.exercicioId) || `ex-view-${diaIndex}-${exIndex}`;
                                    return (
                                      <div key={exercicioKey} className="p-3 border rounded-md bg-slate-50 dark:bg-slate-700/60 shadow-sm">
                                        <p className="font-medium text-sm text-slate-800 dark:text-slate-100">{getNomeExercicio(ex)}</p>
                                        {getGrupoMuscularExercicio(ex) && ( <Badge variant="outline" className="mt-1 mb-1.5 text-xs border-sky-300 text-sky-700 bg-sky-50 dark:border-sky-700 dark:text-sky-300 dark:bg-sky-900/30">{getGrupoMuscularExercicio(ex)}</Badge> )}
                                        <div className="grid grid-cols-2 gap-x-3 gap-y-1 mt-1.5 text-xs text-muted-foreground dark:text-slate-400">
                                          {ex.series && <div><strong>Séries:</strong> {ex.series}</div>}
                                          {ex.repeticoes && <div><strong>Reps:</strong> {ex.repeticoes}</div>}
                                          {ex.carga && <div><strong>Carga:</strong> {ex.carga}</div>}
                                          {ex.descanso && <div><strong>Desc:</strong> {ex.descanso}</div>}
                                        </div>
                                        {ex.observacoes && <p className="mt-1.5 pt-1.5 border-t border-slate-200 dark:border-slate-600 text-xs text-muted-foreground dark:text-slate-400"><strong>Obs:</strong> {ex.observacoes}</p>}
                                        {!ex.series && !ex.repeticoes && !ex.carga && !ex.descanso && !ex.observacoes && (<p className="italic text-xs mt-1">Sem detalhes adicionais.</p>)}
                                      </div>
                                    );
                                  })}
                              </div>
                            ) : ( <p className="text-sm text-muted-foreground text-center py-4 italic"> Nenhum exercício cadastrado para este dia. </p> )}
                          </AccordionContent>
                        </AccordionItem>
                      );
                    })}
                </Accordion>
              ) : rotina.exercicios && rotina.exercicios.length > 0 ? ( // Fallback para estrutura antiga de 'exercicios' planos
                <Accordion type="multiple" className="w-full space-y-2">
                    {(rotina.exercicios) 
                    .sort((a, b) => (a.ordemNoDia ?? Infinity) - (b.ordemNoDia ?? Infinity))
                    .map((ex, index) => {
                       // CORREÇÃO DA KEY DO EXERCÍCIO (Fallback):
                       const exercicioKeyFallback = ex._id || (typeof ex.exercicioId === 'object' && ex.exercicioId?._id) || (typeof ex.exercicioId === 'string' ? ex.exercicioId : `ex-view-flat-${index}`);
                       return (
                        <AccordionItem
                          key={exercicioKeyFallback}
                          value={`item-view-flat-${index}`} // Value para AccordionItem pode ser diferente da key
                          className="border rounded-md bg-background dark:bg-gray-800 shadow-sm"
                        >
                          <AccordionTrigger className="px-4 py-3 hover:no-underline text-sm hover:bg-muted/50 dark:hover:bg-gray-700/50 rounded-t-md">
                              <div className="flex-1 text-left">
                              <span className="font-medium text-gray-800 dark:text-gray-100">{getNomeExercicio(ex)}</span>
                              {(ex.series || ex.repeticoes) && ( <span className="ml-2 text-xs text-blue-600 dark:text-blue-400">({ex.series || 'Série?'}x{ex.repeticoes || 'Rep?'})</span> )}
                              {getGrupoMuscularExercicio(ex) && ( <Badge variant="outline" className="ml-2 text-xs border-sky-300 text-sky-700 bg-sky-50 dark:border-sky-700 dark:text-sky-300 dark:bg-sky-900/30">{getGrupoMuscularExercicio(ex)}</Badge> )}
                              </div>
                          </AccordionTrigger>
                          <AccordionContent className="px-4 pt-0 pb-4">
                              <div className="pt-3 border-t dark:border-gray-700 space-y-1.5 text-xs text-muted-foreground dark:text-gray-400">
                              {ex.series && <p><strong>Séries:</strong> {ex.series}</p>}
                              {ex.repeticoes && <p><strong>Repetições:</strong> {ex.repeticoes}</p>}
                              {ex.carga && <p><strong>Carga:</strong> {ex.carga}</p>}
                              {ex.descanso && <p><strong>Descanso:</strong> {ex.descanso}</p>}
                              {ex.observacoes && <p className="mt-1 pt-1 border-t dark:border-gray-700"><strong>Obs:</strong> {ex.observacoes}</p>}
                              {!ex.series && !ex.repeticoes && !ex.carga && !ex.descanso && !ex.observacoes && (<p className="italic">Nenhum detalhe.</p>)}
                              </div>
                          </AccordionContent>
                        </AccordionItem>
                       );
                    })}
                </Accordion>
              ) : ( <p className="text-sm text-muted-foreground text-center py-6"> Nenhum dia de treino ou exercício configurado para esta rotina. </p> )}
            </div>
          </div>
        </ScrollArea>

        <DialogFooter className="p-6 pt-4 border-t flex flex-col sm:flex-row sm:justify-between items-center shrink-0">
            <div className="flex flex-col sm:flex-row gap-2 w-full sm:w-auto">
                {onUseOuCopiarFicha && ( <Button onClick={handleUseOuCopiarClick} className="bg-green-600 hover:bg-green-700 text-white order-1 sm:order-none mt-2 sm:mt-0 w-full sm:w-auto"> <CopyPlus className="w-4 h-4 mr-2" /> {useCopyButtonText} </Button> )}
                {onEditFicha && ( <Button variant="default" onClick={handleEditFichaClick} className="order-2 sm:order-none w-full sm:w-auto mt-2 sm:mt-0"> <Edit className="w-4 h-4 mr-2" /> Editar {rotina.tipo === 'modelo' ? 'Rotina' : 'Ficha'} </Button> )}
            </div>
            <Button variant="outline" onClick={onClose} className="order-last sm:order-none w-full sm:w-auto mt-2 sm:mt-0 ml-auto"> Fechar </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
};

export default FichaViewModal;