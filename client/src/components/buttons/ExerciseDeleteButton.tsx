// client/src/components/buttons/ExerciseDeleteButton.tsx
import { useState } from "react";
import { Trash, Loader2 } from "lucide-react";
import { Button } from "@/components/ui/button";
import {
  AlertDialog,
  AlertDialogTrigger,
  AlertDialogContent,
  AlertDialogHeader,
  AlertDialogTitle,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogCancel,
  AlertDialogAction,
} from "@/components/ui/alert-dialog";
import { useToast } from "@/hooks/use-toast"; // <<< USA O HOOK
import { useMutation, useQueryClient } from "@tanstack/react-query";
import { apiRequest } from "@/lib/queryClient";

interface Props {
  exercicioId: string;
  onDeleted: () => void;
}

export default function ExerciseDeleteButton({ exercicioId, onDeleted }: Props) {
  const { toast } = useToast(); // <<< USA O HOOK
  const queryClient = useQueryClient();
  const [isAlertOpen, setIsAlertOpen] = useState(false);

  const deleteMutation = useMutation< { message: string }, Error, string >({
    mutationFn: (idToDelete) => apiRequest<{ message: string }>("DELETE", `/api/exercicios/${idToDelete}`),
    onSuccess: (data) => {
      toast({ title: "Sucesso!", description: data.message || "Exercício excluído." }); // Chama toast do hook
      onDeleted();
      queryClient.invalidateQueries({ queryKey: ['/api/exercicios/meus'] });
      setIsAlertOpen(false);
    },
    onError: (error) => {
      toast({ // Chama toast do hook
        variant: "destructive",
        title: "Erro ao Excluir",
        description: error.message || "Não foi possível excluir o exercício.",
      });
    },
  });

  const handleConfirmDelete = () => {
    deleteMutation.mutate(exercicioId);
  };

  return (
     <AlertDialog open={isAlertOpen} onOpenChange={setIsAlertOpen}>
      <AlertDialogTrigger asChild>
         <Button
           variant="ghost"
           size="icon"
           className="text-destructive hover:text-destructive hover:bg-destructive/10 h-8 w-8" // Ajuste visual
           title="Excluir Exercício"
         >
           <Trash className="w-4 h-4" />
         </Button>
      </AlertDialogTrigger>
      <AlertDialogContent>
         <AlertDialogHeader>
           <AlertDialogTitle>Excluir Exercício</AlertDialogTitle>
           <AlertDialogDescription>
             Tem certeza que deseja excluir este exercício? Os treinos que o utilizam podem ser afetados. Esta ação não poderá ser desfeita.
           </AlertDialogDescription>
         </AlertDialogHeader>
         <AlertDialogFooter>
           <AlertDialogCancel disabled={deleteMutation.isPending}>Cancelar</AlertDialogCancel>
           <AlertDialogAction
              onClick={handleConfirmDelete}
              disabled={deleteMutation.isPending}
              className="bg-destructive text-destructive-foreground hover:bg-destructive/90"
           >
             {deleteMutation.isPending ? ( <><Loader2 className="mr-2 h-4 w-4 animate-spin" /> Excluindo...</> ) : 'Excluir'}
           </AlertDialogAction>
         </AlertDialogFooter>
      </AlertDialogContent>
     </AlertDialog>
  );
}