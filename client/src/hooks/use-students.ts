import { useQuery, useMutation } from "@tanstack/react-query";
import { apiRequest, queryClient } from "@/lib/queryClient";

export function useStudents(trainerId: number) {
  // Get all students for a trainer
  const getStudents = () => {
    return useQuery<any[]>({
      queryKey: ["/api/alunos", { trainerId }],
      queryFn: async () => {
        const res = await fetch(`/api/alunos?trainerId=${trainerId}`);
        if (!res.ok) throw new Error("Failed to fetch students");
        return res.json();
      }
    });
  };

  // Get a single student by ID
  const getStudent = (id: number) => {
    return useQuery<any>({
      queryKey: [`/api/alunos/${id}`],
      queryFn: async () => {
        const res = await fetch(`/api/alunos/${id}`);
        if (!res.ok) throw new Error("Failed to fetch student");
        return res.json();
      }
    });
  };

  // Add a new student
  const addStudent = () => {
    return useMutation({
      mutationFn: async (student: any) => {
        const res = await apiRequest("POST", "/api/alunos", student);
        return res.json();
      },
      onSuccess: () => {
        queryClient.invalidateQueries({ queryKey: ["/api/alunos"] });
      }
    });
  };

  // Update a student
  const updateStudent = () => {
    return useMutation({
      mutationFn: async ({ id, data }: { id: number; data: Partial<any> }) => {
        const res = await apiRequest("PUT", `/api/alunos/${id}`, data);
        return res.json();
      },
      onSuccess: (_, variables) => {
        queryClient.invalidateQueries({ queryKey: ["/api/alunos"] });
        queryClient.invalidateQueries({ queryKey: [`/api/alunos/${variables.id}`] });
      }
    });
  };

  // Delete a student
  const deleteStudent = () => {
    return useMutation({
      mutationFn: async (id: number) => {
        await apiRequest("DELETE", `/api/alunos/${id}`, undefined);
        return id;
      },
      onSuccess: () => {
        queryClient.invalidateQueries({ queryKey: ["/api/alunos"] });
      }
    });
  };

  return {
    getStudents,
    getStudent,
    addStudent,
    updateStudent,
    deleteStudent
  };
}
