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

  // Login / Authentication Routes
  app.post("/api/login", async (req: Request, res: Response) => {
    const { username, password } = req.body;
    if (!username || !password) {
      return res.status(400).json({ message: "Username and password are required" });
    }

    const user = await storage.getUserByUsername(username);
    if (!user || user.password !== password) {
      return res.status(401).json({ message: "Invalid credentials" });
    }

    return res.status(200).json({
      id: user.id,
      username: user.username,
      firstName: user.firstName,
      lastName: user.lastName,
      email: user.email,
      role: user.role
    });
  });

  // Student Routes
  app.get("/api/students", async (req: Request, res: Response) => {
    const trainerId = parseInt(req.query.trainerId as string);
    if (isNaN(trainerId)) {
      return res.status(400).json({ message: "Trainer ID is required" });
    }
    const students = await storage.getStudents(trainerId);
    return res.status(200).json(students);
  });

  app.get("/api/students/:id", async (req: Request, res: Response) => {
    const id = parseInt(req.params.id);
    const student = await storage.getStudent(id);
    if (!student) {
      return res.status(404).json({ message: "Student not found" });
    }
    return res.status(200).json(student);
  });

  app.post("/api/students", validateBody(insertStudentSchema), async (req: Request, res: Response) => {
    const student = await storage.createStudent(req.body);
    
    // Create activity log
    await storage.createActivityLog({
      trainerId: student.trainerId,
      activityType: "student-added",
      details: { studentId: student.id, name: `${student.firstName} ${student.lastName}` },
      timestamp: new Date()
    });
    
    return res.status(201).json(student);
  });

  app.put("/api/students/:id", async (req: Request, res: Response) => {
    const id = parseInt(req.params.id);
    const updatedStudent = await storage.updateStudent(id, req.body);
    if (!updatedStudent) {
      return res.status(404).json({ message: "Student not found" });
    }
    return res.status(200).json(updatedStudent);
  });

  app.delete("/api/students/:id", async (req: Request, res: Response) => {
    const id = parseInt(req.params.id);
    const success = await storage.deleteStudent(id);
    if (!success) {
      return res.status(404).json({ message: "Student not found" });
    }
    return res.status(204).end();
  });

  // Exercise Routes
  app.get("/api/exercises", async (_req: Request, res: Response) => {
    const exercises = await storage.getExercises();
    return res.status(200).json(exercises);
  });

  app.get("/api/exercises/:id", async (req: Request, res: Response) => {
    const id = parseInt(req.params.id);
    const exercise = await storage.getExercise(id);
    if (!exercise) {
      return res.status(404).json({ message: "Exercise not found" });
    }
    return res.status(200).json(exercise);
  });

  app.post("/api/exercises", validateBody(insertExerciseSchema), async (req: Request, res: Response) => {
    const exercise = await storage.createExercise(req.body);
    return res.status(201).json(exercise);
  });

  app.put("/api/exercises/:id", async (req: Request, res: Response) => {
    const id = parseInt(req.params.id);
    const updatedExercise = await storage.updateExercise(id, req.body);
    if (!updatedExercise) {
      return res.status(404).json({ message: "Exercise not found" });
    }
    return res.status(200).json(updatedExercise);
  });

  app.delete("/api/exercises/:id", async (req: Request, res: Response) => {
    const id = parseInt(req.params.id);
    const success = await storage.deleteExercise(id);
    if (!success) {
      return res.status(404).json({ message: "Exercise not found" });
    }
    return res.status(204).end();
  });

  // Workout Plan Routes
  app.get("/api/workout-plans", async (req: Request, res: Response) => {
    const trainerId = parseInt(req.query.trainerId as string);
    if (isNaN(trainerId)) {
      return res.status(400).json({ message: "Trainer ID is required" });
    }
    const workoutPlans = await storage.getWorkoutPlans(trainerId);
    return res.status(200).json(workoutPlans);
  });

  app.get("/api/workout-plans/:id", async (req: Request, res: Response) => {
    const id = parseInt(req.params.id);
    const workoutPlan = await storage.getWorkoutPlan(id);
    if (!workoutPlan) {
      return res.status(404).json({ message: "Workout plan not found" });
    }
    return res.status(200).json(workoutPlan);
  });

  app.post("/api/workout-plans", validateBody(insertWorkoutPlanSchema), async (req: Request, res: Response) => {
    const workoutPlan = await storage.createWorkoutPlan(req.body);
    
    // Create activity log
    await storage.createActivityLog({
      trainerId: workoutPlan.trainerId,
      activityType: "workout-created",
      details: { workoutPlanId: workoutPlan.id, name: workoutPlan.name },
      timestamp: new Date()
    });
    
    return res.status(201).json(workoutPlan);
  });

  app.put("/api/workout-plans/:id", async (req: Request, res: Response) => {
    const id = parseInt(req.params.id);
    const updatedWorkoutPlan = await storage.updateWorkoutPlan(id, req.body);
    if (!updatedWorkoutPlan) {
      return res.status(404).json({ message: "Workout plan not found" });
    }
    
    // Create activity log
    await storage.createActivityLog({
      trainerId: updatedWorkoutPlan.trainerId,
      activityType: "workout-updated",
      details: { workoutPlanId: updatedWorkoutPlan.id, name: updatedWorkoutPlan.name },
      timestamp: new Date()
    });
    
    return res.status(200).json(updatedWorkoutPlan);
  });

  app.delete("/api/workout-plans/:id", async (req: Request, res: Response) => {
    const id = parseInt(req.params.id);
    const success = await storage.deleteWorkoutPlan(id);
    if (!success) {
      return res.status(404).json({ message: "Workout plan not found" });
    }
    return res.status(204).end();
  });

  // Workout Exercises Routes
  app.get("/api/workout-plans/:id/exercises", async (req: Request, res: Response) => {
    const workoutPlanId = parseInt(req.params.id);
    const workoutExercises = await storage.getWorkoutExercises(workoutPlanId);
    return res.status(200).json(workoutExercises);
  });

  app.post("/api/workout-exercises", validateBody(insertWorkoutExerciseSchema), async (req: Request, res: Response) => {
    const workoutExercise = await storage.createWorkoutExercise(req.body);
    return res.status(201).json(workoutExercise);
  });

  app.put("/api/workout-exercises/:id", async (req: Request, res: Response) => {
    const id = parseInt(req.params.id);
    const updatedWorkoutExercise = await storage.updateWorkoutExercise(id, req.body);
    if (!updatedWorkoutExercise) {
      return res.status(404).json({ message: "Workout exercise not found" });
    }
    return res.status(200).json(updatedWorkoutExercise);
  });

  app.delete("/api/workout-exercises/:id", async (req: Request, res: Response) => {
    const id = parseInt(req.params.id);
    const success = await storage.deleteWorkoutExercise(id);
    if (!success) {
      return res.status(404).json({ message: "Workout exercise not found" });
    }
    return res.status(204).end();
  });

  // Student Workout Routes
  app.get("/api/students/:id/workouts", async (req: Request, res: Response) => {
    const studentId = parseInt(req.params.id);
    const studentWorkouts = await storage.getStudentWorkouts(studentId);
    return res.status(200).json(studentWorkouts);
  });

  app.post("/api/student-workouts", validateBody(insertStudentWorkoutSchema), async (req: Request, res: Response) => {
    const studentWorkout = await storage.createStudentWorkout(req.body);
    
    // Get student and workout plan info for activity log
    const student = await storage.getStudent(studentWorkout.studentId);
    const workoutPlan = await storage.getWorkoutPlan(studentWorkout.workoutPlanId);
    
    if (student && workoutPlan) {
      // Create activity log
      await storage.createActivityLog({
        trainerId: workoutPlan.trainerId,
        activityType: "workout-assigned",
        details: { 
          studentId: student.id, 
          studentName: `${student.firstName} ${student.lastName}`,
          workoutPlanId: workoutPlan.id,
          workoutPlanName: workoutPlan.name
        },
        timestamp: new Date()
      });
    }
    
    return res.status(201).json(studentWorkout);
  });

  app.put("/api/student-workouts/:id", async (req: Request, res: Response) => {
    const id = parseInt(req.params.id);
    const updatedStudentWorkout = await storage.updateStudentWorkout(id, req.body);
    if (!updatedStudentWorkout) {
      return res.status(404).json({ message: "Student workout not found" });
    }
    
    // Create activity log if progress was updated
    if (req.body.progress !== undefined) {
      const student = await storage.getStudent(updatedStudentWorkout.studentId);
      const workoutPlan = await storage.getWorkoutPlan(updatedStudentWorkout.workoutPlanId);
      
      if (student && workoutPlan) {
        await storage.createActivityLog({
          trainerId: workoutPlan.trainerId,
          activityType: "workout-progress-updated",
          details: { 
            studentId: student.id, 
            studentName: `${student.firstName} ${student.lastName}`,
            workoutPlanId: workoutPlan.id,
            workoutPlanName: workoutPlan.name,
            progress: updatedStudentWorkout.progress
          },
          timestamp: new Date()
        });
      }
    }
    
    return res.status(200).json(updatedStudentWorkout);
  });

  app.delete("/api/student-workouts/:id", async (req: Request, res: Response) => {
    const id = parseInt(req.params.id);
    const success = await storage.deleteStudentWorkout(id);
    if (!success) {
      return res.status(404).json({ message: "Student workout not found" });
    }
    return res.status(204).end();
  });

  // Activity Log Routes
  app.get("/api/activity-logs", async (req: Request, res: Response) => {
    const trainerId = parseInt(req.query.trainerId as string);
    const limit = req.query.limit ? parseInt(req.query.limit as string) : 10;
    
    if (isNaN(trainerId)) {
      return res.status(400).json({ message: "Trainer ID is required" });
    }
    
    const activityLogs = await storage.getActivityLogs(trainerId, limit);
    return res.status(200).json(activityLogs);
  });

  // Session Routes
  app.get("/api/sessions", async (req: Request, res: Response) => {
    const trainerId = parseInt(req.query.trainerId as string);
    const date = req.query.date ? new Date(req.query.date as string) : undefined;
    
    if (isNaN(trainerId)) {
      return res.status(400).json({ message: "Trainer ID is required" });
    }
    
    let sessions;
    if (date) {
      sessions = await storage.getSessionsByDate(trainerId, date);
    } else {
      sessions = await storage.getSessions(trainerId);
    }
    
    // Fetch student data for each session
    const sessionsWithStudents = await Promise.all(
      sessions.map(async (session) => {
        const student = await storage.getStudent(session.studentId);
        return {
          ...session,
          student
        };
      })
    );
    
    return res.status(200).json(sessionsWithStudents);
  });

  app.post("/api/sessions", validateBody(insertSessionSchema), async (req: Request, res: Response) => {
    const session = await storage.createSession(req.body);
    
    // Create activity log
    const student = await storage.getStudent(session.studentId);
    if (student) {
      await storage.createActivityLog({
        trainerId: session.trainerId,
        activityType: "session-scheduled",
        details: { 
          sessionId: session.id, 
          studentId: student.id,
          studentName: `${student.firstName} ${student.lastName}`,
          sessionDate: session.sessionDate
        },
        timestamp: new Date()
      });
    }
    
    return res.status(201).json(session);
  });

  app.put("/api/sessions/:id", async (req: Request, res: Response) => {
    const id = parseInt(req.params.id);
    const updatedSession = await storage.updateSession(id, req.body);
    if (!updatedSession) {
      return res.status(404).json({ message: "Session not found" });
    }
    
    // Create activity log for status changes
    if (req.body.status) {
      const student = await storage.getStudent(updatedSession.studentId);
      if (student) {
        await storage.createActivityLog({
          trainerId: updatedSession.trainerId,
          activityType: `session-${req.body.status}`,
          details: { 
            sessionId: updatedSession.id, 
            studentId: student.id,
            studentName: `${student.firstName} ${student.lastName}`,
            sessionDate: updatedSession.sessionDate,
            status: updatedSession.status
          },
          timestamp: new Date()
        });
      }
    }
    
    return res.status(200).json(updatedSession);
  });

  app.delete("/api/sessions/:id", async (req: Request, res: Response) => {
    const id = parseInt(req.params.id);
    const success = await storage.deleteSession(id);
    if (!success) {
      return res.status(404).json({ message: "Session not found" });
    }
    return res.status(204).end();
  });

  // Dashboard Stats
  app.get("/api/dashboard", async (req: Request, res: Response) => {
    const trainerId = parseInt(req.query.trainerId as string);
    
    if (isNaN(trainerId)) {
      return res.status(400).json({ message: "Trainer ID is required" });
    }
    
    // Get students count
    const students = await storage.getStudents(trainerId);
    const studentsCount = students.length;
    
    // Get active workout plans count
    const workoutPlans = await storage.getWorkoutPlans(trainerId);
    const activeWorkoutsCount = workoutPlans.filter(plan => plan.status === "active").length;
    
    // Get sessions for current week
    const today = new Date();
    const startOfWeek = new Date(today);
    startOfWeek.setDate(today.getDate() - today.getDay());
    startOfWeek.setHours(0, 0, 0, 0);
    
    const endOfWeek = new Date(today);
    endOfWeek.setDate(startOfWeek.getDate() + 6);
    endOfWeek.setHours(23, 59, 59, 999);
    
    const sessions = await storage.getSessions(trainerId);
    const sessionsThisWeek = sessions.filter(session => {
      const sessionDate = new Date(session.sessionDate);
      return sessionDate >= startOfWeek && sessionDate <= endOfWeek;
    }).length;
    
    // Calculate completion rate (percentage of completed sessions)
    const completedSessions = sessions.filter(session => session.status === "completed").length;
    const allSessions = sessions.length;
    const completionRate = allSessions > 0 ? Math.round((completedSessions / allSessions) * 100) : 0;
    
    return res.status(200).json({
      studentsCount,
      activeWorkoutsCount,
      sessionsThisWeek,
      completionRate
    });
  });

  return httpServer;
}
