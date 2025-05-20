// server/src/routes/convitePublicRoutes.ts
import express, { Request, Response, NextFunction } from 'express';
import mongoose from 'mongoose';
import PersonalTrainer from '../../models/PersonalTrainer'; // Presumindo que IPersonalTrainer está aqui ou é importado por ele
import ConvitePersonal, { IConvitePersonal } from '../../models/ConvitePersonal';

const router = express.Router();

console.log("--- [server/src/routes/convitePublicRoutes.ts] Ficheiro carregado ---");

// Rota: GET /api/convites/validar/:tokenDeConvite
// Usada pelo frontend quando o personal acessa o link de convite para verificar a validade do token.
router.get('/validar/:tokenDeConvite', async (req: Request, res: Response, next: NextFunction) => {
  const { tokenDeConvite } = req.params;
  console.log(`[GET /api/convites/validar/${tokenDeConvite}] Tentativa de validar token.`);

  if (!tokenDeConvite) {
    return res.status(400).json({ mensagem: "Token de convite não fornecido." });
  }

  try {
    const convite = await ConvitePersonal.findOne({ token: tokenDeConvite });

    if (!convite) {
      console.warn(`[GET /api/convites/validar/${tokenDeConvite}] Token não encontrado.`);
      return res.status(404).json({ mensagem: "Convite inválido ou não encontrado." });
    }

    if (convite.status === 'utilizado') {
      console.warn(`[GET /api/convites/validar/${tokenDeConvite}] Token já utilizado.`);
      return res.status(400).json({ mensagem: "Este convite já foi utilizado." });
    }

    if (convite.status === 'expirado' || (convite.dataExpiracao && convite.dataExpiracao < new Date())) {
      if (convite.status === 'pendente') {
        convite.status = 'expirado';
        await convite.save();
      }
      console.warn(`[GET /api/convites/validar/${tokenDeConvite}] Token expirado.`);
      return res.status(400).json({ mensagem: "Este convite expirou." });
    }
    
    console.log(`[GET /api/convites/validar/${tokenDeConvite}] Token válido. Email do convidado (se houver): ${convite.emailConvidado}`);
    res.status(200).json({
      mensagem: "Convite válido.",
      emailConvidado: convite.emailConvidado,
      roleConvidado: convite.roleConvidado,
    });

  } catch (error: any) {
    console.error(`[GET /api/convites/validar/${tokenDeConvite}] Erro ao validar token:`, error);
    next(error);
  }
});

// Rota: POST /api/convites/registrar/:tokenDeConvite
// Usada pelo formulário de cadastro do personal quando ele submete os dados.
router.post('/registrar/:tokenDeConvite', async (req: Request, res: Response, next: NextFunction) => {
  const { tokenDeConvite } = req.params;
  const { nome, email, password } = req.body;

  console.log(`[POST /api/convites/registrar/${tokenDeConvite}] Tentativa de registrar personal. Email: ${email}`);

  if (!tokenDeConvite) {
    return res.status(400).json({ mensagem: "Token de convite não fornecido." });
  }
  if (!nome || !email || !password) {
    return res.status(400).json({ mensagem: "Nome, email e senha são obrigatórios." });
  }

  const session = await mongoose.startSession();
  try {
    session.startTransaction();
    console.log(`[POST /api/convites/registrar/${tokenDeConvite}] Transação iniciada.`);

    const convite = await ConvitePersonal.findOne({ token: tokenDeConvite }).session(session);

    if (!convite) {
      await session.abortTransaction();
      console.warn(`[POST /api/convites/registrar/${tokenDeConvite}] Token não encontrado.`);
      return res.status(404).json({ mensagem: "Convite inválido ou não encontrado." });
    }

    if (convite.status === 'utilizado') {
      await session.abortTransaction();
      console.warn(`[POST /api/convites/registrar/${tokenDeConvite}] Token já utilizado.`);
      return res.status(400).json({ mensagem: "Este convite já foi utilizado." });
    }

    if (convite.status === 'expirado' || (convite.dataExpiracao && convite.dataExpiracao < new Date())) {
      if (convite.status === 'pendente') {
        convite.status = 'expirado';
        await convite.save({ session });
      }
      await session.abortTransaction();
      console.warn(`[POST /api/convites/registrar/${tokenDeConvite}] Token expirado.`);
      return res.status(400).json({ mensagem: "Este convite expirou." });
    }

    if (convite.emailConvidado && convite.emailConvidado.toLowerCase() !== email.toLowerCase()) {
      await session.abortTransaction();
      console.warn(`[POST /api/convites/registrar/${tokenDeConvite}] Email fornecido (${email}) não corresponde ao email do convite (${convite.emailConvidado}).`);
      return res.status(400).json({ mensagem: "O email fornecido não corresponde ao email do convite." });
    }

    const existingPersonal = await PersonalTrainer.findOne({ email: email.toLowerCase() }).session(session);
    if (existingPersonal) {
      await session.abortTransaction();
      console.warn(`[POST /api/convites/registrar/${tokenDeConvite}] Email ${email} já cadastrado.`);
      return res.status(409).json({ mensagem: `Já existe um usuário com o email: ${email}` });
    }

    const novoPersonal = new PersonalTrainer({
      nome,
      email: email.toLowerCase(),
      passwordHash: password, 
      role: convite.roleConvidado,
    });
    await novoPersonal.save({ session });
    console.log(`[POST /api/convites/registrar/${tokenDeConvite}] Novo personal ID: ${novoPersonal._id} (${novoPersonal.email}) criado.`);

    convite.status = 'utilizado';
    // CORREÇÃO APLICADA AQUI: Coerção de tipo para mongoose.Types.ObjectId
    convite.usadoPor = novoPersonal._id as mongoose.Types.ObjectId;
    convite.dataUtilizacao = new Date();
    await convite.save({ session });
    console.log(`[POST /api/convites/registrar/${tokenDeConvite}] Convite (ID: ${convite._id}) marcado como utilizado pelo personal ID: ${novoPersonal._id}.`);

    await session.commitTransaction();
    console.log(`[POST /api/convites/registrar/${tokenDeConvite}] Transação commitada. Personal registrado com sucesso.`);

    res.status(201).json({ mensagem: "Personal registrado com sucesso! Você já pode fazer login." });

  } catch (error: any) {
    if (session.inTransaction()) {
      await session.abortTransaction();
      console.error(`[POST /api/convites/registrar/${tokenDeConvite}] Transação abortada devido a erro.`);
    }
    console.error(`[POST /api/convites/registrar/${tokenDeConvite}] Erro ao registrar personal:`, error);
    if (error.name === 'ValidationError') {
      const mensagens = Object.values(error.errors).map((el: any) => el.message);
      return res.status(400).json({ mensagem: mensagens.join(', ') });
    }
    next(error);
  } finally {
    session.endSession();
    console.log(`[POST /api/convites/registrar/${tokenDeConvite}] Sessão finalizada.`);
  }
});

export default router;
