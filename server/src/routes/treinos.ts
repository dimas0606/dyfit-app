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
    
    // Garante que o criadorId seja adicionado ao corpo da requisição
    const dadosRotina = { ...req.body, criadorId: new Types.ObjectId(criadorId) };
    const novaRotina = new Treino(dadosRotina);
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
    if (!mongoose.Types.ObjectId.isValid(id) || !criadorId) {
        return res.status(400).json({ mensagem: "Requisição inválida." });
    }
    
    const rotina = await Treino.findOneAndUpdate(
        { _id: id, criadorId: new Types.ObjectId(criadorId) },
        { $set: req.body },
        { new: true, runValidators: true }
    );

    if (!rotina) return res.status(404).json({ mensagem: "Rotina não encontrada ou você não tem permissão." });
    
    res.status(200).json(rotina);
  } catch (error) {
    next(error);
  }
});

// --- ROTA MODIFICADA ---
// PUT /api/treinos/:id/pasta - Mover rotina para uma pasta
router.put("/:id/pasta", authenticateToken, async (req: Request, res: Response, next: NextFunction) => {
    const { id: rotinaId } = req.params;
    // O frontend pode enviar 'null' para remover da pasta
    const { pastaId } = req.body; 
    const criadorId = req.user?.id;

    // --- MELHORIA 1: Validação inicial mais robusta ---
    if (!criadorId || !mongoose.Types.ObjectId.isValid(rotinaId)) {
        return res.status(400).json({ mensagem: "ID da rotina inválido ou usuário não autenticado." });
    }
    // Permite 'null' mas valida o ID se ele for fornecido
    if (pastaId && !mongoose.Types.ObjectId.isValid(pastaId)) {
        return res.status(400).json({ mensagem: "ID da pasta inválido." });
    }
    
    try {
        // --- MELHORIA 2: Verificação de segurança da pasta de destino (opcional, mas bom para integridade) ---
        // Se uma pastaId foi fornecida, verifica se ela existe e pertence ao usuário.
        if (pastaId) {
            const pastaDestino = await PastaTreino.findOne({ _id: pastaId, criadorId: criadorId });
            if (!pastaDestino) {
                return res.status(404).json({ mensagem: "Pasta de destino não encontrada ou você não tem permissão para usá-la." });
            }
        }

        // --- MELHORIA 3: Operação atômica e retorno do documento atualizado ---
        // Usa findOneAndUpdate para encontrar, atualizar e retornar o novo documento em uma única chamada.
        const rotinaAtualizada = await Treino.findOneAndUpdate(
            { _id: rotinaId, criadorId: criadorId }, // Filtro de segurança para garantir posse
            { $set: { pastaId: pastaId ? new Types.ObjectId(pastaId) : null } }, // Atualiza o campo pastaId
            { new: true } // Opção para retornar o documento APÓS a atualização
        ).populate('pastaId', 'nome'); // Popula o nome da pasta para ser usado no frontend

        if (!rotinaAtualizada) {
            return res.status(404).json({ mensagem: "Rotina não encontrada ou você não tem permissão para movê-la." });
        }
        
        // --- MELHORIA 4: Retorna o objeto da rotina completo e atualizado ---
        res.status(200).json(rotinaAtualizada);

    } catch (error) {
        next(error);
    }
});


// DELETE /api/treinos/:id - Excluir rotina
router.delete("/:id", authenticateToken, async (req: Request, res: Response, next: NextFunction) => {
    try {
        const { id } = req.params;
        const criadorId = req.user?.id;
        if (!mongoose.Types.ObjectId.isValid(id) || !criadorId) {
            return res.status(400).json({ mensagem: "Requisição inválida." });
        }
        const resultado = await Treino.findOneAndDelete({ _id: id, criadorId: new Types.ObjectId(criadorId) });
        if (!resultado) return res.status(404).json({ mensagem: "Rotina não encontrada ou você não tem permissão." });
        res.status(200).json({ mensagem: "Rotina excluída com sucesso." });
    } catch (error) {
        next(error);
    }
});

export default router;