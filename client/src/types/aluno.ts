export interface Aluno {
    _id: string;
    nome: string;
    email: string;
    phone?: string;
    birthDate: string;
    gender: string;
    goal: string;
    weight: number;
    height: number;
    startDate: string;
    // --- CORREÇÃO AQUI ---
    status: 'active' | 'inactive';
    notes?: string;
    trainerId: string; // ID do PersonalTrainer
  }