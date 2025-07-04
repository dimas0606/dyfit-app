// server/src/routes/alunoApiRoutes.ts

import express, { Request, Response, NextFunction } from 'express'; // Usamos os tipos padrão do Express
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
import { startOfWeek, endOfWeek } from 'date-fns'; 

const router = express.Router();

console.log("--- [server/src/routes/alunoApiRoutes.ts] v11 - Usando Tipagem Global do Express ---");

// --- Rota para buscar as rotinas/fichas do aluno ---
router.get('/meus-treinos', async (req: Request, res: Response, next: NextFunction) => {
    // Agora req.aluno é reconhecido globalmente pelo TypeScript
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

// --- Rota para buscar os dias de treino concluidos na semana (para o gráfico) ---
router.get('/minhas-sessoes-concluidas-na-semana', async (req: Request, res: Response, next: NextFunction) => {
    const alunoId = req.aluno?.id;
    if (!alunoId) return res.status(401).json({ message: 'ID do aluno não encontrado no token.' });
    try {
        const alunoObjectId = new Types.ObjectId(alunoId);
        const hoje = new Date();
        const inicioDaSemana = startOfWeek(hoje, { weekStartsOn: 1 }); // Começa na Segunda
        const fimDaSemana = endOfWeek(hoje, { weekStartsOn: 1 });

        const sessoesConcluidas = await Sessao.find({
            alunoId: alunoObjectId, 
            status: 'completed',
            concluidaEm: { $gte: inicioDaSemana, $lte: fimDaSemana }, 
        }).select('_id sessionDate concluidaEm tipoCompromisso') 
          .sort({ concluidaEm: 1 })
          .lean();
        res.status(200).json(sessoesConcluidas);
    } catch (error) { 
        next(error); 
    }
});


// --- OUTRAS ROTAS (COPIADAS DO SEU ARQUIVO ORIGINAL, SEM ALTERAÇÕES DE LÓGICA) ---

router.get('/minhas-rotinas/:rotinaId', async (req: Request, res: Response, next: NextFunction) => {
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

router.post('/sessoes/concluir-dia', async (req: Request, res: Response, next: NextFunction) => {
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
            return res.status(404).json({ message: 'Dia de treino especificado não nesta rotina.' });
        }

        const novaSessao = new Sessao({
            alunoId: alunoObjectId,
            personalId: rotina.criadorId, 
            rotinaId: rotinaObjectId,
            diaDeTreinoId: diaDeTreinoExecutado._id,
            diaDeTreinoIdentificador: diaDeTreinoExecutado.identificadorDia,
            nomeSubFichaDia: diaDeTreinoExecutado.nomeSubFicha || null,
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

router.get('/minhas-sessoes-agendadas', async (req: Request, res: Response, next: NextFunction) => {
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

router.get('/meu-historico-sessoes', async (req: Request, res: Response, next: NextFunction) => {
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
            .select('_id sessionDate concluidaEm tipoCompromisso status rotinaId personalId pseAluno comentarioAluno diaDeTreinoIdentificador nomeSubFichaDia') 
            .sort({ concluidaEm: -1, sessionDate: -1 })
            .skip(skip).limit(limit)
            .lean<ISessaoLean[]>();
        const totalSessoesQuery = Sessao.countDocuments(queryConditions);
        const [sessoes, totalSessoes] = await Promise.all([sessoesQuery, totalSessoesQuery]);
        const totalPages = Math.ceil(totalSessoes / limit);
        res.status(200).json({ sessoes, currentPage: page, totalPages, totalSessoes });
    } catch (error) {
        next(error);
    }
});

export default router;