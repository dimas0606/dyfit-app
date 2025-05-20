// server/src/routes/publicContatosRoutes.ts
import express, { Request, Response, NextFunction } from 'express';
import mongoose from 'mongoose';
import Contato, { IContato } from '../../models/Contato';
import PersonalTrainer, { IPersonalTrainer } from '../../models/PersonalTrainer'; // Importe seu modelo PersonalTrainer

const router = express.Router();

console.log("--- [server/src/routes/publicContatosRoutes.ts] Ficheiro carregado ---");

// Rota: POST /api/public/contatos/registrar/:tokenPersonal
// Usada pela página pública de inscrição do aluno via link do personal
router.post('/registrar/:tokenPersonal', async (req: Request, res: Response, next: NextFunction) => {
  const { tokenPersonal } = req.params;
  const { nomeCompleto, email, telefone, dataNascimento, genero } = req.body;

  console.log(`[POST /registrar/${tokenPersonal}] Tentativa de registrar novo contato. Email: ${email}`);

  if (!tokenPersonal) {
    return res.status(400).json({ mensagem: "Token do personal não fornecido." });
  }

  // Validações básicas (podem ser aprimoradas com Zod ou similar no backend também)
  if (!nomeCompleto || typeof nomeCompleto !== 'string' || nomeCompleto.trim().length < 3) {
    return res.status(400).json({ mensagem: "Nome completo é obrigatório e deve ter pelo menos 3 caracteres." });
  }
  if (!email || typeof email !== 'string' || !/.+\@.+\..+/.test(email)) {
    return res.status(400).json({ mensagem: "E-mail inválido." });
  }

  try {
    // 1. Encontrar o Personal Trainer pelo tokenCadastroAluno
    const personal = await PersonalTrainer.findOne({ tokenCadastroAluno: tokenPersonal }).select('nome _id'); // Seleciona apenas nome e _id
    if (!personal) {
      console.warn(`[POST /registrar/${tokenPersonal}] Personal não encontrado com este token.`);
      return res.status(404).json({ mensagem: "Link de cadastro inválido ou personal não encontrado." });
    }

    // 2. (Opcional, mas recomendado) Verificar se já existe um contato 'novo' com este email para este personal
    // O middleware pre-save no modelo Contato já pode estar fazendo isso.
    // Se não, você pode adicionar a lógica aqui:
    const contatoExistente = await Contato.findOne({
        email: email.toLowerCase().trim(),
        personalId: personal._id,
        status: 'novo'
    });

    if (contatoExistente) {
        console.log(`[POST /registrar/${tokenPersonal}] Contato com email ${email} já existe para o personal ${personal._id} com status 'novo'.`);
        // Você pode decidir atualizar o contato existente ou apenas informar que já foi registrado.
        // Por simplicidade, vamos apenas informar.
        return res.status(200).json({ mensagem: `Você já demonstrou interesse. O personal ${personal.nome} entrará em contato.` });
    }

    // 3. Criar o novo Contato
    const novoContato = new Contato({
      nomeCompleto: nomeCompleto.trim(),
      email: email.toLowerCase().trim(),
      telefone: telefone?.trim(),
      dataNascimento: dataNascimento ? new Date(dataNascimento) : undefined,
      genero,
      personalId: personal._id,
      status: 'novo', // Status inicial
      origemToken: tokenPersonal,
    });

    await novoContato.save(); // O middleware pre-save do Contato será acionado aqui

    console.log(`[POST /registrar/${tokenPersonal}] Novo contato ID: ${novoContato._id} registrado para Personal ID: ${personal._id}.`);

    // 4. (Próximo Passo - Fase 2.1) Enviar e-mail de notificação para o personal
    // Ex: await enviarEmailNotificacaoNovoContato(personal.email, novoContato.nomeCompleto, novoContato.email);

    // 5. (Próximo Passo - Fase 2.1) Enviar e-mail de confirmação para o interessado (aluno)
    // Ex: await enviarEmailConfirmacaoInteresse(novoContato.email, novoContato.nomeCompleto, personal.nome);

    res.status(201).json({ mensagem: "Interesse registrado com sucesso! Em breve, seu personal entrará em contato." });

  } catch (error: any) {
    console.error(`[POST /registrar/${tokenPersonal}] Erro ao registrar contato:`, error);
    if (error.status === 409) { // Erro customizado do middleware pre-save
        return res.status(409).json({ mensagem: error.message });
    }
    if (error.name === 'ValidationError') {
      const mensagens = Object.values(error.errors).map((el: any) => el.message);
      return res.status(400).json({ mensagem: mensagens.join(', ') });
    }
    next(error); // Passa para o error handler global
  }
});

// Não se esqueça de adicionar este router ao seu arquivo principal de rotas do servidor (ex: server/routes.ts)
// Exemplo:
// import publicContatosRoutes from './src/routes/publicContatosRoutes';
// router.use('/api/public/contatos', publicContatosRoutes);

export default router;
