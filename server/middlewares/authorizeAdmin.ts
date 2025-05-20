// server/middlewares/authorizeAdmin.ts
import { Response, NextFunction } from 'express';
import { AuthenticatedRequest } from './authenticateToken'; // Certifique-se que este tipo existe e define req.user

export function authorizeAdmin(req: AuthenticatedRequest, res: Response, next: NextFunction) {
  // Verifica se o usuário está autenticado e se a role é 'Admin'
  // O campo 'role' deve existir no objeto req.user após o login
  if (req.user && req.user.role === 'Admin') {
    next(); // Usuário é Admin, permite o acesso à próxima rota/middleware
  } else {
    // Usuário não é Admin ou não está autenticado corretamente com a role
    res.status(403).json({ mensagem: "Acesso negado. Esta funcionalidade é restrita a administradores." });
  }
}
