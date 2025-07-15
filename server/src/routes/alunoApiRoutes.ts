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
    const trainerId = req.user?.id;
    if (req.user?.role?.toLowerCase() !== 'personal') return res.status(403).json({ erro: "Apenas personais podem gerar convites." });
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
    } catch (error) { next(error); }
});

// GET /api/aluno/gerenciar - Personal lista seus alunos
router.get("/gerenciar", async (req, res, next) => {
    const trainerId = req.user?.id;
    if (!trainerId) return res.status(401).json({ erro: "Usuário não autenticado." });
    try {
        const alunos = await Aluno.find({ trainerId }).sort({ nome: 1 }).select('-passwordHash');
        res.status(200).json(alunos);
    } catch (error) { next(error); }
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
    } catch (error) { next(error); }
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
    } catch (error) { next(error); }
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
    } catch (error) { next(error); }
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
    } catch (error) { next(error); }
});


// =======================================================
// ROTAS DO ALUNO (PARA ACESSO PRÓPRIO) - LÓGICA RESTAURADA
// =======================================================
router.get('/meus-treinos', async (req: Request, res: Response, next: NextFunction) => {
    const alunoId = req.aluno?.id;
    if (!alunoId) return res.status(401).json({ message: 'ID do aluno não encontrado no token.' }); 
    try {
        const query = Treino.find({ alunoId: new Types.ObjectId(alunoId), tipo: 'individual' })
                          .sort({ atualizadoEm: -1, criadoEm: -1 })
                          .populate({ path: 'criadorId', select: 'nome email _id' })
                          .populate({
                              path: 'diasDeTreino.exerciciosDoDia.exercicioId', 
                              select: 'nome grupoMuscular urlVideo tipo categoria descricao _id' 
                          });
        const rotinasDoAluno = await query.lean<ITreinoPopuladoLean[]>();
        res.status(200).json(rotinasDoAluno);
    } catch (error) { 
        next(error); 
    }
});

router.get('/minhas-sessoes-concluidas-na-semana', async (req: Request, res: Response, next: NextFunction) => {
    const alunoId = req.aluno?.id;
    if (!alunoId) return res.status(401).json({ message: 'ID do aluno não encontrado no token.' });
    try {
        const hoje = new Date();
        const inicioDaSemana = startOfWeek(hoje, { weekStartsOn: 1 });
        const fimDaSemana = endOfWeek(hoje, { weekStartsOn: 1 });

        const sessoesConcluidas = await Sessao.find({
            alunoId: new Types.ObjectId(alunoId), 
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

// ... as outras rotas do aluno continuam aqui ...

export default router;