// server/middlewares/authenticateToken.ts
import { Request, Response, NextFunction } from 'express';
import jwt, { Secret, JwtPayload } from 'jsonwebtoken';

// 1. Interface DecodedTokenPayload ATUALIZADA para refletir o que salvamos no token
interface DecodedTokenPayload extends JwtPayload {
  id: string;
  email: string;
  firstName: string;
  lastName: string;
  role: string;
}

// 2. Adicionada exportação da AuthenticatedRequest para uso em outros lugares
export interface AuthenticatedRequest extends Request {
  user?: DecodedTokenPayload;
}

// 3. A função authenticateToken agora usa leitura segura do JWT_SECRET dentro da função
export const authenticateToken = (req: AuthenticatedRequest, res: Response, next: NextFunction) => {
  const authHeader = req.headers['authorization'];
  const token = authHeader && authHeader.startsWith('Bearer ') ? authHeader.split(' ')[1] : null;

  if (!token) {
    return res.status(401).json({ message: 'Acesso não autorizado. Token não fornecido.' });
  }

  const JWT_SECRET = process.env.JWT_SECRET;
  if (!JWT_SECRET) {
    console.error("Auth Middleware: JWT_SECRET não disponível em process.env. Verifique o .env na raiz e o carregamento no index.ts.");
    return res.status(500).json({ message: 'Erro interno do servidor (configuração).' });
  }

  try {
    const decoded = jwt.verify(token, JWT_SECRET as Secret) as DecodedTokenPayload;
    req.user = decoded;
    next();
  } catch (err: any) {
    console.warn(`Auth Middleware: Falha na verificação do token - ${err.name}: ${err.message}`);
    if (err instanceof jwt.TokenExpiredError) {
      return res.status(401).json({ message: 'Sessão expirada. Faça login novamente.', code: 'TOKEN_EXPIRED' });
    }
    if (err instanceof jwt.JsonWebTokenError) {
      return res.status(403).json({ message: 'Acesso proibido. Token inválido.' });
    }
    console.error("Auth Middleware: Erro inesperado ao verificar token:", err);
    return res.status(500).json({ message: 'Erro interno ao processar o token.' });
  }
};
