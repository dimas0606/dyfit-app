// client/src/components/rotinas/RotinaCard.tsx
import React from 'react';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Popover, PopoverContent, PopoverTrigger } from "@/components/ui/popover";
import { MoreVertical, Edit, Trash2, Eye, CopyPlus, User, Folder, GripVertical } from 'lucide-react';
import type { RotinaListagemItem } from '@/types/treinoOuRotinaTypes';

interface RotinaCardProps {
  rotina: RotinaListagemItem;
  alunoNome?: string;
  onView: (rotina: RotinaListagemItem) => void;
  onEdit: (rotina: RotinaListagemItem) => void;
  onDelete: (rotina: RotinaListagemItem) => void;
  onAssign: (rotinaId: string, rotinaTitulo: string) => void;
  dndHandleProps?: any; 
}

export const RotinaCard: React.FC<RotinaCardProps> = ({ rotina, alunoNome, onView, onEdit, onDelete, onAssign, dndHandleProps }) => {
  const isModelo = rotina.tipo === 'modelo';
  const diasDeTreinoCount = Array.isArray(rotina.diasDeTreino) ? rotina.diasDeTreino.length : 0;
  
  return (
    <Card className="flex flex-col h-full shadow-md hover:shadow-lg transition-shadow duration-200 dark:bg-slate-800">
      <CardHeader className="pb-4">
        <div className="flex justify-between items-start gap-2">
          {dndHandleProps && (
            <div {...dndHandleProps} className="p-1 cursor-grab touch-none -ml-1 mt-1">
              <GripVertical className="h-5 w-5 text-slate-400" />
            </div>
          )}
          <div className="flex-grow min-w-0">
            <CardTitle className="text-lg font-bold truncate text-slate-800 dark:text-slate-100" title={rotina.titulo}>{rotina.titulo}</CardTitle>
            <CardDescription className="text-xs text-slate-500 dark:text-slate-400 mt-1 line-clamp-2" title={rotina.descricao ?? undefined}>{rotina.descricao || 'Sem descrição.'}</CardDescription>
          </div>
          <Popover>
            <PopoverTrigger asChild><Button variant="ghost" size="icon" className="h-8 w-8 flex-shrink-0 -mr-2 -mt-2"><MoreVertical className="h-4 w-4" /></Button></PopoverTrigger>
            <PopoverContent className="w-48 p-1">
              <Button variant="ghost" className="w-full justify-start text-sm" onClick={() => onView(rotina)}><Eye className="mr-2 h-4 w-4"/>Visualizar</Button>
              <Button variant="ghost" className="w-full justify-start text-sm" onClick={() => onEdit(rotina)}><Edit className="mr-2 h-4 w-4"/>Editar</Button>
              {isModelo && <Button variant="ghost" className="w-full justify-start text-sm" onClick={() => onAssign(rotina._id, rotina.titulo)}><CopyPlus className="mr-2 h-4 w-4"/>Atribuir a Aluno</Button>}
              <div className="border-t my-1"></div>
              <Button variant="ghost" className="w-full justify-start text-sm text-red-600 hover:text-red-700" onClick={() => onDelete(rotina)}><Trash2 className="mr-2 h-4 w-4"/>Excluir</Button>
            </PopoverContent>
          </Popover>
        </div>
      </CardHeader>
      <CardContent className="flex-grow pt-0 flex flex-col justify-between">
        <div className="flex flex-wrap gap-2">
          <Badge variant="secondary">{`${diasDeTreinoCount} Dia(s)`}</Badge>
          {isModelo ? <Badge variant="outline" className="border-purple-500 text-purple-600"><Folder className="mr-1 h-3 w-3"/>Modelo</Badge> : <Badge variant="outline" className="border-teal-500 text-teal-600"><User className="mr-1 h-3 w-3"/>{alunoNome || 'Individual'}</Badge>}
        </div>
      </CardContent>
    </Card>
  );
};