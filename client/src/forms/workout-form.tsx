import { useState } from "react";
import { useLocation } from "wouter";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { z } from "zod";

import { Button } from "@/components/ui/button";
import {
  Form, FormControl, FormDescription, FormField,
  FormItem, FormLabel, FormMessage
} from "@/components/ui/form";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import {
  Select, SelectContent, SelectItem,
  SelectTrigger, SelectValue
} from "@/components/ui/select";

import { apiRequest, queryClient } from "@/lib/queryClient";
import { useToast } from "@/hooks/use-toast";

// ✅ Schema corrigido (não depende mais do shared/schema)
const formSchema = z.object({
  name: z.string().min(1, { message: "O nome do treino é obrigatório" }),
  description: z.string().optional(),
  duration: z.coerce.number().min(1, { message: "A duração deve ser no mínimo 1 semana" }),
  status: z.string(),
  trainerId: z.number(),
});

type FormValues = z.infer<typeof formSchema>;

export function WorkoutForm() {
  const [, navigate] = useLocation();
  const { toast } = useToast();
  const [isSubmitting, setIsSubmitting] = useState(false);

  const defaultValues: Partial<FormValues> = {
    name: "",
    description: "",
    duration: 4,
    status: "active",
    trainerId: 1,
  };

  const form = useForm<FormValues>({
    resolver: zodResolver(formSchema),
    defaultValues,
  });

  async function onSubmit(data: FormValues) {
    setIsSubmitting(true);
    try {
      const result = await apiRequest("POST", "/api/workout-plans", data);
      const workoutPlan = await result.json();

      await queryClient.invalidateQueries({ queryKey: ["/api/workout-plans"] });

      toast({
        title: "Plano de treino criado com sucesso!",
        description: "Você será redirecionado para editá-lo.",
      });

      navigate(`/workouts/${workoutPlan.id}`);
    } catch (error) {
      toast({
        variant: "destructive",
        title: "Erro",
        description: "Não foi possível criar o plano de treino. Tente novamente.",
      });
      setIsSubmitting(false);
    }
  }

  return (
    <Form {...form}>
      <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-6">
        <FormField
          control={form.control}
          name="name"
          render={({ field }) => (
            <FormItem>
              <FormLabel>Nome do Treino*</FormLabel>
              <FormControl>
                <Input placeholder="Ex: Treinamento de Força" {...field} />
              </FormControl>
              <FormMessage />
            </FormItem>
          )}
        />

        <div className="grid gap-4 sm:grid-cols-2">
          <FormField
            control={form.control}
            name="duration"
            render={({ field }) => (
              <FormItem>
                <FormLabel>Duração (semanas)*</FormLabel>
                <FormControl>
                  <Input type="number" min={1} {...field} />
                </FormControl>
                <FormDescription>
                  Quantas semanas o plano de treino deve durar
                </FormDescription>
                <FormMessage />
              </FormItem>
            )}
          />

          <FormField
            control={form.control}
            name="status"
            render={({ field }) => (
              <FormItem>
                <FormLabel>Status</FormLabel>
                <Select onValueChange={field.onChange} defaultValue={field.value}>
                  <FormControl>
                    <SelectTrigger>
                      <SelectValue placeholder="Selecione o status" />
                    </SelectTrigger>
                  </FormControl>
                  <SelectContent>
                    <SelectItem value="active">Ativo</SelectItem>
                    <SelectItem value="draft">Rascunho</SelectItem>
                    <SelectItem value="archived">Arquivado</SelectItem>
                  </SelectContent>
                </Select>
                <FormDescription>
                  Rascunhos não serão visíveis para os alunos até que sejam ativados
                </FormDescription>
                <FormMessage />
              </FormItem>
            )}
          />
        </div>

        <FormField
          control={form.control}
          name="description"
          render={({ field }) => (
            <FormItem>
              <FormLabel>Descrição</FormLabel>
              <FormControl>
                <Textarea
                  placeholder="Descreva os objetivos e o foco desse plano de treino"
                  className="resize-none"
                  {...field}
                />
              </FormControl>
              <FormMessage />
            </FormItem>
          )}
        />

        <div className="flex justify-end space-x-2">
          <Button
            variant="outline"
            type="button"
            onClick={() => navigate("/workouts")}
          >
            Cancelar
          </Button>
          <Button type="submit" disabled={isSubmitting}>
            {isSubmitting ? "Criando..." : "Criar Treino"}
          </Button>
        </div>
      </form>
    </Form>
  );
}
