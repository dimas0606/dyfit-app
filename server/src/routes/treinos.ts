import express, { Request, Response, NextFunction } from "express";
import mongoose, { Types } from "mongoose";
import Treino, {
    ITreino,
    IDiaDeTreino,
    IExercicioEmDiaDeTreino,
    IDiaDeTreinoPlain,
    IExercicioEmDiaDeTreinoPlain
} from "../../models/Treino";
import PastaTreino from '../../models/Pasta';
import { authenticateToken } from '../../middlewares/authenticateToken';

const router = express.Router();

// O tipo auxiliar ITreinoParaCriacao foi removido pois não é mais necessário.

// --- ROTAS (sem alterações, exceto /associar-modelo) ---

router.get("/", authenticateToken, async (req: Request, res: Response, next: NextFunction) => {
  try {
    const criadorId = req.user?.id;
    if (!criadorId) return res.status(401).json({ mensagem: "Usuário não autenticado." });

    const rotinas = await Treino.find({ criadorId: new Types.ObjectId(criadorId) })
        .populate({ path: 'alunoId', select: 'nome' })
        .populate({ path: 'pastaId', select: 'nome' })
        .populate({
            path: 'diasDeTreino',
            populate: {
                path: 'exerciciosDoDia.exercicioId',
                model: 'Exercicio',
                select: 'nome urlVideo'
            }
        })
        .sort({ tipo: 1, atualizadoEm: -1 });

    res.status(200).json(rotinas);
  } catch (error) {
    next(error);
  }
});

router.post("/", authenticateToken, async (req: Request, res: Response, next: NextFunction) => {
  try {
    const criadorId = req.user?.id;
    if (!criadorId) return res.status(401).json({ mensagem: "Usuário não autenticado." });

    const dadosRotina = { ...req.body, criadorId: new Types.ObjectId(criadorId) };
    const novaRotina = new Treino(dadosRotina);
    await novaRotina.save();

    const rotinaPopulada = await Treino.findById(novaRotina._id)
        .populate({ path: 'alunoId', select: 'nome' })
        .populate({ path: 'pastaId', select: 'nome' })
        .populate({
            path: 'diasDeTreino',
            populate: {
                path: 'exerciciosDoDia.exercicioId',
                model: 'Exercicio',
                select: 'nome urlVideo'
            }
        });

    res.status(201).json(rotinaPopulada);
  } catch (error) {
    next(error);
  }
});

// POST /api/treinos/associar-modelo - Associar modelo de treino a um aluno (ROTA CORRIGIDA FINAL)
router.post("/associar-modelo", authenticateToken, async (req: Request, res: Response, next: NextFunction) => {
    try {
        const { fichaModeloId, alunoId } = req.body;
        const criadorId = req.user?.id;

        if (!criadorId) {
            return res.status(401).json({ mensagem: "Usuário não autenticado." });
        }
        if (!mongoose.Types.ObjectId.isValid(fichaModeloId) || !mongoose.Types.ObjectId.isValid(alunoId)) {
            return res.status(400).json({ mensagem: "IDs inválidos fornecidos." });
        }

        const fichaModelo = await Treino.findOne({ _id: fichaModeloId, criadorId: new Types.ObjectId(criadorId), tipo: 'modelo' });

        if (!fichaModelo) {
            return res.status(404).json({ mensagem: "Ficha modelo não encontrada ou você não tem permissão para usá-la." });
        }

        // Desestrutura o objeto PURO para remover propriedades que não queremos clonar
        const {
            _id,
            criadoEm,
            atualizadoEm,
            diasDeTreino,
            ...modeloRestante
        } = fichaModelo.toObject();

        // MUDANÇA PRINCIPAL: Removemos a anotação de tipo explícita.
        // Deixamos o TypeScript inferir que `newFichaData` é um objeto simples.
        // O construtor `new Treino()` aceita este objeto sem problemas.
        const newFichaData = {
            ...modeloRestante,
            tipo: 'individual' as const, // O 'as const' ajuda o TS a saber que o tipo é literal 'individual'
            criadorId: new Types.ObjectId(criadorId),
            alunoId: new Types.ObjectId(alunoId),
            pastaId: null,
            titulo: `${modeloRestante.titulo} (Ficha de Aluno)`,

            diasDeTreino: diasDeTreino?.map((dia): IDiaDeTreinoPlain => ({
                identificadorDia: dia.identificadorDia,
                nomeSubFicha: dia.nomeSubFicha,
                ordemNaRotina: dia.ordemNaRotina,
                exerciciosDoDia: dia.exerciciosDoDia?.map((ex): IExercicioEmDiaDeTreinoPlain => {
                    const exercicioIdValue = typeof ex.exercicioId === 'object' && ex.exercicioId?._id
                        ? ex.exercicioId._id.toString()
                        : ex.exercicioId.toString();

                    return {
                        exercicioId: new Types.ObjectId(exercicioIdValue),
                        series: ex.series,
                        repeticoes: ex.repeticoes,
                        carga: ex.carga,
                        observacoes: ex.observacoes,
                        ordemNoDia: ex.ordemNoDia,
                        concluido: false
                    };
                }) ?? []
            })) ?? []
        };

        const novaFichaIndividual = new Treino(newFichaData);
        await novaFichaIndividual.save();

        const fichaPopulada = await Treino.findById(novaFichaIndividual._id)
            .populate({ path: 'alunoId', select: 'nome' })
            .populate({ path: 'pastaId', select: 'nome' })
            .populate({
                path: 'diasDeTreino',
                populate: {
                    path: 'exerciciosDoDia.exercicioId',
                    model: 'Exercicio',
                    select: 'nome urlVideo'
                }
            });

        res.status(201).json(fichaPopulada);

    } catch (error) {
        console.error("Erro ao associar modelo de treino ao aluno:", error);
        next(error);
    }
});


// ... (resto do arquivo sem alterações)
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
    ).populate({ path: 'alunoId', select: 'nome' })
     .populate({ path: 'pastaId', select: 'nome' })
     .populate({
         path: 'diasDeTreino',
         populate: {
             path: 'exerciciosDoDia.exercicioId',
             model: 'Exercicio',
             select: 'nome urlVideo'
         }
     });

    if (!rotina) return res.status(404).json({ mensagem: "Rotina não encontrada ou você não tem permissão." });

    res.status(200).json(rotina);
  } catch (error) {
    next(error);
  }
});

router.put("/:id/pasta", authenticateToken, async (req: Request, res: Response, next: NextFunction) => {
    const { id: rotinaId } = req.params;
    const { pastaId } = req.body;
    const criadorId = req.user?.id;

    if (!criadorId || !mongoose.Types.ObjectId.isValid(rotinaId)) {
        return res.status(400).json({ mensagem: "ID da rotina inválido ou usuário não autenticado." });
    }
    if (pastaId && !mongoose.Types.ObjectId.isValid(pastaId)) {
        return res.status(400).json({ mensagem: "ID da pasta inválido." });
    }

    try {
        if (pastaId) {
            const pastaDestino = await PastaTreino.findOne({ _id: pastaId, criadorId: criadorId });
            if (!pastaDestino) {
                return res.status(404).json({ mensagem: "Pasta de destino não encontrada ou você não tem permissão para usá-la." });
            }
        }

        const rotinaAtualizada = await Treino.findOneAndUpdate(
            { _id: rotinaId, criadorId: criadorId },
            { $set: { pastaId: pastaId ? new Types.ObjectId(pastaId) : null } },
            { new: true }
        ).populate('pastaId', 'nome')
         .populate({
            path: 'diasDeTreino',
            populate: {
                path: 'exerciciosDoDia.exercicioId',
                model: 'Exercicio',
                select: 'nome urlVideo'
            }
        });

        if (!rotinaAtualizada) {
            return res.status(404).json({ mensagem: "Rotina não encontrada ou você não tem permissão para movê-la." });
        }

        res.status(200).json(rotinaAtualizada);

    } catch (error) {
        next(error);
    }
});

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
