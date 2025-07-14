// server/models/Treino.ts
import mongoose, { Schema, Document, Types } from "mongoose";
import { IExercicio } from './Exercicio'; // Usado em ExercicioEmDiaDeTreinoSchema

// Tipos de organização da Rotina/Ficha
export const TIPOS_ORGANIZACAO_ROTINA = ['diasDaSemana', 'numerico', 'livre'] as const;
export type TipoOrganizacaoRotina = typeof TIPOS_ORGANIZACAO_ROTINA[number];

// --- Subdocumento para um Exercício dentro de um Dia de Treino ---
// Interface para o documento Mongoose completo (com propriedades de Subdocument)
export interface IExercicioEmDiaDeTreino extends Types.Subdocument {
  _id: Types.ObjectId; // CORREÇÃO: _id é obrigatório para subdocumentos Mongoose
  exercicioId: Types.ObjectId | IExercicio; // IExercicio para quando populado
  series?: string;
  repeticoes?: string;
  carga?: string;
  descanso?: string;
  observacoes?: string;
  ordemNoDia: number;
  concluido?: boolean;
}

// Interface para o objeto populado e "lean" (convertido para JS puro) no CLIENTE
export interface IExercicioEmDiaDeTreinoPopuladoLean {
  _id: string; // Mongoose adiciona _id a subdocumentos por padrão, aqui como string
  exercicioId: { // Objeto do exercício da biblioteca, populado
      _id: string;
      nome: string;
      grupoMuscular?: string;
      urlVideo?: string;
      descricao?: string;
      categoria?: string;
      tipo?: string; 
  } | string; // Pode ser string (ID) ou objeto (populado)
  series?: string;
  repeticoes?: string;
  carga?: string;
  descanso?: string;
  observacoes?: string;
  ordemNoDia: number;
  concluido?: boolean; // Usado pelo aluno ao realizar o treino
}

// --- NOVA INTERFACE: Para representação de objeto JS puro (sem propriedades de Subdocument)
// Usado ao construir novos documentos ou ao manipular dados de .toObject()
export interface IExercicioEmDiaDeTreinoPlain {
  _id?: Types.ObjectId; // Pode ser ObjectId ao construir (opcional se for novo)
  exercicioId: Types.ObjectId; // Espera ObjectId ao criar um novo subdocumento
  series?: string;
  repeticoes?: string;
  carga?: string;
  descanso?: string;
  observacoes?: string;
  ordemNoDia: number;
  concluido?: boolean;
}


// --- Subdocumento para um Dia de Treino ---
// Interface para o documento Mongoose completo (com propriedades de Subdocument)
export interface IDiaDeTreino extends Types.Subdocument {
    _id: Types.ObjectId; // CORREÇÃO: _id é obrigatório para subdocumentos Mongoose
    identificadorDia: string;
    nomeSubFicha?: string | null;
    ordemNaRotina: number;
    exerciciosDoDia?: Types.DocumentArray<IExercicioEmDiaDeTreino>; // Array de subdocumentos Mongoose
}

// Interface para o objeto populado e "lean" (convertido para JS puro) no CLIENTE
export interface IDiaDeTreinoPopuladoLean {
    _id: string; // ID do subdocumento DiaDeTreino no MongoDB (se já salvo), aqui como string
    identificadorDia: string;
    nomeSubFicha?: string | null;
    ordemNaRotina: number;
    exerciciosDoDia?: IExercicioEmDiaDeTreinoPopuladoLean[]; // Array de objetos JS puros
}

// --- NOVA INTERFACE: Para representação de objeto JS puro (sem propriedades de DocumentArray)
// Usado ao construir novos documentos ou ao manipular dados de .toObject()
export interface IDiaDeTreinoPlain {
    _id?: Types.ObjectId; // Pode ser ObjectId ao construir (opcional se for novo)
    identificadorDia: string;
    nomeSubFicha?: string | null;
    ordemNaRotina: number;
    exerciciosDoDia?: IExercicioEmDiaDeTreinoPlain[]; // Array de objetos JS puros
}


// --- Documento Principal da Rotina/Ficha ---
export interface ITreino extends Document {
  titulo: string;
  descricao?: string;
  tipo: 'modelo' | 'individual'; // 'modelo' para modelos de treino, 'individual' para fichas de aluno
  criadorId: Types.ObjectId; // ID do Personal Trainer que criou
  alunoId?: Types.ObjectId | null; // ID do aluno (se tipo for 'individual')
  
  tipoOrganizacaoRotina: TipoOrganizacaoRotina; // 'diasDaSemana', 'numerico', 'livre'
  diasDeTreino: Types.DocumentArray<IDiaDeTreino>; // Array de subdocumentos para os dias de treino

  // Campos específicos de modelo
  pastaId?: Types.ObjectId | null; // ID da pasta onde o modelo está
  statusModelo?: 'ativo' | 'rascunho' | 'arquivado' | null;
  ordemNaPasta?: number;

  // Campos específicos de individual
  dataValidade?: Date | null;
  totalSessoesRotinaPlanejadas?: number; // Total de sessões planejadas para a rotina
  sessoesRotinaConcluidas?: number; // Contador de sessões concluídas

  criadoEm: Date;
  atualizadoEm: Date;

  // Virtuais (não armazenados no DB, mas acessíveis via Mongoose)
  isConcluida?: boolean;
  progressoRotina?: string;
}

// Interface para a Rotina/Ficha como listada na TreinosPage e usada no cache do React Query.
// Também é a base para o que é passado para os modais de visualização e edição.
// Esta interface deve refletir o que é retornado pela API após população.
export interface RotinaListagemItem {
    _id: string;
    titulo: string;
    descricao?: string | null;
    tipo: "modelo" | "individual";
    // Detalhes do aluno e criador, podem vir populados da API
    alunoId?: { _id: string; nome: string; email?: string; } | string | null; 
    criadorId: { _id: string; nome: string; email?: string; } | string; 
    
    tipoOrganizacaoRotina: 'diasDaSemana' | 'numerico' | 'livre';
    diasDeTreino?: IDiaDeTreinoPopuladoLean[]; // Array de dias de treino detalhados

    // Campos específicos de modelo
    pastaId?: { _id: string; nome: string; } | string | null;
    statusModelo?: "ativo" | "rascunho" | "arquivado" | null;
    ordemNaPasta?: number;

    // Campos específicos de individual
    dataValidade?: string | Date | null; // API pode retornar string, mas Date é útil no form
    totalSessoesRotinaPlanejadas?: number;
    sessoesRotinaConcluidas?: number;

    criadoEm?: string | Date;
    atualizadoEm?: string | Date;

    isConcluida?: boolean;
    progressoRotina?: string;
}


// --- Definição dos Schemas ---

// Schema para Exercício dentro de um Dia de Treino
const ExercicioEmDiaDeTreinoSchema = new Schema<IExercicioEmDiaDeTreino>({
  exercicioId: { type: Schema.Types.ObjectId, ref: 'Exercicio', required: true },
  series: { type: String, trim: true },
  repeticoes: { type: String, trim: true },
  carga: { type: String, trim: true },
  descanso: { type: String, trim: true },
  observacoes: { type: String, trim: true },
  ordemNoDia: { type: Number, required: true },
  concluido: { type: Boolean, default: false },
}, { _id: true }); // Mongoose adiciona _id por padrão a subdocumentos, mas explicitamos.

// Schema para Dia de Treino
const DiaDeTreinoSchema = new Schema<IDiaDeTreino>({
  identificadorDia: { type: String, required: true, trim: true }, // Ex: "Dia A", "Treino 1", "Segunda-feira"
  nomeSubFicha: { type: String, trim: true, default: null }, // Ex: "Peito e Tríceps"
  ordemNaRotina: { type: Number, required: true },
  exerciciosDoDia: [ExercicioEmDiaDeTreinoSchema], // Array de subdocumentos de exercícios
}, { _id: true });

// Schema Principal para Rotina/Ficha de Treino
const TreinoSchema = new Schema<ITreino>({
  titulo: { type: String, required: true, trim: true },
  descricao: { type: String, trim: true },
  tipo: { type: String, required: true, enum: ['modelo', 'individual'] },
  criadorId: { type: Schema.Types.ObjectId, ref: 'PersonalTrainer', required: true },
  alunoId: { 
    type: Schema.Types.ObjectId, 
    ref: 'Aluno', 
    default: null, 
    sparse: true, // Permite que o índice seja criado mesmo com valores nulos
    index: true // Adiciona um índice para consultas eficientes por aluno
  },
  
  tipoOrganizacaoRotina: { type: String, required: true, enum: TIPOS_ORGANIZACAO_ROTINA },
  diasDeTreino: [DiaDeTreinoSchema], // Array de subdocumentos para os dias de treino

  // Campos específicos de modelo
  pastaId: { type: Schema.Types.ObjectId, ref: 'PastaTreino', default: null, sparse: true },
  statusModelo: { type: String, enum: ['ativo', 'rascunho', 'arquivado'], default: 'ativo' },
  ordemNaPasta: { type: Number },

  // Campos específicos de individual
  dataValidade: { type: Date, default: null },
  totalSessoesRotinaPlanejadas: { type: Number, default: 0 },
  sessoesRotinaConcluidas: { type: Number, default: 0 },

  criadoEm: { type: Date, default: Date.now },
  atualizadoEm: { type: Date, default: Date.now },
});

// Atualiza 'atualizadoEm' antes de cada save/update
TreinoSchema.pre('save', function (next) {
    this.atualizadoEm = new Date();
    next();
});

TreinoSchema.pre('findOneAndUpdate', function (next) {
    this.set({ atualizadoEm: new Date() });
    next();
});


// Virtuais
// Virtual para verificar se a rotina está concluída
TreinoSchema.virtual('isConcluida').get(function(this: ITreino) {
    if (this.tipo !== 'individual') return false; // Modelos não são "concluídos"

    // CORREÇÃO: Adicionar verificação para undefined/null antes de acessar propriedades
    const totalPlanejado = this.totalSessoesRotinaPlanejadas ?? 0;
    const sessoesConcluidas = this.sessoesRotinaConcluidas ?? 0;

    // Se não há sessões planejadas, considera concluída se houver pelo menos 1 sessão concluída
    if (totalPlanejado === 0 && sessoesConcluidas > 0) {
        return true;
    }
    // Se há sessões planejadas, considera concluída se as sessões concluídas atingirem o total planejado
    if (totalPlanejado > 0 && sessoesConcluidas >= totalPlanejado) {
        return true;
    }
    return false;
});

// Virtual para progresso da rotina (ex: "3/6 sessões")
TreinoSchema.virtual('progressoRotina').get(function(this: ITreino) {
    if (this.tipo !== 'individual') return null;

    // CORREÇÃO: Adicionar verificação para undefined/null antes de acessar propriedades
    const totalPlanejado = this.totalSessoesRotinaPlanejadas ?? 0;
    const sessoesConcluidas = this.sessoesRotinaConcluidas ?? 0;

    if (totalPlanejado > 0) {
        return `${sessoesConcluidas}/${totalPlanejado}`;
    }
    if (totalPlanejado === 0) { // Se planejou 0 sessões, considera 100%
        return `0/0`; // Ou poderia ser 100% ou N/A dependendo da sua lógica de UI
    }
    return null; // Se não houver totalSessoesRotinaPlanejadas definido (null ou undefined)
});

// Índices
TreinoSchema.index({ criadorId: 1, tipo: 1 });
// O índice para alunoId já foi definido no schema como `index: true, sparse: true`
TreinoSchema.index({ criadorId: 1, tipo: 1, pastaId: 1 }, { sparse: true }); 
TreinoSchema.index({ criadorId: 1, tipo: 1, statusModelo: 1 }, { partialFilterExpression: { tipo: 'modelo' } });


export default mongoose.model<ITreino>("Treino", TreinoSchema);
