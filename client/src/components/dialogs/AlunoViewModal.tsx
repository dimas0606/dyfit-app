import React from "react";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from "@/components/ui/dialog";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Badge } from "@/components/ui/badge";
import { ScrollArea } from "@/components/ui/scroll-area";
import { Aluno } from "@/types/aluno";

interface AlunoViewModalProps {
  aluno: Aluno;
  trigger?: React.ReactNode;
  open?: boolean;
  onOpenChange?: (open: boolean) => void;
}

const AlunoViewModal: React.FC<AlunoViewModalProps> = ({
  aluno,
  trigger,
  open,
  onOpenChange,
}) => {
  const formatDateBR = (dateStr: string) =>
    new Intl.DateTimeFormat("pt-BR").format(new Date(dateStr));

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      {trigger && <DialogTrigger asChild>{trigger}</DialogTrigger>}
      <DialogContent className="max-w-2xl">
        <DialogHeader>
          <DialogTitle>Detalhes de {aluno.nome}</DialogTitle>
        </DialogHeader>

        <Tabs defaultValue="perfil" className="w-full">
          <TabsList className="mb-4">
            <TabsTrigger value="perfil">Perfil</TabsTrigger>
            <TabsTrigger value="treino" disabled>Treino Atual</TabsTrigger>
          </TabsList>

          <TabsContent value="perfil">
            <ScrollArea className="h-[300px] pr-4">
              <div className="space-y-2 text-sm">
                <p><strong>Email:</strong> {aluno.email}</p>
                <p><strong>Telefone:</strong> {aluno.phone || "Não informado"}</p>
                <p><strong>Data de nascimento:</strong> {formatDateBR(aluno.birthDate)}</p>
                <p><strong>Gênero:</strong> {aluno.gender}</p>
                <p><strong>Objetivo:</strong> {aluno.goal}</p>
                <p><strong>Peso:</strong> {aluno.weight} kg</p>
                <p><strong>Altura:</strong> {aluno.height} cm</p>
                <p><strong>Data de início:</strong> {formatDateBR(aluno.startDate)}</p>
                <p>
                  <strong>Status:</strong>{" "}
                  <Badge variant="outline" className="bg-green-100 text-green-800">
                    {aluno.status === "active" ? "Ativo" : "Inativo"}
                  </Badge>
                </p>
                <p><strong>Observações:</strong> {aluno.notes || "Nenhuma"}</p>
              </div>
            </ScrollArea>
          </TabsContent>

          <TabsContent value="treino">
            <div className="text-center text-muted-foreground">
              Vinculação de treinos em breve.
            </div>
          </TabsContent>
        </Tabs>
      </DialogContent>
    </Dialog>
  );
};

export default AlunoViewModal;
