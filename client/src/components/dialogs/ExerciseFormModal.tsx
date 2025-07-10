// client/src/components/dialogs/ExerciseFormModal.tsx
import {
  Dialog,
  DialogTrigger,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogDescription,
  DialogFooter,
} from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { Textarea } from "@/components/ui/textarea";
import { Plus } from "lucide-react";
import { useState } from "react";
import { useToast } from "@/hooks/use-toast";
import { Label } from "@/components/ui/label";
import {
  Select,
  SelectTrigger,
  SelectContent,
  SelectItem,
  SelectValue,
} from "@/components/ui/select";
import { apiRequest } from "@/lib/queryClient";
import { useMutation, useQueryClient } from "@tanstack/react-query";

interface Props {
  onCreated: () => void;
  // =======================================================
  // --- NOVA PROP PARA DIFERENCIAR O TIPO DE CRIAÇÃO ---
  creationType: 'app' | 'personal';
  triggerButtonText?: string; // Texto customizável para o botão
  // =======================================================
}

interface ExercicioPayload {
  nome: string;
  descricao?: string;
  grupoMuscular?: string;
  tipo?: string;
  categoria?: string;
  urlVideo?: string;
  // =======================================================
  // --- NOVA PROPRIEDADE PARA O BACKEND ---
  isCustom?: boolean;
  // =======================================================
}

interface ExercicioCriadoResponse {
  _id: string;
}

export default function ExerciseFormModal({ onCreated, creationType, triggerButtonText = "Criar Exercício" }: Props) {
  const { toast } = useToast();
  const queryClient = useQueryClient();
  const [open, setOpen] = useState(false);
  const [nome, setNome] = useState("");
  const [descricao, setDescricao] = useState("");
  const [grupoMuscular, setGrupoMuscular] = useState("");
  const [tipo, setTipo] = useState("");
  const [categoria, setCategoria] = useState("");
  const [urlVideo, setUrlVideo] = useState("");

  const formatVideoUrl = (url: string): string | undefined => {
    if (!url) return undefined;
    if (url.includes("youtu.be/")) {
      const id = url.split("youtu.be/")[1].split(/[?&]/)[0];
      return `https://www.youtube.com/embed/${id}`;
    }
     if (url.includes("youtube.com/watch?v=")) {
        const id = url.split("v=")[1].split("&")[0];
        return `https://www.youtube.com/embed/${id}`;
    }
    return url;
  };

  const createExerciseMutation = useMutation<ExercicioCriadoResponse, Error, ExercicioPayload>({
    mutationFn: (newExerciseData) => {
      // A rota de criação é sempre a mesma, o backend diferencia pelo payload
      return apiRequest<ExercicioCriadoResponse>("POST", "/api/exercicios", newExerciseData);
    },
    onSuccess: () => {
      setOpen(false);
      setNome(""); setDescricao(""); setGrupoMuscular(""); setTipo(""); setCategoria(""); setUrlVideo("");
      onCreated();
      toast({ title: "Exercício criado com sucesso!" });
      queryClient.invalidateQueries({ queryKey: ['exercicios', 'app'] });
      queryClient.invalidateQueries({ queryKey: ['exercicios', 'meus'] });
      queryClient.invalidateQueries({ queryKey: ['exercicios', 'todos'] });
    },
    onError: (error) => {
       toast({
            title: "Erro ao criar exercício",
            description: error.message || "Não foi possível salvar o exercício.",
            variant: "destructive"
       });
    },
  });

  const handleSubmit = () => {
    if (!nome.trim()) {
       toast({ title: "Erro de Validação", description: "O nome do exercício é obrigatório.", variant: "destructive" });
       return;
    }

    const finalVideoUrl = formatVideoUrl(urlVideo);
    
    // =======================================================
    // --- PAYLOAD ATUALIZADO ---
    // Agora enviamos 'isCustom' com base no tipo de criação
    const payload: ExercicioPayload = {
      nome: nome.trim(),
      isCustom: creationType === 'personal', // true se for do personal, false se for do app
      ...(descricao.trim() && { descricao: descricao.trim() }),
      ...(grupoMuscular && { grupoMuscular }),
      ...(tipo && { tipo }),
      ...(categoria && { categoria }),
      ...(finalVideoUrl && { urlVideo: finalVideoUrl }),
    };
    // =======================================================

    createExerciseMutation.mutate(payload);
  };

  const isLoading = createExerciseMutation.isPending;

  return (
    <Dialog open={open} onOpenChange={setOpen}>
      <DialogTrigger asChild>
        <Button>
          <Plus className="w-4 h-4 mr-2" />
          {triggerButtonText}
        </Button>
      </DialogTrigger>

      <DialogContent className="max-w-lg overflow-y-auto max-h-[80vh]">
        <DialogHeader>
          <DialogTitle>Novo Exercício</DialogTitle>
          <DialogDescription>
            Preencha os campos abaixo para adicionar um novo exercício.
          </DialogDescription>
        </DialogHeader>

        <div className="flex flex-col gap-4 py-4">
          <div>
            <Label>Nome*</Label>
            <Input placeholder="Nome do exercício" value={nome} onChange={(e) => setNome(e.target.value)} disabled={isLoading} />
          </div>
          <div>
            <Label>Grupo Muscular</Label>
            <Select onValueChange={setGrupoMuscular} value={grupoMuscular} disabled={isLoading}>
              <SelectTrigger><SelectValue placeholder="Selecione o grupo muscular" /></SelectTrigger>
              <SelectContent>
                {["Peitoral", "Pernas", "Costas", "Ombros", "Bíceps", "Tríceps", "Abdômen", "Lombar", "Glúteos", "Panturrilha", "Cardio", "Corpo Inteiro", "Outro"].sort().map(g => <SelectItem key={g} value={g}>{g}</SelectItem>)}
              </SelectContent>
            </Select>
          </div>
          <div>
            <Label>Categoria</Label>
            <Select onValueChange={setCategoria} value={categoria} disabled={isLoading}>
              <SelectTrigger><SelectValue placeholder="Selecione a categoria" /></SelectTrigger>
              <SelectContent>
                {["Força", "Resistência", "Hipertrofia", "Potência", "Cardiovascular", "Flexibilidade", "Mobilidade", "Funcional", "Calistenia", "Outro"].sort().map(c => <SelectItem key={c} value={c}>{c}</SelectItem>)}
              </SelectContent>
            </Select>
          </div>
          <div>
            <Label>Descrição (opcional)</Label>
            <Textarea placeholder="Descrição detalhada do exercício" value={descricao} onChange={(e) => setDescricao(e.target.value)} disabled={isLoading}/>
          </div>
          <div>
            <Label>URL do Vídeo (opcional)</Label>
            <Input placeholder="https://youtube.com/..." value={urlVideo} onChange={(e) => setUrlVideo(e.target.value)} disabled={isLoading}/>
          </div>
        </div>

        <DialogFooter className="mt-4">
           <Button variant="outline" onClick={() => setOpen(false)} disabled={isLoading}>Cancelar</Button>
          <Button onClick={handleSubmit} disabled={isLoading || !nome.trim()}>
            {isLoading ? "Salvando..." : "Salvar Exercício"}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
