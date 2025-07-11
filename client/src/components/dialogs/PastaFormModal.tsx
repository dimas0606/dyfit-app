// client/src/components/dialogs/PastaFormModal.tsx
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
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Loader2 } from 'lucide-react';
import { useToast } from '@/hooks/use-toast';

export interface PastaFormData {
  nome: string;
}

export interface PastaExistente extends PastaFormData {
  _id: string;
}

interface PastaFormModalProps {
  isOpen: boolean;
  onClose: () => void;
  onSave: (data: PastaFormData, pastaId?: string) => Promise<void>;
  initialData?: PastaExistente | null;
  isLoading?: boolean;
}

const PastaFormModal: React.FC<PastaFormModalProps> = ({ isOpen, onClose, onSave, initialData, isLoading: isLoadingProp = false }) => {
  const [nomePasta, setNomePasta] = useState('');
  const [isSubmitting, setIsSubmitting] = useState(false);
  const { toast } = useToast();
  const isEditing = !!initialData;

  useEffect(() => {
    if (isOpen) {
      if (isEditing && initialData) {
        setNomePasta(initialData.nome);
      } else {
        setNomePasta('');
      }
    }
  }, [isOpen, isEditing, initialData]);

  const handleSubmit = async () => {
    if (!nomePasta.trim()) {
      toast({ variant: "destructive", title: "Erro de Validação", description: "O nome da pasta é obrigatório." });
      return;
    }
    setIsSubmitting(true);
    try {
      await onSave({ nome: nomePasta.trim() }, initialData?._id);
    } catch (error: any) {
      console.error("Erro ao salvar pasta:", error);
      toast({ variant: "destructive", title: "Erro", description: `Não foi possível ${isEditing ? 'atualizar' : 'criar'} a pasta.` });
    } finally {
      setIsSubmitting(false);
    }
  };

  if (!isOpen) return null;

  const modalTitle = isEditing ? "Editar Pasta de Rotinas" : "Nova Pasta de Rotinas";
  const modalDescription = isEditing ? "Altere o nome da sua pasta de rotinas modelo." : "Crie uma nova pasta para organizar suas rotinas modelo.";
  const buttonText = isEditing ? "Salvar Alterações" : "Criar Pasta";
  const loadingButtonText = isEditing ? "Salvando..." : "Criando...";
  const actualLoading = isLoadingProp || isSubmitting;

  return (
    <Dialog open={isOpen} onOpenChange={(openStatus) => !openStatus && onClose()}>
      <DialogContent className="sm:max-w-md">
        <DialogHeader>
          <DialogTitle>{modalTitle}</DialogTitle>
          <DialogDescription>{modalDescription}</DialogDescription>
        </DialogHeader>
        <div className="py-4 space-y-2">
          <Label htmlFor="nome-pasta">Nome da Pasta*</Label>
          <Input
            id="nome-pasta"
            value={nomePasta}
            onChange={(e) => setNomePasta(e.target.value)}
            // =======================================================
            // --- MUDANÇA NO PLACEHOLDER ---
            placeholder="Ex: Adaptação, Hipertrofia, Cutting..."
            // =======================================================
            disabled={actualLoading}
          />
        </div>
        <DialogFooter>
          <Button variant="outline" onClick={onClose} disabled={actualLoading}>Cancelar</Button>
          <Button onClick={handleSubmit} disabled={actualLoading || !nomePasta.trim()}>
            {actualLoading && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
            {actualLoading ? loadingButtonText : buttonText}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
};

export default PastaFormModal;
