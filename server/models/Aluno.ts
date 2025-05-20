// server/models/Aluno.ts
import mongoose, { Schema, Document } from "mongoose"; // Document importado
import bcrypt from 'bcrypt'; // Importar bcrypt para hashear senhas

console.log("--- [server/models/Aluno.ts] Modelo Carregado (com funcionalidade de senha) ---");

// Interface para tipar o documento Aluno, incluindo campos de senha
export interface IAluno extends Document {
  nome: string;
  email: string;
  passwordHash?: string; // Adicionado para armazenar a senha hasheada
  phone?: string;
  birthDate: string; 
  gender: string;
  goal: string;
  weight: number;
  height: number;
  startDate: string; 
  status: 'active' | 'inactive';
  notes?: string;
  trainerId: mongoose.Types.ObjectId; // Mantido como ObjectId
  createdAt: Date;
  updatedAt: Date;
  // Método para comparar senhas
  comparePassword(candidatePassword: string): Promise<boolean>;
}

const alunoSchema = new Schema<IAluno>( // Tipando o Schema com IAluno
  {
    nome: { type: String, required: [true, 'O nome completo é obrigatório'], trim: true },
    email: {
        type: String,
        required: [true, 'O email é obrigatório'],
        unique: true, // Garante que o email seja único
        lowercase: true,
        trim: true,
        // match: [/^\S+@\S+\.\S+$/, 'Por favor, use um email válido'] // Descomente se quiser validação de formato de email mais estrita
    },
    passwordHash: { // Novo campo para a senha hasheada
        type: String,
        required: [true, 'A senha é obrigatória'], // Senha será obrigatória para alunos
        select: false, // Não retorna o hash da senha por padrão nas queries
    },
    phone: { type: String, trim: true },
    birthDate: { type: String, required: [true, 'A data de nascimento é obrigatória'] },
    gender: { type: String, required: [true, 'O gênero é obrigatório'] },
    goal: { type: String, required: [true, 'O objetivo é obrigatório'] },
    weight: { type: Number, required: [true, 'O peso é obrigatório'] },
    height: { type: Number, required: [true, 'A altura é obrigatória'] },
    startDate: { type: String, required: [true, 'A data de início é obrigatória'] },
    status: { type: String, required: [true, 'O status é obrigatório'], enum: ['active', 'inactive'], default: 'active' },
    notes: { type: String },
    trainerId: {
      type: Schema.Types.ObjectId,
      ref: 'PersonalTrainer',
      required: [true, 'O ID do treinador é obrigatório']
    },
  },
  {
    timestamps: true
  }
);

// Hook pre-save para hashear a senha ANTES de salvar, se ela foi modificada
alunoSchema.pre<IAluno>('save', async function (next) {
    // 'this' se refere ao documento Aluno que está sendo salvo
    if (!this.isModified('passwordHash')) { // Só faz o hash se a senha (passwordHash) foi modificada ou é nova
        return next();
    }
    try {
        const saltRounds = 10; // Custo do salt (padrão é 10)
        if (this.passwordHash) { // Garante que passwordHash não é undefined
            this.passwordHash = await bcrypt.hash(this.passwordHash, saltRounds);
        }
        next();
    } catch (error: any) { // Especificar 'any' ou um tipo de erro mais específico
        next(error); // Passa o erro para o próximo middleware/error handler
    }
});

// Método para comparar a senha candidata com o hash armazenado no documento
alunoSchema.methods.comparePassword = async function (candidatePassword: string): Promise<boolean> {
    if (!this.passwordHash) { // Se por algum motivo o hash não estiver presente
        return false;
    }
    return bcrypt.compare(candidatePassword, this.passwordHash);
};


// Index para garantir unicidade do email, se não for feito automaticamente pelo 'unique: true' em alguns drivers/versões
// alunoSchema.index({ email: 1 }, { unique: true }); // Descomente se necessário

export default mongoose.model<IAluno>("Aluno", alunoSchema);
