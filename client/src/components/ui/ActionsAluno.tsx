// client/src/components/ui/ActionsAluno.tsx
import React from 'react';
import { Button } from "@/components/ui/button";
import { 
    DropdownMenu, 
    DropdownMenuContent, 
    DropdownMenuItem, 
    DropdownMenuTrigger 
} from "@/components/ui/dropdown-menu";
import { Pencil, Trash2, MoreVertical } from 'lucide-react'; 

// --- INTERFACE CORRIGIDA ---
interface ActionsAlunoProps {
  onEdit: () => void;    // Função chamada ao clicar em Editar
  onDelete: () => void;  // Função chamada ao clicar em Excluir
}
// --- FIM DA CORREÇÃO ---

const ActionsAluno: React.FC<ActionsAlunoProps> = ({ onEdit, onDelete }) => {
  
  return (
    <DropdownMenu>
      <DropdownMenuTrigger asChild>
        <Button 
          variant="ghost" 
          size="icon" 
          title="Mais ações"
          className="h-8 w-8" // Tamanho consistente com o botão de visualizar
        > 
          <MoreVertical className="h-4 w-4" />
        </Button>
      </DropdownMenuTrigger>
      <DropdownMenuContent align="end"> 
        {/* Editar */}
        <DropdownMenuItem onClick={(e) => { e.stopPropagation(); onEdit(); }}>
          <Pencil className="mr-2 h-4 w-4" /> 
          <span>Editar</span>
        </DropdownMenuItem>
        {/* Excluir */}
        <DropdownMenuItem 
          onClick={(e) => { e.stopPropagation(); onDelete(); }}
          className="text-red-600 focus:text-red-700 focus:bg-red-50" 
        >
          <Trash2 className="mr-2 h-4 w-4" /> 
          <span>Excluir</span>
        </DropdownMenuItem>
      </DropdownMenuContent>
    </DropdownMenu>
  );
};

export default ActionsAluno;