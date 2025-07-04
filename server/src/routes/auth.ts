// server/src/routes/auth.ts
import { Router, Request, Response, NextFunction } from 'express';
import mongoose from 'mongoose';
import PersonalTrainer, { IPersonalTrainer } from '../../models/PersonalTrainer';
import Aluno, { IAluno } from '../../models/Aluno';
import jwt, { Secret } from 'jsonwebtoken';
import ms from 'ms';

const router = Router();

const getJwtSecret = (): Secret => {
    const secret = process.env.JWT_SECRET;
    if (!secret) {
        console.error("FATAL: JWT_SECRET não está definido no ambiente.");
        return 'fallback_secret_para_desenvolvimento_nao_usar_em_prod';
    }
    return secret;
};

const getExpiresInSeconds = (durationString: string | undefined, defaultDuration: string): number => {
    try {
        const durationMs = ms(durationString || defaultDuration);
        return Math.floor(durationMs / 1000);
    } catch (e) {
        return Math.floor(ms(defaultDuration) / 1000);
    }
};

router.post('/login', async (req: Request, res: Response, next: NextFunction) => {
    const { email, password } = req.body;
    if (!email || !password) return res.status(400).json({ message: 'Email e senha são obrigatórios.' });
    try {
        const user: IPersonalTrainer | null = await PersonalTrainer.findOne({ email: email.toLowerCase() }).select('+passwordHash +role');
        if (!user || !user._id) return res.status(401).json({ message: 'Credenciais inválidas.' });
        const isPasswordValid = await user.comparePassword(password);
        if (!isPasswordValid) return res.status(401).json({ message: 'Credenciais inválidas.' });
        
        const firstName = user.nome.split(' ')[0] || '';
        const lastName = user.nome.split(' ').slice(1).join(' ') || '';

        // ---> CORREÇÃO LÓGICA: Simplifica a verificação do role
        let role = 'personal'; // Define 'personal' como padrão
        if (user.role?.toLowerCase() === 'admin') {
            role = 'admin'; // Se o role do banco for 'Admin' ou 'admin', padroniza para 'admin'
        }
        // ---> FIM DA CORREÇÃO

        const tokenPayload = {
            id: user._id.toString(),
            email: user.email,
            firstName,
            lastName,
            role: role // Usa o role padronizado
        };

        const expiresIn = getExpiresInSeconds(process.env.JWT_EXPIRES_IN, '1h');
        const token = jwt.sign(tokenPayload, getJwtSecret(), { expiresIn });

        console.log(`✅ Login de ${role} bem-sucedido para: ${user.email}`);
        res.json({ message: 'Login bem-sucedido!', token, user: { ...tokenPayload } });
    } catch (error) {
        next(error);
    }
});

router.post('/aluno/login', async (req: Request, res: Response, next: NextFunction) => {
    const { email, password } = req.body;
    if (!email || !password) return res.status(400).json({ message: 'Email e senha são obrigatórios.' });
    try {
        const aluno: IAluno | null = await Aluno.findOne({ email: email.toLowerCase() }).select('+passwordHash');
        if (!aluno || !aluno._id) return res.status(401).json({ message: 'Credenciais inválidas.' });
        const isPasswordValid = await aluno.comparePassword(password);
        if (!isPasswordValid) return res.status(401).json({ message: 'Credenciais inválidas.' });
        
        const tokenPayload = {
            id: aluno._id.toString(),
            nome: aluno.nome,
            email: aluno.email,
            personalId: aluno.trainerId?.toString(),
            role: 'aluno',
        };

        const expiresIn = getExpiresInSeconds(process.env.JWT_ALUNO_EXPIRES_IN, '7d');
        const token = jwt.sign(tokenPayload, getJwtSecret(), { expiresIn });
        
        console.log(`✅ Login de Aluno bem-sucedido para: ${aluno.email}`);
        res.json({
            message: 'Login de aluno bem-sucedido!',
            token,
            aluno: tokenPayload
        });
    } catch (error) {
        next(error);
    }
});

export default router;