// server/src/routes/sessionsRoutes.ts
import express, { Response, NextFunction } from 'express';
import mongoose, { Types } from 'mongoose';
import { authenticateToken, AuthenticatedRequest } from '../../middlewares/authenticateToken';
import Sessao, { ISessaoLean, ISessaoDocument, TipoCompromisso, TIPOS_COMPROMISSO, OpcaoPSE, OPCOES_PSE } from '../../models/Sessao'; // Import completo, incluindo PSE
import Aluno from '../../models/Aluno'; // Usado para verificar se aluno pertence ao personal
import Treino, { ITreino } from '../../models/Treino'; // Importar Treino para lógica de conclusão

const router = express.Router();

console.log("--- [server/src/routes/sessionsRoutes.ts] Ficheiro carregado (vCorrigida para personalId/alunoId e PATCH) ---");

// GET /api/sessions - Listar sessões com filtros
router.get('/', authenticateToken, async (req: AuthenticatedRequest, res: Response, next: NextFunction) => {
    const personalIdFromToken = req.user?.id;
    const { alunoId: alunoIdParam, date, populateStudent, limit, tipoCompromisso: tipoCompromissoQuery } = req.query;

    if (!personalIdFromToken) {
        return res.status(401).json({ mensagem: "Usuário não autenticado." });
    }

    try {
        const queryFilter: any = { personalId: new Types.ObjectId(personalIdFromToken) };

        if (alunoIdParam && typeof alunoIdParam === 'string' && Types.ObjectId.isValid(alunoIdParam)) {
            queryFilter.alunoId = new Types.ObjectId(alunoIdParam);
        }

        if (date && typeof date === 'string') {
            const targetDate = new Date(date);
            if (!isNaN(targetDate.getTime())) {
                const inicioDia = new Date(targetDate);
                inicioDia.setHours(0, 0, 0, 0);
                const fimDia = new Date(targetDate);
                fimDia.setHours(23, 59, 59, 999);
                queryFilter.sessionDate = { $gte: inicioDia, $lte: fimDia };
            }
        }

        if (tipoCompromissoQuery && typeof tipoCompromissoQuery === 'string' && TIPOS_COMPROMISSO.includes(tipoCompromissoQuery as TipoCompromisso)) {
            queryFilter.tipoCompromisso = tipoCompromissoQuery;
        }
        
        let query = Sessao.find(queryFilter).sort({ sessionDate: 1 });

        if (populateStudent === 'true') {
            query = query.populate('alunoId', 'nome _id'); 
        }
        query = query.populate('rotinaId', 'titulo _id'); // Popular rotinaId também, se presente
        
        if (limit && typeof limit === 'string' && !isNaN(parseInt(limit))) {
            query = query.limit(parseInt(limit));
        }

        const sessoes = await query.lean<ISessaoLean[]>(); 
        res.json(sessoes);

    } catch (error) {
        console.error("[GET /api/sessions] Erro ao buscar sessões:", error);
        next(error);
    }
});

// POST /api/sessions - Criar uma nova sessão
router.post('/', authenticateToken, async (req: AuthenticatedRequest, res: Response, next: NextFunction) => {
    const personalIdFromToken = req.user?.id;
    const { alunoId, sessionDate, tipoCompromisso, notes, status, rotinaId, diaDeTreinoId, diaDeTreinoIdentificador } = req.body; 

    if (!personalIdFromToken) return res.status(401).json({ mensagem: "Usuário não autenticado." });
    if (!alunoId || !sessionDate || !status || !tipoCompromisso) {
        return res.status(400).json({ mensagem: "Campos alunoId, sessionDate, status e tipoCompromisso são obrigatórios." });
    }
    if (!Types.ObjectId.isValid(alunoId)) return res.status(400).json({ mensagem: "ID do aluno inválido." });
    if (!TIPOS_COMPROMISSO.includes(tipoCompromisso as TipoCompromisso)) return res.status(400).json({ mensagem: `Tipo de compromisso inválido.` });
    if (rotinaId && !Types.ObjectId.isValid(rotinaId)) return res.status(400).json({ mensagem: "ID da rotina inválido." });
    // diaDeTreinoId pode ser qualquer string se não for ObjectId, ou validar se for ObjectId
    if (diaDeTreinoId && typeof diaDeTreinoId === 'string' && !Types.ObjectId.isValid(diaDeTreinoId)) {
         // Se você espera que diaDeTreinoId seja sempre um ObjectId válido quando presente
         // return res.status(400).json({ mensagem: "ID do dia de treino inválido." });
    }
    
    const validDate = new Date(sessionDate);
    if (isNaN(validDate.getTime())) return res.status(400).json({ mensagem: "Formato de sessionDate inválido." });

    try {
        const personalObjectId = new Types.ObjectId(personalIdFromToken);
        const alunoObjectId = new Types.ObjectId(alunoId);

        const aluno = await Aluno.findOne({ _id: alunoObjectId, trainerId: personalObjectId }); 
        if (!aluno) return res.status(403).json({ mensagem: "Este aluno não pertence a você ou não foi encontrado." });

        const novaSessaoDoc = new Sessao({
            personalId: personalObjectId,
            alunoId: alunoObjectId,      
            sessionDate: validDate,
            tipoCompromisso,
            notes,
            status,
            rotinaId: rotinaId ? new Types.ObjectId(rotinaId) : null,
            diaDeTreinoId: diaDeTreinoId ? new Types.ObjectId(diaDeTreinoId) : null, 
            diaDeTreinoIdentificador: diaDeTreinoIdentificador || null,
        });

        await novaSessaoDoc.save();
        
        const sessaoPopulada = await Sessao.findById(novaSessaoDoc._id)
                                        .populate('alunoId', 'nome _id') 
                                        .populate('rotinaId', 'titulo _id') 
                                        .lean<ISessaoLean>(); 
        res.status(201).json(sessaoPopulada);
    } catch (error: any) {
        if (error.name === 'ValidationError') return res.status(400).json({ mensagem: "Erro de validação", detalhes: error.errors });
        next(error);
    }
});

// PUT /api/sessions/:sessionId - Atualizar uma sessão
router.put('/:sessionId', authenticateToken, async (req: AuthenticatedRequest, res: Response, next: NextFunction) => {
    const personalIdFromToken = req.user?.id;
    const { sessionId } = req.params;
    const { status, notes, sessionDate, tipoCompromisso, rotinaId, diaDeTreinoId, diaDeTreinoIdentificador, alunoId: alunoIdBody, pseAluno, comentarioAluno } = req.body;

    if (!personalIdFromToken) return res.status(401).json({ mensagem: "Usuário não autenticado." });
    if (!Types.ObjectId.isValid(sessionId)) return res.status(400).json({ mensagem: "ID da sessão inválido." });

    const updateData: Partial<ISessaoDocument> = {};
    if (status && ['pending', 'confirmed', 'completed', 'cancelled', 'skipped'].includes(status)) {
        updateData.status = status as ISessaoDocument['status'];
    }
    if (notes !== undefined) updateData.notes = notes;
    if (sessionDate) {
        const validDate = new Date(sessionDate);
        if (isNaN(validDate.getTime())) return res.status(400).json({ mensagem: "Formato de sessionDate inválido." });
        updateData.sessionDate = validDate;
    }
    if (tipoCompromisso && TIPOS_COMPROMISSO.includes(tipoCompromisso as TipoCompromisso)) {
        updateData.tipoCompromisso = tipoCompromisso;
    } else if (tipoCompromisso) {
        return res.status(400).json({ mensagem: `Tipo de compromisso inválido.` });
    }
    if (rotinaId !== undefined) {
        updateData.rotinaId = rotinaId && Types.ObjectId.isValid(rotinaId) ? new Types.ObjectId(rotinaId) : null;
    }
    if (diaDeTreinoId !== undefined) {
        updateData.diaDeTreinoId = diaDeTreinoId && Types.ObjectId.isValid(diaDeTreinoId) ? new Types.ObjectId(diaDeTreinoId) : null;
    }
    if (diaDeTreinoIdentificador !== undefined) {
        updateData.diaDeTreinoIdentificador = diaDeTreinoIdentificador;
    }
    if (alunoIdBody && Types.ObjectId.isValid(alunoIdBody)) {
        const aluno = await Aluno.findOne({ _id: new Types.ObjectId(alunoIdBody), trainerId: new Types.ObjectId(personalIdFromToken) });
        if (!aluno) return res.status(403).json({ mensagem: "Aluno selecionado não pertence a você ou não foi encontrado." });
        updateData.alunoId = new Types.ObjectId(alunoIdBody);
    }
    if (pseAluno !== undefined) updateData.pseAluno = pseAluno as OpcaoPSE || null;
    if (comentarioAluno !== undefined) updateData.comentarioAluno = comentarioAluno;

    
    if (Object.keys(updateData).length === 0) {
        return res.status(400).json({ mensagem: "Nenhum dado válido para atualização fornecido." });
    }

    const mongoTransactionSession = await mongoose.startSession(); // Iniciar sessão para transação
    try {
        mongoTransactionSession.startTransaction();
        const personalObjectId = new Types.ObjectId(personalIdFromToken);
        const sessionObjectId = new Types.ObjectId(sessionId);

        // Buscar a sessão ANTES de tentar atualizá-la para pegar o estado anterior (se necessário)
        const sessaoExistente = await Sessao.findOne({ _id: sessionObjectId, personalId: personalObjectId }).session(mongoTransactionSession);
        if (!sessaoExistente) {
            await mongoTransactionSession.abortTransaction();
            return res.status(404).json({ mensagem: "Sessão não encontrada ou você não tem permissão para atualizá-la." });
        }

        const jaEstavaConcluida = sessaoExistente.status === 'completed';

        // Aplicar atualizações
        Object.assign(sessaoExistente, updateData);
        if (updateData.status === 'completed' && !sessaoExistente.concluidaEm) {
            sessaoExistente.concluidaEm = new Date();
        }
        await sessaoExistente.save({ session: mongoTransactionSession });

        // Lógica para incrementar contador da rotina
        if (updateData.status === 'completed' && !jaEstavaConcluida && sessaoExistente.rotinaId) {
            const rotina: ITreino | null = await Treino.findById(sessaoExistente.rotinaId).session(mongoTransactionSession);
            if (rotina) {
                if (rotina.alunoId && rotina.alunoId.toString() !== sessaoExistente.alunoId.toString()) { // Comparar strings de ObjectIds
                     await mongoTransactionSession.abortTransaction();
                    return res.status(403).json({ message: "Acesso negado para modificar esta rotina (aluno não corresponde)." });
                }
                rotina.sessoesRotinaConcluidas = (rotina.sessoesRotinaConcluidas || 0) + 1;
                await rotina.save({ session: mongoTransactionSession });
            }
        }
        
        await mongoTransactionSession.commitTransaction();
        
        const sessaoAtualizadaPopulada = await Sessao.findById(sessaoExistente._id)
            .populate('alunoId', 'nome _id')
            .populate('rotinaId', 'titulo _id')
            .lean<ISessaoLean>();

        res.json(sessaoAtualizadaPopulada);

    } catch (error: any) {
        if (mongoTransactionSession.inTransaction()) await mongoTransactionSession.abortTransaction();
        if (error.name === 'ValidationError') return res.status(400).json({ mensagem: "Erro de validação", detalhes: error.errors });
        next(error);
    } finally {
        await mongoTransactionSession.endSession();
    }
});

// DELETE /api/sessions/:sessionId - Excluir uma sessão
router.delete('/:sessionId', authenticateToken, async (req: AuthenticatedRequest, res: Response, next: NextFunction) => {
    const personalIdFromToken = req.user?.id;
    const { sessionId } = req.params;

    if(!personalIdFromToken) return res.status(401).json({ mensagem: "Usuário não autenticado." });
    if(!Types.ObjectId.isValid(sessionId)) return res.status(400).json({ mensagem: "ID da sessão inválido." });

    try {
        const result = await Sessao.deleteOne({ _id: new Types.ObjectId(sessionId), personalId: new Types.ObjectId(personalIdFromToken) });
        if (result.deletedCount === 0) {
            return res.status(404).json({ mensagem: "Sessão não encontrada ou você não tem permissão para excluí-la." });
        }
        res.status(200).json({ mensagem: "Sessão excluída com sucesso." });
    } catch (error) {
        next(error);
    }
});

export default router;