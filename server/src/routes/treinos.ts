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
import { authenticateToken, AuthenticatedRequest } from '../../middlewares/authenticateToken';
import { isValid as isDateValid, parseISO } from 'date-fns';

const router = express.Router();

console.log("--- [server/src/routes/treinos.ts] Ficheiro carregado (CORREÇÃO v5.8 - Associar qualquer rotina) ---");

// --- INTERFACES PARA INPUT DE DADOS (REQ.BODY) ---
interface ExercicioInputData {
    exercicioId: string;
    series?: string;
    repeticoes?: string;
    carga?: string;
    descanso?: string;
    observacoes?: string;
    ordemNoDia: number;
    concluido?: boolean;
    _id?: string; // Para manter o ID do subdocumento ao editar
}

interface DiaDeTreinoInputData {
    identificadorDia: string;
    nomeSubFicha?: string;
    ordemNaRotina: number;
    exerciciosDoDia: ExercicioInputData[];
    _id?: string; // Para manter o ID do subdocumento ao editar
}

// --- FUNÇÕES DE VALIDAÇÃO AUXILIARES ---
const isValidExercicioInput = (ex: any): ex is ExercicioInputData => {
    return ex &&
           typeof ex.exercicioId === 'string' && mongoose.Types.ObjectId.isValid(ex.exercicioId) &&
           typeof ex.ordemNoDia === 'number' &&
           (ex._id === undefined || ex._id === null || (typeof ex._id === 'string' && mongoose.Types.ObjectId.isValid(ex._id)));
};

const isValidDiaDeTreinoInput = (dia: any): dia is DiaDeTreinoInputData => {
    return dia &&
           typeof dia.identificadorDia === 'string' && dia.identificadorDia.trim() !== '' &&
           typeof dia.ordemNaRotina === 'number' &&
           Array.isArray(dia.exerciciosDoDia) && dia.exerciciosDoDia.every(isValidExercicioInput) &&
           (dia._id === undefined || dia._id === null || (typeof dia._id === 'string' && mongoose.Types.ObjectId.isValid(dia._id)));
};


// --- ROTA POST /api/treinos - CRIAR ROTINA DE TREINO ---
router.post("/", authenticateToken, async (req: AuthenticatedRequest, res: Response, next: NextFunction) => {
    const criadorId = req.user?.id;
    const {
        titulo, descricao, tipo, tipoOrganizacaoRotina,
        alunoId: alunoIdInput, pastaId: pastaIdInputString, statusModelo,
        dataValidade: dataValidadeInputString, totalSessoesRotinaPlanejadas: totalSessoesInput,
        diasDeTreino: diasDeTreinoInput
    } = req.body as Partial<Omit<ITreino, 'diasDeTreino' | 'criadorId' | 'sessoesRotinaConcluidas' | 'criadoEm' | 'atualizadoEm'> & { diasDeTreino: DiaDeTreinoInputData[] }>;


    if (!criadorId) return res.status(401).json({ mensagem: "Usuário não autenticado." });
    if (!titulo || !titulo.trim()) return res.status(400).json({ mensagem: "Título obrigatório." });
    if (!tipo || !["modelo", "individual"].includes(tipo)) return res.status(400).json({ mensagem: "Tipo inválido." });
    if (!tipoOrganizacaoRotina || !TIPOS_ORGANIZACAO_ROTINA.includes(tipoOrganizacaoRotina)) {
        return res.status(400).json({ mensagem: `Tipo de organização inválido.` });
    }
    if (diasDeTreinoInput !== undefined && !Array.isArray(diasDeTreinoInput)) {
        return res.status(400).json({ mensagem: "'diasDeTreino' deve ser um array." });
    }
    if (Array.isArray(diasDeTreinoInput) && diasDeTreinoInput.length > 0 && diasDeTreinoInput.some(dia => !isValidDiaDeTreinoInput(dia))) {
        return res.status(400).json({ mensagem: "Se 'diasDeTreino' for fornecido e não vazio, cada dia deve ser válido e seus exercícios também." });
    }
    
    const session = await mongoose.startSession();
    try {
        session.startTransaction();
        const criadorObjectId = new Types.ObjectId(criadorId);
        
        const diasDeTreinoParaSalvar: Partial<IDiaDeTreino>[] = (diasDeTreinoInput || []).map((dia: DiaDeTreinoInputData) => {
            const exerciciosFormatados: Partial<IExercicioEmDiaDeTreino>[] = dia.exerciciosDoDia.map((ex: ExercicioInputData) => {
                return {
                    exercicioId: new Types.ObjectId(ex.exercicioId),
                    series: ex.series, repeticoes: ex.repeticoes, carga: ex.carga,
                    descanso: ex.descanso, observacoes: ex.observacoes,
                    ordemNoDia: ex.ordemNoDia, concluido: ex.concluido ?? false,
                    // _id será gerado pelo Mongoose se não existir, ou mantido se ex._id for válido
                    ...(ex._id && Types.ObjectId.isValid(ex._id) && { _id: new Types.ObjectId(ex._id) })
                };
            });
            const diaData: Partial<IDiaDeTreino> = {
                identificadorDia: dia.identificadorDia.trim(),
                nomeSubFicha: dia.nomeSubFicha?.trim(),
                ordemNaRotina: dia.ordemNaRotina,
                exerciciosDoDia: exerciciosFormatados as any,
                 // _id será gerado pelo Mongoose se não existir, ou mantido se dia._id for válido
                ...(dia._id && Types.ObjectId.isValid(dia._id) && { _id: new Types.ObjectId(dia._id) })
            };
            return diaData;
        });

        const novaRotinaData: Partial<ITreino> = {
            titulo: titulo.trim(),
            descricao: descricao?.trim(),
            tipo: tipo,
            tipoOrganizacaoRotina: tipoOrganizacaoRotina,
            criadorId: criadorObjectId,
            diasDeTreino: diasDeTreinoParaSalvar as any,
            sessoesRotinaConcluidas: 0,
        };

        if (tipo === "modelo") {
            novaRotinaData.statusModelo = statusModelo && ["ativo", "rascunho", "arquivado"].includes(statusModelo as string) ? (statusModelo as "ativo" | "rascunho" | "arquivado") : "rascunho";
            const pastaIdInput = pastaIdInputString as string | undefined | null;
            if (pastaIdInput && pastaIdInput !== "nenhuma" && pastaIdInput !== null && pastaIdInput !== "") {
                if (!mongoose.Types.ObjectId.isValid(pastaIdInput)) {
                    await session.abortTransaction(); return res.status(400).json({ mensagem: "ID da pasta inválido." });
                }
                const pastaObjectId = new Types.ObjectId(pastaIdInput);
                const pastaExiste = await PastaTreino.findOne({ _id: pastaObjectId, criadorId: criadorObjectId }).session(session);
                if (!pastaExiste) {
                    await session.abortTransaction(); return res.status(404).json({ mensagem: "Pasta não encontrada." });
                }
                novaRotinaData.pastaId = pastaObjectId;
                const proximaOrdem = await Treino.countDocuments({ criadorId: criadorObjectId, tipo: 'modelo', pastaId: pastaObjectId }).session(session);
                novaRotinaData.ordemNaPasta = proximaOrdem;
            } else {
                novaRotinaData.pastaId = null;
                const proximaOrdem = await Treino.countDocuments({ criadorId: criadorObjectId, tipo: 'modelo', pastaId: null }).session(session);
                novaRotinaData.ordemNaPasta = proximaOrdem;
            }
        } else if (tipo === "individual") {
            const alunoIdVal = alunoIdInput as string | undefined;
            if (!alunoIdVal || !mongoose.Types.ObjectId.isValid(alunoIdVal)) {
                await session.abortTransaction(); return res.status(400).json({ mensagem: "ID do aluno inválido." });
            }
            const alunoObjectId = new Types.ObjectId(alunoIdVal);
            const alunoExiste = await Aluno.findOne({ _id: alunoObjectId, trainerId: criadorObjectId }).session(session);
            if (!alunoExiste) {
                await session.abortTransaction(); return res.status(404).json({ mensagem: "Aluno não encontrado ou não pertence a este personal." });
            }
            novaRotinaData.alunoId = alunoObjectId;
            
            const dataValidadeStr = dataValidadeInputString as string | undefined;
            if (dataValidadeStr) {
                const parsedDate = parseISO(dataValidadeStr);
                if (!isDateValid(parsedDate)) {
                    await session.abortTransaction(); return res.status(400).json({ mensagem: "Data de validade inválida." });
                }
                novaRotinaData.dataValidade = parsedDate;
            } else {
                novaRotinaData.dataValidade = null;
            }

            const totalSessoesVal = totalSessoesInput as number | string | null | undefined;
            if (totalSessoesVal !== undefined && totalSessoesVal !== null && String(totalSessoesVal).trim() !== '') {
                const parsedSessoes = parseInt(String(totalSessoesVal), 10);
                if (isNaN(parsedSessoes) || parsedSessoes < 0) {
                    await session.abortTransaction(); return res.status(400).json({ mensagem: "Número de sessões inválido." });
                }
                novaRotinaData.totalSessoesRotinaPlanejadas = parsedSessoes;
            } else {
                novaRotinaData.totalSessoesRotinaPlanejadas = null;
            }
        }

        const rotinaCriada = new Treino(novaRotinaData);
        await rotinaCriada.save({ session });
        await session.commitTransaction();

        const rotinaPopulada = await Treino.findById(rotinaCriada._id)
            .populate({ path: 'diasDeTreino.exerciciosDoDia.exercicioId', select: 'nome grupoMuscular urlVideo tipo categoria descricao _id' })
            .populate({ path: 'alunoId', select: 'nome email _id fotoPerfil' })
            .populate({ path: 'pastaId', select: 'nome _id' })
            .populate({ path: 'criadorId', select: 'nome email _id' })
            .lean<ITreinoPopuladoLean>();
        res.status(201).json(rotinaPopulada);

    } catch (error: any) {
        if (session.inTransaction()) await session.abortTransaction();
        if (error.name === 'ValidationError') {
            const mensagens = Object.values(error.errors).map((el: any) => el.message);
            return res.status(400).json({ mensagem: `Erro de validação: ${mensagens.join(', ')}` });
        }
        if (error instanceof mongoose.Error.CastError && error.path === '_id') {
             return res.status(400).json({ mensagem: `ID inválido fornecido: ${error.value}` });
        }
        console.error("Erro ao criar rotina:", error);
        next(error);
    } finally {
        if (session.inTransaction()) await session.abortTransaction(); // Garante abort em caso de erro não pego
        await session.endSession();
    }
});


// --- POST /api/treinos/associar-modelo ---
router.post("/associar-modelo", authenticateToken, async (req: AuthenticatedRequest, res: Response, next: NextFunction) => {
    const criadorId = req.user?.id;
    const {
        fichaModeloId, // ID da rotina base (modelo ou individual)
        alunoId,       // ID do aluno para quem a nova rotina individual será criada
        dataValidade: dataValidadeInput,
        totalSessoesRotinaPlanejadas: totalSessoesInput
    } = req.body;

    if (!criadorId) return res.status(401).json({ mensagem: "Usuário não autenticado." });
    if (!mongoose.Types.ObjectId.isValid(fichaModeloId as string) || !mongoose.Types.ObjectId.isValid(alunoId as string)) {
        return res.status(400).json({ mensagem: "IDs inválidos para rotina base ou aluno." });
    }

    const session = await mongoose.startSession();
    try {
        session.startTransaction();
        const criadorObjectId = new Types.ObjectId(criadorId);
        const fichaBaseObjectId = new Types.ObjectId(fichaModeloId as string);
        const alunoObjectId = new Types.ObjectId(alunoId as string);

        // Busca a rotina base (pode ser modelo ou individual)
        const rotinaBaseParaCopia = await Treino.findOne({ 
            _id: fichaBaseObjectId, 
            criadorId: criadorObjectId // Garante que a rotina base pertence ao personal
        })
        .lean<ITreino | null>() // ITreino é a interface do Mongoose
        .session(session);

        if (!rotinaBaseParaCopia) {
            await session.abortTransaction(); 
            // Mensagem de erro mais genérica
            return res.status(404).json({ mensagem: "Rotina base para cópia não encontrada ou não pertence a você." });
        }

        const alunoDoc = await Aluno.findOne({ _id: alunoObjectId, trainerId: criadorObjectId }).session(session);
        if (!alunoDoc) {
            await session.abortTransaction(); return res.status(404).json({ mensagem: "Aluno não encontrado ou não pertence a este personal." });
        }

        // Mapeia os dias de treino e exercícios da rotina base
        const diasDeTreinoCopiados: Partial<IDiaDeTreino>[] = (rotinaBaseParaCopia.diasDeTreino || []).map(dia => {
            const exerciciosCopiados: Partial<IExercicioEmDiaDeTreino>[] = (dia.exerciciosDoDia || []).map(ex => {
                return {
                    exercicioId: ex.exercicioId, // Mantém o ID do exercício da biblioteca
                    series: ex.series, 
                    repeticoes: ex.repeticoes, 
                    carga: ex.carga,
                    descanso: ex.descanso, 
                    observacoes: ex.observacoes, 
                    ordemNoDia: ex.ordemNoDia, 
                    concluido: false, // Nova rotina começa com exercícios não concluídos
                };
            });
            return {
                identificadorDia: dia.identificadorDia, 
                nomeSubFicha: dia.nomeSubFicha, 
                ordemNaRotina: dia.ordemNaRotina,
                exerciciosDoDia: exerciciosCopiados as any, // Tipagem para Mongoose
            };
        });

        // Prepara o payload para a nova rotina individual
        const novaRotinaIndividualPayload: Partial<ITreino> = {
            titulo: `${rotinaBaseParaCopia.titulo} (Aluno: ${alunoDoc.nome.split(' ')[0]})`,
            descricao: rotinaBaseParaCopia.descricao, 
            tipo: 'individual', // A nova rotina é SEMPRE individual
            tipoOrganizacaoRotina: rotinaBaseParaCopia.tipoOrganizacaoRotina,
            alunoId: alunoObjectId, 
            criadorId: criadorObjectId,
            diasDeTreino: diasDeTreinoCopiados as any, // Tipagem para Mongoose
            pastaId: null, // Rotinas individuais não pertencem a pastas de modelos
            statusModelo: undefined, // Não se aplica a rotinas individuais
            ordemNaPasta: undefined, // Não se aplica
            sessoesRotinaConcluidas: 0, // Começa com zero
        };

        // Processa data de validade e total de sessões, se fornecidos
        const dataValidadeStr = dataValidadeInput as string | undefined;
        if (dataValidadeStr) {
            const parsedDate = parseISO(dataValidadeStr);
            if (isDateValid(parsedDate)) novaRotinaIndividualPayload.dataValidade = parsedDate;
            else { await session.abortTransaction(); return res.status(400).json({ mensagem: "Data de validade inválida fornecida."}); }
        }
        const totalSessoesVal = totalSessoesInput as number | string | null | undefined;
        if (totalSessoesVal !== undefined && totalSessoesVal !== null && String(totalSessoesVal).trim() !== '') {
            const parsedSessoes = parseInt(String(totalSessoesVal), 10);
            if (!isNaN(parsedSessoes) && parsedSessoes >= 0) novaRotinaIndividualPayload.totalSessoesRotinaPlanejadas = parsedSessoes;
            else { await session.abortTransaction(); return res.status(400).json({ mensagem: "Número de sessões inválido fornecido."}); }
        }

        const novaRotinaIndividual = new Treino(novaRotinaIndividualPayload);
        await novaRotinaIndividual.save({ session });
        await session.commitTransaction();

        const rotinaPopulada = await Treino.findById(novaRotinaIndividual._id)
            .populate({ path: 'diasDeTreino.exerciciosDoDia.exercicioId', select: 'nome grupoMuscular urlVideo _id tipo categoria descricao' })
            .populate({ path: 'alunoId', select: 'nome email _id fotoPerfil' })
            .populate({ path: 'criadorId', select: 'nome email _id' })
            .lean<ITreinoPopuladoLean>();
        res.status(201).json(rotinaPopulada);

    } catch (error: any) {
        if (session.inTransaction()) await session.abortTransaction();
        console.error("Erro ao associar/copiar rotina:", error); // Log de erro mais genérico
        next(error);
    } finally {
        if (session.inTransaction()) await session.abortTransaction(); // Garante abort em caso de erro não pego
        await session.endSession();
    }
});


// --- GET /api/treinos ---
router.get("/", authenticateToken, async (req: AuthenticatedRequest, res: Response, next: NextFunction) => {
  try {
    const criadorId = req.user?.id;
    const { tipo, alunoId, pastaId: pastaIdInput, limit, statusModelo } = req.query;

    if (!criadorId) return res.status(401).json({ mensagem: "Usuário não autenticado." });
    const criadorObjectId = new Types.ObjectId(criadorId);
    const queryFilter: mongoose.FilterQuery<ITreino> = { criadorId: criadorObjectId };

    if (tipo && typeof tipo === 'string' && ['modelo', 'individual'].includes(tipo)) {
        queryFilter.tipo = tipo as "modelo" | "individual";
    }
    if (queryFilter.tipo === 'individual' && alunoId && typeof alunoId === 'string' && mongoose.Types.ObjectId.isValid(alunoId)) {
        queryFilter.alunoId = new Types.ObjectId(alunoId);
    }
    if (queryFilter.tipo === 'modelo') {
        const pastaIdStr = pastaIdInput as string | undefined;
        if (pastaIdStr && pastaIdStr !== "sem-pasta" && pastaIdStr !== "null" && mongoose.Types.ObjectId.isValid(pastaIdStr)) {
            queryFilter.pastaId = new Types.ObjectId(pastaIdStr);
        } else if (pastaIdStr === 'null' || pastaIdStr === 'sem-pasta') {
            queryFilter.pastaId = null;
        }
        if (statusModelo && typeof statusModelo === 'string' && ['ativo', 'rascunho', 'arquivado'].includes(statusModelo)) {
            queryFilter.statusModelo = statusModelo as "ativo" | "rascunho" | "arquivado";
        }
    }

    let mongoQuery = Treino.find(queryFilter);
    mongoQuery = mongoQuery.populate({ path: 'diasDeTreino.exerciciosDoDia.exercicioId', select: 'nome grupoMuscular urlVideo _id tipo categoria descricao' });
    mongoQuery = mongoQuery.populate({ path: 'alunoId', select: 'nome email _id fotoPerfil' });
    mongoQuery = mongoQuery.populate({ path: 'pastaId', select: 'nome _id' });
    mongoQuery = mongoQuery.populate({ path: 'criadorId', select: 'nome email _id' });

    if (queryFilter.tipo === 'modelo') {
        mongoQuery = mongoQuery.sort({ pastaId: 1, ordemNaPasta: 1, atualizadoEm: -1 });
    } else if (queryFilter.tipo === 'individual') {
        mongoQuery = mongoQuery.sort({ atualizadoEm: -1, criadoEm: -1 });
    } else {
        mongoQuery = mongoQuery.sort({ tipo: 1, pastaId: 1, ordemNaPasta: 1, atualizadoEm: -1 });
    }

    if (limit && typeof limit === 'string' && !isNaN(parseInt(limit))) {
        mongoQuery = mongoQuery.limit(parseInt(limit));
    }
    const rotinas = await mongoQuery.lean<ITreinoPopuladoLean[]>();
    res.status(200).json(rotinas);
  } catch (error: any) {
    console.error("Erro ao buscar rotinas:", error);
    next(error);
  }
});

// --- GET /api/treinos/aluno/:alunoId ---
router.get("/aluno/:alunoId", authenticateToken, async (req: AuthenticatedRequest, res: Response, next: NextFunction) => {
  const { alunoId } = req.params;
  const criadorIdToken = req.user?.id;
  try {
    if (!criadorIdToken) return res.status(401).json({ mensagem: "Usuário não autenticado." });
    if (!mongoose.Types.ObjectId.isValid(alunoId)) return res.status(400).json({ mensagem: "ID do aluno inválido." });

    const alunoObjectId = new Types.ObjectId(alunoId);
    const criadorObjectId = new Types.ObjectId(criadorIdToken);
    const alunoDoc = await Aluno.findOne({ _id: alunoObjectId, trainerId: criadorObjectId });
    if (!alunoDoc) return res.status(404).json({ mensagem: "Aluno não encontrado ou não pertence a este personal." });

    const queryFilter: mongoose.FilterQuery<ITreino> = {
        alunoId: alunoObjectId,
        criadorId: criadorObjectId, // Garante que o personal só veja rotinas que ele criou para o aluno
        tipo: 'individual'
    };
    const rotinasDoAluno = await Treino.find(queryFilter)
      .populate({ path: 'diasDeTreino.exerciciosDoDia.exercicioId', select: 'nome grupoMuscular urlVideo _id tipo categoria descricao'})
      .populate({ path: 'alunoId', select: 'nome email _id fotoPerfil' })
      .populate({ path: 'criadorId', select: 'nome email _id' })
      .sort({ atualizadoEm: -1, criadoEm: -1 })
      .lean<ITreinoPopuladoLean[]>();
    res.status(200).json(rotinasDoAluno);
  } catch (error: any) {
    console.error("Erro ao buscar rotinas do aluno:", error);
    next(error);
  }
});

// --- GET /api/treinos/:id ---
router.get("/:id", authenticateToken, async (req: AuthenticatedRequest, res: Response, next: NextFunction) => {
    const { id: rotinaId } = req.params;
    const criadorId = req.user?.id;
    if (!criadorId) return res.status(401).json({ mensagem: "Usuário não autenticado." });
    if (!mongoose.Types.ObjectId.isValid(rotinaId)) return res.status(400).json({ mensagem: "ID da rotina inválido." });
    try {
        const rotinaObjectId = new Types.ObjectId(rotinaId);
        const criadorObjectId = new Types.ObjectId(criadorId);
        const rotina = await Treino.findOne({ _id: rotinaObjectId, criadorId: criadorObjectId })
            .populate({ path: 'diasDeTreino.exerciciosDoDia.exercicioId', select: 'nome grupoMuscular urlVideo tipo categoria descricao _id' })
            .populate({ path: 'alunoId', select: 'nome email _id fotoPerfil' })
            .populate({ path: 'pastaId', select: 'nome _id' })
            .populate({ path: 'criadorId', select: 'nome email _id' })
            .lean<ITreinoPopuladoLean>();
        if (!rotina) return res.status(404).json({ mensagem: "Rotina não encontrada ou acesso não permitido." });
        res.status(200).json(rotina);
    } catch (error: any) {
        console.error(`Erro ao buscar rotina ${rotinaId}:`, error);
        next(error);
    }
});

// --- ROTA PUT /api/treinos/:id - ATUALIZAR ROTINA ---
router.put("/:id", authenticateToken, async (req: AuthenticatedRequest, res: Response, next: NextFunction) => {
    const { id: rotinaId } = req.params;
    const criadorId = req.user?.id;
    const updates = req.body as Partial<Omit<ITreino, 'criadorId' | 'criadoEm' | 'atualizadoEm'> & { diasDeTreino?: DiaDeTreinoInputData[] | null }>;

    if (!criadorId) return res.status(401).json({ mensagem: "Usuário não autenticado." });
    if (!mongoose.Types.ObjectId.isValid(rotinaId)) return res.status(400).json({ mensagem: "ID da rotina inválido." });

    const session = await mongoose.startSession();
    try {
        session.startTransaction();
        const rotinaObjectId = new Types.ObjectId(rotinaId);
        const criadorObjectId = new Types.ObjectId(criadorId);
        const rotinaParaAtualizar = await Treino.findOne({ _id: rotinaObjectId, criadorId: criadorObjectId }).session(session);

        if (!rotinaParaAtualizar) {
            await session.abortTransaction();
            return res.status(404).json({ mensagem: "Rotina não encontrada ou não tem permissão para editá-la." });
        }

        // Atualizar campos básicos
        if (updates.titulo && typeof updates.titulo === 'string') rotinaParaAtualizar.titulo = updates.titulo.trim();
        if (updates.descricao !== undefined) rotinaParaAtualizar.descricao = updates.descricao?.trim() ?? undefined;
        if (updates.tipoOrganizacaoRotina && TIPOS_ORGANIZACAO_ROTINA.includes(updates.tipoOrganizacaoRotina)) {
            rotinaParaAtualizar.tipoOrganizacaoRotina = updates.tipoOrganizacaoRotina;
        }

        // Atualizar campos específicos do tipo
        if (rotinaParaAtualizar.tipo === 'modelo') {
            if (updates.statusModelo && ["ativo", "rascunho", "arquivado"].includes(updates.statusModelo as string)) {
                rotinaParaAtualizar.statusModelo = updates.statusModelo as "ativo" | "rascunho" | "arquivado";
            }
            if (updates.pastaId !== undefined) { // Permite desassociar (pastaId: null)
                const pastaIdInputString = updates.pastaId as string | null;
                if (pastaIdInputString === null || pastaIdInputString === "nenhuma" || pastaIdInputString === "") {
                    rotinaParaAtualizar.pastaId = null;
                } else if (mongoose.Types.ObjectId.isValid(pastaIdInputString)) {
                    const pastaObjectId = new Types.ObjectId(pastaIdInputString);
                    const pastaValida = await PastaTreino.findOne({ _id: pastaObjectId, criadorId: criadorObjectId }).session(session);
                    if (!pastaValida) {
                         await session.abortTransaction(); return res.status(400).json({ mensagem: "Pasta de destino inválida ou não pertence a você." });
                    }
                    rotinaParaAtualizar.pastaId = pastaObjectId;
                } else {
                     await session.abortTransaction(); return res.status(400).json({ mensagem: "ID da pasta fornecido é inválido." });
                }
            }
        } else if (rotinaParaAtualizar.tipo === 'individual') {
            if (updates.dataValidade !== undefined) {
                 const dataValidadeInputString = updates.dataValidade as string | null;
                 if (dataValidadeInputString === null || dataValidadeInputString === '') {
                    rotinaParaAtualizar.dataValidade = null;
                 } else {
                    const parsedDate = parseISO(dataValidadeInputString); // Espera ISO string do frontend
                    if (isDateValid(parsedDate)) {
                       rotinaParaAtualizar.dataValidade = parsedDate;
                    } else {
                        await session.abortTransaction(); return res.status(400).json({ mensagem: "Data de validade inválida." });
                    }
                 }
            }
            if (updates.totalSessoesRotinaPlanejadas !== undefined) {
                const totalSessoesInputVal = updates.totalSessoesRotinaPlanejadas as number | string | null;
                if (totalSessoesInputVal === null || String(totalSessoesInputVal).trim() === '') {
                    rotinaParaAtualizar.totalSessoesRotinaPlanejadas = null;
                } else {
                    const parsedSessoes = parseInt(String(totalSessoesInputVal), 10);
                    if (!isNaN(parsedSessoes) && parsedSessoes >= 0) {
                        rotinaParaAtualizar.totalSessoesRotinaPlanejadas = parsedSessoes;
                    } else {
                        await session.abortTransaction(); return res.status(400).json({ mensagem: "Número de sessões inválido." });
                    }
                }
            }
            if (updates.sessoesRotinaConcluidas !== undefined && typeof updates.sessoesRotinaConcluidas === 'number' && updates.sessoesRotinaConcluidas >=0) {
                rotinaParaAtualizar.sessoesRotinaConcluidas = updates.sessoesRotinaConcluidas;
            }
        }

        // Atualizar diasDeTreino e seus exercícios
        if (updates.diasDeTreino !== undefined) {
            if (updates.diasDeTreino === null || (Array.isArray(updates.diasDeTreino) && updates.diasDeTreino.length === 0)) {
                rotinaParaAtualizar.diasDeTreino = new Types.DocumentArray([]) as Types.DocumentArray<IDiaDeTreino>;
            } else if (Array.isArray(updates.diasDeTreino) && updates.diasDeTreino.length > 0) {
                if (updates.diasDeTreino.some(dia => !isValidDiaDeTreinoInput(dia))) {
                    await session.abortTransaction();
                    return res.status(400).json({ mensagem: "Um ou mais dias de treino no payload de atualização são inválidos." });
                }
                
                const novosDiasDeTreinoProcessados = updates.diasDeTreino.map((diaInput: DiaDeTreinoInputData) => {
                    const exerciciosFormatados = (diaInput.exerciciosDoDia || []).map((exInput: ExercicioInputData) => {
                        const exData: Partial<IExercicioEmDiaDeTreino> & { _id?: Types.ObjectId } = {
                            exercicioId: new Types.ObjectId(exInput.exercicioId),
                            series: exInput.series, repeticoes: exInput.repeticoes, carga: exInput.carga,
                            descanso: exInput.descanso, observacoes: exInput.observacoes,
                            ordemNoDia: exInput.ordemNoDia, concluido: exInput.concluido ?? false,
                        };
                        // Manter _id do subdocumento exercício se estiver editando um existente
                        if (exInput._id && Types.ObjectId.isValid(exInput._id)) {
                            exData._id = new Types.ObjectId(exInput._id);
                        }
                        return exData;
                    });

                    const diaData: Partial<IDiaDeTreino> & { _id?: Types.ObjectId } = {
                        identificadorDia: diaInput.identificadorDia.trim(),
                        nomeSubFicha: diaInput.nomeSubFicha?.trim(),
                        ordemNaRotina: diaInput.ordemNaRotina,
                        exerciciosDoDia: exerciciosFormatados as any,
                    };
                    // Manter _id do subdocumento dia se estiver editando um existente
                    if (diaInput._id && Types.ObjectId.isValid(diaInput._id)) {
                        diaData._id = new Types.ObjectId(diaInput._id);
                    }
                    return diaData;
                });
                // Substitui completamente o array de diasDeTreino
                rotinaParaAtualizar.diasDeTreino = novosDiasDeTreinoProcessados as Types.DocumentArray<IDiaDeTreino>;
            } else {
                await session.abortTransaction();
                return res.status(400).json({ mensagem: "'diasDeTreino' deve ser um array, null para limpar, ou undefined para não alterar." });
            }
        }

        await rotinaParaAtualizar.save({ session });
        await session.commitTransaction();

        const rotinaAtualizadaPopulada = await Treino.findById(rotinaId)
             .populate({ path: 'diasDeTreino.exerciciosDoDia.exercicioId', select: 'nome grupoMuscular urlVideo tipo categoria descricao _id' })
             .populate({ path: 'alunoId', select: 'nome email _id fotoPerfil' })
             .populate({ path: 'pastaId', select: 'nome _id' })
             .populate({ path: 'criadorId', select: 'nome email _id' })
             .lean<ITreinoPopuladoLean>();
        res.status(200).json(rotinaAtualizadaPopulada);

    } catch (error: any) {
        if (session.inTransaction()) await session.abortTransaction();
        if (error instanceof mongoose.Error.CastError && error.path === '_id') {
             return res.status(400).json({ mensagem: `ID inválido fornecido: ${error.value}` });
        }
        console.error(`Erro ao atualizar rotina ${rotinaId}:`, error);
        next(error);
    } finally {
        if (session.inTransaction()) await session.abortTransaction(); // Garante abort em caso de erro não pego
        await session.endSession();
    }
});

// --- DELETE /api/treinos/:id ---
router.delete("/:id", authenticateToken, async (req: AuthenticatedRequest, res: Response, next: NextFunction) => {
  const { id } = req.params;
  const criadorId = req.user?.id;
  if (!criadorId) return res.status(401).json({ mensagem: "Usuário não autenticado." });
  if (!mongoose.Types.ObjectId.isValid(id)) return res.status(400).json({ mensagem: "ID da rotina inválido." });
  
  const session = await mongoose.startSession();
  try {
    session.startTransaction();
    const rotinaObjectId = new Types.ObjectId(id);
    const criadorObjectId = new Types.ObjectId(criadorId);

    const rotinaParaExcluir = await Treino.findOne({ _id: rotinaObjectId, criadorId: criadorObjectId }).session(session);
    if (!rotinaParaExcluir) {
      await session.abortTransaction(); return res.status(404).json({ mensagem: "Rotina não encontrada ou não tem permissão para excluí-la." });
    }

    const resultadoExclusao = await Treino.deleteOne({ _id: rotinaObjectId, criadorId: criadorObjectId }, { session });
    if (resultadoExclusao.deletedCount === 0) {
        await session.abortTransaction(); return res.status(404).json({ mensagem: "Erro ao excluir: Rotina não encontrada (após verificação inicial)." });
    }
    await session.commitTransaction();
    res.status(200).json({ mensagem: "Rotina excluída com sucesso." });
  } catch (error: any) {
    if (session.inTransaction()) await session.abortTransaction();
    console.error(`Erro ao excluir rotina ${id}:`, error);
    next(error);
  } finally {
    if (session.inTransaction()) await session.abortTransaction(); // Garante abort em caso de erro não pego
    await session.endSession();
  }
});


// --- ROTA PUT /api/treinos/reordenar ---
router.put("/reordenar", authenticateToken, async (req: AuthenticatedRequest, res: Response, next: NextFunction) => {
    const criadorId = req.user?.id;
    const { idContexto, novaOrdemFichaIds } = req.body; // idContexto é o pastaId

    if (!criadorId) return res.status(401).json({ mensagem: "Usuário não autenticado." });
    if (!Array.isArray(novaOrdemFichaIds) || novaOrdemFichaIds.some((id: any) => typeof id !== 'string' || !mongoose.Types.ObjectId.isValid(id))) {
        return res.status(400).json({ mensagem: "'novaOrdemFichaIds' deve ser um array de IDs de rotina válidos." });
    }

    let pastaObjectIdQuery: mongoose.Types.ObjectId | null = null;
    const idContextoStr = idContexto as string | undefined;

    if (idContextoStr && idContextoStr !== "sem-pasta" && idContextoStr !== "null" && idContextoStr !== "") {
        if (!mongoose.Types.ObjectId.isValid(idContextoStr)) {
            return res.status(400).json({ mensagem: "ID do contexto (pastaId) fornecido é inválido." });
        }
        pastaObjectIdQuery = new Types.ObjectId(idContextoStr);
    } else if (idContextoStr === "sem-pasta" || idContextoStr === null || idContextoStr === "") {
        // Se o contexto for "sem-pasta" ou nulo, significa que estamos reordenando rotinas fora de qualquer pasta.
        pastaObjectIdQuery = null;
    }
    // Se idContexto não for fornecido, pode ser um erro ou uma lógica não prevista.
    // Por segurança, se idContexto é undefined e não "sem-pasta" ou "null", pode ser melhor retornar um erro.
    // No entanto, a lógica atual permite undefined passar, resultando em pastaObjectIdQuery = null.

    const session = await mongoose.startSession();
    try {
        session.startTransaction();
        const criadorObjectId = new Types.ObjectId(criadorId);

        // Se estamos reordenando dentro de uma pasta, verifica se a pasta existe e pertence ao usuário
        if (pastaObjectIdQuery) {
            const pastaExiste = await PastaTreino.findOne({ _id: pastaObjectIdQuery, criadorId: criadorObjectId }).session(session);
            if (!pastaExiste) {
                await session.abortTransaction();
                return res.status(404).json({ mensagem: "Pasta de contexto não encontrada ou não pertence a você." });
            }
        }

        // Atualiza a ordemNaPasta para cada rotina na nova ordem
        const operations = novaOrdemFichaIds.map((fichaId: string, index: number) => {
            return Treino.updateOne(
                { 
                    _id: new Types.ObjectId(fichaId), 
                    criadorId: criadorObjectId, 
                    tipo: 'modelo', // A reordenação de 'ordemNaPasta' só faz sentido para rotinas modelo
                    pastaId: pastaObjectIdQuery // Condição para rotinas na pasta especificada ou fora de pastas
                },
                { $set: { ordemNaPasta: index } },
                { session }
            ).exec();
        });

        const results = await Promise.all(operations);
        
        // Verifica se todas as operações encontraram e modificaram um documento.
        // Se alguma rotina não foi encontrada (matchedCount === 0), pode indicar um problema (ex: rotina não é 'modelo' ou não está na pasta correta).
        if (results.some(r => r.matchedCount === 0)) {
            // Se alguma rotina não foi encontrada, pode ser que ela não exista, não seja do tipo 'modelo',
            // ou não esteja na pastaId correta (ou fora de pastas, se pastaObjectIdQuery for null).
            // É importante que o frontend envie apenas IDs de rotinas que realmente pertencem ao contexto (pastaId) sendo reordenado.
            console.warn("[Reordenar Rotinas] Algumas rotinas não foram encontradas ou não puderam ser atualizadas. Resultados:", results);
            // Não necessariamente um erro fatal se algumas não foram encontradas, mas um aviso.
            // Se for crítico que TODAS sejam atualizadas, então aborte a transação.
            // Por ora, vamos permitir que continue, mas logar.
            // Se for um erro, descomente a linha abaixo:
            // await session.abortTransaction();
            // return res.status(404).json({ mensagem: "Erro ao reordenar: uma ou mais rotinas não foram encontradas nos critérios especificados (verifique ID, tipo 'modelo' e pastaId)." });
        }

        await session.commitTransaction();
        res.status(200).json({ mensagem: "Rotinas modelo reordenadas com sucesso." });
    } catch (error: any) {
        if (session.inTransaction()) await session.abortTransaction();
        console.error("Erro ao reordenar rotinas:", error);
        next(error);
    } finally {
        if (session.inTransaction()) await session.abortTransaction(); // Garante abort em caso de erro não pego
        await session.endSession();
    }
});

export default router;
