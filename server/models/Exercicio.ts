// Caminho: ./server/models/Exercicio.ts
import mongoose, { Document, Schema, Types } from "mongoose";

export interface IExercicio extends Document {
  nome: string;
  descricao?: string;
  categoria?: string; // Ex: Superior, Inferior, Core
  grupoMuscular?: string; // Ex: Peito, Costas, Pernas
  tipo?: string; // Ex: Musculação, Calistenia, Funcional (pode ser o mesmo que categoria ou um campo adicional)
  urlVideo?: string;
  isCustom: boolean; // true se criado pelo personal, false se for do sistema/app
  creatorId?: Types.ObjectId; // ID do PersonalTrainer que criou (se isCustom for true)
  favoritedBy: Types.ObjectId[]; // Array de IDs de PersonalTrainers que favoritaram
  createdAt?: Date;
  updatedAt?: Date;
}

const ExercicioSchema = new Schema<IExercicio>({
  nome: { type: String, required: true, trim: true },
  descricao: { type: String, trim: true },
  categoria: { type: String, trim: true },
  grupoMuscular: { type: String, trim: true, index: true }, // Principal grupo muscular trabalhado - MANTÉM ESTE
  tipo: { type: String, trim: true },
  urlVideo: { type: String, trim: true },
  isCustom: { type: Boolean, required: true, default: false },
  creatorId: {
    type: Schema.Types.ObjectId,
    ref: "PersonalTrainer",
    required: function(this: IExercicio) { return this.isCustom; }
  },
  favoritedBy: [{
    type: Schema.Types.ObjectId,
    ref: "PersonalTrainer"
  }],
}, {
  timestamps: true
});

// Índice para busca por nome (case-insensitive)
ExercicioSchema.index({ nome: 'text' });
// ExercicioSchema.index({ grupoMuscular: 1 }); // <<< REMOVER ESTA LINHA
ExercicioSchema.index({ categoria: 1 });
ExercicioSchema.index({ isCustom: 1, creatorId: 1 });


export default mongoose.model<IExercicio>("Exercicio", ExercicioSchema);