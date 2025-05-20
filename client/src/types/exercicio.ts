// client/src/types/exercicio.ts

// Define e exporta a interface Exercicio
export interface Exercicio { 
    _id: string; 
    nome: string;
    grupoMuscular: string;
    descricao?: string;
    categoria?: string;
    imageUrl?: string;
    videoUrl?: string; 
    isCustom: boolean;
    creatorId?: string; 
    favoritedBy?: string[]; 
    isFavorited?: boolean; 
    createdAt?: string; 
    updatedAt?: string; 
  }