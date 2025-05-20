import { Request, Response, NextFunction } from 'express';
import jwt, { Secret, JwtPayload } from 'jsonwebtoken';

// Lê diretamente de process.env
const JWT_SECRET = process.env.JWT_SECRET;

// 1. Interface DecodedTokenPayload ATUALIZADA para refletir o que salvamos no token
interface DecodedTokenPayload extends JwtPayload {
  id: string;
  email: string;
  firstName: string; // <<< MUDADO de nome para firstName
  lastName: string;  // <<< ADICIONADO lastName
  role: string;      // <<< ADICIONADO role
  // 'nome' foi removido, pois o token agora contém firstName e lastName
}

// 2. Adicionada exportação da AuthenticatedRequest para uso em outros lugares
export interface AuthenticatedRequest extends Request {
  user?: DecodedTokenPayload; // Usa a DecodedTokenPayload atualizada
}

// 3. A função authenticateToken agora usa AuthenticatedRequest
export const authenticateToken = (req: AuthenticatedRequest, res: Response, next: NextFunction) => {
  const authHeader = req.headers['authorization'];
  const token = authHeader && authHeader.startsWith('Bearer ') ? authHeader.split(' ')[1] : null;

  if (!token) {
    // Não precisa logar aqui, frontend já lida com isso
    return res.status(401).json({ message: 'Acesso não autorizado. Token não fornecido.' });
  }

  if (!JWT_SECRET) {
     console.error("Auth Middleware: JWT_SECRET não disponível em process.env. Verifique o .env na raiz e o carregamento no index.ts.");
     return res.status(500).json({ message: 'Erro interno do servidor (configuração).' });
  }

  try {
    // TypeScript agora entende que o 'decoded' terá as propriedades da DecodedTokenPayload
    const decoded = jwt.verify(token, JWT_SECRET as Secret) as DecodedTokenPayload;
    req.user = decoded; // Agora req.user terá id, email, firstName, lastName, role
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