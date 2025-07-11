// server/src/routes/exercicios.ts
import express, { Request, Response, Router, NextFunction } from "express";
import mongoose from "mongoose";
import Exercicio, { IExercicio } from "../../models/Exercicio";
import { authenticateToken } from '../../middlewares/authenticateToken';

const router: Router = express.Router();

// Função auxiliar de filtro
const buildFilterQuery = (baseFilter: mongoose.FilterQuery<IExercicio>, req: Request): mongoose.FilterQuery<IExercicio> => {
    const query: mongoose.FilterQuery<IExercicio> = { ...baseFilter };
    const { grupo, categoria } = req.query;
    if (grupo && typeof grupo === 'string' && grupo !== 'all') query.grupoMuscular = grupo;
    if (categoria && typeof categoria === 'string' && categoria !== 'all') query.categoria = categoria;
    return query;
};

// GET /app
router.get("/app", authenticateToken, async (req: Request, res: Response, next: NextFunction) => {
  const userId = req.user?.id; 
  try {
    const filterQuery = buildFilterQuery({ isCustom: false }, req); 
    const exerciciosApp = await Exercicio.find(filterQuery).lean();
    const exerciciosComFavorito = exerciciosApp.map(ex => ({
      ...ex,
      isFavoritedByCurrentUser: ex.favoritedBy?.some(favId => favId.equals(new mongoose.Types.ObjectId(userId))) ?? false
    }));
    res.status(200).json(exerciciosComFavorito);
  } catch (error) { next(error); }
});

// GET /meus
router.get("/meus", authenticateToken, async (req: Request, res: Response, next: NextFunction) => {
  const creatorId = req.user?.id;
  try {
    if (!creatorId) return res.status(401).json({ erro: "Usuário não autenticado." });
    const filterQuery = buildFilterQuery({ creatorId: new mongoose.Types.ObjectId(creatorId), isCustom: true }, req);
    const exercicios = await Exercicio.find(filterQuery).lean();
    const exerciciosComFavorito = exercicios.map(ex => ({
      ...ex,
      isFavoritedByCurrentUser: ex.favoritedBy?.some(favId => favId.equals(new mongoose.Types.ObjectId(creatorId))) ?? false
    }));
    res.status(200).json(exerciciosComFavorito);
  } catch (error) { next(error); }
});

// GET /favoritos
router.get("/favoritos", authenticateToken, async (req: Request, res: Response, next: NextFunction) => {
  const userId = req.user?.id;
  try {
    if (!userId) return res.status(401).json({ erro: "Usuário não autenticado." });
    const filterQuery = buildFilterQuery({ favoritedBy: new mongoose.Types.ObjectId(userId) }, req);
    const favoritos = await Exercicio.find(filterQuery).lean();
    const exerciciosComFavorito = favoritos.map(ex => ({ ...ex, isFavoritedByCurrentUser: true }));
    res.status(200).json(exerciciosComFavorito);
  } catch (error) { next(error); }
});

// =======================================================
// --- ROTAS POST, PUT, DELETE CORRIGIDAS E COMPLETAS ---
// =======================================================

// POST / - Criar um novo exercício
router.post("/", authenticateToken, async (req: Request, res: Response, next: NextFunction) => {
    const { nome, descricao, categoria, grupoMuscular, urlVideo, isCustom } = req.body;
    const requesterId = req.user?.id;
    const requesterRole = req.user?.role;

    if (!requesterId) return res.status(401).json({ erro: "Usuário não autenticado." });
    if (!nome) return res.status(400).json({ erro: "O nome do exercício é obrigatório." });

    try {
        const exercicioData: Partial<IExercicio> = {
            nome: nome.trim(), descricao, categoria, grupoMuscular, urlVideo, isCustom
        };

        if (isCustom === false) { // Criando um exercício do App
            if (requesterRole?.toLowerCase() !== 'admin') {
                return res.status(403).json({ erro: "Apenas administradores podem criar exercícios do App." });
            }
            exercicioData.creatorId = undefined;
        } else { // Criando um exercício customizado
            exercicioData.isCustom = true;
            exercicioData.creatorId = new mongoose.Types.ObjectId(requesterId);
            const jaExiste = await Exercicio.findOne({ nome: nome.trim(), creatorId: exercicioData.creatorId });
            if (jaExiste) return res.status(409).json({ erro: "Você já possui um exercício personalizado com esse nome." });
        }

        const novoExercicio = await Exercicio.create(exercicioData);
        res.status(201).json(novoExercicio);
    } catch (error) {
        next(error);
    }
});

// PUT /:id - Atualizar um exercício
router.put("/:id", authenticateToken, async (req: Request, res: Response, next: NextFunction) => {
    const requesterId = req.user?.id;
    const requesterRole = req.user?.role;
    const { id } = req.params;
    const updates = req.body;

    if (!mongoose.Types.ObjectId.isValid(id)) return res.status(400).json({ erro: "ID inválido." });
    if (!requesterId) return res.status(401).json({ erro: "Não autorizado." });

    try {
        const exercicio = await Exercicio.findById(id);
        if (!exercicio) return res.status(404).json({ erro: "Exercício não encontrado." });
        
        const isOwner = exercicio.creatorId?.equals(new mongoose.Types.ObjectId(requesterId));
        const isAdmin = requesterRole?.toLowerCase() === 'admin';

        if ((exercicio.isCustom && isOwner) || (!exercicio.isCustom && isAdmin)) {
            Object.assign(exercicio, updates);
            await exercicio.save();
            res.status(200).json(exercicio);
        } else {
            return res.status(403).json({ erro: "Permissão negada para editar este exercício." });
        }
    } catch (error) {
        next(error);
    }
});

// DELETE /:id - Deletar um exercício
router.delete("/:id", authenticateToken, async (req: Request, res: Response, next: NextFunction) => {
    const requesterId = req.user?.id;
    const requesterRole = req.user?.role;
    const { id } = req.params;

    if (!mongoose.Types.ObjectId.isValid(id)) return res.status(400).json({ erro: "ID inválido." });
    if (!requesterId) return res.status(401).json({ erro: "Não autorizado." });

    try {
        const exercicio = await Exercicio.findById(id);
        if (!exercicio) return res.status(404).json({ erro: "Exercício não encontrado." });
        
        const isOwner = exercicio.creatorId?.equals(new mongoose.Types.ObjectId(requesterId));
        const isAdmin = requesterRole?.toLowerCase() === 'admin';

        if ((exercicio.isCustom && isOwner) || (!exercicio.isCustom && isAdmin)) {
            await exercicio.deleteOne();
            res.status(200).json({ message: "Exercício deletado com sucesso." });
        } else {
            return res.status(403).json({ erro: "Permissão negada para deletar este exercício." });
        }
    } catch (error) {
        next(error);
    }
});

// POST /:id/favorite - Favoritar
router.post("/:id/favorite", authenticateToken, async (req: Request, res: Response, next: NextFunction) => {
    const userId = req.user?.id;
    const { id } = req.params;
    if (!mongoose.Types.ObjectId.isValid(id) || !userId) return res.status(400).json({ erro: "Requisição inválida." });
    try {
        await Exercicio.updateOne({ _id: id }, { $addToSet: { favoritedBy: new mongoose.Types.ObjectId(userId) } });
        res.status(200).json({ message: "Exercício favoritado." });
    } catch (error) { next(error); }
});

// DELETE /:id/favorite - Desfavoritar
router.delete("/:id/favorite", authenticateToken, async (req: Request, res: Response, next: NextFunction) => {
    const userId = req.user?.id;
    const { id } = req.params;
    if (!mongoose.Types.ObjectId.isValid(id) || !userId) return res.status(400).json({ erro: "Requisição inválida." });
    try {
        await Exercicio.updateOne({ _id: id }, { $pull: { favoritedBy: new mongoose.Types.ObjectId(userId) } });
        res.status(200).json({ message: "Exercício desfavoritado." });
    } catch (error) { next(error); }
});

export default router;
