// shared/types/personal.ts

// Interface para os detalhes completos de um PersonalTrainer, como retornado pela API (sem campos sensíveis)
export interface PersonalDetalhes {
    _id: string;
    nome: string;
    email: string;
    role: 'Personal Trainer' | 'Admin'; // Roles permitidas
    tokenCadastroAluno?: string;
    statusAssinatura?: 'ativa' | 'inativa' | 'pendente_pagamento' | 'cancelada' | 'trial' | 'sem_assinatura';
    limiteAlunos?: number;
    dataInicioAssinatura?: string | Date; 
    dataFimAssinatura?: string | Date;
    idAssinaturaGateway?: string;
    planoId?: string; // <<< CAMPO ADICIONADO AQUI
    createdAt: string | Date;
    updatedAt: string | Date;
  }
    
  // Interface para os itens listados na tabela de personais (pode ser um subconjunto de PersonalDetalhes)
  export interface PersonalListadoItem {
    _id: string;
    nome: string;
    email: string;
    role: 'Personal Trainer' | 'Admin';
    createdAt: string | Date; 
    statusAssinatura?: string;
    // planoId não é usado na listagem da tabela, então não precisa ser adicionado aqui
    // a menos que você decida exibir essa informação na tabela no futuro.
  }
  