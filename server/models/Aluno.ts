// server/models/Aluno.ts
import mongoose, { Schema, Document } from "mongoose";
import bcrypt from 'bcryptjs';

export interface IAluno extends Document {
  nome: string;
  email: string;
  passwordHash?: string;
  phone?: string;
  // <<< CORREÇÃO: Campos agora são opcionais >>>
  birthDate?: string; 
  gender?: string;
  goal?: string;
  weight?: number;
  height?: number;
  startDate?: string; 
  status: 'active' | 'inactive';
  notes?: string;
  trainerId: mongoose.Types.ObjectId;
  createdAt: Date;
  updatedAt: Date;
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
    // <<< CORREÇÃO: Removida a obrigatoriedade (required: true) dos campos abaixo >>>
    birthDate: { type: String },
    gender: { type: String },
    goal: { type: String },
    weight: { type: Number },
    height: { type: Number },
    startDate: { type: String },
    status: { type: String, required: true, enum: ['active', 'inactive'], default: 'active' },
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

alunoSchema.methods.comparePassword = async function (candidatePassword: string): Promise<boolean> {
    if (!this.passwordHash) {
        return false;
    }
    return bcrypt.compare(candidatePassword, this.passwordHash);
};

export default mongoose.model<IAluno>("Aluno", alunoSchema);