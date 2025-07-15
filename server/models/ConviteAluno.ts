// server/models/ConviteAluno.ts
import mongoose, { Schema, Document } from 'mongoose';
import crypto from 'crypto';

export interface IConviteAluno extends Document {
  token: string;
  emailConvidado: string;
  status: 'pendente' | 'utilizado' | 'expirado';
  dataExpiracao: Date;
  criadoPor: mongoose.Types.ObjectId; // ID do PersonalTrainer que criou o convite
  usadoPor?: mongoose.Types.ObjectId; // ID do Aluno que utilizou o convite
}

const ConviteAlunoSchema: Schema<IConviteAluno> = new Schema(
  {
    token: {
      type: String,
      unique: true,
      required: true,
      default: () => crypto.randomBytes(20).toString('hex'),
    },
    emailConvidado: {
      type: String,
      required: true,
      lowercase: true,
      trim: true,
    },
    status: {
      type: String,
      required: true,
      enum: ['pendente', 'utilizado', 'expirado'],
      default: 'pendente',
    },
    dataExpiracao: {
      type: Date,
      required: true,
      // Expira em 7 dias por padrão
      default: () => new Date(Date.now() + 7 * 24 * 60 * 60 * 1000),
    },
    criadoPor: {
      type: Schema.Types.ObjectId,
      ref: 'PersonalTrainer',
      required: true,
    },
    usadoPor: {
      type: Schema.Types.ObjectId,
      ref: 'Aluno',
    },
  },
  {
    timestamps: true,
  }
);

const ConviteAluno = mongoose.model<IConviteAluno>('ConviteAluno', ConviteAlunoSchema);

export default ConviteAluno;