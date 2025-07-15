// server/src/routes/alunoApiRoutes.ts
import express, { Request, Response, NextFunction } from 'express';
import mongoose, { Types } from 'mongoose';
import Treino, { ITreinoPopuladoLean, IDiaDeTreino } from '../../models/Treino';
import Sessao, { ISessaoDocument, OpcaoPSE, OPCOES_PSE, ISessaoLean } from '../../models/Sessao';
import Aluno from '../../models/Aluno';
import ConviteAluno from '../../models/ConviteAluno';
import { startOfWeek, endOfWeek } from 'date-fns';

const router = express.Router();

// =======================================================
// ROTAS DO PERSONAL (PARA GERENCIAR ALUNOS)
// =======================================================

// POST /api/aluno/convite - Personal gera convite
router.post("/convite", async (req: Request, res: Response, next: NextFunction) => {
    // Esta rota requer token de PERSONAL, garantido pelo authenticateToken no index.ts
    const trainerId = req.user?.id;
    if (req.user?.role?.toLowerCase() !== 'personal') {
        return res.status(403).json({ erro: "Apenas personais podem gerar convites." });
    }
    // Lógica que já tínhamos...
    try {
        const { emailConvidado } = req.body;
        if (!trainerId) return res.status(401).json({ erro: "Personal não autenticado." });
        if (!emailConvidado) return res.status(400).json({ erro: "O email do aluno é obrigatório." });

        const alunoExistente = await Aluno.findOne({ email: emailConvidado, trainerId });
        if (alunoExistente) return res.status(409).json({ erro: "Este aluno já está cadastrado com você." });

        const convitePendente = await ConviteAluno.findOne({ emailConvidado, status: 'pendente' });
        if (convitePendente) {
            const linkConvite = `${process.env.FRONTEND_URL}/convite/aluno/${convitePendente.token}`;
            return res.status(200).json({ mensagem: "Já existe um convite pendente para este email.", linkConvite });
        }
        
        const novoConvite = new ConviteAluno({ emailConvidado, criadoPor: new mongoose.Types.ObjectId(trainerId) });
        await novoConvite.save();

        const linkConvite = `${process.env.FRONTEND_URL}/convite/aluno/${novoConvite.token}`;
        res.status(201).json({ mensagem: "Link de convite gerado com sucesso!", linkConvite });
    } catch (error) {
        next(error);
    }
});

// GET /api/aluno/gerenciar - Personal lista seus alunos
router.get("/gerenciar", async (req, res, next) => {
    const trainerId = req.user?.id;
    if (!trainerId) return res.status(401).json({ erro: "Usuário não autenticado." });
    try {
        const alunos = await Aluno.find({ trainerId }).sort({ nome: 1 }).select('-passwordHash');
        res.status(200).json(alunos);
    } catch (error) {
        next(error);
    }
});

// POST /api/aluno/gerenciar - Personal cadastra aluno manualmente
router.post("/gerenciar", async (req, res, next) => {
    const trainerId = req.user?.id;
    if (!trainerId) return res.status(401).json({ erro: "Usuário não autenticado." });
    try {
        const { password, ...alunoDataBody } = req.body;
        if (!password) return res.status(400).json({ erro: "O campo de senha é obrigatório." });

        const alunoData = { ...alunoDataBody, trainerId: new mongoose.Types.ObjectId(trainerId), passwordHash: password };
        const novoAluno = new Aluno(alunoData);
        const alunoSalvo = await novoAluno.save();
        const alunoParaRetornar = { ...alunoSalvo.toObject() };
        delete (alunoParaRetornar as any).passwordHash;
        res.status(201).json(alunoParaRetornar);
    } catch (error) {
        next(error);
    }
});

// GET /api/aluno/gerenciar/:id - Personal busca um aluno específico
router.get("/gerenciar/:id", async (req, res, next) => {
    const trainerId = req.user?.id;
    const { id } = req.params;
    if (!trainerId) return res.status(401).json({ erro: "Usuário não autenticado." });
    if (!mongoose.Types.ObjectId.isValid(id)) return res.status(400).json({ erro: "ID do aluno inválido" });
    try {
        const aluno = await Aluno.findOne({ _id: id, trainerId }).select('-passwordHash');
        if (!aluno) return res.status(404).json({ erro: "Aluno não encontrado ou você não tem permissão." });
        res.status(200).json(aluno);
    } catch (error) {
        next(error);
    }
});

// PUT /api/aluno/gerenciar/:id - Personal edita um aluno
router.put("/gerenciar/:id", async (req, res, next) => {
    const trainerId = req.user?.id;
    const { id } = req.params;
    if (!trainerId) return res.status(401).json({ erro: "Usuário não autenticado." });
    if (!mongoose.Types.ObjectId.isValid(id)) return res.status(400).json({ erro: "ID do aluno inválido." });
    try {
        const { password, ...updateData } = req.body;
        const aluno = await Aluno.findOne({ _id: id, trainerId });
        if (!aluno) return res.status(404).json({ erro: "Aluno não encontrado ou você não tem permissão." });

        Object.assign(aluno, updateData);
        if (password && password.trim() !== "") {
            aluno.passwordHash = password;
        }
        const alunoAtualizado = await aluno.save();
        const alunoParaRetornar = { ...alunoAtualizado.toObject() };
        delete (alunoParaRetornar as any).passwordHash;
        res.status(200).json(alunoParaRetornar);
    } catch (error) {
        next(error);
    }
});

// DELETE /api/aluno/gerenciar/:id - Personal deleta um aluno
router.delete("/gerenciar/:id", async (req, res, next) => {
    const trainerId = req.user?.id;
    const { id } = req.params;
    if (!trainerId) return res.status(401).json({ erro: "Usuário não autenticado." });
    if (!mongoose.Types.ObjectId.isValid(id)) return res.status(400).json({ erro: "ID do aluno inválido." });
    try {
        const result = await Aluno.findOneAndDelete({ _id: id, trainerId });
        if (!result) return res.status(404).json({ erro: "Aluno não encontrado ou sem permissão." });
        res.status(200).json({ mensagem: "Aluno removido com sucesso" });
    } catch (error) {
        next(error);
    }
});

// =======================================================
// ROTAS DO ALUNO (PARA ACESSO PRÓPRIO)
// =======================================================
// Estas rotas requerem token de ALUNO, que é tratado pelo middleware
// no `server/index.ts` quando a rota começa com `/api/aluno`.

router.get('/meus-treinos', async (req, res, next) => { /* ... código original ... */ });
router.get('/minhas-sessoes-concluidas-na-semana', async (req, res, next) => { /* ... código original ... */ });
router.get('/minhas-rotinas/:rotinaId', async (req, res, next) => { /* ... código original ... */ });
router.post('/sessoes/concluir-dia', async (req, res, next) => { /* ... código original ... */ });
router.get('/minhas-sessoes-agendadas', async (req, res, next) => { /* ... código original ... */ });
router.get('/meu-historico-sessoes', async (req, res, next) => { /* ... código original ... */ });

export default router;