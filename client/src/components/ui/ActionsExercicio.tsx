// client/src/components/ui/ActionsExercicio.tsx
// (Assumindo estrutura similar aos outros componentes com botões)
import React from 'react'; // Import React
import { Button } from "@/components/ui/button";
import { Pencil, Trash, Star } from "lucide-react";
import { useToast } from "@/hooks/use-toast"; // <<< USA O HOOK

interface ActionsExercicioProps {
  exercicioId: string;
  isFavorito?: boolean;
  isCustom?: boolean; // Para saber se pode editar/excluir
  onEdit: (id: string) => void;
  onDelete: (id: string) => void;
  onToggleFavorite: (id: string, currentState: boolean) => void;
}

export default function ActionsExercicio({
  exercicioId,
  isFavorito = false,
  isCustom = false,
  onEdit,
  onDelete,
  onToggleFavorite,
}: ActionsExercicioProps) {
  const { toast } = useToast(); // <<< USA O HOOK

  const handleEdit = () => {
    if (isCustom) {
      onEdit(exercicioId);
    } else {
      toast({ variant: "destructive", title: "Ação não permitida", description: "Exercícios do App não podem ser editados." });
    }
  };

  const handleDelete = () => {
    if (isCustom) {
      onDelete(exercicioId); // A confirmação deve estar no componente pai ou no botão de delete
    } else {
      toast({ variant: "destructive", title: "Ação não permitida", description: "Exercícios do App não podem ser excluídos." });
    }
  };

  const handleFavorite = () => {
    onToggleFavorite(exercicioId, isFavorito);
  };

  return (
    <div className="flex justify-end items-center space-x-1">
       {/* Mostrar Editar/Excluir apenas se for custom */}
       {isCustom && (
          <>
             <Button variant="ghost" size="icon" className="h-8 w-8 text-gray-500 hover:text-blue-600" title="Editar" onClick={handleEdit}>
                 <Pencil className="w-4 h-4" />
             </Button>
             {/* O botão de Delete pode ser o ExerciseDeleteButton que já usa AlertDialog */}
             {/* <ExerciseDeleteButton exercicioId={exercicioId} onDeleted={() => onDelete(exercicioId)} /> */}
             {/* Ou um botão simples que chama onDelete (pai lida com confirmação) */}
             <Button variant="ghost" size="icon" className="h-8 w-8 text-red-500 hover:text-red-700" title="Excluir" onClick={handleDelete}>
                 <Trash className="w-4 h-4" />
             </Button>
          </>
       )}
        <Button variant="ghost" size="icon" className={`h-8 w-8 ${isFavorito ? 'text-yellow-500 hover:text-yellow-600' : 'text-gray-400 hover:text-yellow-500'}`} title={isFavorito ? "Desfavoritar" : "Favoritar"} onClick={handleFavorite}>
            <Star className={`w-4 h-4 ${isFavorito ? 'fill-current' : ''}`} />
        </Button>
    </div>
  );
}