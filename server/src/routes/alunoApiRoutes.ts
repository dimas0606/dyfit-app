// server/src/routes/alunoApiRoutes.ts
import express, { Response } from 'express';
import mongoose, { Types } from 'mongoose';
import Treino, { 
    ITreinoPopuladoLean,
    ITreino,
    IDiaDeTreino 
} from '../../models/Treino'; 
import Sessao, { 
    ISessaoDocument, 
    OPCOES_PSE, 
    OpcaoPSE,
    ISessaoLean
} from '../../models/Sessao'; 
import { AuthenticatedAlunoRequest } from '../../middlewares/authenticateAlunoToken';
import { startOfWeek, endOfWeek } from 'date-fns'; 

const router = express.Router();

console.log("--- [server/src/routes/alunoApiRoutes.ts] v10 - Add nomeSubFichaDia to Sessao ---");

// --- Rotas GET /meus-treinos e GET /minhas-rotinas/:rotinaId ---
router.get('/meus-treinos', async (req: AuthenticatedAlunoRequest, res: Response, next) => {
    const alunoId = req.aluno?.id;
    if (!alunoId) return res.status(401).json({ message: 'ID do aluno não encontrado no token.' }); 
    try {
        const alunoObjectId = new Types.ObjectId(alunoId);
        let query = Treino.find({ alunoId: alunoObjectId, tipo: 'individual' })
                          .sort({ atualizadoEm: -1, criadoEm: -1 }); 
        query = query.populate({ path: 'criadorId', select: 'nome email _id' });
        query = query.populate({
            path: 'diasDeTreino.exerciciosDoDia.exercicioId', 
            select: 'nome grupoMuscular urlVideo tipo categoria descricao _id' 
        });
        const rotinasDoAluno = await query.lean<ITreinoPopuladoLean[]>();
        res.status(200).json(rotinasDoAluno);
    } catch (error) { 
        next(error); 
    }
});

router.get('/minhas-rotinas/:rotinaId', async (req: AuthenticatedAlunoRequest, res: Response, next) => {
    const alunoId = req.aluno?.id;
    const { rotinaId } = req.params; 
    if (!alunoId) return res.status(401).json({ message: 'ID do aluno não encontrado no token.' });
    if (!mongoose.Types.ObjectId.isValid(rotinaId)) return res.status(400).json({ message: 'ID da rotina inválido.' });
    try {
        const alunoObjectId = new Types.ObjectId(alunoId);
        const rotinaObjectId = new Types.ObjectId(rotinaId);
        let query = Treino.findOne({ _id: rotinaObjectId, alunoId: alunoObjectId, tipo: 'individual' });
        query = query.populate({ path: 'criadorId', select: 'nome email _id' });
        query = query.populate({
            path: 'diasDeTreino.exerciciosDoDia.exercicioId',
            select: 'nome grupoMuscular urlVideo tipo categoria descricao _id'
        });
        const rotina = await query.lean<ITreinoPopuladoLean | null>();
        if (!rotina) return res.status(404).json({ message: 'Rotina de treino não encontrada ou acesso não permitido.' });
        res.status(200).json(rotina);
    } catch (error) { 
        next(error); 
    }
});

// Rota PATCH .../toggle-concluido FOI REMOVIDA

router.post('/sessoes/concluir-dia', async (req: AuthenticatedAlunoRequest, res: Response, next) => {
    const alunoId = req.aluno?.id;
    const { rotinaId, diaDeTreinoId, pseAluno, comentarioAluno } = req.body as { 
        rotinaId: string; 
        diaDeTreinoId: string;
        pseAluno?: OpcaoPSE | null;
        comentarioAluno?: string | null;
    };

    if (!alunoId) return res.status(401).json({ message: 'Aluno não autenticado.' });
    if (!rotinaId || !diaDeTreinoId) return res.status(400).json({ message: 'IDs da rotina e do dia de treino são obrigatórios.' });
    if (!mongoose.Types.ObjectId.isValid(rotinaId) || !mongoose.Types.ObjectId.isValid(diaDeTreinoId)) {
        return res.status(400).json({ message: 'IDs da rotina ou do dia de treino inválidos.' });
    }
    if (pseAluno && !OPCOES_PSE.includes(pseAluno as OpcaoPSE)) {
        return res.status(400).json({ message: `Valor de PSE '${pseAluno}' inválido.` });
    }

    const mongoTransactionSession = await mongoose.startSession();
    try {
        mongoTransactionSession.startTransaction();
        const alunoObjectId = new Types.ObjectId(alunoId);
        const rotinaObjectId = new Types.ObjectId(rotinaId);
        const diaObjectIdBuscado = new Types.ObjectId(diaDeTreinoId);

        const rotina = await Treino.findOne({
            _id: rotinaObjectId,
            alunoId: alunoObjectId
        }).session(mongoTransactionSession);

        if (!rotina) {
            await mongoTransactionSession.abortTransaction();
            return res.status(404).json({ message: 'Rotina não encontrada ou não pertence a este aluno.' });
        }

        const diaDeTreinoExecutado = rotina.diasDeTreino.find(
            (d: IDiaDeTreino) => d._id instanceof Types.ObjectId && d._id.equals(diaObjectIdBuscado)
        );

        if (!diaDeTreinoExecutado) {
            await mongoTransactionSession.abortTransaction();
            return res.status(404).json({ message: 'Dia de treino especificado não encontrado nesta rotina.' });
        }

        const novaSessao = new Sessao({
            alunoId: alunoObjectId,
            personalId: rotina.criadorId, 
            rotinaId: rotinaObjectId,
            diaDeTreinoId: diaDeTreinoExecutado._id,
            diaDeTreinoIdentificador: diaDeTreinoExecutado.identificadorDia,
            nomeSubFichaDia: diaDeTreinoExecutado.nomeSubFicha || null, // <<< ADICIONADO AQUI >>>
            sessionDate: new Date(), 
            status: 'completed',
            concluidaEm: new Date(),
            pseAluno: pseAluno || null,
            comentarioAluno: comentarioAluno?.trim() || null,
            tipoCompromisso: 'treino_rotina', 
        });
        await novaSessao.save({ session: mongoTransactionSession });

        rotina.sessoesRotinaConcluidas = (rotina.sessoesRotinaConcluidas || 0) + 1;
        await rotina.save({ session: mongoTransactionSession });

        await mongoTransactionSession.commitTransaction();
        
        const sessaoPopulada = await Sessao.findById(novaSessao._id)
            .populate<{ rotinaId: Pick<ITreinoPopuladoLean, 'titulo' | '_id'> | null }>({ path: 'rotinaId', select: 'titulo _id' })
            .lean<ISessaoDocument>();

        res.status(201).json(sessaoPopulada);

    } catch (error) {
        if (mongoTransactionSession.inTransaction()) {
            await mongoTransactionSession.abortTransaction();
        }
        console.error("[POST /sessoes/concluir-dia] Erro:", error);
        next(error);
    } finally {
        await mongoTransactionSession.endSession();
    }
});

router.patch('/sessoes/:sessaoId/feedback', async (req: AuthenticatedAlunoRequest, res: Response, next) => {
    const alunoIdAutenticado = req.aluno?.id;
    const { sessaoId } = req.params;
    const { pseAluno, comentarioAluno } = req.body as { pseAluno?: OpcaoPSE | null, comentarioAluno?: string | null };

    if (!alunoIdAutenticado) return res.status(401).json({ message: 'ID do aluno não encontrado no token.' });
    if (!mongoose.Types.ObjectId.isValid(sessaoId)) return res.status(400).json({ message: 'ID da sessão inválido.' });
    if (pseAluno && !OPCOES_PSE.includes(pseAluno as OpcaoPSE)) {
        return res.status(400).json({ message: `Valor de PSE inválido.` });
    }
    
    try {
        const alunoObjectId = new Types.ObjectId(alunoIdAutenticado);
        const sessaoObjectId = new Types.ObjectId(sessaoId);
        
        const sessao = await Sessao.findOne({ _id: sessaoObjectId, alunoId: alunoObjectId, status: 'completed' });
        if (!sessao) {
            return res.status(404).json({ message: 'Sessão concluída não encontrada ou acesso não permitido.' });
        }
        
        if (pseAluno !== undefined) sessao.pseAluno = pseAluno || null;
        if (comentarioAluno !== undefined) sessao.comentarioAluno = comentarioAluno?.trim() || null;
        
        await sessao.save();
        
        res.status(200).json({ message: 'Feedback da sessão atualizado.', sessao: sessao.toObject() });

    } catch (error) {
        console.error("[PATCH /sessoes/:sessaoId/feedback] Erro:", error);
        next(error);
    }
});

router.get('/rotinas/:rotinaId/sessoes-concluidas', async (req: AuthenticatedAlunoRequest, res: Response, next) => {
    const alunoId = req.aluno?.id;
    const { rotinaId } = req.params;

    if (!alunoId) return res.status(401).json({ message: 'ID do aluno não encontrado no token.' });
    if (!mongoose.Types.ObjectId.isValid(rotinaId)) return res.status(400).json({ message: 'ID da rotina inválido.' });

    try {
        const alunoObjectId = new Types.ObjectId(alunoId);
        const rotinaObjectId = new Types.ObjectId(rotinaId);

        const sessoes = await Sessao.find({
            alunoId: alunoObjectId,
            rotinaId: rotinaObjectId,
            status: 'completed'
        })
        .select('diaDeTreinoId concluidaEm _id') 
        .sort({ concluidaEm: -1 }) 
        .lean<Pick<ISessaoLean, 'diaDeTreinoId' | 'concluidaEm' | '_id'>[]>(); 

        res.status(200).json(sessoes);
    } catch (error) {
        console.error(`[GET /rotinas/${rotinaId}/sessoes-concluidas] Erro:`, error);
        next(error);
    }
});

router.get('/minhas-sessoes-concluidas-na-semana', async (req: AuthenticatedAlunoRequest, res: Response, next) => {
    const alunoId = req.aluno?.id;
    if (!alunoId) return res.status(401).json({ message: 'ID do aluno não encontrado no token.' });
    try {
        const alunoObjectId = new Types.ObjectId(alunoId);
        const hoje = new Date();
        const inicioDaSemana = startOfWeek(hoje, { weekStartsOn: 1 }); 
        const fimDaSemana = endOfWeek(hoje, { weekStartsOn: 1 });
        const sessoesConcluidas = await Sessao.find({
            alunoId: alunoObjectId, status: 'completed',
            concluidaEm: { $gte: inicioDaSemana, $lte: fimDaSemana }, 
        }).select('_id sessionDate concluidaEm tipoCompromisso') 
          .sort({ concluidaEm: 1 })
          .lean();
        res.status(200).json(sessoesConcluidas);
    } catch (error) { next(error); }
});

router.get('/minhas-sessoes-agendadas', async (req: AuthenticatedAlunoRequest, res: Response, next) => {
    const alunoId = req.aluno?.id;
    if (!alunoId) return res.status(401).json({ message: 'ID do aluno não encontrado no token.' });
    try {
        const alunoObjectId = new Types.ObjectId(alunoId);
        const hoje = new Date();
        const inicioDeHoje = new Date(hoje.setHours(0, 0, 0, 0)); 
        const sessoesAgendadas = await Sessao.find({
            alunoId: alunoObjectId, status: { $in: ['pending', 'confirmed'] }, 
            sessionDate: { $gte: inicioDeHoje },
        })
        .populate<{ rotinaId: Pick<ITreinoPopuladoLean, 'titulo' | '_id'> | null }>({ path: 'rotinaId', select: 'titulo _id' })
        .populate<{ personalId: { _id: string, nome: string } | null }>({ path: 'personalId', select: 'nome _id' })
        .sort({ sessionDate: 1 }).limit(5) 
        .lean<any[]>(); 
        res.status(200).json(sessoesAgendadas);
    } catch (error) { next(error); }
});

router.patch('/sessoes/:sessaoId/concluir', async (req: AuthenticatedAlunoRequest, res: Response, next) => {
    // ... (código existente, com o console.warn) ...
    const alunoIdAutenticado = req.aluno?.id;
    const { sessaoId } = req.params;
    const { pseAluno, comentarioAluno } = req.body as { pseAluno?: OpcaoPSE, comentarioAluno?: string };

    console.warn (`[DEPRECATION WARNING] Rota PATCH /api/aluno/sessoes/${sessaoId}/concluir foi chamada. Considere usar POST /api/aluno/sessoes/concluir-dia para rotinas ou um endpoint específico para sessões avulsas.`);

    if (!alunoIdAutenticado) return res.status(401).json({ message: 'ID do aluno não encontrado no token.' });
    if (!mongoose.Types.ObjectId.isValid(sessaoId)) return res.status(400).json({ message: 'ID da sessão inválido.' });
    if (pseAluno && !OPCOES_PSE.includes(pseAluno as OpcaoPSE)) return res.status(400).json({ message: `Valor de PSE inválido.` });
    
    const mongoTransactionSession = await mongoose.startSession();
    try {
        mongoTransactionSession.startTransaction();
        const alunoObjectId = new Types.ObjectId(alunoIdAutenticado);
        const sessaoObjectId = new Types.ObjectId(sessaoId);
        
        const sessao: ISessaoDocument | null = await Sessao.findOne({ _id: sessaoObjectId, alunoId: alunoObjectId }).session(mongoTransactionSession);
        if (!sessao) {
            await mongoTransactionSession.abortTransaction();
            return res.status(404).json({ message: 'Sessão não encontrada ou acesso não permitido.' });
        }

        let jaEstavaConcluida = sessao.status === 'completed';
        if (!jaEstavaConcluida) {
            sessao.status = 'completed';
            sessao.concluidaEm = new Date(); 
        }
        
        if (pseAluno !== undefined) sessao.pseAluno = pseAluno || null;
        if (comentarioAluno !== undefined) sessao.comentarioAluno = comentarioAluno.trim() === '' ? null : comentarioAluno.trim();
        await sessao.save({ session: mongoTransactionSession });

        if (!jaEstavaConcluida && sessao.rotinaId && sessao.diaDeTreinoId) { 
            const rotina: ITreino | null = await Treino.findById(sessao.rotinaId).session(mongoTransactionSession);
            if (rotina) {
                if (rotina.alunoId && typeof rotina.alunoId.toString === 'function' && rotina.alunoId.toString() !== alunoIdAutenticado) {
                    await mongoTransactionSession.abortTransaction();
                    return res.status(403).json({ message: "Acesso negado para modificar esta rotina." });
                }
                rotina.sessoesRotinaConcluidas = (rotina.sessoesRotinaConcluidas || 0) + 1;
                await rotina.save({ session: mongoTransactionSession });
            }
        }
        
        await mongoTransactionSession.commitTransaction();
        const respostaSessaoConcluida = { ...sessao.toObject() };
        
        if (jaEstavaConcluida) {
            res.status(200).json({ message: 'Feedback da sessão atualizado.', sessao: respostaSessaoConcluida });
        } else {
            res.status(200).json(respostaSessaoConcluida);
        }
    } catch (error) {
        if (mongoTransactionSession.inTransaction()) await mongoTransactionSession.abortTransaction();
        next(error);
    } finally {
        await mongoTransactionSession.endSession();
    }
});


router.get('/meu-historico-sessoes', async (req: AuthenticatedAlunoRequest, res: Response, next) => {
    const alunoId = req.aluno?.id;
    if (!alunoId) return res.status(401).json({ message: 'ID do aluno não encontrado no token.' });
    const page = parseInt(req.query.page as string) || 1;
    const limit = parseInt(req.query.limit as string) || 10;
    const skip = (page - 1) * limit;
    try {
        const alunoObjectId = new Types.ObjectId(alunoId);
        const queryConditions = { alunoId: alunoObjectId, status: 'completed' }; 
        const sessoesQuery = Sessao.find(queryConditions)
            .populate<{ rotinaId: Pick<ITreinoPopuladoLean, 'titulo' | '_id'> | null }>({ path: 'rotinaId', select: 'titulo _id' })
            .populate<{ personalId: { _id: string, nome: string } | null }>({ path: 'personalId', select: 'nome _id' })
            // <<< AJUSTE AQUI para incluir nomeSubFichaDia no select >>>
            .select('_id sessionDate concluidaEm tipoCompromisso status rotinaId personalId pseAluno comentarioAluno diaDeTreinoIdentificador nomeSubFichaDia') 
            .sort({ concluidaEm: -1, sessionDate: -1 })
            .skip(skip).limit(limit)
            .lean<ISessaoLean[]>(); // <<< Ajustado para ISessaoLean[] >>>
        const totalSessoesQuery = Sessao.countDocuments(queryConditions);
        const [sessoes, totalSessoes] = await Promise.all([sessoesQuery, totalSessoesQuery]);
        const totalPages = Math.ceil(totalSessoes / limit);
        res.status(200).json({ sessoes, currentPage: page, totalPages, totalSessoes });
    } catch (error) {
        next(error);
    }
});

export default router;