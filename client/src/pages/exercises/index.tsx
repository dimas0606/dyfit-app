// client/src/pages/exercises/index.tsx
import { useState, useMemo } from "react"; // useEffect removido
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { Tabs, TabsList, TabsTrigger } from "@/components/ui/tabs"; // TabsContent removido
import { Card, CardContent } from "@/components/ui/card";
import { Skeleton } from "@/components/ui/skeleton";
import { Star, PlayCircle, FilterX, BrainCircuit, User } from "lucide-react";
import ExerciseFormModal from "@/components/dialogs/ExerciseFormModal";
import ExerciseEditModal from "@/components/dialogs/ExerciseEditModal";
import ExerciseDeleteButton from "@/components/buttons/ExerciseDeleteButton";
import { useToast } from "@/hooks/use-toast";
import VideoPlayerModal from "@/components/dialogs/VideoPlayerModal";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { fetchWithAuth } from "@/lib/apiClient";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import { Badge } from "@/components/ui/badge";
import { useUser } from "@/context/UserContext";
// =======================================================
// --- NOVA IMPORTAÇÃO PARA CORRIGIR O ERRO ---
import { Tooltip, TooltipContent, TooltipProvider, TooltipTrigger } from "@/components/ui/tooltip";
// =======================================================

interface Exercicio {
  _id: string;
  nome: string;
  descricao?: string;
  grupoMuscular?: string;
  categoria?: string;
  urlVideo?: string;
  isCustom: boolean;
  isFavoritedByCurrentUser?: boolean;
}

type AbaSelecionada = "todos" | "app" | "meus" | "favoritos";
const ALL_FILTER_VALUE = "all";

const ExerciseList = ({ exercicios, onFavoriteToggle, onVideoOpen, onFetch }: { exercicios: Exercicio[], onFavoriteToggle: (id: string, isFavorited: boolean) => void, onVideoOpen: (url: string) => void, onFetch: () => void }) => (
  <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-4">
    {exercicios.map((ex) => {
      const isFavorited = ex.isFavoritedByCurrentUser ?? false;
      return (
        <Card key={ex._id} className="rounded-xl border bg-card text-card-foreground shadow flex flex-col overflow-hidden">
          <div className="w-full h-40 bg-gray-200 dark:bg-gray-700 relative group">
            {ex.urlVideo ? (
              <div className="w-full h-full cursor-pointer" onClick={() => onVideoOpen(ex.urlVideo!)}>
                <iframe className="w-full h-full object-cover pointer-events-none" src={ex.urlVideo.replace("watch?v=", "embed/")} title={ex.nome} loading="lazy" />
                <div className="absolute inset-0 bg-black bg-opacity-0 group-hover:bg-opacity-40 flex items-center justify-center transition-all duration-300 opacity-0 group-hover:opacity-100">
                  <PlayCircle className="w-12 h-12 text-white opacity-80" />
                </div>
              </div>
            ) : <div className="w-full h-full flex items-center justify-center text-muted-foreground text-sm">Sem Vídeo</div>}
          </div>
          <CardContent className="p-4 flex-grow flex flex-col">
            <div className="flex gap-1 mb-2 flex-wrap">
              {ex.grupoMuscular && <Badge variant="secondary">{ex.grupoMuscular}</Badge>}
              {ex.categoria && <Badge variant="outline">{ex.categoria}</Badge>}
            </div>
            <h2 className="font-semibold text-base truncate mb-1" title={ex.nome}>{ex.nome}</h2>
            <p className="text-xs text-muted-foreground line-clamp-2 flex-grow mb-2" title={ex.descricao ?? ''}>{ex.descricao || 'Nenhuma descrição.'}</p>
            <div className="flex gap-1 items-center justify-end mt-auto pt-2 border-t">
              {/* ======================================================= */}
              {/* --- CORREÇÃO: USANDO TOOLTIP PARA OS ÍCONES --- */}
              <TooltipProvider delayDuration={100}>
                {ex.isCustom ? (
                    <Tooltip>
                        <TooltipTrigger><User className="w-4 h-4 text-blue-500" /></TooltipTrigger>
                        <TooltipContent><p>Exercício Personalizado</p></TooltipContent>
                    </Tooltip>
                ) : (
                    <Tooltip>
                        <TooltipTrigger><BrainCircuit className="w-4 h-4 text-purple-500" /></TooltipTrigger>
                        <TooltipContent><p>Exercício do App</p></TooltipContent>
                    </Tooltip>
                )}
              </TooltipProvider>
              {/* ======================================================= */}

              {ex.isCustom && <ExerciseEditModal exercicio={ex} onUpdated={onFetch} />}
              {ex.isCustom && <ExerciseDeleteButton exercicioId={ex._id} onDeleted={onFetch} />}
              <Button variant="ghost" size="icon" onClick={() => onFavoriteToggle(ex._id, isFavorited)} title={isFavorited ? "Desfavoritar" : "Favoritar"} className="h-7 w-7">
                <Star className={`w-4 h-4 ${isFavorited ? 'fill-yellow-400 text-yellow-500' : 'text-muted-foreground hover:text-yellow-500'}`} />
              </Button>
            </div>
          </CardContent>
        </Card>
      );
    })}
  </div>
);

export default function ExercisesPage() {
  const { user } = useUser();
  const isAdmin = user?.role.toLowerCase() === 'admin';

  const [searchTerm, setSearchTerm] = useState("");
  const [aba, setAba] = useState<AbaSelecionada>("todos");
  const [videoModalUrl, setVideoModalUrl] = useState<string | null>(null);
  const [grupoSelecionado, setGrupoSelecionado] = useState<string>(ALL_FILTER_VALUE);
  const [categoriaSelecionada, setCategoriaSelecionada] = useState<string>(ALL_FILTER_VALUE);
  const { toast } = useToast();
  const queryClient = useQueryClient();

  const { data: appExercises, isLoading: isLoadingApp } = useQuery<Exercicio[]>({
    queryKey: ['exercicios', 'app', grupoSelecionado, categoriaSelecionada],
    queryFn: () => fetchWithAuth(`/api/exercicios/app?grupo=${grupoSelecionado}&categoria=${categoriaSelecionada}`),
  });

  const { data: myExercises, isLoading: isLoadingMy } = useQuery<Exercicio[]>({
    queryKey: ['exercicios', 'meus', grupoSelecionado, categoriaSelecionada],
    queryFn: () => fetchWithAuth(`/api/exercicios/meus?grupo=${grupoSelecionado}&categoria=${categoriaSelecionada}`),
    enabled: !isAdmin, // Desativa essa query se o usuário for admin
  });
  
  const { data: favExercises, isLoading: isLoadingFav } = useQuery<Exercicio[]>({
    queryKey: ['exercicios', 'favoritos', grupoSelecionado, categoriaSelecionada],
    queryFn: () => fetchWithAuth(`/api/exercicios/favoritos?grupo=${grupoSelecionado}&categoria=${categoriaSelecionada}`),
  });

  const isLoading = isLoadingApp || (isLoadingMy && !isAdmin) || isLoadingFav;

  const filteredExercises = useMemo(() => {
    let list: Exercicio[] = [];
    if (aba === 'todos') list = [...(appExercises || []), ...(myExercises || [])];
    else if (aba === 'app') list = appExercises || [];
    else if (aba === 'meus') list = myExercises || [];
    else if (aba === 'favoritos') list = favExercises || [];

    return list
      .filter(ex => ex.nome.toLowerCase().includes(searchTerm.toLowerCase()))
      .sort((a,b) => a.nome.localeCompare(b.nome, 'pt-BR'));
  }, [aba, appExercises, myExercises, favExercises, searchTerm]);


  const handleFavoriteToggle = async (id: string, isFavorited: boolean) => {
    try {
      const method = isFavorited ? "DELETE" : "POST";
      await fetchWithAuth(`/api/exercicios/${id}/favorite`, { method });
      toast({ title: "Sucesso", description: `Exercício ${isFavorited ? 'desfavoritado' : 'favoritado'}.` });
      queryClient.invalidateQueries({ queryKey: ['exercicios'] });
    } catch (err: any) {
      toast({ title: "Erro", description: err.message, variant: "destructive" });
    }
  };

  const handleFetch = () => {
    queryClient.invalidateQueries({ queryKey: ['exercicios'] });
  };
  
  const limparFiltros = () => {
    setSearchTerm("");
    setGrupoSelecionado(ALL_FILTER_VALUE);
    setCategoriaSelecionada(ALL_FILTER_VALUE);
  };
  
  const grupos = ["Peitoral", "Pernas", "Costas", "Ombros", "Bíceps", "Tríceps", "Abdômen", "Lombar", "Glúteos", "Panturrilha", "Cardio", "Corpo Inteiro", "Outro"].sort();
  const categorias = ["Força", "Resistência", "Hipertrofia", "Potência", "Cardiovascular", "Flexibilidade", "Mobilidade", "Funcional", "Calistenia", "Outro"].sort();

  return (
    <div className="p-4 md:p-6 lg:p-8">
      <div className="flex flex-col sm:flex-row justify-between items-center mb-6 gap-4">
        <h1 className="text-2xl font-bold">Biblioteca de Exercícios</h1>
        <div className="flex gap-2">
            {isAdmin && <ExerciseFormModal onCreated={handleFetch} creationType="app" triggerButtonText="Criar Exercício do App" />}
            {!isAdmin && <ExerciseFormModal onCreated={handleFetch} creationType="personal" triggerButtonText="Criar Meu Exercício" />}
        </div>
      </div>

      <Tabs defaultValue="todos" onValueChange={(v) => setAba(v as AbaSelecionada)} className="mb-4">
        <TabsList className={`grid w-full ${isAdmin ? 'grid-cols-3' : 'grid-cols-4'}`}>
          {!isAdmin && <TabsTrigger value="todos">Todos</TabsTrigger>}
          <TabsTrigger value="app">Exercícios do App</TabsTrigger>
          {!isAdmin && <TabsTrigger value="meus">Meus Exercícios</TabsTrigger>}
          <TabsTrigger value="favoritos">Favoritos</TabsTrigger>
        </TabsList>
      </Tabs>

      <div className="flex flex-wrap gap-3 items-center bg-muted p-4 rounded-lg border mb-6">
        <Input placeholder="Buscar por nome..." value={searchTerm} onChange={(e) => setSearchTerm(e.target.value)} className="flex-grow sm:flex-grow-0 sm:w-48 bg-background dark:bg-input" />
        <Select onValueChange={setGrupoSelecionado} value={grupoSelecionado}>
          <SelectTrigger className="w-full sm:w-auto min-w-[180px] bg-background dark:bg-input"><SelectValue placeholder="Grupo muscular" /></SelectTrigger>
          <SelectContent>
            <SelectItem value={ALL_FILTER_VALUE}>Todos os Grupos</SelectItem>
            {grupos.map((g) => <SelectItem key={g} value={g}>{g}</SelectItem>)}
          </SelectContent>
        </Select>
        <Select onValueChange={setCategoriaSelecionada} value={categoriaSelecionada}>
          <SelectTrigger className="w-full sm:w-auto min-w-[180px] bg-background dark:bg-input"><SelectValue placeholder="Tipo/Categoria" /></SelectTrigger>
          <SelectContent>
            <SelectItem value={ALL_FILTER_VALUE}>Todos os Tipos</SelectItem>
            {categorias.map((c) => <SelectItem key={c} value={c}>{c}</SelectItem>)}
          </SelectContent>
        </Select>
        <Button variant="ghost" onClick={limparFiltros} size="sm" className="text-muted-foreground hover:text-foreground">
          <FilterX className="w-4 h-4 mr-1" /> Limpar
        </Button>
      </div>

      {isLoading ? (
        <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-4">
          {[...Array(8)].map((_, i) => <Skeleton key={i} className="h-72 w-full" />)}
        </div>
      ) : filteredExercises.length === 0 ? (
        <div className="text-center text-muted-foreground mt-10 py-10 border rounded-lg bg-card">
          <p className="text-lg">Nenhum exercício encontrado.</p>
        </div>
      ) : (
        <ExerciseList exercicios={filteredExercises} onFavoriteToggle={handleFavoriteToggle} onVideoOpen={setVideoModalUrl} onFetch={handleFetch}/>
      )}
      <VideoPlayerModal videoUrl={videoModalUrl} onClose={() => setVideoModalUrl(null)} />
    </div>
  );
}
