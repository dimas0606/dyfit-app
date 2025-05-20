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
import { apiRequest } from "@/lib/queryClient"; // Importado apiRequest
import { useMutation, useQueryClient } from "@tanstack/react-query"; // Importado para usar mutação

interface Props {
  onCreated: () => void; // Callback para atualizar a lista na página pai
}

// Interface para os dados do exercício a serem enviados
interface ExercicioPayload {
  nome: string;
  descricao?: string;
  grupoMuscular?: string;
  tipo?: string;
  categoria?: string;
  urlVideo?: string;
}

// Interface para a resposta da API (pode incluir o _id do exercício criado)
interface ExercicioCriadoResponse {
  _id: string;
  // ... outros campos que a API retornar ...
}

export default function ExerciseFormModal({ onCreated }: Props) {
  const { toast } = useToast();
  const queryClient = useQueryClient();
  const [open, setOpen] = useState(false);
  const [nome, setNome] = useState("");
  const [descricao, setDescricao] = useState("");
  const [grupoMuscular, setGrupoMuscular] = useState("");
  const [tipo, setTipo] = useState("");
  const [categoria, setCategoria] = useState("");
  const [urlVideo, setUrlVideo] = useState("");

  // Função de formatação de URL (sem alterações)
  const formatVideoUrl = (url: string): string | undefined => {
    if (!url) return undefined; // Retorna undefined se a URL estiver vazia
    if (url.includes("youtu.be/")) {
      const id = url.split("youtu.be/")[1].split(/[?&]/)[0];
      const time = url.includes("?t=") ? url.split("?t=")[1].split("&")[0] : "";
      return `https://www.youtube.com/embed/${id}${time ? `?start=${time}` : ""}`;
    }
     if (url.includes("youtube.com/watch?v=")) {
        const id = url.split("v=")[1].split("&")[0];
        const time = url.includes("?t=") ? url.split("?t=")[1].split("&")[0] : "";
        return `https://www.youtube.com/embed/${id}${time ? `?start=${time}` : ""}`;
    }
    if (url.includes("drive.google.com/file/d/")) {
      const id = url.split("/d/")[1].split("/")[0];
      return `https://drive.google.com/file/d/${id}/preview`;
    }
    // Retorna a URL original se não for um formato conhecido ou se for outro tipo de URL válida
    return url.startsWith('http://') || url.startsWith('https://') ? url : undefined;
  };

  // --- Mutação com React Query ---
  const createExerciseMutation = useMutation<
    ExercicioCriadoResponse,
    Error,
    ExercicioPayload
  >({
    mutationFn: (newExerciseData) => {
      // USA apiRequest para fazer o POST
      return apiRequest<ExercicioCriadoResponse>("POST", "/api/exercicios", newExerciseData);
    },
    onSuccess: () => {
      setOpen(false); // Fecha o modal
      // Limpa os campos do formulário
      setNome("");
      setDescricao("");
      setGrupoMuscular("");
      setTipo("");
      setCategoria("");
      setUrlVideo("");
      onCreated(); // Chama o callback para atualizar a lista na página pai
      toast({ title: "Exercício criado com sucesso!" });
      // Opcional: Invalidar queries relevantes se necessário
      queryClient.invalidateQueries({ queryKey: ['/api/exercicios/meus'] }); // Invalida a query dos "Meus Exercícios"
    },
    onError: (error) => {
       // O toast de erro já está sendo tratado aqui pela mutação
       toast({
            title: "Erro ao criar exercício",
            description: error.message || "Não foi possível salvar o exercício.",
            variant: "destructive"
       });
    },
  }); // <<<<<< Certifique-se que esta chave e parêntese estão fechando corretamente useMutation

  // handleSubmit agora usa a mutação
  const handleSubmit = () => {
     // Validação básica
    if (!nome.trim()) {
       toast({ title: "Erro de Validação", description: "O nome do exercício é obrigatório.", variant: "destructive" });
       return;
    }

    const finalVideoUrl = formatVideoUrl(urlVideo);

    const payload: ExercicioPayload = {
      nome: nome.trim(),
      // Inclui os campos apenas se tiverem valor, para não enviar strings vazias desnecessárias
      ...(descricao.trim() && { descricao: descricao.trim() }),
      ...(grupoMuscular && { grupoMuscular }),
      ...(tipo && { tipo }),
      ...(categoria && { categoria }),
      ...(finalVideoUrl && { urlVideo: finalVideoUrl }),
    };

    // Chama a mutação do React Query
    createExerciseMutation.mutate(payload);
  }; // <<<< Certifique-se que este ponto e vírgula está aqui fechando handleSubmit


  // Lógica dos badges - Verifique se não há erros de digitação aqui
  const corGrupo: Record<string, string> = {
    Peitoral: "bg-red-200", Costas: "bg-blue-200", Pernas: "bg-green-200",
    Ombros: "bg-yellow-200", Bíceps: "bg-purple-200", Tríceps: "bg-pink-200",
    Abdômen: "bg-orange-200", Outros: "bg-gray-200",
  }; // <<<< Ponto e vírgula aqui
  const corCategoria: Record<string, string> = {
    Superior: "bg-emerald-200", Inferior: "bg-lime-200", Core: "bg-cyan-200",
    Cardio: "bg-fuchsia-200", Reabilitação: "bg-rose-200", Outros: "bg-slate-200",
  }; // <<<< Ponto e vírgula aqui

  // Linha ~145 (aproximadamente)
  const badgeGrupo = grupoMuscular ? (
    <span className={`text-xs font-medium px-2 py-0.5 rounded ${corGrupo[grupoMuscular] || "bg-muted"}`}>
      {grupoMuscular}
    </span>
  ) : null; // <<<< Ponto e vírgula aqui

  // Linha ~146 (aproximadamente)
  const badgeCategoria = categoria ? (
    <span className={`text-xs font-medium px-2 py-0.5 rounded ${corCategoria[categoria] || "bg-muted"}`}>
      {categoria}
    </span>
  ) : null; // <<<< Ponto e vírgula aqui

  const isLoading = createExerciseMutation.isPending;

  // Início do JSX retornado pelo componente
  return (
    <Dialog open={open} onOpenChange={setOpen}>
      <DialogTrigger asChild>
        <Button>
          <Plus className="w-4 h-4 mr-2" />
          Criar Exercício
        </Button>
      </DialogTrigger>

      <DialogContent className="max-w-lg overflow-y-auto max-h-[80vh]">
        <DialogHeader>
          <DialogTitle>Novo Exercício</DialogTitle>
          <DialogDescription>
            Preencha os campos abaixo para adicionar um novo exercício personalizado.
          </DialogDescription>
        </DialogHeader>

        <div className="flex gap-2 mb-2 flex-wrap">
          {badgeGrupo}
          {badgeCategoria}
        </div>

        {/* Campos do formulário */}
        <div className="flex flex-col gap-4">
          <div>
            <Label>Nome*</Label>
            <Input
              placeholder="Nome do exercício"
              value={nome}
              onChange={(e) => setNome(e.target.value)}
              disabled={isLoading}
            />
          </div>
          <div>
            <Label>Grupo Muscular</Label>
            <Select onValueChange={setGrupoMuscular} value={grupoMuscular} disabled={isLoading}>
              <SelectTrigger>
                <SelectValue placeholder="Selecione o grupo muscular" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="Peitoral">Peitoral</SelectItem>
                <SelectItem value="Costas">Costas</SelectItem>
                <SelectItem value="Pernas">Pernas</SelectItem>
                <SelectItem value="Ombros">Ombros</SelectItem>
                <SelectItem value="Bíceps">Bíceps</SelectItem>
                <SelectItem value="Tríceps">Tríceps</SelectItem>
                <SelectItem value="Abdômen">Abdômen</SelectItem>
                <SelectItem value="Outros">Outros</SelectItem>
              </SelectContent>
            </Select>
          </div>
          <div>
            <Label>Tipo</Label>
            <Select onValueChange={setTipo} value={tipo} disabled={isLoading}>
              <SelectTrigger>
                <SelectValue placeholder="Selecione o tipo do exercício" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="Musculação">Musculação</SelectItem>
                <SelectItem value="Calistenia">Calistenia</SelectItem>
                <SelectItem value="Funcional">Funcional</SelectItem>
                <SelectItem value="Cardio">Cardio</SelectItem>
                <SelectItem value="Alongamento">Alongamento</SelectItem>
                <SelectItem value="Outros">Outros</SelectItem>
              </SelectContent>
            </Select>
          </div>
          <div>
            <Label>Categoria</Label>
            <Select onValueChange={setCategoria} value={categoria} disabled={isLoading}>
              <SelectTrigger>
                <SelectValue placeholder="Selecione a categoria" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="Superior">Superior</SelectItem>
                <SelectItem value="Inferior">Inferior</SelectItem>
                <SelectItem value="Core">Core</SelectItem>
                <SelectItem value="Cardio">Cardio</SelectItem>
                <SelectItem value="Reabilitação">Reabilitação</SelectItem>
                <SelectItem value="Outros">Outros</SelectItem>
              </SelectContent>
            </Select>
          </div>
          <div>
            <Label>Descrição (opcional)</Label>
            <Textarea
              placeholder="Descrição detalhada do exercício"
              value={descricao}
              onChange={(e) => setDescricao(e.target.value)}
              disabled={isLoading}
            />
          </div>
          <div>
            <Label>URL do Vídeo (opcional)</Label>
            <Input
              placeholder="https://youtube.com/... ou https://drive.google.com/..."
              value={urlVideo}
              onChange={(e) => setUrlVideo(e.target.value)}
              disabled={isLoading}
            />
          </div>
        </div>

        <DialogFooter className="mt-4">
           <Button variant="outline" onClick={() => setOpen(false)} disabled={isLoading}>
                Cancelar
           </Button>
          <Button onClick={handleSubmit} disabled={isLoading || !nome.trim()}>
            {isLoading ? "Salvando..." : "Salvar"}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
} // <<<< Certifique-se que esta chave fecha o componente corretamente