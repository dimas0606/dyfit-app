// server/src/routes/treinos.ts
import express, { Request, Response, NextFunction } from "express";
import mongoose, { Types } from "mongoose";
import Treino from "../../models/Treino";
import PastaTreino from '../../models/Pasta';
import { authenticateToken } from '../../middlewares/authenticateToken';

const router = express.Router();

// GET /api/treinos - Listagem principal e completa
router.get("/", authenticateToken, async (req: Request, res: Response, next: NextFunction) => {
  try {
    const criadorId = req.user?.id;
    if (!criadorId) return res.status(401).json({ mensagem: "Usuário não autenticado." });
    
    const rotinas = await Treino.find({ criadorId: new Types.ObjectId(criadorId) })
        .populate({ path: 'alunoId', select: 'nome' })
        .populate({ path: 'pastaId', select: 'nome' })
        .sort({ tipo: 1, atualizadoEm: -1 });

    res.status(200).json(rotinas);
  } catch (error) {
    next(error);
  }
});

// POST /api/treinos - Criar nova rotina
router.post("/", authenticateToken, async (req: Request, res: Response, next: NextFunction) => {
  try {
    const criadorId = req.user?.id;
    if (!criadorId) return res.status(401).json({ mensagem: "Usuário não autenticado." });
    
    const novaRotina = new Treino({ ...req.body, criadorId: new Types.ObjectId(criadorId) });
    await novaRotina.save();
    res.status(201).json(novaRotina);
  } catch (error) {
    next(error);
  }
});

// PUT /api/treinos/:id - Editar rotina existente
router.put("/:id", authenticateToken, async (req: Request, res: Response, next: NextFunction) => {
  try {
    const { id } = req.params;
    const criadorId = req.user?.id;
    const updates = req.body;

    if (!mongoose.Types.ObjectId.isValid(id)) return res.status(400).json({ mensagem: "ID da rotina inválido." });
    if (!criadorId) return res.status(401).json({ mensagem: "Usuário não autenticado." });
    
    const rotina = await Treino.findOneAndUpdate(
        { _id: id, criadorId: new Types.ObjectId(criadorId) },
        { $set: updates },
        { new: true, runValidators: true }
    );

    if (!rotina) return res.status(404).json({ mensagem: "Rotina não encontrada ou você não tem permissão para editá-la." });
    
    res.status(200).json(rotina);
  } catch (error) {
    next(error);
  }
});

// PUT /:id/pasta - ROTA PARA O DRAG AND DROP
router.put("/:id/pasta", authenticateToken, async (req: Request, res: Response, next: NextFunction) => {
    const { id: rotinaId } = req.params;
    const { pastaId } = req.body;
    const criadorId = req.user?.id;

    if (!criadorId || !mongoose.Types.ObjectId.isValid(rotinaId)) {
        return res.status(400).json({ mensagem: "Requisição inválida." });
    }
    if (pastaId && !mongoose.Types.ObjectId.isValid(pastaId)) {
        return res.status(400).json({ mensagem: "ID da pasta inválido." });
    }
    
    try {
        const rotina = await Treino.findOne({ _id: new Types.ObjectId(rotinaId), criadorId: new Types.ObjectId(criadorId) });
        if (!rotina) return res.status(404).json({ mensagem: "Rotina não encontrada ou você não tem permissão." });
        
        if (pastaId) {
            const pastaDestino = await PastaTreino.findOne({ _id: new Types.ObjectId(pastaId), criadorId: new Types.ObjectId(criadorId) });
            if (!pastaDestino) return res.status(404).json({ mensagem: "Pasta de destino não encontrada." });
        }
        
        rotina.pastaId = pastaId ? new Types.ObjectId(pastaId) : null;
        await rotina.save();
        
        res.status(200).json({ mensagem: "Rotina movida com sucesso." });
    } catch (error) {
        next(error);
    }
});

// DELETE /api/treinos/:id - Excluir rotina
router.delete("/:id", authenticateToken, async (req: Request, res: Response, next: NextFunction) => {
    try {
        const { id } = req.params;
        const criadorId = req.user?.id;

        if (!mongoose.Types.ObjectId.isValid(id)) return res.status(400).json({ mensagem: "ID da rotina inválido." });
        if (!criadorId) return res.status(401).json({ mensagem: "Usuário não autenticado." });

        const resultado = await Treino.findOneAndDelete({ _id: id, criadorId: new Types.ObjectId(criadorId) });
        if (!resultado) return res.status(404).json({ mensagem: "Rotina não encontrada ou você não tem permissão para excluí-la." });

        res.status(200).json({ mensagem: "Rotina excluída com sucesso." });
    } catch (error) {
        next(error);
    }
});

export default router;
