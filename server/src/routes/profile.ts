import { Router, Request, Response, NextFunction } from 'express';
import PersonalTrainer, { IPersonalTrainer } from '../../models/PersonalTrainer';
import { authenticateToken, AuthenticatedRequest } from '../../middlewares/authenticateToken'; // Importe o tipo

const router = Router();

// Rota para ATUALIZAR o perfil do personal trainer logado
// PATCH /api/profile/me
router.patch('/me', authenticateToken, async (req: AuthenticatedRequest, res: Response, next: NextFunction) => {
    const userId = req.user?.id;
    const { firstName, lastName } = req.body;

    if (!userId) {
        return res.status(401).json({ message: 'Não autorizado: ID do usuário não encontrado no token.' });
    }

    if (!firstName || !lastName) {
        return res.status(400).json({ message: 'Nome e Sobrenome são obrigatórios.' });
    }
    if (typeof firstName !== 'string' || typeof lastName !== 'string') {
         return res.status(400).json({ message: 'Nome e Sobrenome devem ser strings.' });
    }

    try {
        const nomeCompleto = `${firstName.trim()} ${lastName.trim()}`.trim();

        // Força a tipagem do resultado para IPersonalTrainer | null
        const updatedUser = await PersonalTrainer.findByIdAndUpdate(
            userId,
            { nome: nomeCompleto },
            { new: true, runValidators: true, select: '-passwordHash' }
        ).exec() as IPersonalTrainer | null; // Adiciona .exec() e tipagem explícita

        // <<< CORREÇÃO: Verifica se updatedUser e seu _id existem >>>
        if (!updatedUser || !updatedUser._id) {
            // Se findByIdAndUpdate não encontrar o usuário, retorna null
            console.warn(`[SERVER] Usuário ${userId} não encontrado para atualização de perfil.`);
            return res.status(404).json({ message: 'Personal Trainer não encontrado.' });
        }
        // <<< FIM DA CORREÇÃO >>>

        // Agora é seguro acessar updatedUser._id e outras propriedades
        const responseUser = {
            id: updatedUser._id.toString(), // Agora TypeScript confia
            username: updatedUser.email,
            firstName: updatedUser.nome.split(' ')[0] || '',
            lastName: updatedUser.nome.split(' ').slice(1).join(' ') || '',
            email: updatedUser.email,
            role: updatedUser.role
        };

        console.log(`[SERVER] Perfil atualizado para usuário ${userId}: ${nomeCompleto}`);
        res.status(200).json({ message: 'Perfil atualizado com sucesso!', user: responseUser });

    } catch (error: any) {
        console.error(`[SERVER] Erro ao atualizar perfil para usuário ${userId}:`, error);
        if (error.name === 'ValidationError') {
            const messages = Object.values(error.errors).map((e: any) => e.message);
            return res.status(400).json({ message: messages.join(', ') });
        }
        next(error);
    }
});

export default router;