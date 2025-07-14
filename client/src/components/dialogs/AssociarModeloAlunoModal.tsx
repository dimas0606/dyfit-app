// client/src/components/dialogs/AssociarModeloAlunoModal.tsx
// ATUALIZADO: Adicionados mais logs no handleSubmit para depurar a chamada API
// CORREÇÃO: Adicionada chave única ao Select e SelectContent para resolver erro de 'removeChild'

import React, { useState, useEffect } from 'react';
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogDescription,
  DialogFooter,
} from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Loader2, Users } from 'lucide-react';
import { Aluno } from '@/types/aluno';
import { apiRequest } from '@/lib/queryClient';
import { useToast } from '@/hooks/use-toast';
import { useQuery, useQueryClient as useTanstackQueryClient } from '@tanstack/react-query';

interface AssociarModeloAlunoModalProps {
  isOpen: boolean;
  onClose: () => void;
  fichaModeloId: string | null;
  fichaModeloTitulo: string | null;
  // Removido onModeloAssociado da prop, a lógica de sucesso será tratada aqui
}

interface AssociacaoResponse {
    _id: string;
    titulo: string;
    tipo: 'individual';
    alunoId: { _id: string; nome: string; };
}

const AssociarModeloAlunoModal: React.FC<AssociarModeloAlunoModalProps> = ({
  isOpen,
  onClose,
  fichaModeloId,
  fichaModeloTitulo,
}) => {
  const [selectedAlunoId, setSelectedAlunoId] = useState<string | undefined>(undefined);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const { toast } = useToast();
  const queryClient = useTanstackQueryClient();

  // Hook para buscar alunos
  const { data: alunos = [], isLoading: isLoadingAlunos } = useQuery<Aluno[], Error>({
    queryKey: ["/api/alunos/associar-modal"], // Chave ligeiramente diferente para evitar conflitos se houver outra query /api/alunos
    queryFn: async () => {
      console.log("[AssociarModeloAlunoModal] Buscando alunos para o modal...");
      const data = await apiRequest<Aluno[]>("GET", "/api/alunos");
      console.log(`[AssociarModeloAlunoModal] ${data.length} alunos recebidos.`);
      return Array.isArray(data) ? data : [];
    },
    enabled: isOpen, // Só busca quando o modal está aberto
    staleTime: 1000 * 60 * 5, // Cache de 5 minutos
  });

  // Efeito para resetar o aluno selecionado ao abrir o modal ou mudar o modelo
  useEffect(() => {
    if (isOpen) {
      setSelectedAlunoId(undefined); // Reseta ao abrir/mudar ficha
    }
  }, [isOpen, fichaModeloId]);

  // Função para lidar com a submissão do formulário
  const handleSubmit = async () => {
    if (!fichaModeloId || !selectedAlunoId) {
      toast({
        variant: "destructive",
        title: "Seleção Incompleta",
        description: "Por favor, selecione um aluno.",
      });
      return;
    }

    setIsSubmitting(true);
    const payload = {
        fichaModeloId,
        alunoId: selectedAlunoId
    };
    const apiPath = "/api/treinos/associar-modelo";

    console.log(`[AssociarModeloAlunoModal] Tentando POST para: ${apiPath}`);
    console.log("[AssociarModeloAlunoModal] Payload:", JSON.stringify(payload, null, 2));

    try {
      // Chamada real à API
      const novaFichaIndividual = await apiRequest<AssociacaoResponse>("POST", apiPath, payload);
      
      console.log("[AssociarModeloAlunoModal] SUCESSO na chamada API. Resposta:", novaFichaIndividual);

      toast({
        title: "Sucesso!",
        description: `Ficha "${novaFichaIndividual.titulo}" criada para ${novaFichaIndividual.alunoId.nome}.`,
      });

      // Invalidar queries para atualizar as listas
      console.log("[AssociarModeloAlunoModal] Invalidando queries: /api/treinos e fichasAluno para", selectedAlunoId);
      queryClient.invalidateQueries({ queryKey: ["/api/treinos"] });
      queryClient.invalidateQueries({ queryKey: ["fichasAluno", selectedAlunoId] });

      onClose(); // Fecha o modal

    } catch (error: any) {
      console.error("[AssociarModeloAlunoModal] ERRO na chamada apiRequest:", error);
      console.error("[AssociarModeloAlunoModal] Detalhes do erro:", error.message, error.response?.data);
      toast({
        variant: "destructive",
        title: "Erro ao Associar",
        description: error.message || "Não foi possível criar a ficha individual a partir do modelo.",
      });
    } finally {
      setIsSubmitting(false);
    }
  };

  // Não renderiza o modal se não estiver aberto ou se faltarem dados essenciais
  if (!isOpen || !fichaModeloId || !fichaModeloTitulo) {
    return null;
  }

  return (
    <Dialog open={isOpen} onOpenChange={(openStatus) => !openStatus && onClose()}>
      <DialogContent className="sm:max-w-md">
        <DialogHeader>
          <DialogTitle className="flex items-center">
            <Users className="w-5 h-5 mr-2 text-primary" />
            Associar Modelo: {fichaModeloTitulo}
          </DialogTitle>
          <DialogDescription>
            Selecione um aluno para criar uma ficha individual baseada neste modelo.
          </DialogDescription>
        </DialogHeader>

        <div className="py-4 space-y-4">
          <div>
            <label htmlFor="aluno-select-associar" className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">
              Selecionar Aluno*
            </label>
            {isLoadingAlunos ? (
              <div className="flex items-center space-x-2 text-sm text-muted-foreground">
                <Loader2 className="h-4 w-4 animate-spin" />
                <span>Carregando alunos...</span>
              </div>
            ) : alunos.length === 0 ? (
                <p className="text-sm text-muted-foreground">Nenhum aluno cadastrado para selecionar.</p>
            ) : (
              // Adicionada a chave 'key' ao componente Select para garantir a correta re-renderização
              <Select
                key={`select-${fichaModeloId}-${selectedAlunoId}`} // Chave dinâmica para forçar re-montagem se o modelo ou aluno mudar
                value={selectedAlunoId}
                onValueChange={setSelectedAlunoId}
                disabled={isSubmitting}
              >
                <SelectTrigger id="aluno-select-associar" className="w-full">
                  <SelectValue placeholder="Escolha um aluno..." />
                </SelectTrigger>
                {/* Adicionada a chave 'key' ao componente SelectContent */}
                <SelectContent key={`select-content-${fichaModeloId}`}>
                  {alunos.map((aluno) => (
                    <SelectItem key={aluno._id} value={aluno._id}>
                      {aluno.nome} ({aluno.email})
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            )}
          </div>
        </div>

        <DialogFooter>
          <Button variant="outline" onClick={onClose} disabled={isSubmitting}>
            Cancelar
          </Button>
          <Button
            onClick={handleSubmit}
            disabled={isSubmitting || isLoadingAlunos || !selectedAlunoId || alunos.length === 0}
          >
            {isSubmitting && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
            Associar e Criar Ficha
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
};

export default AssociarModeloAlunoModal;
