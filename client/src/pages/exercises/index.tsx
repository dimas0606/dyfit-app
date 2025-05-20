// client/src/pages/exercises/index.tsx
// ATUALIZADO: Adicionadas importações de FilterX e Badge

import { useEffect, useState } from "react";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Card, CardContent } from "@/components/ui/card";
import { Skeleton } from "@/components/ui/skeleton";
import { Star, PlayCircle, FilterX } from "lucide-react"; // Adicionado FilterX
import ExerciseFormModal from "@/components/dialogs/ExerciseFormModal";
import ExerciseEditModal from "@/components/dialogs/ExerciseEditModal";
import ExerciseDeleteButton from "@/components/buttons/ExerciseDeleteButton";
import { useToast } from "@/hooks/use-toast";
import VideoPlayerModal from "@/components/dialogs/VideoPlayerModal";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { fetchWithAuth } from "@/lib/apiClient";
import { useQueryClient } from "@tanstack/react-query";
import { Badge } from "@/components/ui/badge"; // Adicionada importação do Badge

interface Exercicio {
  _id: string;
  nome: string;
  descricao?: string;
  grupoMuscular?: string;
  categoria?: string; // Usado para o filtro de "Tipo" no backend
  urlVideo?: string;
  isCustom: boolean;
  favoritedBy?: string[];
  isFavoritedByCurrentUser?: boolean;
}

type AbaSelecionada = "meus" | "app" | "favoritos";
const ALL_FILTER_VALUE = "all";

export default function ExercisesPage() {
  const [exercicios, setExercicios] = useState<Exercicio[]>([]);
  const [loading, setLoading] = useState(true);
  const [searchTerm, setSearchTerm] = useState("");
  const [aba, setAba] = useState<AbaSelecionada>("app");
  const [videoModalUrl, setVideoModalUrl] = useState<string | null>(null);
  const [grupoSelecionado, setGrupoSelecionado] = useState<string>(ALL_FILTER_VALUE);
  const [categoriaSelecionada, setCategoriaSelecionada] = useState<string>(ALL_FILTER_VALUE);
  const { toast } = useToast();
  const queryClient = useQueryClient();

  const grupos = ["Peitoral", "Pernas", "Costas", "Ombros", "Bíceps", "Tríceps", "Abdômen", "Lombar", "Glúteos", "Panturrilha", "Cardio", "Corpo Inteiro", "Outro"].sort((a,b) => a.localeCompare(b, 'pt-BR'));
  const categorias = ["Força", "Resistência", "Hipertrofia", "Potência", "Cardiovascular", "Flexibilidade", "Mobilidade", "Funcional", "Calistenia", "Outro"].sort((a,b) => a.localeCompare(b, 'pt-BR'));

  const fetchExercicios = async () => {
    setLoading(true);
    let rota = "/api/exercicios/app";
    if (aba === "meus") {
      rota = "/api/exercicios/meus";
    } else if (aba === "favoritos") {
      rota = "/api/exercicios/favoritos";
    }

    const params = new URLSearchParams();
    if (grupoSelecionado && grupoSelecionado !== ALL_FILTER_VALUE) {
        params.append('grupo', grupoSelecionado);
    }
    if (categoriaSelecionada && categoriaSelecionada !== ALL_FILTER_VALUE) {
        params.append('categoria', categoriaSelecionada);
    }
    const rotaComFiltros = `${rota}?${params.toString()}`;


    try {
      const data = await fetchWithAuth<Exercicio[]>(rotaComFiltros);
      setExercicios(Array.isArray(data) ? data : []);
    } catch (err: any) {
      toast({
        title: "Erro ao carregar exercícios",
        description: err.message || "Não foi possível buscar os exercícios.",
        variant: "destructive",
      });
      setExercicios([]);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchExercicios();
  }, [aba, grupoSelecionado, categoriaSelecionada]);

  const filtrarPorNome = (lista: Exercicio[]) =>
    lista.filter((ex) =>
      ex.nome.toLowerCase().includes(searchTerm.toLowerCase())
    ).sort((a,b) => a.nome.localeCompare(b.nome, 'pt-BR'));


  const favoritar = async (id: string) => {
    try {
      await fetchWithAuth(`/api/exercicios/${id}/favorite`, { method: "POST" });
      toast({ title: "Sucesso", description: "Exercício favoritado." });
      fetchExercicios();
      queryClient.invalidateQueries({ queryKey: ["/api/exercicios", aba, grupoSelecionado, categoriaSelecionada] });
    } catch (err: any) {
      toast({ title: "Erro ao favoritar", description: err.message, variant: "destructive" });
    }
  };

  const desfavoritar = async (id: string) => {
    try {
      await fetchWithAuth(`/api/exercicios/${id}/favorite`, { method: "DELETE" });
       toast({ title: "Sucesso", description: "Exercício desfavoritado." });
      fetchExercicios();
      queryClient.invalidateQueries({ queryKey: ["/api/exercicios", aba, grupoSelecionado, categoriaSelecionada] });
    } catch (err: any) {
      toast({ title: "Erro ao desfavoritar", description: err.message, variant: "destructive" });
    }
  };
  
  const limparFiltros = () => {
    setSearchTerm("");
    setGrupoSelecionado(ALL_FILTER_VALUE);
    setCategoriaSelecionada(ALL_FILTER_VALUE);
  };


  const corGrupo: Record<string, string> = { Peitoral: "bg-red-100 text-red-700", Costas: "bg-blue-100 text-blue-700", Pernas: "bg-green-100 text-green-700", Ombros: "bg-yellow-100 text-yellow-700", Bíceps: "bg-purple-100 text-purple-700", Tríceps: "bg-pink-100 text-pink-700", Abdômen: "bg-orange-100 text-orange-700", Outros: "bg-gray-100 text-gray-700", Cardio: "bg-indigo-100 text-indigo-700", "Corpo Inteiro": "bg-teal-100 text-teal-700", Lombar: "bg-lime-100 text-lime-700", Glúteos: "bg-fuchsia-100 text-fuchsia-700", Panturrilha: "bg-cyan-100 text-cyan-700" };
  const corCategoria: Record<string, string> = { Força: "border-red-500", Resistência: "border-blue-500", Hipertrofia: "border-green-500", Potência: "border-yellow-500", Cardiovascular: "border-indigo-500", Flexibilidade: "border-pink-500", Mobilidade: "border-purple-500", Funcional: "border-orange-500", Calistenia: "border-teal-500", Outro: "border-gray-500"};


  return (
    <div className="p-4 md:p-6 lg:p-8">
      <div className="flex flex-col sm:flex-row justify-between items-center mb-6 gap-4">
        <h1 className="text-2xl font-bold">Biblioteca de Exercícios</h1>
        {aba === "meus" && <ExerciseFormModal onCreated={fetchExercicios} />}
      </div>

      <Tabs defaultValue="app" onValueChange={(v) => setAba(v as AbaSelecionada)} className="mb-4">
        <TabsList className="grid w-full grid-cols-3">
          <TabsTrigger value="app">Exercícios do App</TabsTrigger>
          <TabsTrigger value="meus">Meus Exercícios</TabsTrigger>
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

      {loading ? (
        <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-4">
          {[...Array(8)].map((_, i) => (
            <Card key={i} className="rounded-xl border bg-card text-card-foreground shadow flex flex-col">
              <Skeleton className="h-40 w-full rounded-t-xl" />
              <div className="p-4 space-y-2 flex-grow">
                <Skeleton className="h-5 w-3/4" />
                <Skeleton className="h-4 w-1/2" />
                <Skeleton className="h-3 w-1/4 mt-1" />
                <Skeleton className="h-3 w-1/3 mt-1" />
              </div>
              <div className="p-2 flex justify-end border-t mt-auto">
                <Skeleton className="h-7 w-7 rounded-md" />
              </div>
            </Card>
          ))}
        </div>
      ) : filtrarPorNome(exercicios).length === 0 ? (
        <div className="text-center text-muted-foreground mt-10 py-10 border rounded-lg bg-card">
          <p className="text-lg">Nenhum exercício encontrado.</p>
          { (searchTerm || grupoSelecionado !== ALL_FILTER_VALUE || categoriaSelecionada !== ALL_FILTER_VALUE) && <p className="text-sm">Tente ajustar seus filtros ou termo de busca.</p>}
          { aba === "meus" && !searchTerm && grupoSelecionado === ALL_FILTER_VALUE && categoriaSelecionada === ALL_FILTER_VALUE && (
             <p className="mt-2 text-sm">Clique em "+ Criar Exercício" para adicionar um.</p>
          )}
        </div>
      ) : (
        <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-4">
          {filtrarPorNome(exercicios).map((ex) => {
            const isFavorited = ex.isFavoritedByCurrentUser ?? false;
            return (
              <Card key={ex._id} className="rounded-xl border bg-card text-card-foreground shadow flex flex-col overflow-hidden">
                <div className="w-full h-40 bg-gray-200 dark:bg-gray-700 relative group">
                  {ex.urlVideo ? (
                    <div className="w-full h-full cursor-pointer" onClick={() => setVideoModalUrl(ex.urlVideo ?? null)}>
                      <iframe
                        className="w-full h-full object-cover pointer-events-none"
                        src={ex.urlVideo.replace("watch?v=", "embed/")}
                        title={ex.nome}
                        allow="accelerometer; autoplay; clipboard-write; encrypted-media; gyroscope; picture-in-picture"
                        allowFullScreen
                        loading="lazy"
                      />
                      <div className="absolute inset-0 bg-black bg-opacity-0 group-hover:bg-opacity-40 flex items-center justify-center transition-all duration-300 opacity-0 group-hover:opacity-100">
                        <PlayCircle className="w-12 h-12 text-white opacity-80" />
                      </div>
                    </div>
                  ) : (
                    <div className="w-full h-full flex items-center justify-center text-muted-foreground text-sm">
                      Sem Vídeo
                    </div>
                  )}
                </div>
                <CardContent className="p-4 flex-grow flex flex-col">
                  <div className="flex gap-1 mb-2 flex-wrap">
                    {ex.grupoMuscular && <Badge variant="outline" className={`${corGrupo[ex.grupoMuscular] || 'bg-gray-100 text-gray-700'} border-transparent text-xs`}>{ex.grupoMuscular}</Badge>}
                    {ex.categoria && <Badge variant="outline" className={`border-2 ${corCategoria[ex.categoria] || 'border-gray-400'} text-xs`}>{ex.categoria}</Badge>}
                  </div>
                  <h2 className="font-semibold text-base truncate mb-1" title={ex.nome}>{ex.nome}</h2>
                  <p className="text-xs text-muted-foreground line-clamp-2 flex-grow mb-2" title={ex.descricao ?? ''}>
                    {ex.descricao || 'Nenhuma descrição.'}
                  </p>
                  <div className="flex gap-1 items-center justify-end mt-auto pt-2 border-t">
                    {aba === "meus" && ex.isCustom && (
                      <>
                        <ExerciseEditModal exercicio={ex} onUpdated={fetchExercicios} />
                        <ExerciseDeleteButton exercicioId={ex._id} onDeleted={fetchExercicios} />
                      </>
                    )}
                    <Button variant="ghost" size="icon" onClick={() => isFavorited ? desfavoritar(ex._id) : favoritar(ex._id)} title={isFavorited ? "Desfavoritar" : "Favoritar"} className="h-7 w-7">
                      <Star className={`w-4 h-4 ${isFavorited ? 'fill-yellow-400 text-yellow-500' : 'text-muted-foreground hover:text-yellow-500'}`} />
                    </Button>
                  </div>
                </CardContent>
              </Card>
            );
          })}
        </div>
      )}
      <VideoPlayerModal videoUrl={videoModalUrl} onClose={() => setVideoModalUrl(null)} />
    </div>
  );
}
