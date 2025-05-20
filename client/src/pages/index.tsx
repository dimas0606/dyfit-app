import { useEffect, useState } from "react";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Card, CardContent } from "@/components/ui/card";
import { Skeleton } from "@/components/ui/skeleton";
import { Star } from "lucide-react";
import ExerciseFormModal from "@/components/dialogs/ExerciseFormModal";
import ExerciseEditModal from "@/components/dialogs/ExerciseEditModal";
import ExerciseDeleteButton from "@/components/buttons/ExerciseDeleteButton";
import { useToast } from "@/hooks/use-toast";
import VideoPlayerModal from "@/components/dialogs/VideoPlayerModal";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { handleApiError } from "@/lib/handleApiError";

interface Exercicio {
  _id: string;
  nome: string;
  descricao?: string;
  grupoMuscular?: string;
  categoria?: string;
  urlVideo?: string;
  isCustom: boolean;
  favoritedBy?: string[];
  isFavoritedByCurrentUser?: boolean;
}

type AbaSelecionada = "meus" | "app" | "favoritos";

const USER_ID_FRONTEND_SIMULADO = "609c1f9b6b6f9b001f9b6b6f";

export default function ExercisesPage() {
  const [exercicios, setExercicios] = useState<Exercicio[]>([]);
  const [loading, setLoading] = useState(true);
  const [searchTerm, setSearchTerm] = useState("");
  const [aba, setAba] = useState<AbaSelecionada>("app");
  const [videoModalUrl, setVideoModalUrl] = useState<string | null>(null);
  const [grupoSelecionado, setGrupoSelecionado] = useState<string | null>(null);
  const [categoriaSelecionada, setCategoriaSelecionada] = useState<string | null>(null);
  const { toast } = useToast();

  const grupos = ["Peitoral", "Costas", "Pernas", "Ombros", "Bíceps", "Tríceps", "Abdômen", "Outros"];
  const categorias = ["Superior", "Inferior", "Core", "Cardio", "Reabilitação", "Outros"];

  const fetchExercicios = async () => {
    setLoading(true);
    try {
      const rota =
        aba === "meus"
          ? "/api/exercicios/meus"
          : aba === "app"
          ? "/api/exercicios/app"
          : "/api/exercicios/favoritos";

      const res = await fetch(rota, {
        method: "GET",
        credentials: "include",
      });

      if (!res.ok) {
        const errorText = await res.text();
        throw new Error(`Erro ${res.status}: ${errorText}`);
      }

      const data = await res.json();
      setExercicios(data);
    } catch (error) {
      handleApiError(error);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchExercicios();
  }, [aba, grupoSelecionado, categoriaSelecionada]);

  const exerciciosFiltrados = exercicios.filter((ex) => {
    const nomeMatch = ex.nome.toLowerCase().includes(searchTerm.toLowerCase());
    const grupoMatch = grupoSelecionado ? ex.grupoMuscular === grupoSelecionado : true;
    const categoriaMatch = categoriaSelecionada ? ex.categoria === categoriaSelecionada : true;
    return nomeMatch && grupoMatch && categoriaMatch;
  });

  return (
    // conteúdo da interface...
    <div> {/* ...aqui entraria o restante da estrutura da página */} </div>
  );
}
