// client/src/components/dialogs/AlunoViewModal.tsx
import React from 'react';
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogDescription,
  DialogFooter,
} from "@/components/ui/dialog";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Badge } from "@/components/ui/badge";
import { Avatar, AvatarFallback } from '@/components/ui/avatar';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Progress } from '@/components/ui/progress';
import { Aluno } from "@/types/aluno";
import {
    Dumbbell, Edit, History, Mail, Phone, User, Weight, Ruler, Cake, Target, CalendarDays, BarChart, CheckCircle2, Sigma
} from 'lucide-react';

interface AlunoViewModalProps {
  aluno: Aluno | null;
  open: boolean;
  onOpenChange: (open: boolean) => void;
}

// Componente auxiliar para um item de informação
const InfoItem = ({ icon: Icon, label, value }: { icon: React.ElementType, label: string, value: React.ReactNode }) => (
    <div className="flex items-start text-sm py-2 border-b border-slate-100 dark:border-slate-800">
        <Icon className="h-4 w-4 mr-3 mt-0.5 text-slate-500" />
        <span className="font-medium text-slate-600 dark:text-slate-400 w-32">{label}:</span>
        <span className="text-slate-900 dark:text-slate-100">{value || <span className="italic text-slate-400">Não informado</span>}</span>
    </div>
);

// Componente auxiliar para um KPI card
const KpiCard = ({ title, value, icon: Icon }: { title: string, value: string | number, icon: React.ElementType }) => (
    <Card className="bg-slate-50 dark:bg-slate-800/50 border-slate-200 dark:border-slate-700">
        <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-xs font-medium uppercase tracking-wider text-slate-500 dark:text-slate-400">{title}</CardTitle>
            <Icon className="h-4 w-4 text-slate-500" />
        </CardHeader>
        <CardContent>
            <div className="text-2xl font-bold text-slate-900 dark:text-slate-50">{value}</div>
        </CardContent>
    </Card>
);

const AlunoViewModal: React.FC<AlunoViewModalProps> = ({ aluno, open, onOpenChange }) => {
  if (!aluno) return null; // Não renderiza nada se não houver aluno

  const getInitials = (nome: string) => 
    nome?.split(' ').map(n => n[0]).slice(0, 2).join('').toUpperCase() || '?';

  const formatDateBR = (dateStr?: string) =>
    dateStr ? new Intl.DateTimeFormat("pt-BR").format(new Date(dateStr)) : 'N/A';

  // Dados de exemplo para os KPIs (TODO: buscar do backend)
  const frequenciaSemanal = 3;
  const progressoFicha = 66;
  const pseMedio = 7.5;

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-3xl p-0">
        <div className="flex">
            {/* Sidebar de Informações Rápidas */}
            <div className="w-1/3 bg-slate-50 dark:bg-slate-900/50 p-6 border-r dark:border-slate-800 hidden md:flex flex-col">
                <div className="flex flex-col items-center text-center">
                    <Avatar className="h-24 w-24 mb-4 border-4 border-primary/50">
                        <AvatarFallback className="text-3xl bg-slate-200 dark:bg-slate-700 text-primary">
                            {getInitials(aluno.nome)}
                        </AvatarFallback>
                    </Avatar>
                    <h2 className="text-xl font-bold text-slate-900 dark:text-slate-50">{aluno.nome}</h2>
                    <p className="text-sm text-slate-500 dark:text-slate-400">{aluno.email}</p>
                    <Badge variant={aluno.status === "active" ? "success" : "destructive"} className="mt-3">
                        {aluno.status === "active" ? "Ativo" : "Inativo"}
                    </Badge>
                </div>
                <div className="mt-8 space-y-4">
                    <InfoItem icon={Mail} label="Email" value={aluno.email} />
                    <InfoItem icon={Phone} label="Telefone" value={aluno.phone} />
                </div>
            </div>

            {/* Conteúdo Principal com Abas */}
            <div className="w-full md:w-2/3 p-6 flex flex-col">
                <DialogHeader className="md:hidden mb-4 text-center">
                    <DialogTitle>{aluno.nome}</DialogTitle>
                    <DialogDescription>{aluno.email}</DialogDescription>
                </DialogHeader>

                {/* KPIs */}
                <div className="grid grid-cols-3 gap-4 mb-6">
                    <KpiCard title="Frequência" value={`${frequenciaSemanal}/sem`} icon={BarChart} />
                    <KpiCard title="PSE Médio" value={pseMedio.toFixed(1)} icon={Sigma} />
                    <KpiCard title="Progresso" value={`${progressoFicha}%`} icon={CheckCircle2} />
                </div>
                {progressoFicha > 0 && <Progress value={progressoFicha} className="w-full h-2 mb-6" />}
                
                <Tabs defaultValue="detalhes" className="w-full flex-grow">
                    <TabsList className="grid w-full grid-cols-3">
                        <TabsTrigger value="detalhes">Detalhes</TabsTrigger>
                        <TabsTrigger value="fichas">Fichas</TabsTrigger>
                        <TabsTrigger value="historico">Histórico</TabsTrigger>
                    </TabsList>

                    <TabsContent value="detalhes" className="mt-4 pr-2 h-[250px] overflow-y-auto">
                        <div className="space-y-1">
                            <InfoItem icon={Target} label="Objetivo" value={aluno.goal} />
                            <InfoItem icon={Cake} label="Nascimento" value={formatDateBR(aluno.birthDate)} />
                            <InfoItem icon={Weight} label="Peso" value={`${aluno.weight} kg`} />
                            <InfoItem icon={Ruler} label="Altura" value={`${aluno.height} cm`} />
                            <InfoItem icon={User} label="Gênero" value={aluno.gender} />
                            <InfoItem icon={CalendarDays} label="Início" value={formatDateBR(aluno.startDate)} />
                        </div>
                    </TabsContent>

                    <TabsContent value="fichas" className="mt-4">
                        <div className="text-center text-muted-foreground pt-10">
                            <Dumbbell className="mx-auto h-12 w-12 text-slate-300 dark:text-slate-700" />
                            <p className="mt-2">Funcionalidade de Fichas em breve.</p>
                        </div>
                    </TabsContent>
                    
                     <TabsContent value="historico" className="mt-4">
                        <div className="text-center text-muted-foreground pt-10">
                            <History className="mx-auto h-12 w-12 text-slate-300 dark:text-slate-700" />
                             <p className="mt-2">Histórico de treinos em breve.</p>
                        </div>
                    </TabsContent>
                </Tabs>
                <DialogFooter className="mt-auto pt-6">
                    <Button variant="outline"> <Edit className="mr-2 h-4 w-4" /> Editar Aluno</Button>
                </DialogFooter>
            </div>
        </div>
      </DialogContent>
    </Dialog>
  );
};

export default AlunoViewModal;