// client/src/components/dialogs/ExerciseEditModal.tsx
import React, { useEffect, useState } from "react"; // Import React
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
import { Pencil, Loader2 } from "lucide-react";
import { useToast } from "@/hooks/use-toast"; // <<< USA O HOOK
import { Label } from "@/components/ui/label";
import {
  Select,
  SelectTrigger,
  SelectContent,
  SelectItem,
  SelectValue,
} from "@/components/ui/select";
import { useMutation, useQueryClient } from "@tanstack/react-query";
import { apiRequest } from "@/lib/queryClient";
import { Badge } from "@/components/ui/badge";

// Interfaces
interface ExercicioData {
  _id: string;
  nome: string;
  descricao?: string;
  categoria?: string;
  grupoMuscular?: string;
  tipo?: string;
  urlVideo?: string;
}
interface Props {
  exercicio: ExercicioData;
  onUpdated: () => void;
}
type UpdateExercicioPayload = Omit<ExercicioData, '_id'>;
interface UpdatedExercicioResponse extends ExercicioData {}

const NONE_FILTER_VALUE = "none"; // Valor para opção "Nenhum/Nenhuma"

export default function ExerciseEditModal(props: Props) {
  const { exercicio, onUpdated } = props;
  const { toast } = useToast(); // <<< USA O HOOK
  const queryClient = useQueryClient();
  const [open, setOpen] = useState(false);

  // Estados do formulário
  const [nome, setNome] = useState(exercicio.nome);
  const [descricao, setDescricao] = useState(exercicio.descricao || "");
  const [categoria, setCategoria] = useState(exercicio.categoria || NONE_FILTER_VALUE);
  const [grupoMuscular, setGrupoMuscular] = useState(exercicio.grupoMuscular || NONE_FILTER_VALUE);
  const [tipo, setTipo] = useState(exercicio.tipo || NONE_FILTER_VALUE);
  const [urlVideo, setUrlVideo] = useState(exercicio.urlVideo || "");

  // Resetar estado quando o modal abrir ou o exercício mudar
  useEffect(() => {
      if (exercicio && open) {
          setNome(exercicio.nome);
          setDescricao(exercicio.descricao || "");
          setCategoria(exercicio.categoria || NONE_FILTER_VALUE);
          setGrupoMuscular(exercicio.grupoMuscular || NONE_FILTER_VALUE);
          setTipo(exercicio.tipo || NONE_FILTER_VALUE);
          setUrlVideo(exercicio.urlVideo || "");
      }
      // Não reseta ao fechar para manter os dados se o usuário cancelar e reabrir
  }, [exercicio, open]);

  // Formata URL do vídeo
  const formatVideoUrl = (url: string): string | undefined => {
    if (!url) return undefined;
    let embedUrl: string | undefined = undefined;
    if (url.includes("youtu.be/")) {
      const id = url.split("youtu.be/")[1]?.split(/[?&]/)[0];
      if (id) {
        const time = url.includes("?t=") ? url.split("?t=")[1]?.split("&")[0] : "";
        embedUrl = `https://www.youtube.com/embed/${id}${time ? `?start=${time}` : ""}`;
      }
    } else if (url.includes("youtube.com/watch?v=")) {
        const id = url.split("v=")[1]?.split("&")[0];
         if (id) {
            const time = url.includes("?t=") ? url.split("?t=")[1]?.split("&")[0] : "";
            embedUrl = `https://www.youtube.com/embed/${id}${time ? `?start=${time}` : ""}`;
         }
    } else if (url.includes("drive.google.com/file/d/")) {
      const id = url.split("/d/")[1]?.split("/")[0];
      if (id) {
         embedUrl = `https://drive.google.com/file/d/${id}/preview`;
      }
    }
    if (!embedUrl && (url.startsWith('http://') || url.startsWith('https://'))) {
        return url;
    }
    return embedUrl;
  }

  // Mutação para atualizar
  const updateMutation = useMutation<
    UpdatedExercicioResponse, Error, UpdateExercicioPayload
  >({
    mutationFn: (payload) => apiRequest<UpdatedExercicioResponse>("PUT", `/api/exercicios/${exercicio._id}`, payload),
    onSuccess: (data) => {
      toast({ title: "Sucesso!", description: `Exercício "${data.nome}" atualizado.` }); // Chama toast do hook
      onUpdated();
      queryClient.invalidateQueries({ queryKey: ['/api/exercicios/meus'] });
      setOpen(false);
    },
    onError: (error) => {
      toast({ // Chama toast do hook
        variant: "destructive",
        title: "Erro ao Atualizar",
        description: error.message || "Não foi possível salvar as alterações.",
      });
    },
  })

  // Handler de submit
  const handleSubmit = () => {
     if (!nome.trim()) {
       toast({ title: "Erro de Validação", description: "O nome é obrigatório.", variant: "destructive" }); // Chama toast do hook
       return;
     }
    const finalVideoUrl = formatVideoUrl(urlVideo);
    const payload: UpdateExercicioPayload = {
      nome: nome.trim(),
      descricao: descricao.trim() || undefined,
      categoria: categoria === NONE_FILTER_VALUE ? undefined : categoria,
      grupoMuscular: grupoMuscular === NONE_FILTER_VALUE ? undefined : grupoMuscular,
      tipo: tipo === NONE_FILTER_VALUE ? undefined : tipo,
      urlVideo: finalVideoUrl || undefined,
    };
    updateMutation.mutate(payload);
  }

  // Definição de cores (mantido)
  const corGrupo: Record<string, string> = { /* ... */ };
  const corTipo: Record<string, string> = { /* ... */ };
  const isLoading = updateMutation.isPending;

  return (
    <Dialog open={open} onOpenChange={setOpen}>
      <DialogTrigger asChild>
        <Button variant="ghost" size="icon" className="h-8 w-8 text-gray-500 hover:text-blue-600" title="Editar Exercício">
          <Pencil className="w-4 h-4" />
        </Button>
      </DialogTrigger>
      <DialogContent className="max-w-lg overflow-y-auto max-h-[80vh]">
        <DialogHeader>
          <DialogTitle>Editar Exercício</DialogTitle>
          <DialogDescription>Atualize os dados do exercício abaixo.</DialogDescription>
        </DialogHeader>
        <div className="flex gap-2 mb-2 flex-wrap -mt-2">
           {grupoMuscular && grupoMuscular !== NONE_FILTER_VALUE && ( <Badge variant="outline" className={corGrupo[grupoMuscular] || "border-border"}>{grupoMuscular}</Badge> )}
           {tipo && tipo !== NONE_FILTER_VALUE && ( <Badge variant="outline" className={corTipo[tipo] || "border-border"}>{tipo}</Badge> )}
        </div>
        <div className="flex flex-col gap-4 py-4">
             <div><Label htmlFor={`edit-nome-${exercicio._id}`}>Nome*</Label><Input id={`edit-nome-${exercicio._id}`} value={nome} onChange={(e) => setNome(e.target.value)} disabled={isLoading} required /></div>
             <div><Label htmlFor={`edit-grupo-${exercicio._id}`}>Grupo Muscular</Label><Select value={grupoMuscular} onValueChange={setGrupoMuscular} disabled={isLoading}><SelectTrigger id={`edit-grupo-${exercicio._id}`}><SelectValue placeholder="Selecione..." /></SelectTrigger><SelectContent><SelectItem value={NONE_FILTER_VALUE}>Nenhum</SelectItem><SelectItem value="Peitoral">Peitoral</SelectItem>{/*...outros*/}</SelectContent></Select></div>
             <div><Label htmlFor={`edit-tipo-${exercicio._id}`}>Tipo</Label><Select value={tipo} onValueChange={setTipo} disabled={isLoading}><SelectTrigger id={`edit-tipo-${exercicio._id}`}><SelectValue placeholder="Selecione..." /></SelectTrigger><SelectContent><SelectItem value={NONE_FILTER_VALUE}>Nenhum</SelectItem><SelectItem value="Musculação">Musculação</SelectItem>{/*...outros*/}</SelectContent></Select></div>
             <div><Label htmlFor={`edit-categoria-${exercicio._id}`}>Categoria</Label><Select value={categoria} onValueChange={setCategoria} disabled={isLoading}><SelectTrigger id={`edit-categoria-${exercicio._id}`}><SelectValue placeholder="Selecione..." /></SelectTrigger><SelectContent><SelectItem value={NONE_FILTER_VALUE}>Nenhuma</SelectItem><SelectItem value="Superior">Superior</SelectItem>{/*...outros*/}</SelectContent></Select></div>
             <div><Label htmlFor={`edit-descricao-${exercicio._id}`}>Descrição</Label><Textarea id={`edit-descricao-${exercicio._id}`} value={descricao} onChange={(e) => setDescricao(e.target.value)} disabled={isLoading} /></div>
             <div><Label htmlFor={`edit-urlVideo-${exercicio._id}`}>URL do Vídeo</Label><Input id={`edit-urlVideo-${exercicio._id}`} value={urlVideo} onChange={(e) => setUrlVideo(e.target.value)} disabled={isLoading} /></div>
        </div>
        <DialogFooter className="mt-4 flex justify-end gap-2">
          <Button variant="outline" onClick={() => setOpen(false)} disabled={isLoading}>Cancelar</Button>
          <Button onClick={handleSubmit} disabled={isLoading || !nome.trim()}>
            {isLoading && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
            {isLoading ? "Salvando..." : "Salvar Alterações"}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}