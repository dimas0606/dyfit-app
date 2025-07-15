// server/src/routes/conviteAlunoPublicRoutes.ts
import express, { Request, Response, NextFunction } from 'express';
import ConviteAluno from '../../models/ConviteAluno';
import Aluno from '../../models/Aluno';
import mongoose from 'mongoose';

const router = express.Router();

// GET /api/public/convite-aluno/:token - Valida o token do convite
router.get('/:token', async (req: Request, res: Response, next: NextFunction) => {
    try {
        const { token } = req.params;
        const convite = await ConviteAluno.findOne({ token, status: 'pendente' });

        if (!convite || convite.dataExpiracao < new Date()) {
            if (convite) {
                convite.status = 'expirado';
                await convite.save();
            }
            return res.status(404).json({ erro: 'Convite inválido ou expirado.' });
        }

        res.status(200).json({ email: convite.emailConvidado });

    } catch (error) {
        next(error);
    }
});

// POST /api/public/convite-aluno/registrar - Finaliza o cadastro do aluno
router.post('/registrar', async (req: Request, res: Response, next: NextFunction) => {
    try {
        const { token, nome, password, ...outrosDados } = req.body;

        if (!token || !nome || !password) {
            return res.status(400).json({ erro: 'Dados insuficientes para o registro.' });
        }

        const convite = await ConviteAluno.findOne({ token, status: 'pendente' });

        if (!convite || convite.dataExpiracao < new Date()) {
            if (convite) {
                convite.status = 'expirado';
                await convite.save();
            }
            return res.status(404).json({ erro: 'Convite inválido ou expirado.' });
        }

        const novoAluno = new Aluno({
            nome,
            email: convite.emailConvidado,
            passwordHash: password,
            trainerId: convite.criadoPor,
            status: 'active',
            ...outrosDados,
        });

        await novoAluno.save();

        convite.status = 'utilizado';
        // <<< CORREÇÃO AQUI: Garantindo o tipo correto para o TypeScript >>>
        convite.usadoPor = novoAluno._id as mongoose.Types.ObjectId;
        await convite.save();

        res.status(201).json({ mensagem: 'Aluno registrado com sucesso!' });

    } catch (error: any) {
        if (error.code === 11000) {
            return res.status(409).json({ erro: 'Este endereço de e-mail já está em uso.' });
        }
        next(error);
    }
});


export default router;