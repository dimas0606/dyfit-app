// shared/types/express/index.d.ts

// Define a estrutura do payload para o token de Personal/Admin
interface UserPayload {
  id: string;
  role: string;
}

// <<< ADICIONADO: Define a estrutura do payload para o token do Aluno >>>
interface AlunoPayload {
    id: string;
    role: 'aluno'; // O role aqui é sempre 'aluno'
    // Adicione outras propriedades se o token do aluno contiver mais dados
}


// Sobrescreve o namespace 'Express' para adicionar os nossos tipos customizados
declare namespace Express {
  export interface Request {
    // A propriedade 'user' pode existir em requisições de Personal/Admin
    user?: UserPayload;
    // <<< ADICIONADO: A propriedade 'aluno' pode existir em requisições de Aluno >>>
    aluno?: AlunoPayload;
  }
}