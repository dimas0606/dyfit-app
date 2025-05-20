// server/src/routes/pastasTreinos.ts
import express, { Response, NextFunction } from 'express';
import mongoose from 'mongoose';
import PastaTreino, { IPasta } from '../../models/Pasta';
import Treino from '../../models/Treino';
import { authenticateToken, AuthenticatedRequest } from '../../middlewares/authenticateToken';

const router = express.Router();

console.log("--- [server/src/routes/pastasTreinos.ts] Ficheiro carregado (DEBUG transação para reordenar - Correção TS) ---");

// ... (outras rotas como POST, GET, PUT/:pastaId permanecem como estão) ...

// PUT /api/pastas/treinos/reordenar - Reordenar pastas COM TRANSAÇÃO (VERSÃO DE DEBUG)
router.put('/reordenar', authenticateToken, async (req: AuthenticatedRequest, res: Response, next: NextFunction) => {
    const criadorId = req.user?.id;
    const { novaOrdemIds } = req.body;

    console.log(`[DEBUG PUT /api/pastas/treinos/reordenar] Tentativa de reordenar pastas. CriadorID: ${criadorId}`);
    console.log(`[DEBUG PUT /api/pastas/treinos/reordenar] Nova ordem de IDs recebida:`, novaOrdemIds);

    if (!criadorId) {
        console.warn("[DEBUG PUT /api/pastas/treinos/reordenar] Usuário não autenticado.");
        return res.status(401).json({ mensagem: "Usuário não autenticado." });
    }

    if (!Array.isArray(novaOrdemIds) || novaOrdemIds.some(id => typeof id !== 'string' || !mongoose.Types.ObjectId.isValid(id))) {
        console.warn("[DEBUG PUT /api/pastas/treinos/reordenar] 'novaOrdemIds' deve ser um array de IDs de pasta válidos.");
        return res.status(400).json({ mensagem: "'novaOrdemIds' deve ser um array de IDs de pasta válidos." });
    }

    const session = await mongoose.startSession();
    let sessionIdForLogging = "N/A_SESSAO_INIT"; // Valor padrão
    try {
        // Correção para obter o ID da sessão como string hexadecimal
        if (session.id && session.id.id && typeof session.id.id.toString === 'function') {
            sessionIdForLogging = session.id.id.toString('hex');
        } else {
            sessionIdForLogging = "ID_SESSAO_NAO_RECUPERAVEL";
            console.warn("[DEBUG TRANSACTION] Não foi possível obter o ID da sessão para logging.");
        }

        console.log(`[DEBUG TRANSACTION ${sessionIdForLogging}] Iniciando transação para reordenar pastas.`);
        session.startTransaction();

        const criadorObjectId = new mongoose.Types.ObjectId(criadorId);

        for (let i = 0; i < novaOrdemIds.length; i++) {
            const pastaId = novaOrdemIds[i];
            const index = i;
            console.log(`  [DEBUG TRANSACTION ${sessionIdForLogging}] Atualizando Pasta ID: ${pastaId} para Ordem: ${index}`);
            const result = await PastaTreino.updateOne(
                { _id: new mongoose.Types.ObjectId(pastaId), criadorId: criadorObjectId },
                { $set: { ordem: index } },
                { session }
            );
            console.log(`    [DEBUG TRANSACTION ${sessionIdForLogging}] Resultado para Pasta ID ${pastaId}: matchedCount=${result.matchedCount}, modifiedCount=${result.modifiedCount}`);
            if (result.matchedCount === 0) {
                console.warn(`  [DEBUG TRANSACTION ${sessionIdForLogging}] ERRO: Pasta com ID ${pastaId} não encontrada para o usuário ${criadorId}. Abortando.`);
                await session.abortTransaction();
                return res.status(404).json({ mensagem: `Erro ao reordenar: Pasta com ID ${pastaId} não encontrada.` });
            }
        }

        console.log(`[DEBUG TRANSACTION ${sessionIdForLogging}] Commitando transação.`);
        await session.commitTransaction();
        console.log("[DEBUG PUT /api/pastas/treinos/reordenar] Pastas reordenadas com sucesso (com transação).");
        res.status(200).json({ mensagem: "Pastas reordenadas com sucesso." });

    } catch (error: any) {
        console.error(`[DEBUG TRANSACTION ${sessionIdForLogging}] Erro durante a transação de reordenar pastas:`, error);
        if (session.inTransaction()) {
            console.log(`[DEBUG TRANSACTION ${sessionIdForLogging}] Abortando transação devido a erro.`);
            await session.abortTransaction();
        } else {
            console.log(`[DEBUG TRANSACTION ${sessionIdForLogging}] Transação não estava ativa no momento do erro ou já foi abortada/commitada.`);
        }
        next(error);
    } finally {
        console.log(`[DEBUG TRANSACTION ${sessionIdForLogging}] Finalizando sessão.`);
        await session.endSession();
    }
});


// POST /api/pastas/treinos - Criar uma nova pasta de treino
router.post('/', authenticateToken, async (req: AuthenticatedRequest, res: Response, next: NextFunction) => {
  const criadorId = req.user?.id;
  const { nome } = req.body;

  console.log(`[POST /api/pastas/treinos] Tentativa de criar pasta. Nome: "${nome}", CriadorID: ${criadorId}`);

  if (!criadorId) {
    console.warn("[POST /api/pastas/treinos] Usuário não autenticado.");
    return res.status(401).json({ mensagem: "Usuário não autenticado." });
  }

  if (!nome || typeof nome !== 'string' || nome.trim().length === 0) {
    console.warn("[POST /api/pastas/treinos] Nome da pasta ausente ou inválido.");
    return res.status(400).json({ mensagem: "O nome da pasta é obrigatório e não pode ser vazio." });
  }

  try {
    const criadorObjectId = new mongoose.Types.ObjectId(criadorId);
    const pastaExistente = await PastaTreino.findOne({ nome: nome.trim(), criadorId: criadorObjectId });
    if (pastaExistente) {
      console.warn(`[POST /api/pastas/treinos] Pasta com nome "${nome.trim()}" já existe para o usuário ${criadorId}.`);
      return res.status(409).json({ mensagem: `Uma pasta com o nome "${nome.trim()}" já existe.` });
    }

    const contagemPastas = await PastaTreino.countDocuments({ criadorId: criadorObjectId });

    const novaPasta = new PastaTreino({
      nome: nome.trim(),
      criadorId: criadorObjectId,
      ordem: contagemPastas,
    });

    await novaPasta.save();
    console.log(`[POST /api/pastas/treinos] Pasta "${novaPasta.nome}" criada com sucesso. ID: ${novaPasta._id}, Ordem: ${novaPasta.ordem}`);
    res.status(201).json(novaPasta);

  } catch (error: any) {
    console.error("[POST /api/pastas/treinos] Erro ao criar pasta:", error);
    if (error.name === 'ValidationError') {
      const mensagens = Object.values(error.errors).map((el: any) => el.message);
      return res.status(400).json({ mensagem: mensagens.join(', ') });
    }
    next(error);
  }
});

// GET /api/pastas/treinos - Listar todas as pastas de treino do usuário logado
router.get('/', authenticateToken, async (req: AuthenticatedRequest, res: Response, next: NextFunction) => {
  const criadorId = req.user?.id;
  console.log(`[GET /api/pastas/treinos] Buscando pastas para o criador ID: ${criadorId}`);

  if (!criadorId) {
    console.warn("[GET /api/pastas/treinos] Usuário não autenticado.");
    return res.status(401).json({ mensagem: "Usuário não autenticado." });
  }

  try {
    const pastas = await PastaTreino.find({ criadorId: new mongoose.Types.ObjectId(criadorId) })
      .sort({ ordem: 1, nome: 1 });

    console.log(`[GET /api/pastas/treinos] ${pastas.length} pastas encontradas para o usuário ${criadorId}.`);
    res.status(200).json(pastas);

  } catch (error: any) {
    console.error("[GET /api/pastas/treinos] Erro ao buscar pastas:", error);
    next(error);
  }
});

// PUT /api/pastas/treinos/:pastaId - Editar nome da pasta
router.put('/:pastaId', authenticateToken, async (req: AuthenticatedRequest, res: Response, next: NextFunction) => {
    const { pastaId } = req.params;
    const criadorId = req.user?.id;
    const { nome } = req.body;

    console.log(`[PUT /api/pastas/treinos/${pastaId}] Tentativa de editar pasta. Novo nome: "${nome}", CriadorID: ${criadorId}`);

    if (!criadorId) {
        return res.status(401).json({ mensagem: "Usuário não autenticado." });
    }
    if (!mongoose.Types.ObjectId.isValid(pastaId)) {
        return res.status(400).json({ mensagem: "ID da pasta inválido." });
    }
    if (!nome || typeof nome !== 'string' || nome.trim().length === 0) {
        return res.status(400).json({ mensagem: "O nome da pasta é obrigatório." });
    }

    try {
        const criadorObjectId = new mongoose.Types.ObjectId(criadorId);
        const pastaObjectId = new mongoose.Types.ObjectId(pastaId);

        const pastaParaAtualizar = await PastaTreino.findOne({ _id: pastaObjectId, criadorId: criadorObjectId });

        if (!pastaParaAtualizar) {
            return res.status(404).json({ mensagem: "Pasta não encontrada ou você não tem permissão para editá-la." });
        }

        const pastaComMesmoNome = await PastaTreino.findOne({
            nome: nome.trim(),
            criadorId: criadorObjectId,
            _id: { $ne: pastaObjectId }
        });

        if (pastaComMesmoNome) {
            return res.status(409).json({ mensagem: `Outra pasta com o nome "${nome.trim()}" já existe.` });
        }

        pastaParaAtualizar.nome = nome.trim();
        await pastaParaAtualizar.save();

        console.log(`[PUT /api/pastas/treinos/${pastaId}] Pasta atualizada com sucesso para "${pastaParaAtualizar.nome}".`);
        res.status(200).json(pastaParaAtualizar);

    } catch (error: any) {
        console.error(`[PUT /api/pastas/treinos/${pastaId}] Erro ao editar pasta:`, error);
        if (error.name === 'ValidationError') {
            const mensagens = Object.values(error.errors).map((el: any) => el.message);
            return res.status(400).json({ mensagem: mensagens.join(', ') });
        }
        next(error);
    }
});


// DELETE /api/pastas/treinos/:pastaId - Excluir uma pasta de treino
router.delete('/:pastaId', authenticateToken, async (req: AuthenticatedRequest, res: Response, next: NextFunction) => {
    const { pastaId } = req.params;
    const criadorId = req.user?.id;

    console.log(`[DELETE /api/pastas/treinos/${pastaId}] Tentativa de excluir pasta. CriadorID: ${criadorId}`);

    if (!criadorId) {
        console.warn(`[DELETE /api/pastas/treinos/${pastaId}] Usuário não autenticado.`);
        return res.status(401).json({ mensagem: "Usuário não autenticado." });
    }

    if (!mongoose.Types.ObjectId.isValid(pastaId)) {
        console.warn(`[DELETE /api/pastas/treinos/${pastaId}] ID da pasta inválido: ${pastaId}`);
        return res.status(400).json({ mensagem: "ID da pasta inválido." });
    }

    const session = await mongoose.startSession();
    let sessionIdForLogging = "N/A_SESSAO_INIT_DELETE";
    try {
        if (session.id && session.id.id && typeof session.id.id.toString === 'function') {
            sessionIdForLogging = session.id.id.toString('hex');
        } else {
            sessionIdForLogging = "ID_SESSAO_NAO_RECUPERAVEL_DELETE";
             console.warn("[TRANSACTION DELETE] Não foi possível obter o ID da sessão para logging.");
        }

        console.log(`[TRANSACTION ${sessionIdForLogging}] Iniciando transação para excluir pasta ${pastaId}.`);
        session.startTransaction();

        const pastaObjectId = new mongoose.Types.ObjectId(pastaId);
        const criadorObjectId = new mongoose.Types.ObjectId(criadorId);

        const pastaParaExcluir = await PastaTreino.findOne({ _id: pastaObjectId, criadorId: criadorObjectId }).session(session);

        if (!pastaParaExcluir) {
            console.warn(`[TRANSACTION ${sessionIdForLogging}] Pasta não encontrada ou usuário não autorizado. Abortando.`);
            await session.abortTransaction();
            return res.status(404).json({ mensagem: "Pasta não encontrada ou você não tem permissão para excluí-la." });
        }

        console.log(`  [TRANSACTION ${sessionIdForLogging}] Desassociando fichas da pasta ${pastaId}.`);
        const updateResult = await Treino.updateMany(
            { criadorId: criadorObjectId, tipo: 'modelo', pastaId: pastaObjectId },
            { $set: { pastaId: null } },
            { session }
        );
        console.log(`  [TRANSACTION ${sessionIdForLogging}] ${updateResult.modifiedCount} fichas foram desassociadas.`);

        console.log(`  [TRANSACTION ${sessionIdForLogging}] Excluindo pasta ${pastaId}.`);
        const deleteResult = await PastaTreino.deleteOne({ _id: pastaObjectId, criadorId: criadorObjectId }, { session });

        if (deleteResult.deletedCount === 0) {
            console.warn(`  [TRANSACTION ${sessionIdForLogging}] ERRO: Falha ao deletar a pasta ${pastaId} (não encontrada ou já deletada). Abortando.`);
            await session.abortTransaction();
            return res.status(404).json({ mensagem: "Erro ao excluir: Pasta não encontrada no momento da exclusão." });
        }

        console.log(`[TRANSACTION ${sessionIdForLogging}] Commitando transação.`);
        await session.commitTransaction();
        console.log(`[DELETE /api/pastas/treinos/${pastaId}] Pasta "${pastaParaExcluir.nome}" excluída com sucesso (com transação).`);
        res.status(200).json({ mensagem: `Pasta "${pastaParaExcluir.nome}" excluída com sucesso.` });

    } catch (error: any) {
        console.error(`[TRANSACTION ${sessionIdForLogging}] Erro durante a transação de excluir pasta ${pastaId}:`, error);
        if (session.inTransaction()) {
            console.log(`[TRANSACTION ${sessionIdForLogging}] Abortando transação devido a erro.`);
            await session.abortTransaction();
        } else {
            console.log(`[TRANSACTION ${sessionIdForLogging}] Transação não estava ativa no momento do erro ou já foi abortada/commitada.`);
        }
        next(error);
    } finally {
        console.log(`[TRANSACTION ${sessionIdForLogging}] Finalizando sessão.`);
        await session.endSession();
    }
});


export default router;
