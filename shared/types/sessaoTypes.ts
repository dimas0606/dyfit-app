export const TIPOS_COMPROMISSO = ['avaliacao', 'checkin', 'treino_acompanhado', 'outro'] as const;
export type TipoCompromisso = typeof TIPOS_COMPROMISSO[number];

// Outras interfaces de Sessao/Compromisso que o frontend precise
export interface CompromissoDataShareable { // Exemplo
  _id: string;
  sessionDate: string; 
  tipoCompromisso: TipoCompromisso;
  notes?: string;
  status: "pending" | "confirmed" | "completed" | "cancelled";
  studentId: { _id: string; nome: string; } | string; 
  // trainerId não precisa ser exposto ao frontend se ele já sabe quem é o trainer
}