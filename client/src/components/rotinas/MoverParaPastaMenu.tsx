// client/src/components/rotinas/MoverParaPastaMenu.tsx
import React from 'react';
import { useMutation, useQueryClient } from '@tanstack/react-query';
// =======================================================
// --- CORREÇÃO: Importando do arquivo correto ---
import { apiRequest } from '@/lib/queryClient';
// =======================================================
import { DropdownMenuItem, DropdownMenuPortal, DropdownMenuSub, DropdownMenuSubContent, DropdownMenuSubTrigger } from '@/components/ui/dropdown-menu';
import { Folder, FolderPlus, Trash2 } from 'lucide-react';
import { useToast } from '@/hooks/use-toast';
import type { Pasta } from '@/pages/treinos/index';

interface MoverParaPastaMenuProps {
  rotinaId: string;
  pastas: Pasta[];
  onActionComplete?: () => void; // Tornando opcional
}

export const MoverParaPastaMenu: React.FC<MoverParaPastaMenuProps> = ({ rotinaId, pastas, onActionComplete }) => {
  const { toast } = useToast();
  const queryClient = useQueryClient();

  const mutation = useMutation<any, Error, { pastaId: string | null }>({
    mutationFn: ({ pastaId }) => apiRequest("PUT", `/api/treinos/${rotinaId}/pasta`, { pastaId }),
    onSuccess: () => {
      toast({ title: "Sucesso!", description: "Rotina movida." });
      queryClient.invalidateQueries({ queryKey: ["/api/treinos"] });
      if (onActionComplete) onActionComplete();
    },
    onError: (error) => toast({ variant: "destructive", title: "Erro", description: error.message }),
  });

  const handleMove = (pastaId: string | null) => {
    mutation.mutate({ pastaId });
  };

  return (
    <DropdownMenuSub>
      <DropdownMenuSubTrigger>
        <FolderPlus className="mr-2 h-4 w-4" />
        <span>Mover para Pasta</span>
      </DropdownMenuSubTrigger>
      <DropdownMenuPortal>
        <DropdownMenuSubContent>
          <DropdownMenuItem onClick={() => handleMove(null)}>
            <Trash2 className="mr-2 h-4 w-4 text-red-500" />
            <span>Remover da Pasta</span>
          </DropdownMenuItem>
          <div className="my-1 border-t"></div>
          {pastas.map(pasta => (
            <DropdownMenuItem key={pasta._id} onClick={() => handleMove(pasta._id)}>
              <Folder className="mr-2 h-4 w-4" />
              <span>{pasta.nome}</span>
            </DropdownMenuItem>
          ))}
          {pastas.length === 0 && <DropdownMenuItem disabled>Nenhuma pasta criada</DropdownMenuItem>}
        </DropdownMenuSubContent>
      </DropdownMenuPortal>
    </DropdownMenuSub>
  );
};
