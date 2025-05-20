// client/src/components/dialogs/SelectExerciseModal.tsx
// ATUALIZADO: Ajustes de layout para garantir a funcionalidade da barra de rolagem.

import React, { useState, useEffect } from 'react';
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogFooter,
  DialogDescription,
} from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Tabs, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { ScrollArea } from "@/components/ui/scroll-area";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { fetchWithAuth } from '@/lib/apiClient';
import { Loader2, CheckCircle, FilterX } from 'lucide-react';

export interface BibliotecaExercicio {
  _id: string;
  nome: string;
  grupoMuscular?: string;
  categoria?: string;
}

interface SelectExerciseModalProps {
  isOpen: boolean;
  onClose: () => void;
  onExercisesSelect: (selecionados: BibliotecaExercicio[]) => void;
}

type AbaBiblioteca = "app" | "meus" | "favoritos";

const ALL_FILTER_VALUE = "all";

export default function SelectExerciseModal({
  isOpen,
  onClose,
  onExercisesSelect,
}: SelectExerciseModalProps) {
  const [exerciciosDaBiblioteca, setExerciciosDaBiblioteca] = useState<BibliotecaExercicio[]>([]);
  const [loading, setLoading] = useState(false);
  const [searchTerm, setSearchTerm] = useState("");
  const [abaSelecionada, setAbaSelecionada] = useState<AbaBiblioteca>("app");
  const [exerciciosSelecionados, setExerciciosSelecionados] = useState<BibliotecaExercicio[]>([]);
  const [grupoSelecionado, setGrupoSelecionado] = useState<string>(ALL_FILTER_VALUE);
  const [categoriaSelecionada, setCategoriaSelecionada] = useState<string>(ALL_FILTER_VALUE);

  const grupos = [
    "Peitoral", "Pernas", "Costas", "Ombros", "Bíceps", "Tríceps", "Abdômen",
    "Lombar", "Glúteos", "Panturrilha", "Cardio", "Corpo Inteiro", "Outro"
  ].sort((a,b) => a.localeCompare(b, 'pt-BR'));

  const tiposOuCategorias = ["Força", "Resistência", "Hipertrofia", "Potência", "Cardiovascular", "Flexibilidade", "Mobilidade", "Funcional", "Calistenia", "Outro"].sort((a,b) => a.localeCompare(b, 'pt-BR'));

  const fetchExerciciosDaBiblioteca = async (
      aba: AbaBiblioteca,
      grupo: string,
      categoriaFiltro: string
    ) => {
    setLoading(true);
    let rotaBase = "/api/exercicios/app";
    if (aba === "meus") rotaBase = "/api/exercicios/meus";
    else if (aba === "favoritos") rotaBase = "/api/exercicios/favoritos";

    const params = new URLSearchParams();
    if (grupo && grupo !== ALL_FILTER_VALUE) params.append('grupo', grupo);
    if (categoriaFiltro && categoriaFiltro !== ALL_FILTER_VALUE) params.append('categoria', categoriaFiltro);
    
    const rotaComFiltros = `${rotaBase}?${params.toString()}`;

    try {
      const data = await fetchWithAuth<BibliotecaExercicio[]>(rotaComFiltros);
      setExerciciosDaBiblioteca(Array.isArray(data) ? data : []);
    } catch (error) {
      console.error("Erro ao buscar exercícios da biblioteca:", error);
      setExerciciosDaBiblioteca([]);
      // TODO: Adicionar toast de erro
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    if (isOpen) {
      fetchExerciciosDaBiblioteca(abaSelecionada, grupoSelecionado, categoriaSelecionada);
      setExerciciosSelecionados([]);
    }
  }, [isOpen, abaSelecionada, grupoSelecionado, categoriaSelecionada]);

  const handleToggleSelecaoExercicio = (exercicio: BibliotecaExercicio) => {
    setExerciciosSelecionados((prevSelecionados) =>
      prevSelecionados.some(ex => ex._id === exercicio._id)
        ? prevSelecionados.filter(ex => ex._id !== exercicio._id)
        : [...prevSelecionados, exercicio]
    );
  };

  const handleSubmitSelecao = () => {
    onExercisesSelect(exerciciosSelecionados);
    onClose();
  };

  const exerciciosFiltradosEOrdenados = [...exerciciosDaBiblioteca]
    .filter(ex => ex.nome.toLowerCase().includes(searchTerm.toLowerCase()))
    .sort((a, b) => a.nome.localeCompare(b.nome, 'pt-BR', { sensitivity: 'base' }));

  const limparFiltrosDeTela = () => {
    setSearchTerm("");
    setGrupoSelecionado(ALL_FILTER_VALUE);
    setCategoriaSelecionada(ALL_FILTER_VALUE);
  };

  if (!isOpen) return null;

  return (
    <Dialog open={isOpen} onOpenChange={(openState) => !openState && onClose()}>
      {/* DialogContent com altura máxima e layout flexível */}
      <DialogContent className="sm:max-w-3xl w-[95vw] h-[90vh] max-h-[90vh] flex flex-col p-0">
        <DialogHeader className="p-6 pb-4 border-b shrink-0"> {/* shrink-0 para não encolher */}
          <DialogTitle>Selecionar Exercício(s) da Biblioteca</DialogTitle>
          <DialogDescription>
            Use as abas, filtros e a busca para encontrar exercícios e adicioná-los à ficha.
          </DialogDescription>
        </DialogHeader>

        {/* Container para Abas e Filtros */}
        <div className="px-6 pt-4 shrink-0"> {/* shrink-0 */}
          <Tabs defaultValue="app" onValueChange={(v) => setAbaSelecionada(v as AbaBiblioteca)} className="mb-2">
            <TabsList className="grid w-full grid-cols-3">
              <TabsTrigger value="app">App</TabsTrigger>
              <TabsTrigger value="meus">Meus Exercícios</TabsTrigger>
              <TabsTrigger value="favoritos">Favoritos</TabsTrigger>
            </TabsList>
          </Tabs>
        </div>

        <div className="flex flex-wrap gap-3 items-center bg-muted p-4 rounded-lg border-y mx-6 shrink-0"> {/* shrink-0 */}
           <Input
              placeholder="Buscar por nome..."
              value={searchTerm}
              onChange={(e: React.ChangeEvent<HTMLInputElement>) => setSearchTerm(e.target.value)}
              className="flex-grow sm:flex-grow-0 sm:w-48 bg-background dark:bg-input"
           />
           <Select onValueChange={setGrupoSelecionado} value={grupoSelecionado}>
            <SelectTrigger className="w-full sm:w-[180px] bg-background dark:bg-input">
              <SelectValue placeholder="Grupo muscular" />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value={ALL_FILTER_VALUE}>Todos os Grupos</SelectItem>
              {grupos.map((g) => <SelectItem key={g} value={g}>{g}</SelectItem>)}
            </SelectContent>
          </Select>
           <Select onValueChange={setCategoriaSelecionada} value={categoriaSelecionada}>
            <SelectTrigger className="w-full sm:w-[180px] bg-background dark:bg-input">
              <SelectValue placeholder="Tipo/Categoria" />
            </SelectTrigger>
            <SelectContent>
               <SelectItem value={ALL_FILTER_VALUE}>Todos os Tipos</SelectItem>
               {tiposOuCategorias.map((c) => <SelectItem key={c} value={c}>{c}</SelectItem>)}
            </SelectContent>
          </Select>
           <Button variant="ghost" onClick={limparFiltrosDeTela} size="sm" className="text-muted-foreground hover:text-foreground">
              <FilterX className="w-4 h-4 mr-1" />
              Limpar
           </Button>
        </div>

        {/* ScrollArea agora está em um container que pode crescer e tem overflow-y-auto */}
        <div className="flex-grow overflow-y-auto px-6 pt-4 pb-2"> {/* Adicionado pb-2 para espaço antes do footer */}
          <ScrollArea className="h-full"> {/* h-full para ocupar o espaço do pai */}
            {loading ? (
              <div className="flex justify-center items-center h-full min-h-[200px]">
                <Loader2 className="w-8 h-8 animate-spin text-primary" />
              </div>
            ) : exerciciosFiltradosEOrdenados.length === 0 ? (
              <p className="text-sm text-muted-foreground text-center py-10 min-h-[200px] flex items-center justify-center">
                Nenhum exercício encontrado {searchTerm || grupoSelecionado !== ALL_FILTER_VALUE || categoriaSelecionada !== ALL_FILTER_VALUE ? "para os filtros aplicados" : "nesta aba"}.
              </p>
            ) : (
              <div className="space-y-2">
                {exerciciosFiltradosEOrdenados.map((ex) => {
                  const isSelected = exerciciosSelecionados.some(sel => sel._id === ex._id);
                  return (
                    <div
                      key={ex._id}
                      onClick={() => handleToggleSelecaoExercicio(ex)}
                      className={`p-3 border rounded-md cursor-pointer flex justify-between items-center transition-colors duration-150 ease-in-out ${
                          isSelected 
                            ? "bg-primary/10 border-primary ring-2 ring-primary shadow-md dark:bg-primary/20" 
                            : "hover:bg-muted/50 dark:hover:bg-muted/20 bg-card"
                      }`}
                    >
                      <div>
                        <p className={`font-medium ${isSelected ? 'text-primary' : 'text-card-foreground'}`}>{ex.nome}</p>
                        <span className="text-xs text-muted-foreground mr-2">{ex.grupoMuscular || 'Não especificado'}</span>
                        <span className="text-xs text-muted-foreground">{ex.categoria || 'Não especificado'}</span>
                      </div>
                      {isSelected && <CheckCircle className="w-5 h-5 text-primary flex-shrink-0" />}
                    </div>
                  );
                })}
              </div>
            )}
          </ScrollArea>
        </div>

        <DialogFooter className="p-6 pt-4 border-t shrink-0"> {/* shrink-0 */}
          <p className="text-sm text-muted-foreground mr-auto self-center">
            {exerciciosSelecionados.length} selecionado(s)
          </p>
          <Button variant="outline" onClick={onClose}>Cancelar</Button>
          <Button onClick={handleSubmitSelecao} disabled={exerciciosSelecionados.length === 0}>
            Adicionar Selecionados
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
