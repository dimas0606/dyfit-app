// src/shared/schema.ts

import { z } from "zod";

// Aluno (Student)
export const insertStudentSchema = z.object({
  nome: z.string(),
  email: z.string().email(),
  phone: z.string().optional(),
  birthDate: z.string(),
  gender: z.string(),
  goal: z.string(),
  weight: z.number(),
  height: z.number(),
  startDate: z.string(),
  trainerId: z.number(),
  status: z.string().optional(),
  notes: z.string().optional(),
});

// Usuário (User)
export const insertUserSchema = z.object({
  username: z.string(),
  password: z.string(),
  firstName: z.string(),
  lastName: z.string(),
  email: z.string().email(),
  role: z.string(),
});

// Exercício (Exercise)
export const insertExerciseSchema = z.object({
  name: z.string(),
  description: z.string().optional(),
  muscleGroup: z.string(),
  category: z.string(),
});

// Plano de treino (Workout Plan)
export const insertWorkoutPlanSchema = z.object({
  name: z.string(),
  description: z.string().optional(),
  trainerId: z.number(),
  status: z.string(),
});

// Exercício dentro de um plano (Workout Exercise)
export const insertWorkoutExerciseSchema = z.object({
  workoutPlanId: z.number(),
  exerciseId: z.number(),
  sets: z.number(),
  reps: z.number(),
  rest: z.number(),
  notes: z.string().optional(),
});

// Relacionamento aluno <-> treino (Student Workout)
export const insertStudentWorkoutSchema = z.object({
  studentId: z.number(),
  workoutPlanId: z.number(),
  progress: z.number().optional(),
});

// Registro de atividade (Activity Log)
export const insertActivityLogSchema = z.object({
  trainerId: z.number(),
  activityType: z.string(),
  details: z.any(),
  timestamp: z.date(),
});

// Sessão (Session)
export const insertSessionSchema = z.object({
  trainerId: z.number(),
  studentId: z.number(),
  sessionDate: z.string(),
  startTime: z.string(),
  endTime: z.string(),
  status: z.string(),
  notes: z.string().optional(),
});
