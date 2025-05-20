// server/models/Treino.ts
import mongoose, { Schema, Document, Types } from "mongoose";
import { IExercicio } from './Exercicio'; // Usado em ExercicioEmDiaDeTreinoSchema

// Tipos de organização da Rotina/Ficha
export const TIPOS_ORGANIZACAO_ROTINA = ['diasDaSemana', 'numerico', 'livre'] as const;
export type TipoOrganizacaoRotina = typeof TIPOS_ORGANIZACAO_ROTINA[number];

// --- Subdocumento para um Exercício dentro de um Dia de Treino ---
export interface IExercicioEmDiaDeTreino extends Types.Subdocument {
  exercicioId: Types.ObjectId | IExercicio; // IExercicio para quando populado
  series?: string;
  repeticoes?: string;
  carga?: string;
  descanso?: string;
  observacoes?: string;
  ordemNoDia: number;
  concluido?: boolean;
}

// Interface para o objeto populado e "lean" (convertido para JS puro)
export interface IExercicioEmDiaDeTreinoPopuladoLean {
  _id: string; // Mongoose adiciona _id a subdocumentos por padrão
  exercicioId: { _id: string; nome: string; grupoMuscular?: string; urlVideo?: string; descricao?: string; categoria?: string; tipo?: string; } | string; // Pode ser string (ID) ou objeto (populado)
  series?: string;
  repeticoes?: string;
  carga?: string;
  descanso?: string;
  observacoes?: string;
  ordemNoDia: number;
  concluido?: boolean;
}

const ExercicioEmDiaDeTreinoSchema = new Schema<IExercicioEmDiaDeTreino>({
  exercicioId: { type: Schema.Types.ObjectId, ref: 'Exercicio', required: true },
  series: { type: String, trim: true },
  repeticoes: { type: String, trim: true },
  carga: { type: String, trim: true },
  descanso: { type: String, trim: true },
  observacoes: { type: String, trim: true },
  ordemNoDia: { type: Number, default: 0, required: true },
  concluido: { type: Boolean, default: false }
}, { _id: true });


// --- Subdocumento para um Dia de Treino (Sub-Ficha) dentro da Rotina/Ficha Principal ---
export interface IDiaDeTreino extends Types.Subdocument {
  identificadorDia: string;
  nomeSubFicha?: string;
  ordemNaRotina: number;
  exerciciosDoDia: Types.DocumentArray<IExercicioEmDiaDeTreino>;
}

// Interface para o objeto populado e "lean"
export interface IDiaDeTreinoPopuladoLean {
  _id: string; // Mongoose adiciona _id a subdocumentos por padrão
  identificadorDia: string;
  nomeSubFicha?: string;
  ordemNaRotina: number;
  exerciciosDoDia: IExercicioEmDiaDeTreinoPopuladoLean[];
}

const DiaDeTreinoSchema = new Schema<IDiaDeTreino>({
  identificadorDia: { type: String, required: true, trim: true },
  nomeSubFicha: { type: String, trim: true },
  ordemNaRotina: { type: Number, required: true, default: 0 },
  exerciciosDoDia: [ExercicioEmDiaDeTreinoSchema]
}, { _id: true });


// --- Interface principal para o Documento da Ficha/Rotina de Treino ---
export interface ITreino extends Document {
  titulo: string;
  descricao?: string;
  tipo: "modelo" | "individual";
  alunoId?: Types.ObjectId | null; // ObjectId do Aluno, populado pode ser object
  criadorId: Types.ObjectId;      // ObjectId do PersonalTrainer, populado pode ser object
  
  tipoOrganizacaoRotina: TipoOrganizacaoRotina;
  diasDeTreino: Types.DocumentArray<IDiaDeTreino>;

  // Campos de gestão da Rotina/Ficha Modelo
  pastaId?: Types.ObjectId | null; // ObjectId da PastaTreino, populado pode ser object
  statusModelo?: "ativo" | "rascunho" | "arquivado";
  ordemNaPasta?: number;

  // Campos para controle de validade/progresso do programa para um aluno (aplicável se tipo === 'individual')
  dataValidade?: Date | null;
  // "Opção A - Simples" para contagem:
  totalSessoesRotinaPlanejadas?: number | null; // Total de "dias de treino" (sessões) para completar a rotina/ciclo.
  sessoesRotinaConcluidas: number; // Contador de "dias de treino" (sessões) concluídos desta rotina. Default 0.

  // Timestamps (Mongoose adiciona automaticamente)
  criadoEm: Date;
  atualizadoEm: Date;
}

// Interface para a Ficha/Rotina APÓS ser populada e "lean"
export interface ITreinoPopuladoLean {
  _id: string;
  titulo: string;
  descricao?: string;
  tipo: "modelo" | "individual";
  // Tipagem para alunoId populado
  alunoId?: { _id: string; nome: string; email?: string; /* outros campos de Aluno se necessário */ } | string | null;
  // Tipagem para criadorId populado
  criadorId: { _id: string; nome: string; email?: string; /* outros campos de PersonalTrainer se necessário */ } | string;
  
  tipoOrganizacaoRotina: TipoOrganizacaoRotina;
  diasDeTreino: IDiaDeTreinoPopuladoLean[];

  // Tipagem para pastaId populado
  pastaId?: { _id: string; nome: string; /* outros campos de PastaTreino se necessário */ } | string | null;
  statusModelo?: "ativo" | "rascunho" | "arquivado";
  ordemNaPasta?: number;

  dataValidade?: string | null; // Date é serializado para string ISO no .lean()
  totalSessoesRotinaPlanejadas?: number | null;
  sessoesRotinaConcluidas: number;

  criadoEm: string; // Date é serializado para string ISO no .lean()
  atualizadoEm: string; // Date é serializado para string ISO no .lean()
  isExpirada?: boolean; // Virtual
  progressoRotina?: string; // Virtual (ex: "3/6")
  __v?: number;
}


// --- Schema Principal da Ficha/Rotina de Treino ---
const TreinoSchema = new Schema<ITreino>(
  {
    titulo: { type: String, required: [true, 'O título da ficha/rotina é obrigatório'], trim: true },
    descricao: { type: String, trim: true },
    tipo: {
      type: String,
      enum: ["modelo", "individual"],
      required: [true, 'O tipo é obrigatório'],
    },
    alunoId: {
      type: Schema.Types.ObjectId,
      ref: "Aluno", // Modelo Aluno.ts
      default: null,
      index: true, 
      sparse: true, 
    },
    criadorId: { 
      type: Schema.Types.ObjectId,
      ref: "PersonalTrainer", // Modelo PersonalTrainer.ts
      required: true,
      index: true,
    },
    tipoOrganizacaoRotina: {
        type: String,
        enum: TIPOS_ORGANIZACAO_ROTINA,
        required: true,
        default: 'diasDaSemana', 
    },
    diasDeTreino: [DiaDeTreinoSchema],

    // Campos para tipo 'modelo'
    pastaId: { type: Schema.Types.ObjectId, ref: 'PastaTreino', default: null, sparse: true }, // Modelo Pasta.ts (exportado como PastaTreino)
    statusModelo: {
      type: String,
      enum: ["ativo", "rascunho", "arquivado"],
      default: function(this: ITreino) { return this.tipo === 'modelo' ? 'rascunho' : undefined; },
      required: function(this: ITreino) { return this.tipo === 'modelo'; }
    },
    ordemNaPasta: { type: Number, default: 0 },

    // Campos de validade para tipo 'individual'
    dataValidade: { type: Date, default: null },
    totalSessoesRotinaPlanejadas: { type: Number, default: null, min: 0 }, 
    sessoesRotinaConcluidas: { type: Number, default: 0, min: 0 },
  },
  {
    timestamps: { createdAt: 'criadoEm', updatedAt: 'atualizadoEm' },
    toJSON: { virtuals: true, getters: true }, 
    toObject: { virtuals: true, getters: true },
  }
);

// Virtual para verificar se a ficha está expirada (considerando tipo individual)
TreinoSchema.virtual('isExpirada').get(function(this: ITreino) {
    if (this.tipo !== 'individual') return false;

    // Lógica para verificar expiração por data
    if (this.dataValidade && new Date() > this.dataValidade) {
        return true;
    }
    // Lógica para verificar expiração por sessões concluídas
    if (this.totalSessoesRotinaPlanejadas && this.totalSessoesRotinaPlanejadas > 0 && this.sessoesRotinaConcluidas >= this.totalSessoesRotinaPlanejadas) {
        return true;
    }
    return false;
});

// Virtual para progresso da rotina (ex: "3/6 sessões")
TreinoSchema.virtual('progressoRotina').get(function(this: ITreino) {
    if (this.tipo !== 'individual') return null;

    if (this.totalSessoesRotinaPlanejadas && this.totalSessoesRotinaPlanejadas > 0) {
        return `${this.sessoesRotinaConcluidas}/${this.totalSessoesRotinaPlanejadas}`;
    }
    if (this.totalSessoesRotinaPlanejadas === 0) { // Se planejou 0 sessões, considera 100%
        return `0/0`; // Ou poderia ser 100% ou N/A dependendo da sua lógica de UI
    }
    return null; // Se não houver totalSessoesRotinaPlanejadas definido (null ou undefined)
});

// Índices
TreinoSchema.index({ criadorId: 1, tipo: 1 });
// O índice para alunoId já foi definido no schema como `index: true, sparse: true`
TreinoSchema.index({ criadorId: 1, tipo: 1, pastaId: 1 }, { sparse: true }); 
TreinoSchema.index({ criadorId: 1, tipo: 1, statusModelo: 1 }, { partialFilterExpression: { tipo: "modelo" } });
// Se você for consultar fichas individuais por dataValidade ou statusValidade (se adicionar de volta), crie índices para eles
// Ex: TreinoSchema.index({ alunoId: 1, tipo: 1, dataValidade: 1 }, { partialFilterExpression: { tipo: "individual" } });


// Exportar o modelo
export default mongoose.model<ITreino>("Treino", TreinoSchema);