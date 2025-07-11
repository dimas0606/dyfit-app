// server/src/routes/alunos.ts
import express, { Request, Response } from "express";
import mongoose from "mongoose";
import Aluno from "../../models/Aluno";
import crypto from 'crypto';

const router = express.Router();

// --- ROTAS ---

// POST /api/alunos - Cadastrar novo aluno
router.post("/", async (req: Request, res: Response) => {
  try {
    const { nome, email, birthDate, gender, goal, weight, height, startDate, phone, status, notes, trainerId } = req.body;
    if (!trainerId || !mongoose.Types.ObjectId.isValid(trainerId)) {
      return res.status(400).json({ erro: "ID do treinador (trainerId) inválido ou não fornecido." });
    }
    if (req.user && req.user.role?.toLowerCase() === 'personal' && req.user.id !== trainerId) {
      return res.status(403).json({ erro: "Personal Trainers só podem cadastrar alunos para si mesmos." });
    }
    const existingAluno = await Aluno.findOne({ email: email.toLowerCase() });
    if (existingAluno) {
      return res.status(409).json({ erro: `Já existe um aluno cadastrado com o email: ${email}` });
    }
    const temporaryPassword = crypto.randomBytes(8).toString('hex');
    const novoAluno = new Aluno({
      nome, email: email.toLowerCase(), passwordHash: temporaryPassword, birthDate, gender, goal,
      weight, height, startDate, phone, status, notes, trainerId
    });
    const alunoSalvo = await novoAluno.save();
    const alunoParaRetornar = { ...alunoSalvo.toObject() };
    delete (alunoParaRetornar as any).passwordHash;
    res.status(201).json(alunoParaRetornar);
  } catch (error: any) {
    if (error.name === 'ValidationError') return res.status(400).json({ erro: "Dados inválidos", detalhes: error.errors });
    if (error.code === 11000) return res.status(409).json({ erro: `O email ${req.body.email} já está em uso.` });
    res.status(500).json({ erro: "Erro interno", detalhes: error.message });
  }
});

// GET /api/alunos - Listar alunos
router.get("/", async (req: Request, res: Response) => {
  try {
    const user = req.user;
    if (!user || !user.id) {
      return res.status(401).json({ erro: "Usuário não autenticado." });
    }
    let query = {};

    // =======================================================
    // --- CORREÇÃO: Verificando o role em minúsculas ---
    const userRole = user.role?.toLowerCase();
    
    if (userRole === 'personal') {
      query = { trainerId: user.id };
    } else if (userRole === 'admin') {
      // Admin pode ver todos, então a query fica vazia
    } else {
      return res.status(403).json({ erro: "Acesso não permitido para esta funcionalidade." });
    }
    // =======================================================

    const alunos = await Aluno.find(query).sort({ nome: 1 }).select('-passwordHash');
    res.status(200).json(alunos);
  } catch (error: any) {
    res.status(500).json({ erro: "Erro interno ao buscar alunos", detalhes: error.message });
  }
});

// GET /api/alunos/:id - Buscar um aluno pelo ID
router.get("/:id", async (req: Request, res: Response) => {
  // ... (Esta rota parece correta, mas podemos aplicar a mesma padronização)
  const { id } = req.params;
  const user = req.user;
  if (!user || !user.id) return res.status(401).json({ erro: "Usuário não autenticado." });
  if (!mongoose.Types.ObjectId.isValid(id)) return res.status(400).json({ erro: "ID do aluno inválido" });
  try {
    let query: mongoose.FilterQuery<any> = { _id: id };
    if (user.role?.toLowerCase() === 'personal') {
      query.trainerId = user.id;
    }
    const aluno = await Aluno.findOne(query).select('-passwordHash');
    if (!aluno) return res.status(404).json({ erro: "Aluno não encontrado ou sem permissão." });
    res.status(200).json(aluno);
  } catch (error: any) {
    res.status(500).json({ erro: "Erro interno ao buscar aluno", detalhes: error.message });
  }
});

// PUT /api/alunos/:id - Editar aluno
router.put("/:id", async (req: Request, res: Response) => {
  // ... (A lógica desta rota também pode ser padronizada para minúsculas)
  const { id } = req.params;
  const user = req.user;
  if (!user || !user.id) return res.status(401).json({ erro: "Usuário não autenticado." });
  if (!mongoose.Types.ObjectId.isValid(id)) return res.status(400).json({ erro: "ID do aluno inválido." });
  try {
    const updateData = { ...req.body };
    delete updateData.passwordHash;
    if (user.role?.toLowerCase() === 'personal') {
        delete updateData.trainerId;
    }
    let query: mongoose.FilterQuery<any> = { _id: id };
    if (user.role?.toLowerCase() === 'personal') {
      query.trainerId = user.id;
    }
    const alunoAtualizado = await Aluno.findOneAndUpdate(query, updateData, { new: true, runValidators: true }).select('-passwordHash');
    if (!alunoAtualizado) return res.status(404).json({ erro: "Aluno não encontrado ou sem permissão para atualizar." });
    res.status(200).json(alunoAtualizado);
  } catch (error: any) {
    // ... (tratamento de erro)
    res.status(500).json({ erro: "Erro interno ao atualizar aluno." });
  }
});

// DELETE /api/alunos/:id - Deletar aluno
router.delete("/:id", async (req: Request, res: Response) => {
  // ... (A lógica desta rota também pode ser padronizada)
  const { id } = req.params;
  const user = req.user;
  if (!user || !user.id) return res.status(401).json({ erro: "Usuário não autenticado." });
  if (!mongoose.Types.ObjectId.isValid(id)) return res.status(400).json({ erro: "ID do aluno inválido." });
  try {
    let query: mongoose.FilterQuery<any> = { _id: id };
    if (user.role?.toLowerCase() === 'personal') {
      query.trainerId = user.id;
    }
    const result = await Aluno.findOneAndDelete(query);
    if (!result) return res.status(404).json({ erro: "Aluno não encontrado ou sem permissão para remover." });
    res.status(200).json({ mensagem: "Aluno removido com sucesso" });
  } catch (error: any) {
    res.status(500).json({ erro: "Erro interno ao remover aluno." });
  }
});

export default router;