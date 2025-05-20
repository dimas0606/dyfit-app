import { useEffect, useState } from "react";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter, DialogDescription } from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Button } from "@/components/ui/button";
import { Textarea } from "@/components/ui/textarea";

interface EditFichaModalProps {
  isOpen: boolean;
  onClose: () => void;
  fichaData: { // Dados necessários para edição
    _id: string;
    titulo: string;
    descricao?: string;
  } | null;
  onSave: (id: string, data: { titulo: string; descricao?: string }) => Promise<void>; // Função para salvar
  isLoading: boolean; // Estado de loading da mutation
}

export default function EditFichaModal({
  isOpen,
  onClose,
  fichaData,
  onSave,
  isLoading,
}: EditFichaModalProps) {
  const [titulo, setTitulo] = useState("");
  const [descricao, setDescricao] = useState("");

  // Atualiza o estado interno quando fichaData muda (ao abrir o modal)
  useEffect(() => {
    if (fichaData) {
      setTitulo(fichaData.titulo);
      setDescricao(fichaData.descricao || "");
    } else {
      // Reseta se não houver dados
      setTitulo("");
      setDescricao("");
    }
  }, [fichaData]);

  const handleSaveClick = async () => {
    if (!fichaData) return; // Segurança extra

    // Validação simples no frontend
    if (!titulo.trim()) {
      alert("O título não pode ficar em branco."); // Adicione um toast se necessário
      return;
    }

    try {
      await onSave(fichaData._id, { titulo: titulo.trim(), descricao });
      // Feedback e fechamento do modal tratados no sucesso da mutation
    } catch (error) {
      console.error("Erro ao salvar:", error);
      alert("Erro ao salvar as alterações. Tente novamente.");
    }
  };

  // Não renderiza nada se não estiver aberto ou sem dados
  if (!isOpen || !fichaData) {
    return null;
  }

  return (
    <Dialog open={isOpen} onOpenChange={(open) => !open && onClose()}>
      <DialogContent className="max-w-md">
        <DialogHeader>
          <DialogTitle>Editar Ficha de Treino</DialogTitle>
          <DialogDescription>Altere o título e a descrição da ficha.</DialogDescription>
        </DialogHeader>

        <div className="space-y-4 py-4">
          {/* Título */}
          <div>
            <Label htmlFor="edit-titulo-ficha">Título*</Label>
            <Input
              id="edit-titulo-ficha"
              value={titulo}
              onChange={(e) => setTitulo(e.target.value)}
              placeholder="Título da ficha"
              disabled={isLoading}
            />
          </div>

          {/* Descrição */}
          <div>
            <Label htmlFor="edit-descricao-ficha">Descrição</Label>
            <Textarea
              id="edit-descricao-ficha"
              value={descricao}
              onChange={(e) => setDescricao(e.target.value)}
              placeholder="Descrição (opcional)"
              disabled={isLoading}
            />
          </div>
        </div>

        <DialogFooter>
          <Button variant="outline" onClick={onClose}>
            Cancelar
          </Button>
          <Button onClick={handleSaveClick} disabled={isLoading}>
            Salvar
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}