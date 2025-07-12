// client/src/components/rotinas/RotinaCard.tsx
import React from 'react';
import { useMutation, useQueryClient } from '@tanstack/react-query';
import { Card, CardContent, CardHeader, CardTitle, CardDescription, CardFooter } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Edit, Trash2, Eye, CopyPlus, User, Folder } from 'lucide-react';
import type { RotinaListagemItem } from '@/types/treinoOuRotinaTypes';
import type { Pasta } from '@/pages/treinos/index';
import { apiRequest } from '@/lib/queryClient';
import { useToast } from '@/hooks/use-toast';

interface RotinaCardProps {
  rotina: RotinaListagemItem;
  alunoNome?: string;
  pastas: Pasta[];
  onView: (rotina: RotinaListagemItem) => void;
  onEdit: (rotina: RotinaListagemItem) => void;
  onDelete: (rotina: RotinaListagemItem) => void;
  onAssign: (rotinaId: string, rotinaTitulo: string) => void;
}

export const RotinaCard: React.FC<RotinaCardProps> = ({ rotina, alunoNome, pastas, onView, onEdit, onDelete, onAssign }) => {
  const isModelo = rotina.tipo === 'modelo';
  const diasDeTreinoCount = Array.isArray(rotina.diasDeTreino) ? rotina.diasDeTreino.length : 0;
  const queryClient = useQueryClient();
  const { toast } = useToast();

  const updatePastaMutation = useMutation<any, Error, { pastaId: string | null }>({
    mutationFn: ({ pastaId }) => apiRequest("PUT", `/api/treinos/${rotina._id}/pasta`, { pastaId }),
    onSuccess: () => {
      toast({ title: "Sucesso!", description: "Rotina movida." });
      queryClient.invalidateQueries({ queryKey: ["/api/treinos"] });
    },
    onError: (error) => toast({ variant: "destructive", title: "Erro", description: error.message }),
  });

  const handlePastaChange = (novaPastaId: string) => {
    const pastaIdFinal = novaPastaId === 'sem-pasta' ? null : novaPastaId;
    updatePastaMutation.mutate({ pastaId: pastaIdFinal });
  };
  
  const pastaAtualId = (typeof rotina.pastaId === 'object' ? rotina.pastaId?._id : rotina.pastaId) || 'sem-pasta';

  return (
    <Card className="flex flex-col h-full shadow-md hover:shadow-lg transition-shadow duration-200 dark:bg-slate-800">
      <CardHeader className="pb-2">
        <CardTitle className="text-base font-bold truncate text-slate-800 dark:text-slate-100" title={rotina.titulo}>{rotina.titulo}</CardTitle>
        <CardDescription className="text-xs text-slate-500 dark:text-slate-400 h-8 line-clamp-2" title={rotina.descricao ?? undefined}>{rotina.descricao || 'Sem descrição.'}</CardDescription>
      </CardHeader>
      <CardContent className="flex-grow pt-2">
        <div className="flex flex-wrap gap-2">
          <Badge variant="secondary">{`${diasDeTreinoCount} Dia(s)`}</Badge>
          {isModelo ? <Badge variant="outline" className="border-purple-500 text-purple-600"><Folder className="mr-1 h-3 w-3"/>Modelo</Badge> : <Badge variant="outline" className="border-teal-500 text-teal-600"><User className="mr-1 h-3 w-3"/>{alunoNome || 'Individual'}</Badge>}
        </div>
      </CardContent>
      <CardFooter className="p-2 border-t dark:border-slate-700 flex justify-between items-center gap-1">
        {isModelo ? (
          <Select value={pastaAtualId} onValueChange={handlePastaChange}>
            <SelectTrigger className="h-8 text-xs w-full max-w-[120px] bg-slate-100 dark:bg-slate-700">
              <SelectValue placeholder="Mover para..." />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="sem-pasta">Sem Pasta</SelectItem>
              {pastas.map(p => <SelectItem key={p._id} value={p._id}>{p.nome}</SelectItem>)}
            </SelectContent>
          </Select>
        ) : <div className="w-full max-w-[120px]"></div> /* Placeholder para alinhar */}

        <div className="flex justify-end">
          <Button variant="ghost" size="icon" className="h-8 w-8" onClick={() => onView(rotina)} title="Visualizar"><Eye className="h-4 w-4 text-slate-500" /></Button>
          {isModelo && <Button variant="ghost" size="icon" className="h-8 w-8" onClick={() => onAssign(rotina._id, rotina.titulo)} title="Atribuir a Aluno"><CopyPlus className="h-4 w-4 text-slate-500" /></Button>}
          <Button variant="ghost" size="icon" className="h-8 w-8" onClick={() => onEdit(rotina)} title="Editar"><Edit className="h-4 w-4 text-slate-500" /></Button>
          <Button variant="ghost" size="icon" className="h-8 w-8 text-red-500/80 hover:text-red-500" onClick={() => onDelete(rotina)} title="Excluir"><Trash2 className="h-4 w-4" /></Button>
        </div>
      </CardFooter>
    </Card>
  );
};
