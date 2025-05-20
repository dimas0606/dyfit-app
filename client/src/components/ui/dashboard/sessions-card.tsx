// client/src/components/ui/dashboard/sessions-card.tsx
import { useState, useEffect } from "react"; // Removido React, não é necessário importar explicitamente no escopo do arquivo com JSX
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { format } from "date-fns";
import { ptBR } from "date-fns/locale";
import { MoreVertical, Plus, CalendarClock, UserCircle, Info, Loader2, Edit3, Activity, ClipboardCheck, Dumbbell } from "lucide-react"; // Adicionado Dumbbell
import {
  Card,
  CardContent,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import { Button } from "@/components/ui/button";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
  DialogFooter,
  DialogDescription,
} from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { apiRequest } from "@/lib/queryClient";
import { useToast } from "@/hooks/use-toast";
import { Aluno } from "@/types/aluno";
import LoadingSpinner from "@/components/LoadingSpinner";

// <<< TIPOS DUPLICADOS/ADAPTADOS PARA O FRONTEND (Idealmente viriam de uma pasta 'shared') >>>
export const TIPOS_COMPROMISSO_FRONTEND = ['avaliacao', 'checkin', 'treino_acompanhado', 'outro'] as const;
export type TipoCompromissoFrontend = typeof TIPOS_COMPROMISSO_FRONTEND[number];

// Interface para os dados de sessão/compromisso esperados da API
interface CompromissoData {
  _id: string;
  sessionDate: string; 
  tipoCompromisso: TipoCompromissoFrontend; // Usando o tipo do frontend
  notes?: string;
  status: "pending" | "confirmed" | "completed" | "cancelled";
  studentId: { _id: string; nome: string; } | string; 
  trainerId: string;
}

interface NewCompromissoState {
    sessionDate: string;
    tipoCompromisso: TipoCompromissoFrontend; // Usando o tipo do frontend
    notes: string;
    status: CompromissoData['status'];
    studentId: string;
    trainerId: string;
}
// <<< FIM DOS TIPOS DUPLICADOS >>>


interface SessionsCardProps {
  trainerId: string; 
}

export function SessionsCard({ trainerId }: SessionsCardProps) {
  const { toast } = useToast();
  const queryClientHook = useQueryClient();
  const today = new Date();
  const [isModalOpen, setIsModalOpen] = useState(false);

  const initialNewCompromissoState: NewCompromissoState = {
    sessionDate: format(new Date(), "yyyy-MM-dd'T'HH:mm"),
    tipoCompromisso: 'treino_acompanhado', 
    notes: "",
    status: "pending" as CompromissoData['status'],
    studentId: "",
    trainerId: trainerId,
  };
  const [newCompromisso, setNewCompromisso] = useState<NewCompromissoState>(initialNewCompromissoState);

  const { data: compromissos = [], isLoading: isLoadingCompromissos, error: errorCompromissos } = useQuery<CompromissoData[], Error>({
    queryKey: ["/api/sessions/today", { trainerId, date: format(today, "yyyy-MM-dd") }],
    queryFn: async () => {
      if (!trainerId) throw new Error("Trainer ID não fornecido para buscar compromissos.");
      return apiRequest<CompromissoData[]>("GET", `/api/sessions?trainerId=${trainerId}&date=${format(today, "yyyy-MM-dd")}&populateStudent=true`);
    },
    enabled: !!trainerId,
  });

  const { data: students = [], isLoading: isLoadingStudents } = useQuery<Aluno[], Error>({
    queryKey: ["/api/alunos", { forComponent: "SessionsCardModal" }],
    queryFn: async () => {
      return apiRequest<Aluno[]>("GET", `/api/alunos`);
    },
    enabled: isModalOpen, 
  });

  const updateCompromissoStatusMutation = useMutation<CompromissoData, Error, { compromissoId: string; status: string }>({
    mutationFn: ({ compromissoId, status }) => apiRequest<CompromissoData>("PUT", `/api/sessions/${compromissoId}`, { status }),
    onSuccess: (updatedCompromisso) => { 
      toast({ title: "Compromisso atualizado", description: `Status do compromisso com ${getStudentName(updatedCompromisso.studentId)} alterado para ${updatedCompromisso.status}.` });
      queryClientHook.invalidateQueries({ queryKey: ["/api/sessions/today", { trainerId, date: format(today, "yyyy-MM-dd") }] });
      queryClientHook.invalidateQueries({ queryKey: ["/api/dashboard/geral", trainerId] }); 
    },
    onError: (error) => {
      toast({ title: "Erro", description: error.message || "Falha ao atualizar o status do compromisso.", variant: "destructive" });
    },
  });

  const createCompromissoMutation = useMutation<CompromissoData, Error, NewCompromissoState>({
    mutationFn: (compromissoData) => apiRequest<CompromissoData>("POST", "/api/sessions", compromissoData),
    onSuccess: (createdCompromisso) => {
      toast({ title: "Compromisso criado!", description: `Novo compromisso (${getTipoCompromissoLabel(createdCompromisso.tipoCompromisso)}) com ${getStudentName(createdCompromisso.studentId)} agendado.` });
      queryClientHook.invalidateQueries({ queryKey: ["/api/sessions/today", { trainerId, date: format(today, "yyyy-MM-dd") }] });
      queryClientHook.invalidateQueries({ queryKey: ["/api/dashboard/geral", trainerId] }); 
      setIsModalOpen(false);
      setNewCompromisso(initialNewCompromissoState);
    },
    onError: (error) => {
      toast({ title: "Erro ao criar compromisso", description: error.message || "Não foi possível agendar o compromisso.", variant: "destructive" });
    },
  });

  const handleUpdateStatus = (compromissoId: string, status: string) => {
    updateCompromissoStatusMutation.mutate({ compromissoId, status });
  };

  const handleCreateCompromisso = () => {
    if (!newCompromisso.studentId) {
        toast({ title: "Erro de Validação", description: "Por favor, selecione um aluno.", variant: "destructive" });
        return;
    }
    if (!newCompromisso.sessionDate) {
        toast({ title: "Erro de Validação", description: "Por favor, defina a data e hora.", variant: "destructive" });
        return;
    }
    if (!newCompromisso.tipoCompromisso) {
        toast({ title: "Erro de Validação", description: "Por favor, selecione o tipo de compromisso.", variant: "destructive" });
        return;
    }
    createCompromissoMutation.mutate(newCompromisso);
  };

  const getStatusBadge = (status: string) => {
    switch (status) {
      case "confirmed": return <Badge variant="success" className="text-xs">Confirmada</Badge>;
      case "pending": return <Badge variant="secondary" className="bg-yellow-100 text-yellow-800 dark:bg-yellow-700/30 dark:text-yellow-300 text-xs">Pendente</Badge>;
      case "completed": return <Badge variant="default" className="bg-blue-100 text-blue-800 dark:bg-blue-700/30 dark:text-blue-300 text-xs">Concluído</Badge>;
      case "cancelled": return <Badge variant="destructive" className="text-xs">Cancelado</Badge>;
      default: return <Badge variant="outline" className="text-xs">{status}</Badge>;
    }
  };
  
  const getStudentName = (studentIdField: CompromissoData['studentId']): string => {
    if (typeof studentIdField === 'object' && studentIdField !== null && studentIdField.nome) {
        return studentIdField.nome;
    }
    const studentDetails = students.find(s => s._id === studentIdField);
    return studentDetails?.nome || "Aluno";
  };

  const getTipoCompromissoLabel = (tipo: TipoCompromissoFrontend): string => { // <<< TIPO ATUALIZADO
    switch (tipo) {
      case 'avaliacao': return 'Avaliação';
      case 'checkin': return 'Check-in';
      case 'treino_acompanhado': return 'Treino Acompanhado';
      case 'outro': return 'Outro';
      default: 
        const exhaustiveCheck: never = tipo; // Para checagem em tempo de compilação
        return exhaustiveCheck;
    }
  };
  
  const getTipoCompromissoIcon = (tipo: TipoCompromissoFrontend) => { // <<< TIPO ATUALIZADO
    switch (tipo) {
        case 'avaliacao': return <ClipboardCheck className="w-4 h-4 mr-1.5 text-blue-500" />;
        case 'checkin': return <Activity className="w-4 h-4 mr-1.5 text-green-500" />;
        case 'treino_acompanhado': return <Dumbbell className="w-4 h-4 mr-1.5 text-purple-500" />; // Ícone Dumbbell
        case 'outro': return <Info className="w-4 h-4 mr-1.5 text-gray-500" />;
        default: 
            const exhaustiveCheck: never = tipo; // Para checagem em tempo de compilação
            return null;
    }
  };

  return (
    <Dialog open={isModalOpen} onOpenChange={setIsModalOpen}>
      <Card className="border border-gray-100 dark:border-gray-800 overflow-hidden shadow-sm flex flex-col h-full">
        <CardHeader className="px-6 py-4 border-b border-gray-200 dark:border-gray-700 flex flex-row items-center justify-between shrink-0">
          <CardTitle className="font-semibold text-gray-900 dark:text-gray-100 flex items-center">
            <CalendarClock className="w-5 h-5 mr-2 text-primary" />
            Agenda do Dia
          </CardTitle>
          <DialogTrigger asChild>
            <Button variant="outline" size="sm">
              <Plus className="w-4 h-4 mr-1.5" /> Adicionar
            </Button>
          </DialogTrigger>
        </CardHeader>

        <CardContent className="p-0 flex-grow overflow-y-auto">
          {isLoadingCompromissos ? (
            <div className="p-6 flex justify-center items-center h-full">
                <LoadingSpinner text="Carregando compromissos..." />
            </div>
          ) : errorCompromissos ? (
            <div className="p-6 text-center text-red-600 dark:text-red-400 text-sm">
                Erro ao carregar compromissos: {errorCompromissos.message}
            </div>
          ) : compromissos.length > 0 ? (
            <ul className="divide-y divide-gray-100 dark:divide-gray-700">
                {compromissos.map((compromisso) => (
                <li key={compromisso._id} className="p-4 hover:bg-muted/30 dark:hover:bg-muted/10">
                    <div className="flex justify-between items-start">
                      <div className="flex-grow">
                          <div className="flex items-center">
                              {getTipoCompromissoIcon(compromisso.tipoCompromisso)}
                              <p className="text-sm font-medium text-gray-800 dark:text-gray-200">
                                  {format(new Date(compromisso.sessionDate), "HH:mm", { locale: ptBR })} - {getStudentName(compromisso.studentId)}
                                  <span className="text-xs text-muted-foreground ml-1">({getTipoCompromissoLabel(compromisso.tipoCompromisso)})</span>
                              </p>
                          </div>
                          {compromisso.notes && <p className="text-xs text-gray-500 dark:text-gray-400 mt-0.5 ml-5 truncate max-w-xs">{compromisso.notes}</p>}
                      </div>
                      <div className="flex items-center gap-2 flex-shrink-0">
                          {getStatusBadge(compromisso.status)}
                          <DropdownMenu>
                          <DropdownMenuTrigger asChild>
                              <Button variant="ghost" size="icon" className="text-gray-400 hover:text-gray-600 dark:text-gray-500 dark:hover:text-gray-300 h-8 w-8">
                              <MoreVertical className="h-4 w-4" />
                              </Button>
                          </DropdownMenuTrigger>
                          <DropdownMenuContent align="end">
                              <DropdownMenuItem onClick={() => handleUpdateStatus(compromisso._id, "confirmed")}>Confirmar</DropdownMenuItem>
                              <DropdownMenuItem onClick={() => handleUpdateStatus(compromisso._id, "completed")}>Concluir</DropdownMenuItem>
                              <DropdownMenuItem onClick={() => handleUpdateStatus(compromisso._id, "cancelled")} className="text-red-600 focus:text-red-500">Cancelar</DropdownMenuItem>
                          </DropdownMenuContent>
                          </DropdownMenu>
                      </div>
                    </div>
                </li>
                ))}
            </ul>
          ) : (
            <div className="p-6 text-center text-sm text-gray-500 dark:text-gray-400 flex flex-col items-center justify-center h-full">
                <Info className="w-10 h-10 text-gray-400 dark:text-gray-500 mb-3"/>
                <p>Nenhum compromisso agendado para hoje.</p>
                <Button variant="link" size="sm" className="mt-2" onClick={() => setIsModalOpen(true)}>Agendar primeiro compromisso</Button>
            </div>
          )}
        </CardContent>
      </Card>

      <DialogContent className="sm:max-w-lg">
        <DialogHeader>
          <DialogTitle>Novo Compromisso</DialogTitle>
          <DialogDescription>
            Preencha os detalhes para agendar um novo compromisso.
          </DialogDescription>
        </DialogHeader>
        <div className="grid gap-4 py-4">
          <div className="grid grid-cols-4 items-center gap-4">
            <Label htmlFor="sessionDate" className="text-right">Data e Hora</Label>
            <Input
              id="sessionDate"
              type="datetime-local"
              value={newCompromisso.sessionDate}
              onChange={(e) => setNewCompromisso((prev) => ({ ...prev, sessionDate: e.target.value }))}
              className="col-span-3"
              disabled={createCompromissoMutation.isPending}
            />
          </div>
          <div className="grid grid-cols-4 items-center gap-4">
            <Label htmlFor="studentId" className="text-right">Aluno</Label>
            <Select
              onValueChange={(value) => setNewCompromisso((prev) => ({ ...prev, studentId: value }))}
              value={newCompromisso.studentId}
              disabled={createCompromissoMutation.isPending || isLoadingStudents}
            >
              <SelectTrigger id="studentId" className="col-span-3">
                <SelectValue placeholder={isLoadingStudents ? "Carregando..." : "Selecione o aluno"} />
              </SelectTrigger>
              <SelectContent>
                {isLoadingStudents ? (
                    <div className="p-2 text-sm text-muted-foreground">Carregando alunos...</div>
                ) : students.length === 0 ? (
                    <div className="p-2 text-sm text-muted-foreground">Nenhum aluno cadastrado.</div>
                ) : (
                    students.map((student) => (
                        <SelectItem key={student._id} value={student._id}>
                        {student.nome}
                        </SelectItem>
                    ))
                )}
              </SelectContent>
            </Select>
          </div>
          <div className="grid grid-cols-4 items-center gap-4">
            <Label htmlFor="tipoCompromisso" className="text-right">Tipo</Label>
            <Select
              onValueChange={(value) => setNewCompromisso((prev) => ({ ...prev, tipoCompromisso: value as TipoCompromissoFrontend }))}
              value={newCompromisso.tipoCompromisso}
              disabled={createCompromissoMutation.isPending}
            >
              <SelectTrigger id="tipoCompromisso" className="col-span-3">
                <SelectValue placeholder="Selecione o tipo" />
              </SelectTrigger>
              <SelectContent>
                {TIPOS_COMPROMISSO_FRONTEND.map(tipo => ( // Usando a constante do frontend
                    <SelectItem key={tipo} value={tipo}>
                        {getTipoCompromissoLabel(tipo)}
                    </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>
          <div className="grid grid-cols-4 items-center gap-4">
            <Label htmlFor="status" className="text-right">Status</Label>
            <Select
              onValueChange={(value) => setNewCompromisso((prev) => ({ ...prev, status: value as CompromissoData['status'] }))}
              value={newCompromisso.status} // Usar value para controle completo
              disabled={createCompromissoMutation.isPending}
            >
              <SelectTrigger id="status" className="col-span-3">
                <SelectValue placeholder="Status" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="pending">Pendente</SelectItem>
                <SelectItem value="confirmed">Confirmado</SelectItem>
                <SelectItem value="completed">Concluído</SelectItem>
                <SelectItem value="cancelled">Cancelado</SelectItem>
              </SelectContent>
            </Select>
          </div>
          <div className="grid grid-cols-4 items-start gap-4"> 
            <Label htmlFor="notes" className="text-right pt-2">Observações</Label>
            <Textarea
              id="notes"
              placeholder="Alguma observação para este compromisso?"
              value={newCompromisso.notes}
              onChange={(e) => setNewCompromisso((prev) => ({ ...prev, notes: e.target.value }))}
              className="col-span-3 min-h-[80px]"
              disabled={createCompromissoMutation.isPending}
            />
          </div>
        </div>
        <DialogFooter>
          <Button variant="outline" onClick={() => { setIsModalOpen(false); setNewCompromisso(initialNewCompromissoState);}} disabled={createCompromissoMutation.isPending}>
            Cancelar
          </Button>
          <Button onClick={handleCreateCompromisso} disabled={createCompromissoMutation.isPending || !newCompromisso.studentId || !newCompromisso.sessionDate || !newCompromisso.tipoCompromisso}>
            {createCompromissoMutation.isPending && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
            Agendar Compromisso
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}