// client/src/components/rotinas/RotinaCard.tsx
import React from 'react';
import { Card, CardContent, CardHeader, CardTitle, CardDescription, CardFooter } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Popover, PopoverContent, PopoverTrigger } from "@/components/ui/popover";
import { Tooltip, TooltipContent, TooltipProvider, TooltipTrigger } from "@/components/ui/tooltip";
import { Edit, Trash2, Eye, CopyPlus, User, Folder as FolderIcon } from 'lucide-react';
import type { RotinaListagemItem } from '@/types/treinoOuRotinaTypes';
import type { Pasta } from '@/pages/treinos/index';

interface RotinaCardProps {
  rotina: RotinaListagemItem;
  pastas: Pasta[];
  alunoNome?: string;
  onView: (rotina: RotinaListagemItem) => void;
  onEdit: (rotina: RotinaListagemItem) => void;
  onDelete: (rotina: RotinaListagemItem) => void;
  onAssign: (rotinaId: string, rotinaTitulo: string) => void;
  onMoveToFolder: (rotinaId: string, pastaId: string) => void;
  onRemoveFromFolder: (rotinaId: string) => void;
}

export const RotinaCard: React.FC<RotinaCardProps> = ({ 
  rotina, 
  pastas,
  alunoNome, 
  onView, 
  onEdit, 
  onDelete, 
  onAssign,
  onMoveToFolder,
  onRemoveFromFolder
}) => {
  const isModelo = rotina.tipo === 'modelo';
  const diasDeTreinoCount = Array.isArray(rotina.diasDeTreino) ? rotina.diasDeTreino.length : 0;
  const pastaAtualId = typeof rotina.pastaId === 'object' ? rotina.pastaId?._id : rotina.pastaId;

  const outrasPastas = pastas.filter(p => p._id !== pastaAtualId);

  const ActionButton = ({ title, onClick, children }: { title: string, onClick: () => void, children: React.ReactNode }) => (
    <TooltipProvider delayDuration={200}>
      <Tooltip>
        <TooltipTrigger asChild>
          <Button variant="ghost" size="icon" className="h-8 w-8" onClick={onClick}>{children}</Button>
        </TooltipTrigger>
        <TooltipContent><p>{title}</p></TooltipContent>
      </Tooltip>
    </TooltipProvider>
  );

  return (
    <Card className="flex flex-col h-full shadow-md hover:shadow-lg transition-shadow duration-200 dark:bg-slate-800">
      <CardHeader className="pb-2">
        <CardTitle className="text-base font-bold truncate text-slate-800 dark:text-slate-100" title={rotina.titulo}>{rotina.titulo}</CardTitle>
        <CardDescription className="text-xs text-slate-500 dark:text-slate-400 h-8 line-clamp-2" title={rotina.descricao ?? undefined}>{rotina.descricao || 'Sem descrição.'}</CardDescription>
      </CardHeader>
      
      <CardContent className="flex-grow pt-2 pb-4">
        <div className="flex flex-wrap gap-2">
          <Badge variant="secondary">{`${diasDeTreinoCount} Dia(s)`}</Badge>
          {isModelo ? <Badge variant="outline" className="border-primary text-primary"><FolderIcon className="mr-1 h-3 w-3"/>Modelo</Badge> : <Badge variant="outline" className="border-teal-500 text-teal-600"><User className="mr-1 h-3 w-3"/>{alunoNome || 'Individual'}</Badge>}
        </div>
      </CardContent>

      <CardFooter className="p-2 border-t dark:border-slate-700 flex justify-between items-center gap-1">
        <div className="flex-1">
          {isModelo && (
            <Popover>
              <TooltipProvider delayDuration={200}>
                <Tooltip>
                  <TooltipTrigger asChild>
                    <PopoverTrigger asChild>
                      <Button variant="ghost" size="icon" className="h-8 w-8">
                        <FolderIcon className="h-4 w-4 text-slate-500" />
                      </Button>
                    </PopoverTrigger>
                  </TooltipTrigger>
                  <TooltipContent><p>Organizar Pastas</p></TooltipContent>
                </Tooltip>
              </TooltipProvider>
              <PopoverContent className="w-56 p-2">
                <div className="grid gap-1">
                  {/* --- AJUSTE DE ESTILO APLICADO AQUI --- */}
                  <p className="font-semibold text-sm px-2 py-1.5 text-muted-foreground bg-slate-100 dark:bg-slate-800 rounded-sm">Mover para...</p>
                  
                  {outrasPastas.length > 0 ? (
                    outrasPastas.map(p => (
                      <Button key={p._id} variant="ghost" className="w-full justify-start text-sm" onClick={() => onMoveToFolder(rotina._id, p._id)}>
                        {p.nome}
                      </Button>
                    ))
                  ) : (
                    <p className="text-xs text-muted-foreground px-2 py-1.5">Nenhuma outra pasta disponível.</p>
                  )}
                  {pastaAtualId && (
                    <>
                      <hr className="my-1"/>
                      <Button variant="ghost" className="w-full justify-start text-sm text-red-500 hover:text-red-500 hover:bg-red-50 dark:hover:bg-red-900/50" onClick={() => onRemoveFromFolder(rotina._id)}>
                        Remover da Pasta Atual
                      </Button>
                    </>
                  )}
                </div>
              </PopoverContent>
            </Popover>
          )}
        </div>

        <div className="flex justify-end">
          <ActionButton title="Visualizar" onClick={() => onView(rotina)}><Eye className="h-4 w-4 text-slate-500" /></ActionButton>
          {isModelo && <ActionButton title="Atribuir a Aluno" onClick={() => onAssign(rotina._id, rotina.titulo)}><CopyPlus className="h-4 w-4 text-slate-500" /></ActionButton>}
          <ActionButton title="Editar" onClick={() => onEdit(rotina)}><Edit className="h-4 w-4 text-slate-500" /></ActionButton>
          <ActionButton title="Excluir" onClick={() => onDelete(rotina)}><Trash2 className="h-4 w-4 text-red-500/80 hover:text-red-500" /></ActionButton>
        </div>
      </CardFooter>
    </Card>
  );
};

export default RotinaCard; // A exportação padrão foi restaurada para consistência