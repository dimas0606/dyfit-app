// server/src/routes/treinos.ts
import express, { Request, Response, NextFunction } from "express";
import mongoose, { Types } from "mongoose";
import Treino, {
    ITreino,
    IDiaDeTreino, 
    IExercicioEmDiaDeTreino, 
    ITreinoPopuladoLean,
    TIPOS_ORGANIZACAO_ROTINA
} from "../../models/Treino";
import Aluno from "../../models/Aluno";
import PastaTreino from '../../models/Pasta';
import { authenticateToken } from '../../middlewares/authenticateToken';
import { isValid as isDateValid, parseISO } from 'date-fns';

const router = express.Router();

// --- GET /api/treinos (Listagem principal) ---
router.get("/", authenticateToken, async (req: Request, res: Response, next: NextFunction) => {
  try {
    const criadorId = req.user?.id;
    const { tipo, alunoId, pastaId: pastaIdInput, limit, statusModelo } = req.query;

    if (!criadorId) return res.status(401).json({ mensagem: "Usuário não autenticado." });
    const criadorObjectId = new Types.ObjectId(criadorId);
    const queryFilter: mongoose.FilterQuery<ITreino> = { criadorId: criadorObjectId };

    if (tipo && typeof tipo === 'string' && ['modelo', 'individual'].includes(tipo)) {
        queryFilter.tipo = tipo as "modelo" | "individual";
    }
    // Adicione outras lógicas de filtro que você tinha aqui...

    let mongoQuery = Treino.find(queryFilter);
    mongoQuery = mongoQuery.populate({ path: 'diasDeTreino.exerciciosDoDia.exercicioId', select: 'nome grupoMuscular' });
    mongoQuery = mongoQuery.populate({ path: 'alunoId', select: 'nome email' });
    mongoQuery = mongoQuery.populate({ path: 'pastaId', select: 'nome' });
    mongoQuery = mongoQuery.sort({ tipo: 1, 'pasta.ordem': 1, ordemNaPasta: 1, atualizadoEm: -1 });

    const rotinas = await mongoQuery.lean<ITreinoPopuladoLean[]>();
    res.status(200).json(rotinas);
  } catch (error: any) {
    next(error);
  }
});

// --- POST /api/treinos (Criação) ---
router.post("/", authenticateToken, async (req: Request, res: Response, next: NextFunction) => {
    // ... (Seu código completo de criação aqui, mantido como estava) ...
    // Se precisar que eu o reescreva, me avise, mas o original deve funcionar.
});

// --- PUT /api/treinos/:id (Edição) ---
router.put("/:id", authenticateToken, async (req: Request, res: Response, next: NextFunction) => {
    // ... (Seu código completo de edição aqui) ...
});

// =======================================================
// --- NOVA ROTA PUT PARA O DRAG AND DROP ---
// =======================================================
router.put("/:id/pasta", authenticateToken, async (req: Request, res: Response, next: NextFunction) => {
    const { id: rotinaId } = req.params;
    const { pastaId } = req.body;
    const criadorId = req.user?.id;

    if (!criadorId) return res.status(401).json({ mensagem: "Usuário não autenticado." });
    if (!mongoose.Types.ObjectId.isValid(rotinaId)) return res.status(400).json({ mensagem: "ID da rotina inválido." });
    if (pastaId && !mongoose.Types.ObjectId.isValid(pastaId)) return res.status(400).json({ mensagem: "ID da pasta inválido." });
    
    try {
        const rotina = await Treino.findOne({ _id: new Types.ObjectId(rotinaId), criadorId: new Types.ObjectId(criadorId) });
        if (!rotina) return res.status(404).json({ mensagem: "Rotina não encontrada ou você não tem permissão para movê-la." });
        
        if (pastaId) {
            const pastaDestino = await PastaTreino.findOne({ _id: new Types.ObjectId(pastaId), criadorId: new Types.ObjectId(criadorId) });
            if (!pastaDestino) return res.status(404).json({ mensagem: "Pasta de destino não encontrada." });
        }
        
        rotina.pastaId = pastaId ? new Types.ObjectId(pastaId) : null;
        await rotina.save();
        
        res.status(200).json({ mensagem: "Rotina movida com sucesso.", rotina });

    } catch (error) {
        next(error);
    }
});


// --- DELETE /api/treinos/:id (Exclusão) ---
router.delete("/:id", authenticateToken, async (req: Request, res: Response, next: NextFunction) => {
    // ... (Seu código completo de exclusão aqui) ...
});

// --- POST /api/treinos/associar-modelo ---
router.post("/associar-modelo", authenticateToken, async (req: Request, res: Response, next: NextFunction) => {
    // ... (Seu código completo de associação aqui) ...
});

// --- GET /api/treinos/aluno/:alunoId ---
router.get("/aluno/:alunoId", authenticateToken, async (req: Request, res: Response, next: NextFunction) => {
    // ... (Seu código completo de busca por aluno aqui) ...
});

// --- GET /api/treinos/:id ---
router.get("/:id", authenticateToken, async (req: Request, res: Response, next: NextFunction) => {
    // ... (Seu código completo de busca por ID aqui) ...
});

// --- PUT /api/treinos/reordenar ---
router.put("/reordenar", authenticateToken, async (req: Request, res: Response, next: NextFunction) => {
    // ... (Seu código completo de reordenação aqui) ...
});

export default router;
