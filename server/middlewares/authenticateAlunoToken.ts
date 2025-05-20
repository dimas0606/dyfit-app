// Localização Sugerida: server/middlewares/authenticateAlunoToken.ts
import { Request, Response, NextFunction } from 'express';
import jwt, { Secret, JwtPayload } from 'jsonwebtoken';

// Lê o segredo JWT das variáveis de ambiente
// É o mesmo segredo usado para assinar os tokens dos alunos
const JWT_SECRET = process.env.JWT_SECRET;

// Interface para o payload decodificado do token do Aluno
// Deve corresponder ao payload definido na rota de login/registro do aluno
interface DecodedAlunoTokenPayload extends JwtPayload {
  id: string;         // ID do Aluno
  email: string;
  nome?: string;
  role: 'Aluno';      // Garante que a role é 'Aluno'
  personalId?: string; // ID do Personal Trainer associado
  // Outros campos que você possa ter incluído no token do aluno
}

// Estende a interface Request do Express para incluir req.aluno
export interface AuthenticatedAlunoRequest extends Request {
  aluno?: DecodedAlunoTokenPayload; // Dados do aluno logado
}

export const authenticateAlunoToken = (
  req: AuthenticatedAlunoRequest, 
  res: Response, 
  next: NextFunction
) => {
  const authHeader = req.headers['authorization'];
  const token = authHeader && authHeader.startsWith('Bearer ') ? authHeader.split(' ')[1] : null;

  if (!token) {
    return res.status(401).json({ message: 'Acesso não autorizado. Token de aluno não fornecido.' });
  }

  if (!JWT_SECRET) {
     console.error("Auth Aluno Middleware: JWT_SECRET não disponível em process.env.");
     return res.status(500).json({ message: 'Erro interno do servidor (configuração de autenticação).' });
  }

  try {
    const decoded = jwt.verify(token, JWT_SECRET as Secret) as DecodedAlunoTokenPayload;

    // Verificação crucial: garantir que o token é realmente de um 'Aluno'
    if (decoded.role !== 'Aluno') {
      console.warn(`[AUTH ALUNO] Tentativa de acesso com token de role inválida: ${decoded.role}`);
      return res.status(403).json({ message: 'Acesso proibido. Token inválido para esta área.' });
    }

    req.aluno = decoded; // Adiciona os dados do aluno ao objeto req
    console.log(`[AUTH ALUNO] Aluno autenticado: ${req.aluno?.email} (ID: ${req.aluno?.id})`);
    next(); // Prossegue para a próxima rota/middleware
  } catch (err: any) {
    console.warn(`[AUTH ALUNO] Falha na verificação do token de aluno - ${err.name}: ${err.message}`);
    if (err instanceof jwt.TokenExpiredError) {
        return res.status(401).json({ message: 'Sessão de aluno expirada. Faça login novamente.', code: 'TOKEN_EXPIRED' });
    }
    if (err instanceof jwt.JsonWebTokenError) {
        return res.status(403).json({ message: 'Acesso proibido. Token de aluno inválido.' });
    }
    console.error("[AUTH ALUNO] Erro inesperado ao verificar token de aluno:", err);
    return res.status(500).json({ message: 'Erro interno ao processar o token de aluno.' });
  }
};
