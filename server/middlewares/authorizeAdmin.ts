// server/middlewares/authorizeAdmin.ts
import { Request, Response, NextFunction } from 'express';

// Não precisamos mais da interface 'AuthenticatedRequest' importada,
// pois nosso 'index.d.ts' já estende a interface global do Express.

export function authorizeAdmin(req: Request, res: Response, next: NextFunction) {
  // Padroniza a verificação para 'admin' (minúsculo).
  if (req.user && req.user.role === 'admin') {
    return next(); // Usuário é admin, permite o acesso.
  } else {
    // Se não for admin, retorna erro 403.
    return res.status(403).json({ mensagem: "Acesso negado. Esta funcionalidade é restrita a administradores." });
  }
}