// server/models/ConvitePersonal.ts
import mongoose, { Schema, Document } from 'mongoose';
import crypto from 'crypto';

export interface IConvitePersonal extends Document {
  token: string;
  emailConvidado?: string; // Email para o qual o convite foi especificamente enviado (opcional)
  roleConvidado: 'Personal Trainer' | 'Admin'; // Role a ser atribuída ao se registrar
  status: 'pendente' | 'utilizado' | 'expirado';
  dataExpiracao?: Date;
  criadoPor: mongoose.Types.ObjectId; // ID do Admin que criou o convite
  usadoPor?: mongoose.Types.ObjectId; // ID do PersonalTrainer que utilizou o convite
  dataUtilizacao?: Date;
  createdAt: Date;
  updatedAt: Date;
}

const ConvitePersonalSchema: Schema<IConvitePersonal> = new Schema(
  {
    token: {
      type: String,
      unique: true,
      required: true,
    },
    emailConvidado: {
      type: String,
      lowercase: true,
      trim: true,
      // Não é obrigatório, convite pode ser genérico
    },
    roleConvidado: {
      type: String,
      required: true,
      enum: ['Personal Trainer', 'Admin'],
      default: 'Personal Trainer',
    },
    status: {
      type: String,
      required: true,
      enum: ['pendente', 'utilizado', 'expirado'],
      default: 'pendente',
    },
    dataExpiracao: {
      type: Date,
      // Pode ser definido para expirar, por exemplo, em 7 dias
    },
    criadoPor: {
      type: Schema.Types.ObjectId,
      ref: 'PersonalTrainer', // Referencia o modelo de quem pode criar convites (Admin)
      required: true,
    },
    usadoPor: {
      type: Schema.Types.ObjectId,
      ref: 'PersonalTrainer', // Referencia o modelo do usuário que se registrou com este convite
    },
    dataUtilizacao: {
      type: Date,
    },
  },
  {
    timestamps: true,
  }
);

// Hook pre-save para gerar o token automaticamente se não fornecido
// (embora geralmente o token seja gerado na lógica da rota e passado para o modelo)
ConvitePersonalSchema.pre<IConvitePersonal>('validate', function (next) {
  if (!this.token) {
    this.token = crypto.randomBytes(20).toString('hex');
  }
  // Se não houver data de expiração, define para 7 dias a partir de agora, por exemplo
  if (!this.dataExpiracao) {
    const umaSemanaEmMs = 7 * 24 * 60 * 60 * 1000;
    this.dataExpiracao = new Date(Date.now() + umaSemanaEmMs);
  }
  next();
});

const ConvitePersonal = mongoose.model<IConvitePersonal>('ConvitePersonal', ConvitePersonalSchema);

export default ConvitePersonal;
