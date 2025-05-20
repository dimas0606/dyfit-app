import { useQuery, useMutation } from "@tanstack/react-query";
import { apiRequest, queryClient } from "@/lib/queryClient";
import type { WorkoutPlan, InsertWorkoutPlan, WorkoutExercise, InsertWorkoutExercise } from "@shared/schema";

export function useWorkouts(trainerId: number) {
  // Get all workout plans for a trainer
  const getWorkoutPlans = () => {
    return useQuery<WorkoutPlan[]>({
      queryKey: ["/api/workout-plans", { trainerId }],
      queryFn: async () => {
        const res = await fetch(`/api/workout-plans?trainerId=${trainerId}`);
        if (!res.ok) throw new Error("Failed to fetch workout plans");
        return res.json();
      }
    });
  };

  // Get a single workout plan by ID
  const getWorkoutPlan = (id: number) => {
    return useQuery<WorkoutPlan>({
      queryKey: [`/api/workout-plans/${id}`],
      queryFn: async () => {
        const res = await fetch(`/api/workout-plans/${id}`);
        if (!res.ok) throw new Error("Failed to fetch workout plan");
        return res.json();
      }
    });
  };

  // Add a new workout plan
  const addWorkoutPlan = () => {
    return useMutation({
      mutationFn: async (workoutPlan: InsertWorkoutPlan) => {
        const res = await apiRequest("POST", "/api/workout-plans", workoutPlan);
        return res.json();
      },
      onSuccess: () => {
        // Invalidate queries to refresh data
        queryClient.invalidateQueries({ queryKey: ["/api/workout-plans"] });
      }
    });
  };

  // Update a workout plan
  const updateWorkoutPlan = () => {
    return useMutation({
      mutationFn: async ({ id, data }: { id: number; data: Partial<InsertWorkoutPlan> }) => {
        const res = await apiRequest("PUT", `/api/workout-plans/${id}`, data);
        return res.json();
      },
      onSuccess: (_, variables) => {
        // Invalidate queries to refresh data
        queryClient.invalidateQueries({ queryKey: ["/api/workout-plans"] });
        queryClient.invalidateQueries({ queryKey: [`/api/workout-plans/${variables.id}`] });
      }
    });
  };

  // Delete a workout plan
  const deleteWorkoutPlan = () => {
    return useMutation({
      mutationFn: async (id: number) => {
        await apiRequest("DELETE", `/api/workout-plans/${id}`, undefined);
        return id;
      },
      onSuccess: () => {
        // Invalidate queries to refresh data
        queryClient.invalidateQueries({ queryKey: ["/api/workout-plans"] });
      }
    });
  };

  // Get exercises for a workout plan
  const getWorkoutExercises = (workoutPlanId: number) => {
    return useQuery<WorkoutExercise[]>({
      queryKey: [`/api/workout-plans/${workoutPlanId}/exercises`],
      queryFn: async () => {
        const res = await fetch(`/api/workout-plans/${workoutPlanId}/exercises`);
        if (!res.ok) throw new Error("Failed to fetch workout exercises");
        return res.json();
      }
    });
  };

  // Add an exercise to a workout plan
  const addWorkoutExercise = () => {
    return useMutation({
      mutationFn: async (workoutExercise: InsertWorkoutExercise) => {
        const res = await apiRequest("POST", "/api/workout-exercises", workoutExercise);
        return res.json();
      },
      onSuccess: (_, variables) => {
        // Invalidate queries to refresh data
        queryClient.invalidateQueries({ 
          queryKey: [`/api/workout-plans/${variables.workoutPlanId}/exercises`] 
        });
      }
    });
  };

  // Update a workout exercise
  const updateWorkoutExercise = () => {
    return useMutation({
      mutationFn: async ({ id, data, workoutPlanId }: { 
        id: number; 
        data: Partial<InsertWorkoutExercise>;
        workoutPlanId: number;
      }) => {
        const res = await apiRequest("PUT", `/api/workout-exercises/${id}`, data);
        return res.json();
      },
      onSuccess: (_, variables) => {
        // Invalidate queries to refresh data
        queryClient.invalidateQueries({ 
          queryKey: [`/api/workout-plans/${variables.workoutPlanId}/exercises`] 
        });
      }
    });
  };

  // Remove an exercise from a workout plan
  const removeWorkoutExercise = () => {
    return useMutation({
      mutationFn: async ({ id, workoutPlanId }: { id: number; workoutPlanId: number }) => {
        await apiRequest("DELETE", `/api/workout-exercises/${id}`, undefined);
        return id;
      },
      onSuccess: (_, variables) => {
        // Invalidate queries to refresh data
        queryClient.invalidateQueries({ 
          queryKey: [`/api/workout-plans/${variables.workoutPlanId}/exercises`] 
        });
      }
    });
  };

  // Assign a workout plan to a student
  const assignWorkoutToStudent = () => {
    return useMutation({
      mutationFn: async (data: { studentId: number; workoutPlanId: number }) => {
        const res = await apiRequest("POST", "/api/student-workouts", {
          studentId: data.studentId,
          workoutPlanId: data.workoutPlanId,
          assignedDate: new Date().toISOString(),
          status: "assigned",
          progress: 0
        });
        return res.json();
      },
      onSuccess: (_, variables) => {
        // Invalidate queries to refresh data
        queryClient.invalidateQueries({ 
          queryKey: [`/api/students/${variables.studentId}/workouts`] 
        });
      }
    });
  };

  return {
    getWorkoutPlans,
    getWorkoutPlan,
    addWorkoutPlan,
    updateWorkoutPlan,
    deleteWorkoutPlan,
    getWorkoutExercises,
    addWorkoutExercise,
    updateWorkoutExercise,
    removeWorkoutExercise,
    assignWorkoutToStudent
  };
}
