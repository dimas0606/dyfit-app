// server/models/Treino.ts
import mongoose, { Schema, Document, Types } from "mongoose";
import { IExercicio } from './Exercicio';

export const TIPOS_ORGANIZACAO_ROTINA = ['diasDaSemana', 'numerico', 'livre'] as const;
export type TipoOrganizacaoRotina = typeof TIPOS_ORGANIZACAO_ROTINA[number];

// --- Subdocumento: Exercício em Dia de Treino ---
export interface IExercicioEmDiaDeTreino extends Types.Subdocument {
  _id: Types.ObjectId;
  exercicioId: Types.ObjectId | IExercicio;
  series?: string;
  repeticoes?: string;
  carga?: string;
  descanso?: string;
  observacoes?: string;
  ordemNoDia: number;
  concluido?: boolean;
}

// <<< ADICIONADO EXPORT >>>
export interface IExercicioEmDiaDeTreinoPopuladoLean {
  _id: string;
  exercicioId: { _id: string; nome: string; grupoMuscular?: string; urlVideo?: string; descricao?: string; categoria?: string; tipo?: string; } | string;
  series?: string;
  repeticoes?: string;
  carga?: string;
  descanso?: string;
  observacoes?: string;
  ordemNoDia: number;
  concluido?: boolean;
}

export interface IExercicioEmDiaDeTreinoPlain {
  _id?: Types.ObjectId;
  exercicioId: Types.ObjectId;
  series?: string;
  repeticoes?: string;
  carga?: string;
  descanso?: string;
  observacoes?: string;
  ordemNoDia: number;
  concluido?: boolean;
}

// --- Subdocumento: Dia de Treino ---
export interface IDiaDeTreino extends Types.Subdocument {
    _id: Types.ObjectId;
    identificadorDia: string;
    nomeSubFicha?: string | null;
    ordemNaRotina: number;
    exerciciosDoDia?: Types.DocumentArray<IExercicioEmDiaDeTreino>;
}

// <<< ADICIONADO EXPORT >>>
export interface IDiaDeTreinoPopuladoLean {
    _id: string;
    identificadorDia: string;
    nomeSubFicha?: string | null;
    ordemNaRotina: number;
    exerciciosDoDia?: IExercicioEmDiaDeTreinoPopuladoLean[];
}

export interface IDiaDeTreinoPlain {
    _id?: Types.ObjectId;
    identificadorDia: string;
    nomeSubFicha?: string | null;
    ordemNaRotina: number;
    exerciciosDoDia?: IExercicioEmDiaDeTreinoPlain[];
}

// --- Documento Principal: Treino/Rotina ---
export interface ITreino extends Document {
  titulo: string;
  descricao?: string;
  tipo: 'modelo' | 'individual';
  criadorId: Types.ObjectId;
  alunoId?: Types.ObjectId | null;
  tipoOrganizacaoRotina: TipoOrganizacaoRotina;
  diasDeTreino: Types.DocumentArray<IDiaDeTreino>;
  pastaId?: Types.ObjectId | null;
  statusModelo?: 'ativo' | 'rascunho' | 'arquivado' | null;
  ordemNaPasta?: number;
  dataValidade?: Date | null;
  totalSessoesRotinaPlanejadas?: number;
  sessoesRotinaConcluidas?: number;
  criadoEm: Date;
  atualizadoEm: Date;
  isConcluida?: boolean;
  progressoRotina?: string;
}

// <<< CORREÇÃO PRINCIPAL: Adicionado EXPORT aqui >>>
// Renomeado para ITreinoPopuladoLean para corresponder ao uso
export interface ITreinoPopuladoLean {
    _id: string;
    titulo: string;
    descricao?: string | null;
    tipo: "modelo" | "individual";
    alunoId?: { _id: string; nome: string; email?: string; } | string | null; 
    criadorId: { _id: string; nome: string; email?: string; } | string; 
    tipoOrganizacaoRotina: 'diasDaSemana' | 'numerico' | 'livre';
    diasDeTreino?: IDiaDeTreinoPopuladoLean[];
    pastaId?: { _id: string; nome: string; } | string | null;
    statusModelo?: "ativo" | "rascunho" | "arquivado" | null;
    ordemNaPasta?: number;
    dataValidade?: string | Date | null;
    totalSessoesRotinaPlanejadas?: number;
    sessoesRotinaConcluidas?: number;
    criadoEm?: string | Date;
    atualizadoEm?: string | Date;
    isConcluida?: boolean;
    progressoRotina?: string;
}

// <<< MANTIDO EXPORTADO: O frontend também usa este tipo com o nome RotinaListagemItem >>>
export type RotinaListagemItem = ITreinoPopuladoLean;


// --- Schemas ---
const ExercicioEmDiaDeTreinoSchema = new Schema<IExercicioEmDiaDeTreino>({
  exercicioId: { type: Schema.Types.ObjectId, ref: 'Exercicio', required: true },
  series: { type: String, trim: true },
  repeticoes: { type: String, trim: true },
  carga: { type: String, trim: true },
  descanso: { type: String, trim: true },
  observacoes: { type: String, trim: true },
  ordemNoDia: { type: Number, required: true },
  concluido: { type: Boolean, default: false },
}, { _id: true });

const DiaDeTreinoSchema = new Schema<IDiaDeTreino>({
  identificadorDia: { type: String, required: true, trim: true },
  nomeSubFicha: { type: String, trim: true, default: null },
  ordemNaRotina: { type: Number, required: true },
  exerciciosDoDia: [ExercicioEmDiaDeTreinoSchema],
}, { _id: true });

const TreinoSchema = new Schema<ITreino>({
  titulo: { type: String, required: true, trim: true },
  descricao: { type: String, trim: true },
  tipo: { type: String, required: true, enum: ['modelo', 'individual'] },
  criadorId: { type: Schema.Types.ObjectId, ref: 'PersonalTrainer', required: true },
  alunoId: { type: Schema.Types.ObjectId, ref: 'Aluno', default: null, sparse: true, index: true },
  tipoOrganizacaoRotina: { type: String, required: true, enum: TIPOS_ORGANIZACAO_ROTINA },
  diasDeTreino: [DiaDeTreinoSchema],
  pastaId: { type: Schema.Types.ObjectId, ref: 'PastaTreino', default: null, sparse: true },
  statusModelo: { type: String, enum: ['ativo', 'rascunho', 'arquivado'], default: 'ativo' },
  ordemNaPasta: { type: Number },
  dataValidade: { type: Date, default: null },
  totalSessoesRotinaPlanejadas: { type: Number, default: 0 },
  sessoesRotinaConcluidas: { type: Number, default: 0 },
  criadoEm: { type: Date, default: Date.now },
  atualizadoEm: { type: Date, default: Date.now },
});

TreinoSchema.pre('save', function (next) {
    this.atualizadoEm = new Date();
    next();
});

TreinoSchema.pre('findOneAndUpdate', function (next) {
    this.set({ atualizadoEm: new Date() });
    next();
});

// ... Virtuais e Índices permanecem os mesmos ...
TreinoSchema.virtual('isConcluida').get(function(this: ITreino) {
    if (this.tipo !== 'individual') return false;
    const totalPlanejado = this.totalSessoesRotinaPlanejadas ?? 0;
    const sessoesConcluidas = this.sessoesRotinaConcluidas ?? 0;
    if (totalPlanejado === 0 && sessoesConcluidas > 0) return true;
    if (totalPlanejado > 0 && sessoesConcluidas >= totalPlanejado) return true;
    return false;
});
TreinoSchema.virtual('progressoRotina').get(function(this: ITreino) {
    if (this.tipo !== 'individual') return null;
    const totalPlanejado = this.totalSessoesRotinaPlanejadas ?? 0;
    const sessoesConcluidas = this.sessoesRotinaConcluidas ?? 0;
    if (totalPlanejado > 0) return `${sessoesConcluidas}/${totalPlanejado}`;
    if (totalPlanejado === 0) return `0/0`;
    return null;
});
TreinoSchema.index({ criadorId: 1, tipo: 1 });
TreinoSchema.index({ criadorId: 1, tipo: 1, pastaId: 1 }, { sparse: true }); 
TreinoSchema.index({ criadorId: 1, tipo: 1, statusModelo: 1 }, { partialFilterExpression: { tipo: 'modelo' } });

export default mongoose.model<ITreino>("Treino", TreinoSchema);