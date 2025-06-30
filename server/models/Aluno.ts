// server/models/Aluno.ts
import mongoose, { Schema, Document } from "mongoose";
import bcrypt from 'bcryptjs'; // <<< ALTERAÇÃO AQUI: de 'bcrypt' para 'bcryptjs'

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
  trainerId: mongoose.Types.ObjectId;
  createdAt: Date;
  updatedAt: Date;
  // Método para comparar senhas
  comparePassword(candidatePassword: string): Promise<boolean>;
}

const alunoSchema = new Schema<IAluno>(
  {
    nome: { type: String, required: [true, 'O nome completo é obrigatório'], trim: true },
    email: {
        type: String,
        required: [true, 'O email é obrigatório'],
        unique: true, 
        lowercase: true,
        trim: true,
    },
    passwordHash: {
        type: String,
        required: [true, 'A senha é obrigatória'],
        select: false,
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
    if (!this.isModified('passwordHash')) { 
        return next();
    }
    try {
        const saltRounds = 10;
        if (this.passwordHash) {
            this.passwordHash = await bcrypt.hash(this.passwordHash, saltRounds);
        }
        next();
    } catch (error: any) { 
        next(error);
    }
});

// Método para comparar a senha candidata com o hash armazenado no documento
alunoSchema.methods.comparePassword = async function (candidatePassword: string): Promise<boolean> {
    if (!this.passwordHash) {
        return false;
    }
    return bcrypt.compare(candidatePassword, this.passwordHash);
};

export default mongoose.model<IAluno>("Aluno", alunoSchema);