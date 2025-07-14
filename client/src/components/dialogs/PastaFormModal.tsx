// client/src/components/dialogs/PastaFormModal.tsx
import React, { useState, useEffect } from 'react';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription, DialogFooter } from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Loader2 } from 'lucide-react';
import { useToast } from '@/hooks/use-toast';
import { useMutation } from '@tanstack/react-query';
import { apiRequest } from '@/lib/queryClient';

export interface PastaFormData { nome: string; }
export interface PastaExistente extends PastaFormData { _id: string; }
interface PastaFormModalProps {
  isOpen: boolean;
  onClose: () => void;
  onSuccessCallback: () => void; // Nova prop para sinalizar sucesso
  initialData?: PastaExistente | null;
}

const PastaFormModal: React.FC<PastaFormModalProps> = ({ isOpen, onClose, onSuccessCallback, initialData }) => {
  const [nomePasta, setNomePasta] = useState('');
  const { toast } = useToast();
  const isEditing = !!initialData;

  useEffect(() => {
    if (isOpen) setNomePasta(isEditing ? initialData.nome : '');
  }, [isOpen, isEditing, initialData]);

  const mutation = useMutation<any, Error, PastaFormData>({
    mutationFn: (data) => {
      const endpoint = isEditing ? `/api/pastas/treinos/${initialData?._id}` : "/api/pastas/treinos";
      return apiRequest(isEditing ? "PUT" : "POST", endpoint, data);
    },
    // O modal não invalida mais a query, ele apenas avisa o pai que teve sucesso.
    onSuccess: () => {
      toast({ title: "Sucesso!", description: `Pasta ${isEditing ? 'atualizada' : 'criada'} com sucesso.` });
      onSuccessCallback(); // Chama a função do componente pai
    },
    onError: (error) => {
      toast({ variant: "destructive", title: "Erro", description: error.message });
      onClose(); // Fecha o modal mesmo em caso de erro.
    },
  });

  const handleSubmit = () => {
    if (!nomePasta.trim()) {
      toast({ variant: "destructive", title: "Erro de Validação", description: "O nome da pasta é obrigatório." });
      return;
    }
    mutation.mutate({ nome: nomePasta.trim() });
  };

  if (!isOpen) return null;

  return (
    <Dialog open={isOpen} onOpenChange={onClose}>
      <DialogContent className="sm:max-w-md">
        <DialogHeader>
          <DialogTitle>{isEditing ? "Editar Pasta" : "Nova Pasta"}</DialogTitle>
          <DialogDescription>Organize suas rotinas modelo.</DialogDescription>
        </DialogHeader>
        <div className="py-4 space-y-2">
          <Label htmlFor="nome-pasta">Nome da Pasta*</Label>
          <Input id="nome-pasta" value={nomePasta} onChange={(e) => setNomePasta(e.target.value)}
            placeholder="Ex: Adaptação, Hipertrofia, Cutting..."
            disabled={mutation.isPending}
          />
        </div>
        <DialogFooter>
          <Button variant="outline" onClick={onClose} disabled={mutation.isPending}>Cancelar</Button>
          <Button onClick={handleSubmit} disabled={mutation.isPending || !nomePasta.trim()}>
            {mutation.isPending && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
            {isEditing ? "Salvar" : "Criar"}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
};

export default PastaFormModal;
