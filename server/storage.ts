import {
  users, type User, type InsertUser,
  students, type Student, type InsertStudent,
  exercises, type Exercise, type InsertExercise,
  workoutPlans, type WorkoutPlan, type InsertWorkoutPlan,
  workoutExercises, type WorkoutExercise, type InsertWorkoutExercise,
  studentWorkouts, type StudentWorkout, type InsertStudentWorkout,
  activityLogs, type ActivityLog, type InsertActivityLog,
  sessions, type Session, type InsertSession
} from "@shared/schema";

export interface IStorage {
  getUser(id: number): Promise<User | undefined>;
  getUserByUsername(username: string): Promise<User | undefined>;
  createUser(user: InsertUser): Promise<User>;

  getStudents(trainerId: number): Promise<Student[]>;
  getStudent(id: number): Promise<Student | undefined>;
  createStudent(student: InsertStudent): Promise<Student>;
  updateStudent(id: number, student: Partial<InsertStudent>): Promise<Student | undefined>;
  deleteStudent(id: number): Promise<boolean>;

  getExercises(): Promise<Exercise[]>;
  getExercise(id: number): Promise<Exercise | undefined>;
  createExercise(exercise: InsertExercise): Promise<Exercise>;
  updateExercise(id: number, exercise: Partial<InsertExercise>): Promise<Exercise | undefined>;
  deleteExercise(id: number): Promise<boolean>;

  getWorkoutPlans(trainerId: number): Promise<WorkoutPlan[]>;
  getWorkoutPlan(id: number): Promise<WorkoutPlan | undefined>;
  createWorkoutPlan(workoutPlan: InsertWorkoutPlan): Promise<WorkoutPlan>;
  updateWorkoutPlan(id: number, workoutPlan: Partial<InsertWorkoutPlan>): Promise<WorkoutPlan | undefined>;
  deleteWorkoutPlan(id: number): Promise<boolean>;

  getWorkoutExercises(workoutPlanId: number): Promise<WorkoutExercise[]>;
  createWorkoutExercise(workoutExercise: InsertWorkoutExercise): Promise<WorkoutExercise>;
  updateWorkoutExercise(id: number, workoutExercise: Partial<InsertWorkoutExercise>): Promise<WorkoutExercise | undefined>;
  deleteWorkoutExercise(id: number): Promise<boolean>;

  getStudentWorkouts(studentId: number): Promise<StudentWorkout[]>;
  getStudentWorkout(id: number): Promise<StudentWorkout | undefined>;
  createStudentWorkout(studentWorkout: InsertStudentWorkout): Promise<StudentWorkout>;
  updateStudentWorkout(id: number, studentWorkout: Partial<InsertStudentWorkout>): Promise<StudentWorkout | undefined>;
  deleteStudentWorkout(id: number): Promise<boolean>;

  getActivityLogs(trainerId: number, limit?: number): Promise<ActivityLog[]>;
  createActivityLog(activityLog: InsertActivityLog): Promise<ActivityLog>;

  getSessions(trainerId: number): Promise<Session[]>;
  getSessionsByDate(trainerId: number, date: Date): Promise<Session[]>;
  getSession(id: number): Promise<Session | undefined>;
  createSession(session: InsertSession): Promise<Session>;
  updateSession(id: number, session: Partial<InsertSession>): Promise<Session | undefined>;
  deleteSession(id: number): Promise<boolean>;
}

export class MemStorage implements IStorage {
  private users = new Map<number, User>();
  private students = new Map<number, Student>();
  private exercises = new Map<number, Exercise>();
  private workoutPlans = new Map<number, WorkoutPlan>();
  private workoutExercises = new Map<number, WorkoutExercise>();
  private studentWorkouts = new Map<number, StudentWorkout>();
  private activityLogs = new Map<number, ActivityLog>();
  private sessions = new Map<number, Session>();

  private userIdCounter = 1;
  private studentIdCounter = 1;
  private exerciseIdCounter = 1;
  private workoutPlanIdCounter = 1;
  private workoutExerciseIdCounter = 1;
  private studentWorkoutIdCounter = 1;
  private activityLogIdCounter = 1;
  private sessionIdCounter = 1;

  constructor() {
    this.createUser({
      username: "admin",
      password: "admin",
      firstName: "John",
      lastName: "Smith",
      email: "john@trainpro.com",
      role: "trainer"
    });
  }

  async getUser(id: number) {
    return this.users.get(id);
  }

  async getUserByUsername(username: string) {
    return Array.from(this.users.values()).find(u => u.username === username);
  }

  async createUser(user: InsertUser): Promise<User> {
    const id = this.userIdCounter++;
    const newUser: User = { ...user, id };
    this.users.set(id, newUser);
    return newUser;
  }

  async getStudents(trainerId: number) {
    return Array.from(this.students.values()).filter(s => s.trainerId === trainerId);
  }

  async getStudent(id: number) {
    return this.students.get(id);
  }

  async createStudent(student: InsertStudent): Promise<Student> {
    const id = this.studentIdCounter++;
    const newStudent: Student = { ...student, id };
    this.students.set(id, newStudent);
    return newStudent;
  }

  async updateStudent(id: number, student: Partial<InsertStudent>): Promise<Student | undefined> {
    const existing = this.students.get(id);
    if (!existing) return undefined;
    const updated = { ...existing, ...student };
    this.students.set(id, updated);
    return updated;
  }

  async deleteStudent(id: number): Promise<boolean> {
    return this.students.delete(id);
  }

  async getExercises() {
    return Array.from(this.exercises.values());
  }

  async getExercise(id: number) {
    return this.exercises.get(id);
  }

  async createExercise(exercise: InsertExercise): Promise<Exercise> {
    const id = this.exerciseIdCounter++;
    const newExercise: Exercise = { ...exercise, id };
    this.exercises.set(id, newExercise);
    return newExercise;
  }

  async updateExercise(id: number, exercise: Partial<InsertExercise>): Promise<Exercise | undefined> {
    const existing = this.exercises.get(id);
    if (!existing) return undefined;
    const updated = { ...existing, ...exercise };
    this.exercises.set(id, updated);
    return updated;
  }

  async deleteExercise(id: number): Promise<boolean> {
    return this.exercises.delete(id);
  }

  async getWorkoutPlans(trainerId: number) {
    return Array.from(this.workoutPlans.values()).filter(w => w.trainerId === trainerId);
  }

  async getWorkoutPlan(id: number) {
    return this.workoutPlans.get(id);
  }

  async createWorkoutPlan(plan: InsertWorkoutPlan): Promise<WorkoutPlan> {
    const id = this.workoutPlanIdCounter++;
    const newPlan: WorkoutPlan = { ...plan, id };
    this.workoutPlans.set(id, newPlan);
    return newPlan;
  }

  async updateWorkoutPlan(id: number, plan: Partial<InsertWorkoutPlan>): Promise<WorkoutPlan | undefined> {
    const existing = this.workoutPlans.get(id);
    if (!existing) return undefined;
    const updated = { ...existing, ...plan };
    this.workoutPlans.set(id, updated);
    return updated;
  }

  async deleteWorkoutPlan(id: number): Promise<boolean> {
    return this.workoutPlans.delete(id);
  }

  async getWorkoutExercises(workoutPlanId: number) {
    return Array.from(this.workoutExercises.values())
      .filter(w => w.workoutPlanId === workoutPlanId)
      .sort((a, b) => a.order - b.order);
  }

  async createWorkoutExercise(w: InsertWorkoutExercise): Promise<WorkoutExercise> {
    const id = this.workoutExerciseIdCounter++;
    const newW: WorkoutExercise = { ...w, id };
    this.workoutExercises.set(id, newW);
    return newW;
  }

  async updateWorkoutExercise(id: number, w: Partial<InsertWorkoutExercise>): Promise<WorkoutExercise | undefined> {
    const existing = this.workoutExercises.get(id);
    if (!existing) return undefined;
    const updated = { ...existing, ...w };
    this.workoutExercises.set(id, updated);
    return updated;
  }

  async deleteWorkoutExercise(id: number): Promise<boolean> {
    return this.workoutExercises.delete(id);
  }

  async getStudentWorkouts(studentId: number) {
    return Array.from(this.studentWorkouts.values()).filter(w => w.studentId === studentId);
  }

  async getStudentWorkout(id: number) {
    return this.studentWorkouts.get(id);
  }

  async createStudentWorkout(w: InsertStudentWorkout): Promise<StudentWorkout> {
    const id = this.studentWorkoutIdCounter++;
    const newW: StudentWorkout = { ...w, id };
    this.studentWorkouts.set(id, newW);
    return newW;
  }

  async updateStudentWorkout(id: number, w: Partial<InsertStudentWorkout>): Promise<StudentWorkout | undefined> {
    const existing = this.studentWorkouts.get(id);
    if (!existing) return undefined;
    const updated = { ...existing, ...w };
    this.studentWorkouts.set(id, updated);
    return updated;
  }

  async deleteStudentWorkout(id: number): Promise<boolean> {
    return this.studentWorkouts.delete(id);
  }

  async getActivityLogs(trainerId: number, limit = 10) {
    return Array.from(this.activityLogs.values())
      .filter(log => log.trainerId === trainerId)
      .sort((a, b) => +new Date(b.timestamp) - +new Date(a.timestamp))
      .slice(0, limit);
  }

  async createActivityLog(log: InsertActivityLog): Promise<ActivityLog> {
    const id = this.activityLogIdCounter++;
    const newLog: ActivityLog = { ...log, id };
    this.activityLogs.set(id, newLog);
    return newLog;
  }

  async getSessions(trainerId: number) {
    return Array.from(this.sessions.values()).filter(s => s.trainerId === trainerId);
  }

  async getSessionsByDate(trainerId: number, date: Date) {
    const start = new Date(date.setHours(0, 0, 0, 0));
    const end = new Date(date.setHours(23, 59, 59, 999));
    return Array.from(this.sessions.values()).filter(s => {
      const d = new Date(s.sessionDate);
      return s.trainerId === trainerId && d >= start && d <= end;
    }).sort((a, b) => +new Date(a.sessionDate) - +new Date(b.sessionDate));
  }

  async getSession(id: number) {
    return this.sessions.get(id);
  }

  async createSession(session: InsertSession): Promise<Session> {
    const id = this.sessionIdCounter++;
    const newSession: Session = { ...session, id };
    this.sessions.set(id, newSession);
    return newSession;
  }

  async updateSession(id: number, session: Partial<InsertSession>): Promise<Session | undefined> {
    const existing = this.sessions.get(id);
    if (!existing) return undefined;
    const updated = { ...existing, ...session };
    this.sessions.set(id, updated);
    return updated;
  }

  async deleteSession(id: number): Promise<boolean> {
    return this.sessions.delete(id);
  }
}

export const storage = new MemStorage();
