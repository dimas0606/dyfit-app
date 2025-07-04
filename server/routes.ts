import type { Express, Request, Response } from "express";
import { createServer, type Server } from "http";
import { storage } from "./storage";
import { 
  insertUserSchema, 
  insertStudentSchema, 
  insertExerciseSchema, 
  insertWorkoutPlanSchema, 
  insertWorkoutExerciseSchema, 
  insertStudentWorkoutSchema, 
  insertActivityLogSchema, 
  insertSessionSchema 
} from "@shared/schema";
import { z } from "zod";

// Importar os roteadores definidos nos arquivos de rotas específicos
import authRoutes from './src/routes/auth'; // Importa seu router de auth
import alunoApiRoutes from './src/routes/alunoApiRoutes'; // Assumindo que você terá rotas específicas para a API do aluno aqui
import alunosRoutes from './src/routes/alunos';
import activityLogsRoutes from './src/routes/activityLogsRoutes';
import adminRoutes from './src/routes/adminRoutes';
import convitePublicRoutes from './src/routes/convitePublicRoutes';
import dashboardGeralRoutes from './src/routes/dashboardGeralRoutes';
import exerciciosRoutes from './src/routes/exercicios';
import pastasTreinosRoutes from './src/routes/pastasTreinos';
import profileRoutes from './src/routes/profile';
import publicContatosRoutes from './src/routes/publicContatosRoutes';
import sessionsRoutes from './src/routes/sessionsRoutes';
import treinosRoutes from './src/routes/treinos';

// Helper function to validate request body with Zod schema
function validateBody<T extends z.ZodType>(schema: T) {
  return (req: Request, res: Response, next: () => void) => {
    try {
      const validatedBody = schema.parse(req.body);
      req.body = validatedBody;
      next();
    } catch (error) {
      return res.status(400).json({ error: "Invalid request body" });
    }
  };
}

// Initialize with default exercise data
async function seedExercises() {
  const exercises = [
    { name: "Barbell Squat", description: "A compound, full body exercise that trains primarily the muscles of the thighs, hips, buttocks and quads.", muscleGroup: "Legs", category: "Strength" },
    { name: "Bench Press", description: "A weight training exercise where the trainee presses a weight upwards while lying on a weight training bench.", muscleGroup: "Chest", category: "Strength" },
    { name: "Deadlift", description: "A weight training exercise in which a loaded barbell or bar is lifted off the ground to the level of the hips.", muscleGroup: "Back", category: "Strength" },
    { name: "Shoulder Press", description: "A weight training exercise in which a weight is pressed from the shoulders until the arms are fully extended overhead.", muscleGroup: "Shoulders", category: "Strength" },
    { name: "Pull-up", description: "An upper-body compound pulling exercise where you hang from a bar and pull your body upward.", muscleGroup: "Back", category: "Bodyweight" },
    { name: "Push-up", description: "A common calisthenics exercise beginning from the prone position, raising and lowering the body using the arms.", muscleGroup: "Chest", category: "Bodyweight" },
    { name: "Plank", description: "An isometric core strength exercise that involves maintaining a position similar to a push-up for the maximum possible time.", muscleGroup: "Core", category: "Bodyweight" },
    { name: "Burpee", description: "A full body exercise used in strength training and as an aerobic exercise.", muscleGroup: "Full Body", category: "Cardio" },
    { name: "Jumping Jacks", description: "A physical jumping exercise performed by jumping to a position with legs spread wide and hands touching overhead.", muscleGroup: "Full Body", category: "Cardio" },
    { name: "Mountain Climber", description: "A bodyweight exercise that engages multiple muscle groups and increases heart rate.", muscleGroup: "Full Body", category: "Cardio" },
    { name: "Russian Twist", description: "A popular exercise that targets the abdominal muscles, particularly the obliques.", muscleGroup: "Core", category: "Strength" },
    { name: "Dumbbell Curl", description: "A weight training exercise that targets the biceps brachii muscle.", muscleGroup: "Arms", category: "Strength" },
    { name: "Tricep Dip", description: "A bodyweight exercise that targets the triceps muscles on the back of the upper arm.", muscleGroup: "Arms", category: "Bodyweight" },
    { name: "Leg Raise", description: "An exercise that targets the iliopsoas and other muscles of the anterior hip and abdomen.", muscleGroup: "Core", category: "Bodyweight" },
    { name: "Lunge", description: "A weight training exercise that works the quadriceps, glutes, and hamstrings.", muscleGroup: "Legs", category: "Bodyweight" }
  ];
  for (const exercise of exercises) {
    const existingExercises = await storage.getExercises();
    const exists = existingExercises.some(e => e.name === exercise.name);
    if (!exists) {
      await storage.createExercise(exercise);
    }
  }
}

export async function registerRoutes(app: Express): Promise<Server> {
  // Initialize seed data
  await seedExercises();
  // Create HTTP server
  const httpServer = createServer(app);

  // ** Remover esta rota de login de personal/admin duplicada, pois ela já está em auth.ts **
  // app.post("/api/login", async (req: Request, res: Response) => {
  //   const { username, password } = req.body;
  //   if (!username || !password) {
  //     return res.status(400).json({ message: "Username and password are required" });
  //   }

  //   const user = await storage.getUserByUsername(username);
  //   if (!user || user.password !== password) {
  //     return res.status(401).json({ message: "Invalid credentials" });
  //   }

  //   return res.status(200).json({
  //     id: user.id,
  //     username: user.username,
  //     firstName: user.firstName,
  //     lastName: user.lastName,
  //     email: user.email,
  //     role: user.role
  //   });
  // });

  // Use the specific routers for their respective paths
  app.use('/api/auth', authRoutes); // Isso registra todas as rotas do auth.ts sob /api/auth
  app.use('/api/aluno', alunoApiRoutes); // Exemplo, se alunoApiRoutes tiver rotas sem o '/auth'
  app.use('/api/alunos', alunosRoutes);
  app.use('/api/activity-logs', activityLogsRoutes);
  app.use('/api/admin', adminRoutes);
  app.use('/api/convite-public', convitePublicRoutes);
  app.use('/api/dashboard-geral', dashboardGeralRoutes);
  app.use('/api/exercicios', exerciciosRoutes);
  app.use('/api/pastas-treinos', pastasTreinosRoutes);
  app.use('/api/profile', profileRoutes);
  app.use('/api/public-contatos', publicContatosRoutes);
  app.use('/api/sessions', sessionsRoutes);
  app.use('/api/treinos', treinosRoutes);

  // Remaining routes (that were originally defined in this file) should be replaced by their specific router files
  // Student Routes (These should now be handled by alunos.ts, for example)
  // Exercise Routes (These should now be handled by exercicios.ts)
  // Workout Plan Routes (These should now be handled by treinos.ts)
  // Workout Exercises Routes (These should be part of treinos.ts or a related router)
  // Student Workout Routes (These should be part of alunos.ts or treinos.ts, depending on your design)
  // Activity Log Routes (These should now be handled by activityLogsRoutes.ts)
  // Session Routes (These should now be handled by sessionsRoutes.ts)
  // Dashboard Stats (These should now be handled by dashboardGeralRoutes.ts)


  // AQUI EU REMOVI TODAS AS ROTAS DUPLICADAS E COMENTEI A ROTA DE LOGIN DE PERSONAL TAMBÉM
  // AS ROTAS JÁ EXISTEM EM SEUS RESPECTIVOS ARQUIVOS DE ROTAS
  // Student Routes
  // app.get("/api/students", async (req: Request, res: Response) => { ... });
  // app.get("/api/students/:id", async (req: Request, res: Response) => { ... });
  // app.post("/api/students", validateBody(insertStudentSchema), async (req: Request, res: Response) => { ... });
  // app.put("/api/students/:id", async (req: Request, res: Response) => { ... });
  // app.delete("/api/students/:id", async (req: Request, res: Response) => { ... });

  // Exercise Routes
  // app.get("/api/exercises", async (_req: Request, res: Response) => { ... });
  // app.get("/api/exercises/:id", async (req: Request, res: Response) => { ... });
  // app.post("/api/exercises", validateBody(insertExerciseSchema), async (req: Request, res: Response) => { ... });
  // app.put("/api/exercises/:id", async (req: Request, res: Response) => { ... });
  // app.delete("/api/exercises/:id", async (req: Request, res: Response) => { ... });

  // Workout Plan Routes
  // app.get("/api/workout-plans", async (req: Request, res: Response) => { ... });
  // app.get("/api/workout-plans/:id", async (req: Request, res: Response) => { ... });
  // app.post("/api/workout-plans", validateBody(insertWorkoutPlanSchema), async (req: Request, res: Response) => { ... });
  // app.put("/api/workout-plans/:id", async (req: Request, res: Response) => { ... });
  // app.delete("/api/workout-plans/:id", async (req: Request, res: Response) => { ... });

  // Workout Exercises Routes
  // app.get("/api/workout-plans/:id/exercises", async (req: Request, res: Response) => { ... });
  // app.post("/api/workout-exercises", validateBody(insertWorkoutExerciseSchema), async (req: Request, res: Response) => { ... });
  // app.put("/api/workout-exercises/:id", async (req: Request, res: Response) => { ... });
  // app.delete("/api/workout-exercises/:id", async (req: Request, res: Response) => { ... });

  // Student Workout Routes
  // app.get("/api/students/:id/workouts", async (req: Request, res: Response) => { ... });
  // app.post("/api/student-workouts", validateBody(insertStudentWorkoutSchema), async (req: Request, res: Response) => { ... });
  // app.put("/api/student-workouts/:id", async (req: Request, res: Response) => { ... });
  // app.delete("/api/student-workouts/:id", async (req: Request, res: Response) => { ... });

  // Activity Log Routes
  // app.get("/api/activity-logs", async (req: Request, res: Response) => { ... });

  // Session Routes
  // app.get("/api/sessions", async (req: Request, res: Response) => { ... });
  // app.post("/api/sessions", validateBody(insertSessionSchema), async (req: Request, res: Response) => { ... });
  // app.put("/api/sessions/:id", async (req: Request, res: Response) => { ... });
  // app.delete("/api/sessions/:id", async (req: Request, res: Response) => { ... });

  // Dashboard Stats
  // app.get("/api/dashboard", async (req: Request, res: Response) => { ... });

  return httpServer;
}