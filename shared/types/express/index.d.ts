// shared/types/express/index.d.ts

// Interfaces para os payloads dos tokens JWT
// Definimos aqui como a fonte da verdade para todo o projeto.
interface PersonalTrainerPayload {
    id: string;
    role: 'personal' | 'admin';
    firstName: string;
    lastName: string;
    email: string; // ---> CORREÇÃO CRÍTICA: Campo adicionado para sincronizar com o middleware
}

interface AlunoPayload {
    id:string;
    role: 'aluno';
    nome: string;
}

// Declaração global para estender a interface Request do Express
// Agora o TypeScript saberá que 'user' E 'aluno' podem existir no objeto 'req'
declare global {
  namespace Express {
    interface Request {
      user?: PersonalTrainerPayload;
      aluno?: AlunoPayload;
    }
  }
}

// Linha necessária para garantir que este arquivo seja tratado como um módulo.
export {};