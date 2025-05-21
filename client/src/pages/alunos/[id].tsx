import React, { useEffect, useState } from 'react';
import { useLocation, Link } from "wouter";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { ArrowLeft, Dumbbell, Edit, Trash2, Calendar, Weight, Ruler, Target, Phone, UserCircle, Info, StickyNote, Loader2, Eye } from "lucide-react";
import LoadingSpinner from "@/components/LoadingSpinner";
import ErrorMessage from "@/components/ErrorMessage";
import { Aluno } from '@/types/aluno';
import { useConfirmDialog } from '@/hooks/useConfirmDialog';
import { ModalConfirmacao } from '@/components/ui/modal-confirmacao';
import { useToast } from '@/hooks/use-toast';
import { apiRequest } from '@/lib/queryClient';
import TreinoFormModal from '@/components/dialogs/TreinoFormModal';
import { Badge } from "@/components/ui/badge";
import { Separator } from "@/components/ui/separator";
import FichaViewModal, { FichaTreinoView } from "@/components/dialogs/FichaViewModal"; // Será renomeado para RotinaViewModal depois
import AssociarModeloAlunoModal from "@/components/dialogs/AssociarModeloAlunoModal";
import { RotinaListagemItem, DiaDeTreinoDetalhado, ExercicioEmDiaDeTreinoDetalhado } from '@/types/treinoOuRotinaTypes';

interface StudentDetailProps {
  id?: string;
}

const StudentDetail: React.FC<StudentDetailProps> = ({ id }) => {
  const studentId = id;
  const queryClient = useQueryClient();
  const { toast } = useToast();
  const { isOpen: isConfirmOpen, options: confirmOptions, openConfirmDialog, closeConfirmDialog, confirm: confirmDeleteAction } = useConfirmDialog();
  const [, navigate] = useLocation();

  const [isTreinoFormModalOpen, setIsTreinoFormModalOpen] = useState(false);
  const [fichaParaEditarOuCriar, setFichaParaEditarOuCriar] = useState<RotinaListagemItem | null>(null);
  const [isViewFichaModalOpen, setIsViewFichaModalOpen] = useState(false);
  const [fichaParaVisualizar, setFichaParaVisualizar] = useState<FichaTreinoView | null>(null);
  const [isAssociarModalOpen, setIsAssociarModalOpen] = useState(false);
  const [fichaOriginalParaAssociar, setFichaOriginalParaAssociar] = useState<{id: string; titulo: string} | null>(null);

  const isEditing = !!(fichaParaEditarOuCriar && fichaParaEditarOuCriar._id); 

  const { data: student, isLoading: isLoadingStudent, error: errorLoadingStudent } = useQuery<Aluno | null, Error>({
    queryKey: ["aluno", studentId],
    queryFn: async (): Promise<Aluno | null> => {
      if (!studentId) return null;
      try {
        const data = await apiRequest<Aluno>("GET", `/api/alunos/${studentId}`);
        return data;
      } catch (err: any) {
        if (err.response?.status === 404 || err.message?.includes("404")) return null;
        throw err;
      }
    },
    enabled: !!studentId,
    retry: 1,
  });

  const { data: studentWorkouts = [], isLoading: isLoadingWorkouts, error: errorLoadingWorkouts, refetch: refetchFichasAluno } = useQuery<RotinaListagemItem[], Error>({
    queryKey: ["fichasAluno", studentId],
    queryFn: async (): Promise<RotinaListagemItem[]> => {
      if (!studentId) return [];
      try {
        const dataFromApi = await apiRequest<any[]>("GET", `/api/treinos/aluno/${studentId}`);
        
        if (!Array.isArray(dataFromApi)) {
            console.warn(`API /api/treinos/aluno/${studentId} não retornou um array. Retornado:`, dataFromApi);
            return [];
        }

        return dataFromApi.map((fichaApi: any): RotinaListagemItem => {
          const diasDeTreinoProcessados = (fichaApi.diasDeTreino || []).map((diaApi: any): DiaDeTreinoDetalhado => {
            const exerciciosDoDiaProcessados = (diaApi.exerciciosDoDia || []).map((exApi: any): ExercicioEmDiaDeTreinoDetalhado => ({
              ...exApi,
              _id: exApi._id, 
              exercicioId: exApi.exercicioId, 
              series: exApi.series !== undefined ? String(exApi.series) : undefined, 
              repeticoes: exApi.repeticoes !== undefined ? String(exApi.repeticoes) : undefined, 
              carga: exApi.carga !== undefined ? String(exApi.carga) : undefined, 
              descanso: exApi.descanso !== undefined ? String(exApi.descanso) : undefined, 
              ordemNoDia: exApi.ordemNoDia ?? 0, 
              concluido: exApi.concluido ?? false, 
            }));
            return {
              ...diaApi,
              _id: diaApi._id, 
              identificadorDia: diaApi.identificadorDia, 
              ordemNaRotina: diaApi.ordemNaRotina ?? 0, 
              exerciciosDoDia: exerciciosDoDiaProcessados, 
            };
          });

          return {
            _id: fichaApi._id, 
            titulo: fichaApi.titulo, 
            descricao: fichaApi.descricao, 
            tipo: fichaApi.tipo, 
            alunoId: fichaApi.alunoId, 
            criadorId: fichaApi.criadorId, 
            tipoOrganizacaoRotina: fichaApi.tipoOrganizacaoRotina || 'numerico', 
            diasDeTreino: diasDeTreinoProcessados, 
            pastaId: fichaApi.pastaId, 
            statusModelo: fichaApi.statusModelo, 
            ordemNaPasta: fichaApi.ordemNaPasta, 
            dataValidade: fichaApi.dataValidade, 
            totalSessoesRotinaPlanejadas: fichaApi.totalSessoesRotinaPlanejadas, 
            sessoesRotinaConcluidas: fichaApi.sessoesRotinaConcluidas ?? 0, 
            criadoEm: fichaApi.criadoEm, 
            atualizadoEm: fichaApi.atualizadoEm, 
          };
        });
      } catch (err: any) {
        if (err.message?.includes("404") || (typeof err === 'object' && err !== null && 'response' in err && (err as any).response?.status === 404) ) {
            console.warn(`Nenhuma rotina encontrada para o aluno ${studentId} ou erro 404 na API (queryFn).`);
            return []; 
        }
        console.error("Erro ao buscar rotinas do aluno (queryFn):", err);
        throw err;
      }
    },
    enabled: !!studentId, 
    retry: 1, 
    initialData: [], 
  });

  const deleteMutation = useMutation<any, Error, string>({
    mutationFn: (rotinaId) => apiRequest("DELETE", `/api/treinos/${rotinaId}`), 
    onSuccess: () => {
      toast({ title: "Sucesso", description: "Rotina de treino excluída." }); 
      refetchFichasAluno(); 
    },
    onError: (error) => {
      toast({ variant: "destructive", title: "Erro ao Excluir", description: error.message || "Não foi possível excluir a rotina." }); 
    },
    onSettled: () => closeConfirmDialog(), 
  });

  const handleEditFichaClick = (rotina: RotinaListagemItem) => {
    console.log("[StudentDetail] handleEditFichaClick - Rotina recebida:", JSON.parse(JSON.stringify(rotina)));
    setFichaParaEditarOuCriar(rotina); 
    setIsTreinoFormModalOpen(true); 
  };

  const handleCreateFichaClick = () => {
    setFichaParaEditarOuCriar(null); 
    setIsTreinoFormModalOpen(true); 
  };

  const handleDeleteClick = (rotina: RotinaListagemItem) => {
    openConfirmDialog({
        titulo: "Excluir Rotina de Treino", 
        mensagem: `Tem certeza que deseja excluir a rotina "${rotina.titulo}"?`, 
        textoConfirmar: "Excluir Rotina", 
        textoCancelar: "Cancelar", 
        onConfirm: () => deleteMutation.mutate(rotina._id), 
    });
  };

  const handleViewFichaClick = (rotina: RotinaListagemItem) => {
    const todosExerciciosPlanos: ExercicioEmDiaDeTreinoDetalhado[] = (rotina.diasDeTreino || []).flatMap(
      (dia: DiaDeTreinoDetalhado) => (dia.exerciciosDoDia || []).map(
        (ex: ExercicioEmDiaDeTreinoDetalhado): ExercicioEmDiaDeTreinoDetalhado => ({ ...ex })
      )
    );
    const fichaViewData: FichaTreinoView = {
        _id: rotina._id, 
        titulo: rotina.titulo, 
        descricao: rotina.descricao, 
        tipo: rotina.tipo, 
        alunoId: rotina.alunoId, 
        criadorId: rotina.criadorId, 
        diasDeTreino: rotina.diasDeTreino || [], 
        exercicios: todosExerciciosPlanos,  
        criadoEm: rotina.criadoEm, 
        atualizadoEm: rotina.atualizadoEm, 
        statusModelo: rotina.statusModelo, 
        tipoOrganizacaoRotina: rotina.tipoOrganizacaoRotina, 
    };
    setFichaParaVisualizar(fichaViewData); 
    setIsViewFichaModalOpen(true); 
  };

  const handleTriggerEditFichaFromView = (fichaFromView: FichaTreinoView) => {
      setIsViewFichaModalOpen(false); 
      const fichaOriginal = studentWorkouts.find(f => f._id === fichaFromView._id); 
      if (fichaOriginal) {
        handleEditFichaClick(fichaOriginal); 
      } else {
        toast({ title: "Erro", description: "Não foi possível encontrar a rotina original para edição.", variant: "destructive"}); 
      }
  };

  const handleTriggerCopyFichaFromView = (fichaId: string, fichaTitulo: string, tipoFichaOriginal?: "modelo" | "individual") => {
    setIsViewFichaModalOpen(false); 
    setFichaOriginalParaAssociar({ id: fichaId, titulo: fichaTitulo }); 
    setIsAssociarModalOpen(true); 
  };

  const handleTreinoFormSuccess = () => {
      refetchFichasAluno(); 
      setIsTreinoFormModalOpen(false); 
      setFichaParaEditarOuCriar(null); 
  };

  if (isLoadingStudent) return <LoadingSpinner text="Carregando dados do aluno..." />; 
  if (!studentId) return <ErrorMessage title="Erro" message="ID do aluno não fornecido na URL."/>; 
  if (!isLoadingStudent && !errorLoadingStudent && !student) { return <ErrorMessage title="Não Encontrado" message={`Aluno com ID "${studentId}" não encontrado.`} />; 
  }
  if (errorLoadingStudent) { return <ErrorMessage title="Erro ao Carregar Aluno" message={errorLoadingStudent.message} />; 
  }

  const formatDate = (dateString?: string): string => {
      if (!dateString) return 'Não informado'; 
      try {
          const date = new Date(dateString); 
          if (isNaN(date.getTime())) return dateString; 
          return date.toLocaleDateString('pt-BR', { timeZone: 'UTC' }); 
      } catch (e) {
          return dateString; 
      }
  };

  const renderFichasContent = () => {
    if (isLoadingWorkouts) {
      return <LoadingSpinner text="Carregando rotinas..." />; 
    }
    if (errorLoadingWorkouts) {
      return <ErrorMessage title="Erro ao Carregar Rotinas" message={errorLoadingWorkouts.message} />; 
    }
    if (Array.isArray(studentWorkouts) && studentWorkouts.length > 0) { 
      return (
        <div className="space-y-4">
          {studentWorkouts.map((rotina) => ( 
            <div key={rotina._id} className="border rounded-lg p-4 shadow-sm dark:border-gray-700 flex flex-col sm:flex-row justify-between items-start sm:items-center gap-3">
              <div className="flex-grow">
                <h3 className="font-semibold text-lg text-gray-900 dark:text-gray-100 mb-1">{rotina.titulo}</h3> 
                {rotina.descricao && <p className="text-sm text-muted-foreground mb-2">{rotina.descricao}</p>} 
                <p className="text-xs text-muted-foreground">
                  Criada em: {formatDate(rotina.criadoEm)}
                </p>
              </div>
       
              <div className="flex-shrink-0 flex gap-2 self-start sm:self-center"> 
                <Button variant="outline" size="icon" className="h-8 w-8" title="Visualizar Rotina" onClick={() => handleViewFichaClick(rotina)}> <Eye className="w-4 h-4" /> </Button> 
                <Button variant="outline" size="icon" className="h-8 w-8" title="Editar Rotina" onClick={() => handleEditFichaClick(rotina)} disabled={deleteMutation.isPending} > <Edit className="w-4 h-4" /> </Button> 
                <Button variant="destructive" size="icon" className="h-8 w-8" title="Excluir Rotina" onClick={() => handleDeleteClick(rotina)} 
                  disabled={deleteMutation.isPending && deleteMutation.variables === rotina._id} > 
                  {deleteMutation.isPending && deleteMutation.variables === rotina._id ? ( <Loader2 className="w-4 h-4 animate-spin" /> ) : ( <Trash2 className="w-4 h-4" /> )} 
                </Button>
              </div>
            </div>
          ))}
        </div>
      );
    }
    return <p className="text-center py-6 text-gray-600 dark:text-gray-400">Este aluno ainda não possui rotinas de treino atribuídas.</p>; 
  };

  return (
    <div className="container mx-auto py-8 px-4"> 
      <div className="mb-6">
        <Button variant="outline" onClick={() => navigate("/alunos")} >
          <ArrowLeft className="w-4 h-4 mr-2" />
           Voltar para Lista de Alunos
        </Button>
      </div>

      <Card className="mb-8">
        <CardHeader>
          <CardTitle className="flex items-center justify-between"> 
             <span>Detalhes de {student?.nome}</span>
             <Link href={`/alunos/editar/${studentId}`}>
               <Button variant="outline" size="sm">
                 <Edit className="w-4 h-4 mr-2" /> Editar Aluno
               </Button>
             </Link>
          </CardTitle> 
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="grid grid-cols-1 md:grid-cols-2 gap-x-8 gap-y-3 text-sm">
              <div className="flex items-center gap-2 text-gray-700 dark:text-gray-300">
                <UserCircle className="w-5 h-5 text-gray-500 dark:text-gray-400 flex-shrink-0" />
                <span><strong>Nome:</strong> {student?.nome ?? 'Não informado'}</span> 
              </div>
              <div className="flex items-center gap-2 text-gray-700 dark:text-gray-300">
                <svg xmlns="http://www.w3.org/2000/svg" className="h-5 w-5 text-gray-500 dark:text-gray-400 flex-shrink-0" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}> <path strokeLinecap="round" strokeLinejoin="round" d="M16 12a4 4 0 10-8 0 4 4 0 008 0zm0 0v1.5a2.5 2.5 0 005 0V12a9 9 0 10-9 9m4.5-1.206a8.959 8.959 0 01-4.5 1.206" /> </svg>
                <span><strong>Email:</strong> {student?.email ?? 'Não informado'}</span> 
              </div>
              <div className="flex items-center gap-2 text-gray-700 dark:text-gray-300">
                <Phone className="w-5 h-5 text-gray-500 dark:text-gray-400 flex-shrink-0" />
                <span><strong>Telefone:</strong> {student?.phone ?? 'Não informado'}</span> 
              </div>
              <div className="flex items-center gap-2 text-gray-700 dark:text-gray-300">
                <Calendar className="w-5 h-5 text-gray-500 dark:text-gray-400 flex-shrink-0" />
                <span><strong>Data de Nasc.:</strong> {formatDate(student?.birthDate)}</span>
              </div>
              <div className="flex items-center gap-2 text-gray-700 dark:text-gray-300"> 
                <Info className="w-5 h-5 text-gray-500 dark:text-gray-400 flex-shrink-0" />
                <span><strong>Gênero:</strong> {student?.gender ?? 'Não informado'}</span> 
              </div>
          </div>
           <Separator className="my-4" />
           <div className="grid grid-cols-1 md:grid-cols-2 gap-x-8 gap-y-3 text-sm">
              <div className="flex items-center gap-2 text-gray-700 dark:text-gray-300">
                <Weight className="w-5 h-5 text-gray-500 dark:text-gray-400 flex-shrink-0" />
                <span><strong>Peso:</strong> {student?.weight ? `${student.weight} kg` : 'Não informado'}</span> 
              </div>
              <div className="flex items-center gap-2 text-gray-700 dark:text-gray-300">
                <Ruler className="w-5 h-5 text-gray-500 dark:text-gray-400 flex-shrink-0" />
                <span><strong>Altura:</strong> {student?.height ? `${student.height} cm` : 'Não informado'}</span> 
              </div>
              <div className="flex items-center gap-2 text-gray-700 dark:text-gray-300">
                <Target className="w-5 h-5 text-gray-500 dark:text-gray-400 flex-shrink-0" />
                <span><strong>Objetivo:</strong> {student?.goal ?? 'Não informado'}</span> 
              </div>
              <div className="flex items-center gap-2 text-gray-700 dark:text-gray-300">
                <Calendar className="w-5 h-5 text-gray-500 dark:text-gray-400 flex-shrink-0" />
                <span><strong>Data de Início:</strong> {formatDate(student?.startDate)}</span>
              </div>
              <div className="flex items-center gap-2 text-sm text-gray-700 dark:text-gray-300"> 
                 <Info className="w-5 h-5 text-gray-500 dark:text-gray-400 flex-shrink-0" />
                 <strong>Status:</strong>
                 <Badge variant={student?.status === 'active' ? 'success' : 'secondary'} className="ml-1"> 
                     {student?.status === 'active' ? 'Ativo' : 'Inativo'} 
                 </Badge>
              </div>
            </div>
           {student?.notes && (
               <>
                  <Separator className="my-4" />
                  <div className="flex items-start gap-2 text-sm text-gray-700 dark:text-gray-300"> 
                      <StickyNote className="w-5 h-5 text-gray-500 dark:text-gray-400 mt-1 flex-shrink-0" />
                      <div>
                          <strong>Observações:</strong>
                          <p className="mt-1 whitespace-pre-wrap">{student.notes}</p> 
                      </div>
                  </div>
               </>
           )}
        </CardContent>
      </Card> 

      <Card>
        <CardHeader>
          <CardTitle className="flex items-center justify-between">
            Rotinas de Treino Atribuídas
            <Button size="sm" onClick={handleCreateFichaClick} disabled={!studentId || !student}> 
              <Dumbbell className="w-4 h-4 mr-2" /> Nova Rotina para {student?.nome?.split(' ')[0]}
            </Button> 
          </CardTitle>
        </CardHeader>
        <CardContent>
          {renderFichasContent()}
        </CardContent>
      </Card> 

      {isTreinoFormModalOpen && (
          <TreinoFormModal
              open={isTreinoFormModalOpen}
              onClose={() => {setIsTreinoFormModalOpen(false); setFichaParaEditarOuCriar(null);}}
              onSuccess={handleTreinoFormSuccess}
              alunos={student ? [student] : []}
              rotinaParaEditar={fichaParaEditarOuCriar} 
              alunoId={!(fichaParaEditarOuCriar && fichaParaEditarOuCriar._id) ? studentId : undefined}
          />
      )}
      {isViewFichaModalOpen && fichaParaVisualizar && (
          <FichaViewModal
              isOpen={isViewFichaModalOpen}
              onClose={() => setIsViewFichaModalOpen(false)}
              ficha={fichaParaVisualizar} 
              onEditFicha={handleTriggerEditFichaFromView}
              onUseOuCopiarFicha={handleTriggerCopyFichaFromView}
          />
      )}
      {isAssociarModalOpen && fichaOriginalParaAssociar && (
        <AssociarModeloAlunoModal
            isOpen={isAssociarModalOpen}
            onClose={() => setIsAssociarModalOpen(false)} 
            fichaModeloId={fichaOriginalParaAssociar.id} 
            fichaModeloTitulo={fichaOriginalParaAssociar.titulo} 
        />
      )}
      <ModalConfirmacao
        isOpen={isConfirmOpen}
        onClose={closeConfirmDialog}
        onConfirm={confirmDeleteAction}
        titulo={confirmOptions.titulo}
        mensagem={confirmOptions.mensagem}
        textoConfirmar={confirmOptions.textoConfirmar}
        textoCancelar={confirmOptions.textoCancelar} 
        isLoadingConfirm={deleteMutation.isPending} 
      />
    </div>
  );
}

export default StudentDetail; 