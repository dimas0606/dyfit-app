import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import * as z from 'zod';
import { Button } from '@/components/ui/button';
import { Form, FormControl, FormField, FormItem, FormLabel, FormMessage } from '@/components/ui/form';
import { Input } from '@/components/ui/input';
import { Textarea } from '@/components/ui/textarea';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Loader2 } from 'lucide-react';
import { Separator } from '@/components/ui/separator';
import { Aluno } from '@/types/aluno'; // <<< Importa o tipo correto e unificado

// --- Funções de Validação ---
const requiredNumericString = (fieldName: string) => z.string()
    .min(1, `${fieldName} é obrigatório.`)
    .refine((val) => !isNaN(parseFloat(val.replace(',', '.'))), { message: "Deve ser um número." });
const requiredIntegerString = (fieldName: string) => z.string()
    .min(1, `${fieldName} é obrigatório.`)
    .refine((val) => /^\d+$/.test(val), { message: "Deve ser um número inteiro." });

// --- SCHEMA ZOD ---
const createStudentFormSchema = (isEditing: boolean) => z.object({
    nome: z.string().min(3, "Nome completo é obrigatório."),
    email: z.string().email("E-mail inválido."),
    phone: z.string().optional(),
    birthDate: z.string().min(1, "Data de nascimento é obrigatória."),
    gender: z.enum(['masculino', 'feminino', 'outro']),
    goal: z.string().min(1, "Objetivo é obrigatório."),
    weight: requiredNumericString("Peso"),
    height: requiredIntegerString("Altura"),
    startDate: z.string().min(1, "Data de início é obrigatória."),
    status: z.enum(['active', 'inactive']),
    notes: z.string().optional(),
    password: isEditing 
        ? z.string().optional() 
        : z.string().min(6, "A senha deve ter no mínimo 6 caracteres."),
    confirmPassword: isEditing 
        ? z.string().optional() 
        : z.string().min(6, "A confirmação de senha é obrigatória."),
}).refine(data => {
    if (!isEditing || data.password) {
        return data.password === data.confirmPassword;
    }
    return true;
}, {
    message: "As senhas não coincidem.",
    path: ["confirmPassword"],
});

type StudentFormValues = z.infer<ReturnType<typeof createStudentFormSchema>>;

export interface StudentFormDataProcessed {
    nome: string; email: string; phone?: string; birthDate: string;
    gender: 'masculino' | 'feminino' | 'outro'; goal: string; weight: number;
    height: number; startDate: string; status: 'active' | 'inactive'; notes?: string;
    password?: string;
}

// <<< AGORA USA O TIPO ALUNO IMPORTADO >>>
interface StudentFormProps { onSubmit: (data: StudentFormDataProcessed) => void; isLoading?: boolean; initialData?: Aluno; isEditing?: boolean; }

export function StudentForm({ onSubmit: onSubmitProp, isLoading = false, initialData, isEditing = false }: StudentFormProps) {
    const form = useForm<StudentFormValues>({
        resolver: zodResolver(createStudentFormSchema(isEditing)),
        defaultValues: {
            nome: initialData?.nome || "", email: initialData?.email || "", phone: initialData?.phone || "",
            birthDate: initialData?.birthDate ? initialData.birthDate.split('T')[0] : "",
            gender: initialData?.gender as any || undefined, goal: initialData?.goal || "",
            weight: initialData?.weight ? String(initialData.weight) : '', height: initialData?.height ? String(initialData.height) : '',
            startDate: initialData?.startDate ? initialData.startDate.split('T')[0] : "",
            status: initialData?.status || 'active', notes: initialData?.notes || "",
            password: "", confirmPassword: "",
        },
    });

    function handleFormSubmit(data: StudentFormValues) {
        const { confirmPassword, ...restOfData } = data;
        const processedData: StudentFormDataProcessed = {
            ...restOfData,
            weight: parseFloat(data.weight.replace(',', '.')),
            height: parseInt(data.height, 10),
            password: data.password?.trim() === '' ? undefined : data.password,
        };
        onSubmitProp(processedData);
    }

    return (
        <Form {...form}>
            <form onSubmit={form.handleSubmit(handleFormSubmit)} className="space-y-8">
                {/* O restante do JSX do formulário permanece o mesmo... */}
                {/* Dados Pessoais */}
                <div className="space-y-4">
                    <h3 className="text-lg font-semibold border-b pb-2">Dados Pessoais</h3>
                    <div className="grid grid-cols-1 md:grid-cols-2 gap-x-6 gap-y-4">
                        <FormField control={form.control} name="nome" render={({ field }) => ( <FormItem><FormLabel>Nome completo*</FormLabel><FormControl><Input placeholder="Digite o nome completo" {...field} /></FormControl><FormMessage /></FormItem> )} />
                        <FormField control={form.control} name="email" render={({ field }) => ( <FormItem><FormLabel>Email*</FormLabel><FormControl><Input type="email" placeholder="exemplo@email.com" {...field} /></FormControl><FormMessage /></FormItem> )} />
                        <FormField control={form.control} name="phone" render={({ field }) => ( <FormItem><FormLabel>Telefone</FormLabel><FormControl><Input placeholder="(00) 00000-0000" {...field} value={field.value ?? ''} /></FormControl><FormMessage /></FormItem> )} />
                        <FormField control={form.control} name="birthDate" render={({ field }) => ( <FormItem><FormLabel>Data de nascimento*</FormLabel><FormControl><Input type="date" {...field} /></FormControl><FormMessage /></FormItem> )} />
                        <FormField control={form.control} name="gender" render={({ field }) => ( <FormItem><FormLabel>Gênero*</FormLabel><Select onValueChange={field.onChange} value={field.value}><FormControl><SelectTrigger><SelectValue placeholder="Selecione o gênero" /></SelectTrigger></FormControl><SelectContent><SelectItem value="masculino">Masculino</SelectItem><SelectItem value="feminino">Feminino</SelectItem><SelectItem value="outro">Outro</SelectItem></SelectContent></Select><FormMessage /></FormItem> )} />
                    </div>
                </div>

                {/* Medidas Corporais */}
                <div className="space-y-4">
                     <h3 className="text-lg font-semibold border-b pb-2">Medidas Corporais</h3>
                     <div className="grid grid-cols-1 md:grid-cols-2 gap-x-6 gap-y-4">
                        <FormField control={form.control} name="weight" render={({ field }) => ( <FormItem><FormLabel>Peso (kg)*</FormLabel><FormControl><Input type="text" inputMode="decimal" placeholder="Ex: 75,5" {...field} value={field.value ?? ''} /></FormControl><FormMessage /></FormItem> )} />
                        <FormField control={form.control} name="height" render={({ field }) => ( <FormItem><FormLabel>Altura (cm)*</FormLabel><FormControl><Input type="text" inputMode="numeric" placeholder="Ex: 178" {...field} value={field.value ?? ''} /></FormControl><FormMessage /></FormItem> )} />
                    </div>
                </div>

                {/* Seção de Senha */}
                <div className="space-y-4">
                     <h3 className="text-lg font-semibold border-b pb-2">Credenciais de Acesso</h3>
                     <div className="grid grid-cols-1 md:grid-cols-2 gap-x-6 gap-y-4">
                        <FormField control={form.control} name="password" render={({ field }) => ( <FormItem><FormLabel>{isEditing ? 'Nova Senha' : 'Senha*'}</FormLabel><FormControl><Input type="password" placeholder={isEditing ? 'Deixe em branco para não alterar' : 'Mínimo 6 caracteres'} {...field} /></FormControl><FormMessage /></FormItem> )} />
                        {(!isEditing || form.watch('password')) && (
                             <FormField control={form.control} name="confirmPassword" render={({ field }) => ( <FormItem><FormLabel>{isEditing ? 'Confirme a Nova Senha' : 'Confirmar Senha*'}</FormLabel><FormControl><Input type="password" placeholder="Repita a senha" {...field} /></FormControl><FormMessage /></FormItem> )} />
                        )}
                    </div>
                </div>

                 {/* Metas e Status */}
                <div className="space-y-4">
                     <h3 className="text-lg font-semibold border-b pb-2">Metas e Status</h3>
                    <div className="space-y-4">
                        <FormField control={form.control} name="goal" render={({ field }) => ( <FormItem><FormLabel>Objetivo*</FormLabel><Select onValueChange={field.onChange} value={field.value}><FormControl><SelectTrigger><SelectValue placeholder="Selecione o objetivo" /></SelectTrigger></FormControl><SelectContent><SelectItem value="Hipertrofia">Hipertrofia</SelectItem><SelectItem value="Emagrecimento">Emagrecimento</SelectItem><SelectItem value="Outros">Outros</SelectItem></SelectContent></Select><FormMessage /></FormItem> )} />
                        <FormField control={form.control} name="startDate" render={({ field }) => ( <FormItem><FormLabel>Data de início*</FormLabel><FormControl><Input type="date" {...field} /></FormControl><FormMessage /></FormItem> )} />
                        <FormField control={form.control} name="status" render={({ field }) => ( <FormItem><FormLabel>Status*</FormLabel><Select onValueChange={field.onChange} value={field.value}><FormControl><SelectTrigger><SelectValue placeholder="Selecione o status" /></SelectTrigger></FormControl><SelectContent><SelectItem value="active">Ativo</SelectItem><SelectItem value="inactive">Inativo</SelectItem></SelectContent></Select><FormMessage /></FormItem> )} />
                        <FormField control={form.control} name="notes" render={({ field }) => ( <FormItem><FormLabel>Observações</FormLabel><FormControl><Textarea placeholder="Observações adicionais..." {...field} value={field.value ?? ''} rows={4} /></FormControl><FormMessage /></FormItem> )} />
                    </div>
                </div>
                
                <Separator className="my-8" />
                <div className="flex justify-end space-x-3">
                    <Button variant="outline" type="button" onClick={() => window.history.back()} disabled={isLoading}>Cancelar</Button>
                    <Button type="submit" disabled={isLoading}>{isLoading && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}{isEditing ? "Salvar Alterações" : "Adicionar Aluno"}</Button>
                </div>
            </form>
        </Form>
    );
}