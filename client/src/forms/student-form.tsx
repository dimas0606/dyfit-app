import React, { useEffect } from 'react';
import { useLocation } from 'wouter';
import { useForm, ControllerRenderProps, FieldValues } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import * as z from 'zod';

import { Button } from '@/components/ui/button';
import {
    Form, FormControl, FormField,
    FormItem, FormLabel, FormMessage
} from '@/components/ui/form';
import { Input } from '@/components/ui/input';
import { Textarea } from '@/components/ui/textarea';
import {
    Select, SelectContent, SelectItem,
    SelectTrigger, SelectValue
} from '@/components/ui/select';
import { Loader2 } from 'lucide-react';
import { Separator } from '@/components/ui/separator'; // Importar Separator

// --- Funções de Validação (sem alterações) ---
const numericString = (fieldName: string) => z.string()
    .optional()
    .refine((val) => {
        if (!val || val.trim() === '') return true;
        const num = parseFloat(val.replace(',', '.'));
        return !isNaN(num) && num > 0;
    }, { message: `${fieldName} deve ser um número positivo (ex: 70 ou 70.5 ou 70,5).` });

const integerString = (fieldName: string) => z.string()
    .optional()
    .refine((val) => {
        if (!val || val.trim() === '') return true;
        const num = parseInt(val, 10);
        return !isNaN(num) && num > 0 && /^\d+$/.test(val);
    }, { message: `${fieldName} deve ser um número inteiro positivo (ex: 175).` });

const requiredNumericString = (fieldName: string) => z.string()
    .min(1, `${fieldName} é obrigatório.`)
    .refine((val) => {
        const num = parseFloat(val.replace(',', '.'));
        return !isNaN(num) && num > 0;
    }, { message: `${fieldName} deve ser um número positivo (ex: 70 ou 70.5 ou 70,5).` });

const requiredIntegerString = (fieldName: string) => z.string()
    .min(1, `${fieldName} é obrigatório.`)
    .refine((val) => {
        const num = parseInt(val, 10);
        return !isNaN(num) && num > 0 && /^\d+$/.test(val);
    }, { message: `${fieldName} deve ser um número inteiro positivo (ex: 175).` });
// --- Fim Validação ---


// Schema Zod (Com campos Peso/Altura obrigatórios)
const studentFormSchema = z.object({
    nome: z.string().min(3, "Nome completo obrigatório"),
    email: z.string().email("E-mail inválido"),
    phone: z.string().optional(),
    birthDate: z.string().refine(val => !!val, { message: "Data de nascimento obrigatória" }),
    gender: z.enum(['masculino', 'feminino', 'outro'], { errorMap: () => ({ message: "Selecione um gênero." }) }),
    goal: z.string().min(1, "Objetivo obrigatório"),
    weight: requiredNumericString("Peso"),
    height: requiredIntegerString("Altura"),
    startDate: z.string().refine(val => !!val, { message: "Data de início obrigatória" }),
    status: z.enum(['active', 'inactive'], { errorMap: () => ({ message: "Selecione um status." }) }),
    notes: z.string().optional(),
});

// Tipos (sem alterações funcionais)
export type StudentFormStringData = z.infer<typeof studentFormSchema>;
export interface StudentFormDataProcessed {
    nome: string; email: string; phone?: string; birthDate: string;
    gender: 'masculino' | 'feminino' | 'outro'; goal: string; weight: number;
    height: number; startDate: string; status: 'active' | 'inactive'; notes?: string;
}
interface Aluno {
    _id: string; nome: string; email: string; phone?: string; birthDate: string;
    gender: string; goal: string; weight?: number | null; height?: number | null;
    startDate: string; status: string; notes?: string; trainerId: number;
}
interface StudentFormProps {
    onSubmit: (data: StudentFormDataProcessed) => void;
    isLoading?: boolean; initialData?: Aluno; isEditing?: boolean;
}

// === COMPONENTE DO FORMULÁRIO COM LAYOUT REFATORADO ===
export function StudentForm({
    onSubmit: onSubmitProp, isLoading = false, initialData, isEditing = false
}: StudentFormProps) {

    const [, navigate] = useLocation();
    const form = useForm<StudentFormStringData>({
        resolver: zodResolver(studentFormSchema),
        defaultValues: { /* ... (sem alterações aqui) ... */
            nome: initialData?.nome || "",
            email: initialData?.email || "",
            phone: initialData?.phone || "",
            birthDate: initialData?.birthDate ? initialData.birthDate.split('T')[0] : "",
            gender: initialData?.gender as 'masculino' | 'feminino' | 'outro' || undefined,
            goal: initialData?.goal || "",
            weight: initialData?.weight !== null && initialData?.weight !== undefined ? String(initialData.weight) : '',
            height: initialData?.height !== null && initialData?.height !== undefined ? String(initialData.height) : '',
            startDate: initialData?.startDate ? initialData.startDate.split('T')[0] : "",
            status: initialData?.status as 'active' | 'inactive' || undefined,
            notes: initialData?.notes || "",
        },
    });

    useEffect(() => { /* ... (sem alterações aqui) ... */
        if (initialData) {
            const resetValues: Partial<StudentFormStringData> = {
                nome: initialData.nome || "", email: initialData.email || "", phone: initialData.phone || "",
                birthDate: initialData.birthDate ? initialData.birthDate.split('T')[0] : "",
                gender: initialData.gender as 'masculino' | 'feminino' | 'outro' || undefined,
                goal: initialData.goal || "",
                weight: initialData.weight !== null && initialData.weight !== undefined ? String(initialData.weight) : '',
                height: initialData.height !== null && initialData.height !== undefined ? String(initialData.height) : '',
                startDate: initialData.startDate ? initialData.startDate.split('T')[0] : "",
                status: initialData.status as 'active' | 'inactive' || undefined,
                notes: initialData.notes || "",
            };
            form.reset(resetValues);
        }
    }, [initialData, form]);

    function handleFormSubmit(data: StudentFormStringData) { /* ... (sem alterações aqui) ... */
        const processedData: StudentFormDataProcessed = {
            ...data,
            weight: parseFloat(data.weight.replace(',', '.')),
            height: parseInt(data.height, 10),
            gender: data.gender!, status: data.status!,
        };
        onSubmitProp(processedData);
    }

    return (
        <Form {...form}>
            {/* Aumentado espaçamento entre seções */}
            <form onSubmit={form.handleSubmit(handleFormSubmit)} className="space-y-8">

                {/* --- Seção Dados Pessoais --- */}
                <div className="space-y-4"> {/* Espaçamento interno da seção */}
                    <h3 className="text-lg font-semibold text-gray-800 dark:text-gray-200 border-b border-gray-200 dark:border-gray-700 pb-2">
                        Dados Pessoais
                    </h3>
                    {/* Grid responsivo para os campos */}
                    <div className="grid grid-cols-1 md:grid-cols-2 gap-x-6 gap-y-4">
                        <FormField control={form.control} name="nome" render={({ field }) => ( <FormItem><FormLabel>Nome completo*</FormLabel><FormControl><Input placeholder="Digite o nome completo" {...field} /></FormControl><FormMessage /></FormItem> )} />
                        <FormField control={form.control} name="email" render={({ field }) => ( <FormItem><FormLabel>Email*</FormLabel><FormControl><Input type="email" placeholder="exemplo@email.com" {...field} /></FormControl><FormMessage /></FormItem> )} />
                        <FormField control={form.control} name="phone" render={({ field }) => ( <FormItem><FormLabel>Telefone</FormLabel><FormControl><Input placeholder="(00) 00000-0000" {...field} value={field.value ?? ''} /></FormControl><FormMessage /></FormItem> )} />
                        <FormField control={form.control} name="birthDate" render={({ field }) => ( <FormItem><FormLabel>Data de nascimento*</FormLabel><FormControl><Input type="date" {...field} /></FormControl><FormMessage /></FormItem> )} />
                        <FormField control={form.control} name="gender" render={({ field }) => ( <FormItem><FormLabel>Gênero*</FormLabel><Select onValueChange={field.onChange} value={field.value}><FormControl><SelectTrigger><SelectValue placeholder="Selecione o gênero" /></SelectTrigger></FormControl><SelectContent><SelectItem value="masculino">Masculino</SelectItem><SelectItem value="feminino">Feminino</SelectItem><SelectItem value="outro">Outro</SelectItem></SelectContent></Select><FormMessage /></FormItem> )} />
                    </div>
                </div>

                {/* --- Seção Medidas Corporais --- */}
                <div className="space-y-4">
                     <h3 className="text-lg font-semibold text-gray-800 dark:text-gray-200 border-b border-gray-200 dark:border-gray-700 pb-2">
                        Medidas Corporais
                    </h3>
                     <div className="grid grid-cols-1 md:grid-cols-2 gap-x-6 gap-y-4">
                        <FormField control={form.control} name="weight" render={({ field }) => (
                            <FormItem><FormLabel>Peso (kg)*</FormLabel><FormControl><Input type="text" inputMode="decimal" placeholder="Ex: 75,5" {...field} value={field.value ?? ''} /></FormControl><FormMessage /></FormItem>
                        )} />
                        <FormField control={form.control} name="height" render={({ field }) => (
                            <FormItem><FormLabel>Altura (cm)*</FormLabel><FormControl><Input type="text" inputMode="numeric" placeholder="Ex: 178" {...field} value={field.value ?? ''} /></FormControl><FormMessage /></FormItem>
                        )} />
                    </div>
                </div>

                 {/* --- Seção Metas e Status --- */}
                <div className="space-y-4">
                     <h3 className="text-lg font-semibold text-gray-800 dark:text-gray-200 border-b border-gray-200 dark:border-gray-700 pb-2">
                        Metas e Status
                    </h3>
                    {/* Usar espaçamento simples ou grid aqui também, se preferir */}
                    <div className="space-y-4">
                        <FormField control={form.control} name="goal" render={({ field }) => ( <FormItem><FormLabel>Objetivo*</FormLabel><Select onValueChange={field.onChange} value={field.value}><FormControl><SelectTrigger><SelectValue placeholder="Selecione o objetivo" /></SelectTrigger></FormControl><SelectContent><SelectItem value="Hipertrofia">Hipertrofia</SelectItem><SelectItem value="Emagrecimento">Emagrecimento</SelectItem><SelectItem value="Reabilitação">Reabilitação</SelectItem><SelectItem value="Condicionamento físico">Condicionamento físico</SelectItem><SelectItem value="Definição muscular">Definição muscular</SelectItem><SelectItem value="Manutenção">Manutenção</SelectItem><SelectItem value="Preparação para competição">Preparação para competição</SelectItem><SelectItem value="Outros">Outros</SelectItem></SelectContent></Select><FormMessage /></FormItem> )} />
                        <FormField control={form.control} name="startDate" render={({ field }) => ( <FormItem><FormLabel>Data de início*</FormLabel><FormControl><Input type="date" {...field} /></FormControl><FormMessage /></FormItem> )} />
                        <FormField control={form.control} name="status" render={({ field }) => ( <FormItem><FormLabel>Status*</FormLabel><Select onValueChange={field.onChange} value={field.value}><FormControl><SelectTrigger><SelectValue placeholder="Selecione o status" /></SelectTrigger></FormControl><SelectContent><SelectItem value="active">Ativo</SelectItem><SelectItem value="inactive">Inativo</SelectItem></SelectContent></Select><FormMessage /></FormItem> )} />
                        <FormField control={form.control} name="notes" render={({ field }) => ( <FormItem><FormLabel>Observações</FormLabel><FormControl><Textarea placeholder="Observações adicionais..." {...field} value={field.value ?? ''} rows={4} /></FormControl><FormMessage /></FormItem> )} /> {/* Aumentei rows */}
                    </div>
                </div>

                {/* Separador antes dos botões (opcional) */}
                <Separator className="my-8" />

                {/* --- Botões de Ação --- */}
                <div className="flex justify-end space-x-3"> {/* Aumentado espaço entre botões */}
                    <Button variant="outline" type="button" onClick={() => navigate("/alunos")} disabled={isLoading}>Cancelar</Button>
                    <Button type="submit" disabled={isLoading}>
                        {isLoading && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
                        {isEditing ? "Salvar Alterações" : "Adicionar Aluno"}
                    </Button>
                </div>
            </form>
        </Form>
    );
}