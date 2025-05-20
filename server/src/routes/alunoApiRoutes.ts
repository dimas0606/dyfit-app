// server/src/routes/alunoApiRoutes.ts
import express, { Response } from 'express';
import mongoose, { Types } from 'mongoose';
import Treino, { 
    ITreinoPopuladoLean,
    ITreino 
} from '../../models/Treino'; 
import Sessao, { 
    ISessaoDocument, 
    OPCOES_PSE, 
    OpcaoPSE 
} from '../../models/Sessao'; 
import { AuthenticatedAlunoRequest } from '../../middlewares/authenticateAlunoToken';
import { startOfWeek, endOfWeek } from 'date-fns'; 

const router = express.Router();

console.log("--- [server/src/routes/alunoApiRoutes.ts] Ficheiro carregado (CORREÇÕES TS v4 em PATCH toggle) ---");

// --- Rotas GET /meus-treinos e GET /minhas-rotinas/:rotinaId (sem alterações desta vez) ---
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

// Rota: PATCH /api/aluno/rotinas/:rotinaId/dias/:diaId/exercicios/:exercicioDiaId/toggle-concluido
router.patch('/rotinas/:rotinaId/dias/:diaId/exercicios/:exercicioDiaId/toggle-concluido', async (req: AuthenticatedAlunoRequest, res: Response, next) => {
    const alunoId = req.aluno?.id;
    const { rotinaId, diaId, exercicioDiaId } = req.params;

    if (!alunoId) return res.status(401).json({ message: "Aluno não autenticado." });
    if (!Types.ObjectId.isValid(rotinaId) || 
        !Types.ObjectId.isValid(diaId) ||    
        !Types.ObjectId.isValid(exercicioDiaId)) { 
        return res.status(400).json({ message: "IDs inválidos fornecidos."});
    }
    
    const mongoSession = await mongoose.startSession();
    try {
        mongoSession.startTransaction();
        const alunoObjectId = new Types.ObjectId(alunoId);
        const rotinaObjectId = new Types.ObjectId(rotinaId);
        const diaObjectIdString = diaId; // Manter como string para comparação
        const exercicioObjectIdString = exercicioDiaId; // Manter como string para comparação

        const rotina: ITreino | null = await Treino.findOne({ 
            _id: rotinaObjectId, 
            alunoId: alunoObjectId,
            // A query para encontrar o dia e exercício exato é mais eficiente no Mongoose
            // usando o operador $elemMatch ou atualizando diretamente com operadores posicionais.
            // No entanto, para a lógica de encontrar e modificar no código, vamos carregar
            // a rotina se ela contiver o dia (a verificação do exercício será feita no loop).
            "diasDeTreino._id": new Types.ObjectId(diaObjectIdString),
        }).session(mongoSession).exec();

        if (!rotina) {
            await mongoSession.abortTransaction();
            return res.status(404).json({ message: "Rotina ou dia de treino não encontrado para este aluno." });
        }

        let exercicioAtualizadoView; 
        let foiModificado = false;

        // Iterar para encontrar e modificar o exercício específico
        for (const dia of rotina.diasDeTreino) {
            // dia._id é um mongoose.Types.ObjectId aqui. Comparamos sua string.
            if (dia._id && dia._id.toString() === diaObjectIdString) { 
                for (const ex of dia.exerciciosDoDia) {
                    // ex._id é um mongoose.Types.ObjectId aqui. Comparamos sua string.
                    if (ex._id && ex._id.toString() === exercicioObjectIdString) { 
                        ex.concluido = !ex.concluido;
                        exercicioAtualizadoView = ex.toObject(); 
                        foiModificado = true;
                        break; 
                    }
                }
            }
            if (foiModificado) break; 
        }
        
        if (!foiModificado) {
            await mongoSession.abortTransaction();
            return res.status(404).json({ message: "Exercício específico não encontrado para toggle dentro do dia e rotina especificados." });
        }

        await rotina.save({ session: mongoSession });
        await mongoSession.commitTransaction();
        
        console.log(`[PATCH /toggle-concluido] Exercicio ${exercicioDiaId} na rotina ${rotinaId}, dia ${diaId} atualizado para concluido: ${exercicioAtualizadoView?.concluido}.`);
        res.status(200).json({ 
            message: 'Status do exercício atualizado.', 
            concluido: exercicioAtualizadoView?.concluido 
        });

    } catch (error) {
        if (mongoSession.inTransaction()) await mongoSession.abortTransaction();
        console.error("[PATCH /toggle-concluido] Erro:", error);
        next(error);
    } finally {
        await mongoSession.endSession();
    }
});


// --- Outras Rotas (sem alterações nesta rodada) ---
// ... (GET /minhas-sessoes-concluidas-na-semana, GET /minhas-sessoes-agendadas, PATCH /sessoes/:sessaoId/concluir, GET /meu-historico-sessoes)
// As rotas abaixo permanecem como na versão anterior (v3)

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
            sessionDate: { $gte: inicioDaSemana, $lte: fimDaSemana },
        }).select('_id sessionDate tipoCompromisso status concluidaEm pseAluno comentarioAluno rotinaId diaDeTreinoIdentificador')
          .sort({ sessionDate: 1 })
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
    const alunoIdAutenticado = req.aluno?.id;
    const { sessaoId } = req.params;
    const { pseAluno, comentarioAluno } = req.body as { pseAluno?: OpcaoPSE, comentarioAluno?: string };

    if (!alunoIdAutenticado) return res.status(401).json({ message: 'ID do aluno não encontrado no token.' });
    if (!mongoose.Types.ObjectId.isValid(sessaoId)) return res.status(400).json({ message: 'ID da sessão inválido.' });
    if (pseAluno && !OPCOES_PSE.includes(pseAluno)) return res.status(400).json({ message: `Valor de PSE inválido.` });
    
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

        if (!jaEstavaConcluida && sessao.rotinaId) { 
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
            .sort({ concluidaEm: -1, sessionDate: -1 })
            .skip(skip).limit(limit)
            .lean<any[]>(); 
        const totalSessoesQuery = Sessao.countDocuments(queryConditions);
        const [sessoes, totalSessoes] = await Promise.all([sessoesQuery, totalSessoesQuery]);
        const totalPages = Math.ceil(totalSessoes / limit);
        res.status(200).json({ sessoes, currentPage: page, totalPages, totalSessoes });
    } catch (error) {
        next(error);
    }
});

export default router;