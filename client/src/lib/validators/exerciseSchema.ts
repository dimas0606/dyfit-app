import { z } from 'zod';

// Schema Zod para validação do formulário de exercícios
export const exerciseFormSchema = z.object({
  nome: z.string()
    .min(3, { message: "O nome deve ter pelo menos 3 caracteres." })
    .max(100, { message: "O nome não pode exceder 100 caracteres." })
    .trim(),
  grupoMuscular: z.string()
    .min(1, { message: "Selecione ou digite um grupo muscular." })
    .trim(),
  descricao: z.string()
    .max(1000, { message: "A descrição não pode exceder 1000 caracteres." })
    .trim()
    .optional(),
  categoria: z.string()
    .trim()
    .optional(),
  videoUrl: z.string()
    .url({ message: "Por favor, insira uma URL de vídeo válida." })
    .trim()
    .optional()
    .or(z.literal('')),
  isCustom: z.boolean().default(false),
});

export type ExerciseFormData = z.infer<typeof exerciseFormSchema>;

export const gruposMuscularesOptions = [
  "Peito", "Costas", "Pernas", "Ombros", "Bíceps", "Tríceps", "Antebraço", "Abdômen", "Lombar", "Glúteos", "Panturrilha", "Cardio", "Corpo Inteiro", "Outro"
];

export const categoriasOptions = [
  "Força", "Resistência", "Hipertrofia", "Potência", "Cardiovascular", "Flexibilidade", "Mobilidade", "Funcional", "Calistenia", "Outro"
];
