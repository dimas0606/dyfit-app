// shared/types.ts

// Interface básica para Aluno
// Adicione outras propriedades conforme necessário
export interface Aluno {
    _id: string;
    firstName: string;
    lastName: string;
    email: string;
    // Adicione outros campos do aluno aqui (ex: dataNascimento, telefone, etc.)
  }
  
  // Interface básica para Personal
  // Adicione outras propriedades conforme necessário
  export interface Personal {
    _id: string;
    firstName: string;
    lastName: string;
    email: string;
    // Adicione outros campos do personal aqui
  }
  
  // Interface para os detalhes de um exercício dentro da ficha de treino do aluno
  export interface ExercicioFichaAluno {
    exercicioId: { // Populated exercise details (assumindo que você popula)
      _id: string;
      nome: string;
      grupoMuscular: string;
      // Adicione outros campos do exercício que você popula
    };
    ordem: number;
    series: string;
    repeticoes: string;
    carga?: string;
    observacoes?: string;
  }
  
  // Interface para o documento da Ficha de Treino do Aluno
  export interface IFichaTreinoAluno {
    _id: string;
    alunoId: string; // Pode ser string se não for populado, ou Aluno se for populado
    personalId: string; // Pode ser string se não for populado, ou Personal se for populado
    nome: string;
    descricao?: string;
    exercicios: ExercicioFichaAluno[];
    dataCriacao: string; // Use string se for ISO date string, ou Date se converter
    dataAtualizacao: string; // Use string se for ISO date string, ou Date se converter
  }
  
  // Adicione outras interfaces compartilhadas aqui (Exercicio, FichaModelo, etc.)
  