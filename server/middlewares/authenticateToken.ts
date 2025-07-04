// server/middlewares/authenticateToken.ts

import { Request, Response, NextFunction } from 'express';
import jwt, { Secret, JwtPayload } from 'jsonwebtoken';

export const authenticateToken = (req: Request, res: Response, next: NextFunction) => {
    const authHeader = req.headers['authorization'];
    const token = authHeader?.startsWith('Bearer ') ? authHeader.split(' ')[1] : null;

    if (!token) {
        return res.status(401).json({ message: 'Acesso não autorizado. Token não fornecido.' });
    }

    const JWT_SECRET = process.env.JWT_SECRET as Secret;
    if (!JWT_SECRET) {
        console.error("Middleware Auth: JWT_SECRET não está definido. Verifique o .env");
        return res.status(500).json({ message: 'Erro interno de configuração do servidor.' });
    }

    try {
        const decoded = jwt.verify(token, JWT_SECRET) as JwtPayload;

        if (decoded.role === 'aluno') {
            req.aluno = {
                id: decoded.id,
                role: 'aluno',
                nome: decoded.nome
            };
            return next();
        }

        if (decoded.role === 'personal' || decoded.role === 'admin') {
            req.user = {
                id: decoded.id,
                role: decoded.role,
                firstName: decoded.firstName,
                lastName: decoded.lastName,
                email: decoded.email
            };
            return next();
        }

        return res.status(403).json({ message: 'Acesso proibido. Permissão de usuário desconhecida.' });

    } catch (err: any) {
        console.warn(`Middleware Auth: Falha na verificação do token - ${err.name}: ${err.message}`);
        if (err instanceof jwt.TokenExpiredError) {
            return res.status(401).json({ message: 'Sessão expirada. Faça login novamente.', code: 'TOKEN_EXPIRED' });
        }
        if (err instanceof jwt.JsonWebTokenError) {
            return res.status(403).json({ message: 'Acesso proibido. Token inválido.' });
        }
        return res.status(500).json({ message: 'Erro interno ao processar o token.' });
    }
};