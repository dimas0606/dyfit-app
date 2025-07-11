// client/src/components/dialogs/SelectExerciseModal.tsx
import { useState, useEffect, useMemo } from 'react'; // 'React' foi removido
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter, DialogDescription } from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Tabs, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { ScrollArea } from "@/components/ui/scroll-area";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { useQuery } from '@tanstack/react-query';
import { fetchWithAuth } from '@/lib/apiClient';
import { Loader2, CheckCircle, FilterX } from 'lucide-react';

export interface BibliotecaExercicio { _id: string; nome: string; grupoMuscular?: string; categoria?: string; isCustom?: boolean; }
interface SelectExerciseModalProps { isOpen: boolean; onClose: () => void; onExercisesSelect: (selecionados: BibliotecaExercicio[]) => void; }
type AbaBiblioteca = "todos" | "app" | "meus" | "favoritos";
const ALL_FILTER_VALUE = "all";

export default function SelectExerciseModal({ isOpen, onClose, onExercisesSelect }: SelectExerciseModalProps) {
  const [searchTerm, setSearchTerm] = useState("");
  const [abaSelecionada, setAbaSelecionada] = useState<AbaBiblioteca>("todos");
  const [exerciciosSelecionados, setExerciciosSelecionados] = useState<BibliotecaExercicio[]>([]);
  const [grupoSelecionado, setGrupoSelecionado] = useState<string>(ALL_FILTER_VALUE);
  const [categoriaSelecionada, setCategoriaSelecionada] = useState<string>(ALL_FILTER_VALUE);

  const grupos = ["Peitoral", "Pernas", "Costas", "Ombros", "Bíceps", "Tríceps", "Abdômen", "Lombar", "Glúteos", "Panturrilha", "Cardio", "Corpo Inteiro", "Outro"].sort();
  const categorias = ["Força", "Resistência", "Hipertrofia", "Potência", "Cardiovascular", "Flexibilidade", "Mobilidade", "Funcional", "Calistenia", "Outro"].sort();

  const fetchData = (path: string) => fetchWithAuth<BibliotecaExercicio[]>(`/api/exercicios/${path}`);
  
  const { data: appExercises = [], isLoading: isLoadingApp } = useQuery({ queryKey: ['exerciciosBiblioteca', 'app'], queryFn: () => fetchData('app'), enabled: isOpen, staleTime: 1000 * 60 * 5 });
  const { data: myExercises = [], isLoading: isLoadingMy } = useQuery({ queryKey: ['exerciciosBiblioteca', 'meus'], queryFn: () => fetchData('meus'), enabled: isOpen, staleTime: 1000 * 60 * 5 });
  const { data: favExercises = [], isLoading: isLoadingFav } = useQuery({ queryKey: ['exerciciosBiblioteca', 'favoritos'], queryFn: () => fetchData('favoritos'), enabled: isOpen, staleTime: 1000 * 60 * 5 });
  const isLoading = isLoadingApp || isLoadingMy || isLoadingFav;

  useEffect(() => { if (!isOpen) setExerciciosSelecionados([]); }, [isOpen]);
  
  const handleToggleSelecaoExercicio = (exercicio: BibliotecaExercicio) => setExerciciosSelecionados(prev => prev.some(ex => ex._id === exercicio._id) ? prev.filter(ex => ex._id !== exercicio._id) : [...prev, exercicio]);
  const handleSubmitSelecao = () => { onExercisesSelect(exerciciosSelecionados); onClose(); };
  const limparFiltrosDeTela = () => { setSearchTerm(""); setGrupoSelecionado(ALL_FILTER_VALUE); setCategoriaSelecionada(ALL_FILTER_VALUE); };

  const exerciciosFiltradosEOrdenados = useMemo(() => {
    let baseList: BibliotecaExercicio[] = [];
    if (abaSelecionada === 'todos') baseList = [...appExercises, ...myExercises];
    else if (abaSelecionada === 'app') baseList = appExercises;
    else if (abaSelecionada === 'meus') baseList = myExercises;
    else if (abaSelecionada === 'favoritos') baseList = favExercises;
    const uniqueList = Array.from(new Map(baseList.map(item => [item._id, item])).values());
    return uniqueList.filter(ex => 
        ex.nome.toLowerCase().includes(searchTerm.toLowerCase()) &&
        (grupoSelecionado === ALL_FILTER_VALUE || ex.grupoMuscular === grupoSelecionado) &&
        (categoriaSelecionada === ALL_FILTER_VALUE || ex.categoria === categoriaSelecionada)
    ).sort((a, b) => a.nome.localeCompare(b.nome));
  }, [abaSelecionada, appExercises, myExercises, favExercises, searchTerm, grupoSelecionado, categoriaSelecionada]);

  if (!isOpen) return null;

  return (
    <Dialog open={isOpen} onOpenChange={(openState) => !openState && onClose()}>
      <DialogContent className="sm:max-w-3xl w-[95vw] h-[90vh] flex flex-col p-0">
        <DialogHeader className="p-6 pb-4 border-b shrink-0">
          <DialogTitle>Selecionar Exercício(s) da Biblioteca</DialogTitle>
          <DialogDescription>Use as abas e filtros para encontrar e selecionar os exercícios.</DialogDescription>
        </DialogHeader>
        <div className="px-6 pt-4 shrink-0">
          <Tabs defaultValue="todos" onValueChange={(v) => setAbaSelecionada(v as AbaBiblioteca)} className="mb-2">
            <TabsList className="grid w-full grid-cols-4">
              <TabsTrigger value="todos">Todos</TabsTrigger>
              <TabsTrigger value="app">App</TabsTrigger>
              <TabsTrigger value="meus">Meus</TabsTrigger>
              <TabsTrigger value="favoritos">Favoritos</TabsTrigger>
            </TabsList>
          </Tabs>
        </div>
        <div className="flex flex-wrap gap-3 items-center bg-muted p-4 border-y mx-6 shrink-0">
           <Input placeholder="Buscar por nome..." value={searchTerm} onChange={(e) => setSearchTerm(e.target.value)} className="flex-grow sm:flex-grow-0 sm:w-48 bg-background"/>
           <Select onValueChange={setGrupoSelecionado} value={grupoSelecionado}><SelectTrigger className="w-full sm:w-[180px] bg-background"><SelectValue placeholder="Grupo muscular" /></SelectTrigger><SelectContent><SelectItem value={ALL_FILTER_VALUE}>Todos os Grupos</SelectItem>{grupos.map((g) => <SelectItem key={g} value={g}>{g}</SelectItem>)}</SelectContent></Select>
           <Select onValueChange={setCategoriaSelecionada} value={categoriaSelecionada}><SelectTrigger className="w-full sm:w-[180px] bg-background"><SelectValue placeholder="Categoria" /></SelectTrigger><SelectContent><SelectItem value={ALL_FILTER_VALUE}>Todas as Categorias</SelectItem>{categorias.map((c) => <SelectItem key={c} value={c}>{c}</SelectItem>)}</SelectContent></Select>
           <Button variant="ghost" onClick={limparFiltrosDeTela} size="sm"><FilterX className="w-4 h-4 mr-1" />Limpar</Button>
        </div>
        <div className="flex-grow overflow-y-auto px-6 pt-4 pb-2">
          <ScrollArea className="h-full">
            {isLoading ? <div className="flex justify-center items-center h-full min-h-[200px]"><Loader2 className="w-8 h-8 animate-spin text-primary" /></div>
            : exerciciosFiltradosEOrdenados.length === 0 ? <p className="text-sm text-muted-foreground text-center py-10">Nenhum exercício encontrado.</p>
            : <div className="space-y-2">{exerciciosFiltradosEOrdenados.map((ex) => {
                const isSelected = exerciciosSelecionados.some(sel => sel._id === ex._id);
                return (
                  <div key={ex._id} onClick={() => handleToggleSelecaoExercicio(ex)} className={`p-3 border rounded-md cursor-pointer flex justify-between items-center transition-colors ${isSelected ? "bg-primary/10 border-primary ring-2 ring-primary" : "hover:bg-muted/50"}`}>
                      <div><p className={`font-medium ${isSelected ? 'text-primary' : ''}`}>{ex.nome}</p><span className="text-xs text-muted-foreground">{ex.grupoMuscular || 'N/A'}</span></div>
                      {isSelected && <CheckCircle className="w-5 h-5 text-primary shrink-0" />}
                  </div>
                );})}
              </div>}
          </ScrollArea>
        </div>
        <DialogFooter className="p-6 pt-4 border-t shrink-0">
            <p className="text-sm text-muted-foreground mr-auto">{exerciciosSelecionados.length} selecionado(s)</p>
            <Button variant="outline" onClick={onClose}>Cancelar</Button>
            <Button onClick={handleSubmitSelecao} disabled={exerciciosSelecionados.length === 0}>Adicionar</Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}