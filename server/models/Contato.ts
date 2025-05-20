// server/models/Contato.ts
import mongoose, { Document, Schema, Types } from 'mongoose';

// Interface para tipar os documentos de Contato
export interface IContato extends Document {
  nomeCompleto: string;
  email: string;
  telefone?: string;
  dataNascimento?: Date;
  genero?: string;
  personalId: Types.ObjectId; // Referência ao PersonalTrainer
  status: 'novo' | 'convertido_aluno' | 'arquivado' | 'contatado'; // Status do lead/contato
  anotacoesPersonal?: string; // Anotações que o personal pode fazer
  dataCadastro: Date;
  origemToken?: string; // Token do personal que originou este contato
  // Adicione quaisquer outros campos que você achar relevantes
}

const ContatoSchema: Schema<IContato> = new Schema({
  nomeCompleto: {
    type: String,
    required: [true, 'O nome completo é obrigatório.'],
    trim: true,
    minlength: [3, 'O nome completo deve ter pelo menos 3 caracteres.'],
  },
  email: {
    type: String,
    required: [true, 'O e-mail é obrigatório.'],
    trim: true,
    lowercase: true,
    // Validação de formato de e-mail simples (pode ser aprimorada)
    match: [/.+\@.+\..+/, 'Por favor, insira um e-mail válido.'],
    // Considerar adicionar um índice único composto com personalId se um email só puder se registrar uma vez por personal
    // index: { unique: true, partialFilterExpression: { status: 'novo' } } // Exemplo, ajuste conforme necessário
  },
  telefone: {
    type: String,
    trim: true,
    // Validação opcional de formato de telefone
  },
  dataNascimento: {
    type: Date,
  },
  genero: {
    type: String,
    enum: ['masculino', 'feminino', 'outro', 'prefiro_nao_dizer'], // Exemplo de opções
  },
  personalId: {
    type: Schema.Types.ObjectId,
    ref: 'PersonalTrainer', // Certifique-se que 'PersonalTrainer' é o nome do seu modelo de personal
    required: true,
    index: true,
  },
  status: {
    type: String,
    enum: ['novo', 'convertido_aluno', 'arquivado', 'contatado'],
    default: 'novo',
    index: true,
  },
  anotacoesPersonal: {
    type: String,
    trim: true,
  },
  dataCadastro: {
    type: Date,
    default: Date.now,
  },
  origemToken: { // Para rastrear qual link de personal gerou este contato
    type: String,
  }
  // Você pode adicionar timestamps automáticos do Mongoose se preferir
  // }, { timestamps: true });
});

// Middleware para evitar que um mesmo email (em status 'novo') seja cadastrado para o mesmo personal.
// Esta é uma abordagem. Outra seria um índice único composto como comentado acima.
ContatoSchema.pre<IContato>('save', async function (next) {
  if (this.isNew && this.status === 'novo') {
    const existingContact = await mongoose.model('Contato').findOne({
      email: this.email,
      personalId: this.personalId,
      status: 'novo' // Verifica apenas contatos que ainda não foram convertidos ou arquivados
    });
    if (existingContact) {
      const err = new Error(`Este e-mail já foi registrado como um novo contato para este personal.`) as any;
      err.status = 409; // Conflict
      return next(err);
    }
  }
  next();
});


export default mongoose.model<IContato>('Contato', ContatoSchema);
