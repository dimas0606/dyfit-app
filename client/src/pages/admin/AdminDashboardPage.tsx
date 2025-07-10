// client/src/pages/admin/AdminDashboardPage.tsx
import { useQuery } from '@tanstack/react-query';
import { Link } from 'wouter';
import { apiRequest } from '@/lib/queryClient';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { Badge } from '@/components/ui/badge';
import LoadingSpinner from '@/components/LoadingSpinner';
import ErrorMessage from '@/components/ErrorMessage';
// Corrigindo a importação de ícones
import { Users, UserPlus, Mail, List, UserCheck } from 'lucide-react'; 
import { PersonalListadoItem } from '@/pages/admin/ListarPersonaisPage';

interface AdminDashboardData {
  totalPersonais: number;
  personaisAtivos: number;
  convitesPendentes: number;
  totalExercicios: number;
}

const fetchAdminDashboardData = async (): Promise<AdminDashboardData> => {
  // TODO: Implementar a rota GET /api/admin/dashboard/stats no backend
  // Por enquanto, vamos retornar dados de exemplo
  return {
    totalPersonais: 15,
    personaisAtivos: 12,
    convitesPendentes: 3,
    totalExercicios: 85
  };
};

export default function AdminDashboardPage() {
  const { data, isLoading, error } = useQuery<AdminDashboardData>({
    queryKey: ['adminDashboardStats'],
    queryFn: fetchAdminDashboardData,
  });

  const { data: personaisRecentes, isLoading: isLoadingPersonais } = useQuery<PersonalListadoItem[]>({
      queryKey: ['adminRecentPersonals'],
      queryFn: () => apiRequest('GET', '/api/admin/personal-trainers?limit=5&sort=createdAt:desc'),
  });

  if (isLoading) {
    return <LoadingSpinner text="Carregando dashboard..." />;
  }

  if (error) {
    return <ErrorMessage title="Erro ao carregar dados" message={error.message} />;
  }

  return (
    <div className="container mx-auto p-4 md:p-6 lg:p-8 space-y-8">
      <h1 className="text-3xl font-bold text-gray-800 dark:text-gray-100">
        Dashboard do Administrador
      </h1>

      <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-4">
        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Total de Personais</CardTitle>
            <Users className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{data?.totalPersonais ?? '...'}</div>
            <p className="text-xs text-muted-foreground">Cadastrados na plataforma</p>
          </CardContent>
        </Card>
        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Assinaturas Ativas</CardTitle>
            <UserCheck className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{data?.personaisAtivos ?? '...'}</div>
            <p className="text-xs text-muted-foreground">Personais com plano ativo</p>
          </CardContent>
        </Card>
        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Convites Pendentes</CardTitle>
            <Mail className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{data?.convitesPendentes ?? '...'}</div>
            <p className="text-xs text-muted-foreground">Aguardando aceite</p>
          </CardContent>
        </Card>
        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Exercícios na Base</CardTitle>
            <List className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{data?.totalExercicios ?? '...'}</div>
            <p className="text-xs text-muted-foreground">Disponíveis para todos</p>
          </CardContent>
        </Card>
      </div>

      <div className="grid gap-8 md:grid-cols-3">
        <div className="md:col-span-1 space-y-4">
            <h2 className="text-xl font-semibold">Ações Rápidas</h2>
            <Link href="/admin/criar-personal"><Button className="w-full justify-start"><UserPlus className="mr-2 h-4 w-4"/>Criar Novo Personal</Button></Link>
            <Link href="/admin/convites"><Button className="w-full justify-start"><Mail className="mr-2 h-4 w-4"/>Gerenciar Convites</Button></Link>
            <Link href="/exercises"><Button className="w-full justify-start"><List className="mr-2 h-4 w-4"/>Gerenciar Exercícios</Button></Link>
        </div>
        <div className="md:col-span-2">
            <h2 className="text-xl font-semibold mb-4">Personais Recentes</h2>
            <Card>
                <CardContent className="p-0">
                    {isLoadingPersonais ? <LoadingSpinner /> : (
                    <Table>
                        <TableHeader>
                            <TableRow>
                                <TableHead>Nome</TableHead>
                                <TableHead>Email</TableHead>
                                <TableHead>Status</TableHead>
                            </TableRow>
                        </TableHeader>
                        <TableBody>
                            {personaisRecentes?.map(p => (
                                <TableRow key={p._id}>
                                    <TableCell className="font-medium">{p.nome}</TableCell>
                                    <TableCell>{p.email}</TableCell>
                                    <TableCell><Badge variant="outline">Ativo</Badge></TableCell>
                                </TableRow>
                            ))}
                        </TableBody>
                    </Table>
                    )}
                </CardContent>
            </Card>
        </div>
      </div>
    </div>
  );
}
