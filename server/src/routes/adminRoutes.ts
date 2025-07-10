// server/src/routes/adminRoutes.ts
import express, { Response, NextFunction, Request } from 'express';
import mongoose from 'mongoose';
import crypto from 'crypto';
import PersonalTrainer from '../../models/PersonalTrainer';
import ConvitePersonal from '../../models/ConvitePersonal';

const router = express.Router();

// =======================================================
// --- ROTAS DE GESTÃO DE PERSONAL TRAINERS ---
// =======================================================

// POST /api/admin/personal-trainers
router.post('/personal-trainers', async (req: Request, res: Response, next: NextFunction) => {
  const { nome, email, password, role } = req.body;
  if (!nome || !email || !password) {
    return res.status(400).json({ mensagem: "Nome, email e senha são obrigatórios." });
  }
  const roleFinal = (role && role.toLowerCase() === 'admin') ? 'Admin' : 'Personal Trainer';
  try {
    const existingPersonal = await PersonalTrainer.findOne({ email: email.toLowerCase() });
    if (existingPersonal) {
      return res.status(409).json({ mensagem: `Já existe um usuário com o email: ${email}` });
    }
    const newPersonal = new PersonalTrainer({ nome, email: email.toLowerCase(), passwordHash: password, role: roleFinal });
    await newPersonal.save();
    const personalToReturn = { _id: newPersonal._id, nome: newPersonal.nome, email: newPersonal.email, role: newPersonal.role, createdAt: newPersonal.createdAt, updatedAt: newPersonal.updatedAt };
    res.status(201).json(personalToReturn);
  } catch (error: any) {
    next(error);
  }
});

// GET /api/admin/personal-trainers
router.get('/personal-trainers', async (req: Request, res: Response, next: NextFunction) => {
  try {
    const personais = await PersonalTrainer.find().select('-passwordHash').sort({ createdAt: -1 });
    res.status(200).json(personais);
  } catch (error: any) {
    next(error);
  }
});

// GET /api/admin/personal-trainers/:id
router.get('/personal-trainers/:id', async (req: Request, res: Response, next: NextFunction) => {
  const { id } = req.params;
  if (!mongoose.isValidObjectId(id)) {
    return res.status(400).json({ mensagem: "ID do personal inválido." });
  }
  try {
    const personal = await PersonalTrainer.findById(id).select('-passwordHash');
    if (!personal) {
      return res.status(404).json({ mensagem: "Personal trainer não encontrado." });
    }
    res.status(200).json(personal);
  } catch (error: any) {
    next(error);
  }
});

// PUT /api/admin/personal-trainers/:id
router.put('/personal-trainers/:id', async (req: Request, res: Response, next: NextFunction) => {
  const { id } = req.params;
  const { nome, email, role } = req.body;
  if (!mongoose.isValidObjectId(id)) {
    return res.status(400).json({ mensagem: 'ID do personal inválido.' });
  }
  if (!nome || !email || !role) {
    return res.status(400).json({ mensagem: 'Nome, email e função são obrigatórios.' });
  }
  try {
    const personal = await PersonalTrainer.findById(id);
    if (!personal) {
      return res.status(404).json({ mensagem: 'Personal trainer não encontrado.' });
    }
    personal.nome = nome;
    personal.email = email.toLowerCase();
    personal.role = (role.toLowerCase() === 'admin') ? 'Admin' : 'Personal Trainer';
    const updatedPersonal = await personal.save();
    const personalToReturn = { _id: updatedPersonal._id, nome: updatedPersonal.nome, email: updatedPersonal.email, role: updatedPersonal.role, createdAt: updatedPersonal.createdAt, updatedAt: updatedPersonal.updatedAt };
    res.status(200).json(personalToReturn);
  } catch (error: any) {
    next(error);
  }
});

// DELETE /api/admin/personal-trainers/:id
router.delete('/personal-trainers/:id', async (req: Request, res: Response, next: NextFunction) => {
  const { id: personalIdToDelete } = req.params;
  const adminId = req.user?.id;
  if (!mongoose.isValidObjectId(personalIdToDelete)) {
    return res.status(400).json({ mensagem: "ID do personal inválido." });
  }
  if (personalIdToDelete === adminId) {
     return res.status(403).json({ mensagem: "Administradores não podem se auto-excluir." });
  }
  try {
    const personal = await PersonalTrainer.findByIdAndDelete(personalIdToDelete);
    if (!personal) {
      return res.status(404).json({ mensagem: "Personal trainer não encontrado." });
    }
    res.status(200).json({ mensagem: `Personal trainer ${personal.nome} excluído com sucesso.` });
  } catch (error: any) {
    next(error);
  }
});


// =======================================================
// --- ROTAS DE GESTÃO DE CONVITES ---
// Criamos um sub-roteador para organizar as rotas de convites.
// =======================================================

const conviteRouter = express.Router();

// Rota: POST /personal - Admin cria um novo convite para Personal Trainer
// Acessível em: POST /api/admin/convites/personal
conviteRouter.post('/personal', async (req: Request, res: Response, next: NextFunction) => {
  const adminId = req.user?.id;
  const { emailConvidado, roleConvidado, diasParaExpirar } = req.body;

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
    
    const frontendUrl = process.env.FRONTEND_URL || 'http://localhost:5173';
    const linkConvite = `${frontendUrl}/cadastrar-personal/convite/${token}`;

    res.status(201).json({
      mensagem: "Convite criado com sucesso!",
      convite: novoConvite,
      linkConvite: linkConvite,
    });
  } catch (error: any) {
    next(error);
  }
});

// Rota: GET /personal - Listar todos os convites de Personal
// Acessível em: GET /api/admin/convites/personal
conviteRouter.get('/personal', async (req: Request, res: Response, next: NextFunction) => {
  const adminId = req.user?.id;
  if (!adminId) {
    return res.status(401).json({ mensagem: "Administrador não autenticado." });
  }

  try {
    const convites = await ConvitePersonal.find({ criadoPor: new mongoose.Types.ObjectId(adminId) })
      .populate('usadoPor', 'nome email')
      .sort({ createdAt: -1 });
    res.status(200).json(convites);
  } catch (error: any) {
    next(error);
  }
});

// Rota: DELETE /personal/:conviteId - Revogar/Excluir um convite de Personal
// Acessível em: DELETE /api/admin/convites/personal/:conviteId
conviteRouter.delete('/personal/:conviteId', async (req: Request, res: Response, next: NextFunction) => {
  const adminId = req.user?.id;
  const { conviteId } = req.params;

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
      status: 'pendente',
    });

    if (!convite) {
      return res.status(404).json({ mensagem: "Convite não encontrado ou já utilizado." });
    }

    res.status(200).json({ mensagem: "Convite revogado com sucesso." });
  } catch (error: any) {
    next(error);
  }
});

// Monta o sub-roteador de convites no roteador principal com o prefixo '/convites'
router.use('/convites', conviteRouter);


export default router;