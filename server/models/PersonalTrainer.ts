// server/models/PersonalTrainer.ts
import mongoose, { Schema, Document } from 'mongoose';
import bcrypt from 'bcryptjs';
import crypto from 'crypto'; // Importar crypto para gerar o token

// Interface atualizada para incluir todos os campos planejados
export interface IPersonalTrainer extends Document {
    nome: string;
    email: string;
    passwordHash: string; // Mantido como passwordHash conforme seu arquivo
    role: 'Personal Trainer' | 'Admin';
    tokenCadastroAluno?: string; // Token para o link de cadastro de alunos
    
    // Campos de Assinatura
    planoId?: string; // Ex: 'mensal_5_alunos', 'anual_ilimitado'
    statusAssinatura?: 'ativa' | 'inativa' | 'pendente_pagamento' | 'cancelada' | 'trial' | 'sem_assinatura';
    dataInicioAssinatura?: Date;
    dataFimAssinatura?: Date;
    idAssinaturaGateway?: string; // ID da assinatura no provedor de pagamento
    limiteAlunos?: number; // Limite de alunos ativos com base no plano

    createdAt: Date;
    updatedAt: Date;
    comparePassword(password: string): Promise<boolean>;
}

const personalTrainerSchema: Schema<IPersonalTrainer> = new Schema(
    {
        nome: {
            type: String,
            required: [true, 'O nome é obrigatório.'],
            trim: true,
        },
        email: {
            type: String,
            required: [true, 'O email é obrigatório.'],
            unique: true,
            lowercase: true,
            trim: true,
            match: [/^\w+([\.-]?\w+)*@\w+([\.-]?\w+)*(\.\w{2,3})+$/, 'Por favor, forneça um email válido.'],
        },
        passwordHash: { // Nome do campo da senha hasheada
            type: String,
            required: [true, 'A senha é obrigatória.'],
            select: false, // Não retorna o hash da senha por padrão nas queries
        },
        role: {
            type: String,
            required: true,
            enum: ['Personal Trainer', 'Admin'],
            default: 'Personal Trainer'
        },
        tokenCadastroAluno: { // Novo campo adicionado
            type: String,
            unique: true,
            sparse: true, // Permite múltiplos documentos com valor null/undefined, mas único se presente
                        // Um índice sparse só contém entradas para documentos que têm o campo indexado.
                        // O índice omite todos os documentos que não têm o campo indexado.
        },
        // Campos de Assinatura
        planoId: { type: String },
        statusAssinatura: {
            type: String,
            enum: ['ativa', 'inativa', 'pendente_pagamento', 'cancelada', 'trial', 'sem_assinatura'],
            default: 'sem_assinatura', // Personal começa sem assinatura por padrão
        },
        dataInicioAssinatura: { type: Date },
        dataFimAssinatura: { type: Date },
        idAssinaturaGateway: { type: String },
        limiteAlunos: { type: Number, default: 0 }, // Exemplo: 0 para sem plano, ou o limite do plano
    },
    {
        timestamps: true, // Adiciona createdAt e updatedAt automaticamente
    }
);

// Middleware para fazer o hash da senha ANTES de salvar, se ela foi modificada
personalTrainerSchema.pre<IPersonalTrainer>('save', async function (next) {
    // Só faz o hash da senha se ela foi modificada (ou é nova)
    if (!this.isModified('passwordHash')) {
        return next();
    }
    try {
        const saltRounds = 10; // Custo do salt
        this.passwordHash = await bcrypt.hash(this.passwordHash, saltRounds);
        next();
    } catch (error: any) {
        next(error); // Passa o erro para o próximo middleware/error handler
    }
});

// Middleware para gerar o tokenCadastroAluno ANTES de salvar um novo personal
personalTrainerSchema.pre<IPersonalTrainer>('save', function (next) {
  // Gera o token apenas se for um novo documento e o token ainda não existir
  if (this.isNew && !this.tokenCadastroAluno) {
    this.tokenCadastroAluno = crypto.randomBytes(20).toString('hex');
  }
  next();
});


// Método para comparar a senha candidata com o hash armazenado
personalTrainerSchema.methods.comparePassword = async function (candidatePassword: string): Promise<boolean> {
    // 'this.passwordHash' refere-se ao passwordHash do documento específico
    // É importante que o campo 'passwordHash' não esteja com select: false aqui,
    // ou que você o selecione explicitamente na query antes de chamar comparePassword.
    // No entanto, como o método é chamado em uma instância do documento onde passwordHash pode
    // ter sido selecionado ou já estar presente (ex: após um findOne().select('+passwordHash')),
    // geralmente funciona. Se der problema, garanta que o hash está carregado.
    if (!this.passwordHash) return false; // Caso o hash não esteja presente por algum motivo
    return bcrypt.compare(candidatePassword, this.passwordHash);
};


const PersonalTrainer = mongoose.model<IPersonalTrainer>('PersonalTrainer', personalTrainerSchema);

export default PersonalTrainer;
