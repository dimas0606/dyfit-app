// server/src/routes/adminRoutes.ts
import express, { Response, NextFunction, Request } from 'express';
import mongoose from 'mongoose';
import crypto from 'crypto'; // Para gerar tokens de convite
import PersonalTrainer from '../../models/PersonalTrainer';
import ConvitePersonal, { IConvitePersonal } from '../../models/ConvitePersonal'; // Importar o modelo de Convite

const router = express.Router();

console.log("--- [server/src/routes/adminRoutes.ts] Ficheiro carregado (com gestão de personais e convites) ---");

// --- ROTAS DE GESTÃO DE PERSONAL TRAINERS ---

// Rota: POST /api/admin/personal-trainers - Admin cria um novo Personal Trainer.
router.post('/personal-trainers', async (req: Request, res: Response, next: NextFunction) => {
  const { nome, email, password, role: personalRoleInput } = req.body;
  // req.user virá da definição global em express.d.ts
  console.log(`[POST /api/admin/personal-trainers] Admin (ID: ${req.user?.id}) tentando criar personal. Email: ${email}`);

  if (!nome || !email || !password) {
    return res.status(400).json({ mensagem: "Nome, email e senha são obrigatórios para criar um personal." });
  }

  const roleFinal = (personalRoleInput && ['Personal Trainer', 'Admin'].includes(personalRoleInput))
                    ? personalRoleInput
                    : 'Personal Trainer';

  try {
    const existingPersonal = await PersonalTrainer.findOne({ email: email.toLowerCase() });
    if (existingPersonal) {
      return res.status(409).json({ mensagem: `Já existe um usuário com o email: ${email}` });
    }

    const newPersonal = new PersonalTrainer({
      nome,
      email: email.toLowerCase(),
      passwordHash: password,
      role: roleFinal,
    });

    await newPersonal.save();

    const personalToReturn = {
      _id: newPersonal._id,
      nome: newPersonal.nome,
      email: newPersonal.email,
      role: newPersonal.role,
      tokenCadastroAluno: newPersonal.tokenCadastroAluno,
      createdAt: newPersonal.createdAt,
      updatedAt: newPersonal.updatedAt,
      statusAssinatura: newPersonal.statusAssinatura,
      limiteAlunos: newPersonal.limiteAlunos,
      planoId: newPersonal.planoId,
      dataInicioAssinatura: newPersonal.dataInicioAssinatura,
      dataFimAssinatura: newPersonal.dataFimAssinatura
    };

    console.log(`[POST /api/admin/personal-trainers] Personal ID: ${newPersonal._id} (${newPersonal.email}) criado com sucesso pelo Admin ID: ${req.user?.id}.`);
    res.status(201).json(personalToReturn);

  } catch (error: any) {
    console.error(`[POST /api/admin/personal-trainers] Erro ao criar personal:`, error);
    if (error.name === 'ValidationError') {
      const mensagens = Object.values(error.errors).map((el: any) => el.message);
      return res.status(400).json({ mensagem: mensagens.join(', ') });
    }
    next(error);
  }
});

// Rota: GET /api/admin/personal-trainers - Listar todos os Personal Trainers
router.get('/personal-trainers', async (req: Request, res: Response, next: NextFunction) => {
  console.log(`[GET /api/admin/personal-trainers] Admin (ID: ${req.user?.id}) listando todos os personal trainers.`);
  try {
    const personais = await PersonalTrainer.find()
      .select('-passwordHash')
      .sort({ createdAt: -1 });
    res.status(200).json(personais);
  } catch (error: any) {
    console.error(`[GET /api/admin/personal-trainers] Erro ao listar personais:`, error);
    next(error);
  }
});

// Rota: GET /api/admin/personal-trainers/:id - Obter um Personal Trainer específico por ID
router.get('/personal-trainers/:id', async (req: Request, res: Response, next: NextFunction) => {
  const { id: personalId } = req.params;
  const adminId = req.user?.id;
  console.log(`[GET /api/admin/personal-trainers/${personalId}] Admin (ID: ${adminId}) tentando obter personal.`);

  if (!mongoose.isValidObjectId(personalId)) {
    return res.status(400).json({ mensagem: "ID do personal inválido." });
  }

  try {
    const personal = await PersonalTrainer.findById(personalId).select('-passwordHash');
    if (!personal) {
      return res.status(404).json({ mensagem: "Personal trainer não encontrado." });
    }
    const personalToReturn = {
        _id: personal._id,
        nome: personal.nome,
        email: personal.email,
        role: personal.role,
        tokenCadastroAluno: personal.tokenCadastroAluno,
        createdAt: personal.createdAt,
        updatedAt: personal.updatedAt,
        statusAssinatura: personal.statusAssinatura,
        limiteAlunos: personal.limiteAlunos,
        planoId: personal.planoId,
        dataInicioAssinatura: personal.dataInicioAssinatura,
        dataFimAssinatura: personal.dataFimAssinatura
      };
    res.status(200).json(personalToReturn);
  } catch (error: any) {
    console.error(`[GET /api/admin/personal-trainers/${personalId}] Erro ao obter personal:`, error);
    next(error);
  }
});

// Rota: DELETE /api/admin/personal-trainers/:id - Excluir um Personal Trainer
router.delete('/personal-trainers/:id', async (req: Request, res: Response, next: NextFunction) => {
  const { id: personalIdToDelete } = req.params;
  const adminId = req.user?.id;
  console.log(`[DELETE /api/admin/personal-trainers/${personalIdToDelete}] Admin (ID: ${adminId}) tentando excluir personal.`);

  if (!mongoose.isValidObjectId(personalIdToDelete)) {
    return res.status(400).json({ mensagem: "ID do personal inválido." });
  }
  if (personalIdToDelete === adminId) {
     return res.status(403).json({ mensagem: "Administradores não podem se auto-excluir por esta rota." });
  }

  const session = await mongoose.startSession();
  try {
    session.startTransaction();
    const personal = await PersonalTrainer.findById(personalIdToDelete).session(session);
    if (!personal) {
      await session.abortTransaction();
      session.endSession();
      return res.status(404).json({ mensagem: "Personal trainer não encontrado." });
    }
    await PersonalTrainer.findByIdAndDelete(personalIdToDelete, { session });
    await session.commitTransaction();
    console.log(`[DELETE /api/admin/personal-trainers/${personalIdToDelete}] Personal ${personal.email} excluído com sucesso pelo Admin ID: ${adminId}.`);
    res.status(200).json({ mensagem: `Personal trainer ${personal.nome} (${personal.email}) excluído com sucesso.` });
  } catch (error: any) {
    if (session.inTransaction()) {
        await session.abortTransaction();
    }
    console.error(`[DELETE /api/admin/personal-trainers/${personalIdToDelete}] Erro ao excluir personal:`, error);
    next(error);
  } finally {
    session.endSession();
  }
});


// --- ROTAS DE GESTÃO DE CONVITES PARA PERSONAL TRAINERS ---

// Rota: POST /api/admin/convites/personal - Admin cria um novo convite para Personal Trainer
router.post('/convites/personal', async (req: Request, res: Response, next: NextFunction) => {
  const adminId = req.user?.id; // ID do admin logado
  const { emailConvidado, roleConvidado, diasParaExpirar } = req.body;

  console.log(`[POST /api/admin/convites/personal] Admin (ID: ${adminId}) criando convite. Email: ${emailConvidado}, Role: ${roleConvidado}`);

  if (!adminId) {
    return res.status(401).json({ mensagem: "Administrador não autenticado." });
  }

  try {
    const token = crypto.randomBytes(20).toString('hex');
    const dataExpiracao = new Date();
    const diasValidade = diasParaExpirar && !isNaN(parseInt(diasParaExpirar)) ? parseInt(diasParaExpirar) : 7;
    dataExpiracao.setDate(dataExpiracao.getDate() + diasValidade);

    const novoConvite = new ConvitePersonal({
      token,
      emailConvidado: emailConvidado?.toLowerCase().trim(),
      roleConvidado: roleConvidado || 'Personal Trainer',
      status: 'pendente',
      dataExpiracao,
      criadoPor: new mongoose.Types.ObjectId(adminId),
    });

    await novoConvite.save();

    // Construir o link de convite (exemplo)
    const frontendUrl = process.env.FRONTEND_URL || 'http://localhost:5173'; // Certifique-se de ter essa variável de ambiente
    const linkConvite = `${frontendUrl}/cadastrar-personal/convite/${token}`;

    console.log(`[POST /api/admin/convites/personal] Convite criado com token: ${token} para ${emailConvidado || 'qualquer email'}. Link: ${linkConvite}`);
    res.status(201).json({
      mensagem: "Convite criado com sucesso!",
      convite: novoConvite,
      linkConvite: linkConvite, // Envia o link para o frontend
    });

  } catch (error: any) {
    console.error(`[POST /api/admin/convites/personal] Erro ao criar convite:`, error);
    if (error.name === 'ValidationError') {
      const mensagens = Object.values(error.errors).map((el: any) => el.message);
      return res.status(400).json({ mensagem: mensagens.join(', ') });
    }
    next(error);
  }
});

// Rota: GET /api/admin/convites/personal - Listar todos os convites
router.get('/convites/personal', async (req: Request, res: Response, next: NextFunction) => {
  const adminId = req.user?.id;
  console.log(`[GET /api/admin/convites/personal] Admin (ID: ${adminId}) listando convites.`);

  if (!adminId) {
    return res.status(401).json({ mensagem: "Administrador não autenticado." });
  }

  try {
    const convites = await ConvitePersonal.find({ criadoPor: new mongoose.Types.ObjectId(adminId) })
      .populate('usadoPor', 'nome email') // Popula quem usou o convite
      .sort({ createdAt: -1 });

    res.status(200).json(convites);
  } catch (error: any) {
    console.error(`[GET /api/admin/convites/personal] Erro ao listar convites:`, error);
    next(error);
  }
});

// Rota: DELETE /api/admin/convites/personal/:conviteId - Revogar/Excluir um convite
router.delete('/convites/personal/:conviteId', async (req: Request, res: Response, next: NextFunction) => {
  const adminId = req.user?.id;
  const { conviteId } = req.params;

  console.log(`[DELETE /api/admin/convites/personal/${conviteId}] Admin (ID: ${adminId}) tentando revogar convite.`);

  if (!adminId) {
    return res.status(401).json({ mensagem: "Administrador não autenticado." });
  }
  if (!mongoose.isValidObjectId(conviteId)) {
    return res.status(400).json({ mensagem: "ID do convite inválido." });
  }

  try {
    const convite = await ConvitePersonal.findOneAndDelete({
      _id: new mongoose.Types.ObjectId(conviteId),
      criadoPor: new mongoose.Types.ObjectId(adminId),
      status: 'pendente', // Só permite excluir convites pendentes, por exemplo
    });

    if (!convite) {
      return res.status(404).json({ mensagem: "Convite não encontrado, já utilizado, expirado ou não pertence a este administrador." });
    }

    console.log(`[DELETE /api/admin/convites/personal/${conviteId}] Convite (Token: ${convite.token}) revogado com sucesso.`);
    res.status(200).json({ mensagem: "Convite revogado com sucesso." });

  } catch (error: any) {
    console.error(`[DELETE /api/admin/convites/personal/${conviteId}] Erro ao revogar convite:`, error);
    next(error);
  }
});


export default router;
