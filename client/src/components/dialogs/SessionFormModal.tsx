import { useState } from "react";
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { Calendar } from "@/components/ui/calendar";
import { Select, SelectTrigger, SelectValue, SelectContent, SelectItem } from "@/components/ui/select";

interface Sessao {
  id: string;
  aluno: string;
  data: Date;
  hora: string;
  status: "confirmada" | "pendente" | "concluida" | "cancelada";
  observacoes?: string;
}

interface SessionFormModalProps {
  isOpen: boolean;
  onClose: () => void;
  onSave: (novaSessao: Sessao) => void;
}

export default function SessionFormModal({ isOpen, onClose, onSave }: SessionFormModalProps) {
  const [aluno, setAluno] = useState("");
  const [data, setData] = useState<Date | undefined>(new Date());
  const [hora, setHora] = useState("");
  const [status, setStatus] = useState<"confirmada" | "pendente" | "concluida" | "cancelada">("pendente");
  const [observacoes, setObservacoes] = useState("");

  const handleSalvar = () => {
    if (!aluno || !data || !hora) return alert("Preencha todos os campos obrigatórios.");

    const novaSessao: Sessao = {
      id: Date.now().toString(),
      aluno,
      data,
      hora,
      status,
      observacoes,
    };

    onSave(novaSessao);
    onClose();
    limparCampos();
  };

  const limparCampos = () => {
    setAluno("");
    setData(new Date());
    setHora("");
    setStatus("pendente");
    setObservacoes("");
  };

  return (
    <Dialog open={isOpen} onOpenChange={onClose}>
      <DialogContent className="max-w-lg">
        <DialogHeader>
          <DialogTitle>Nova Sessão</DialogTitle>
        </DialogHeader>
        <div className="space-y-4">
          <Input placeholder="Nome do aluno" value={aluno} onChange={(e) => setAluno(e.target.value)} />
          <div className="flex gap-2 items-center">
            <Calendar selected={data} onSelect={setData} mode="single" className="border rounded-md" />
            <Input type="time" value={hora} onChange={(e) => setHora(e.target.value)} className="w-1/2" />
          </div>
          <Select value={status} onValueChange={(value) => setStatus(value as any)}>
            <SelectTrigger>
              <SelectValue placeholder="Status da sessão" />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="confirmada">Confirmada</SelectItem>
              <SelectItem value="pendente">Pendente</SelectItem>
              <SelectItem value="concluida">Concluída</SelectItem>
              <SelectItem value="cancelada">Cancelada</SelectItem>
            </SelectContent>
          </Select>
          <Input
            placeholder="Observações (opcional)"
            value={observacoes}
            onChange={(e) => setObservacoes(e.target.value)}
          />
          <Button onClick={handleSalvar} className="w-full">Salvar Sessão</Button>
        </div>
      </DialogContent>
    </Dialog>
  );
}
