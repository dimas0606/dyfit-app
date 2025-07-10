// client/src/App.tsx
import React, { Suspense, lazy, useContext } from 'react';
import { Switch, Route, Redirect, useLocation, RouteProps, Params } from "wouter";
import { QueryClientProvider } from "@tanstack/react-query";
import { ThemeProvider } from "next-themes";
import { Loader2 } from "lucide-react";

import { Toaster } from "@/components/ui/toaster";
import { TooltipProvider } from "@/components/ui/tooltip";
import MainLayout from "@/components/layout/main-layout";
import { UserProvider, UserContext } from "@/context/UserContext";
import { AlunoProvider, useAluno } from "@/context/AlunoContext";
import { queryClient } from "@/lib/queryClient";
import NotFound from "@/pages/not-found";

// --- Páginas do Personal ---
const Dashboard = lazy(() => import("@/pages/dashboard"));
const StudentsIndex = lazy(() => import("@/pages/alunos/index"));
const NewStudent = lazy(() => import("@/pages/alunos/new"));
const StudentDetail = lazy(() => import("@/pages/alunos/[id]"));
const EditStudentPage = lazy(() => import("@/pages/alunos/edit"));
const ExercisesIndex = lazy(() => import("@/pages/exercises/index"));
const SessionsPage = lazy(() => import("@/pages/sessoes/index"));
const TreinosPage = lazy(() => import("@/pages/treinos/index"));
const ProfileEditPage = lazy(() => import('@/pages/perfil/editar'));

// --- Páginas de Admin ---
const AdminDashboardPage = lazy(() => import("@/pages/admin/AdminDashboardPage"));
const CriarPersonalPage = lazy(() => import("@/pages/admin/CriarPersonalPage"));
const ListarPersonaisPage = lazy(() => import("@/pages/admin/ListarPersonaisPage"));
const GerenciarConvitesPage = lazy(() => import("@/pages/admin/GerenciarConvitesPage"));
const EditarPersonalPage = lazy(() => import("@/pages/admin/EditarPersonalPage.tsx"));

// --- Páginas Públicas ---
const LoginPage = lazy(() => import("@/pages/login"));
const CadastroPersonalPorConvitePage = lazy(() => import("@/pages/public/CadastroPersonalPorConvitePage"));
const CadastroAlunoPorConvitePersonalPage = lazy(() => import("@/pages/public/CadastroAlunoPorConvitePersonalPage"));
const AlunoLoginPage = lazy(() => import("@/pages/public/AlunoLoginPage"));

// --- Páginas do Aluno ---
const AlunoDashboardPage = lazy(() => import('@/pages/alunos/AlunoDashboardPage'));
const AlunoFichaDetalhePage = lazy(() => import('@/pages/alunos/AlunoFichaDetalhePage'));
const AlunoHistoricoPage = lazy(() => import('@/pages/alunos/AlunoHistoricoPage'));

interface CustomRouteProps extends Omit<RouteProps, 'component' | 'children'> {
  component?: React.ComponentType<any>;
  children?: React.ReactNode | ((params: Params) => React.ReactNode);
}

const ProtectedRoute: React.FC<CustomRouteProps> = ({ component: Component, children, ...rest }) => {
  const { user, isLoading: isUserContextLoading } = useContext(UserContext);
  if (isUserContextLoading) return <div className="flex h-screen w-full items-center justify-center"><Loader2 className="h-10 w-10 animate-spin text-primary" /></div>;
  if (!user) return <Redirect to="/login" />;
  if (Component) return <Route {...rest} component={Component} />;
  return <Route {...rest}>{children}</Route>;
};

const AdminRoute: React.FC<CustomRouteProps> = ({ component: Component, children, ...rest }) => {
  const { user, isLoading: isUserContextLoading } = useContext(UserContext);
  if (isUserContextLoading) return <div className="flex h-screen w-full items-center justify-center"><Loader2 className="h-10 w-10 animate-spin text-primary" /></div>;
  if (!user || user.role?.toLowerCase() !== 'admin') return <Redirect to="/login" />;
  if (Component) return <Route {...rest} component={Component} />;
  return <Route {...rest}>{children}</Route>;
};

const AlunoProtectedRoute: React.FC<CustomRouteProps> = ({ component: Component, children, ...rest }) => {
  const { aluno, isLoadingAluno } = useAluno();
  if (isLoadingAluno) return <div className="flex h-screen w-full items-center justify-center"><Loader2 className="h-10 w-10 animate-spin text-primary" /> Carregando...</div>;
  if (!aluno) return <Redirect to="/aluno/login" />;
  if (Component) return <Route {...rest} component={Component} />;
  return <Route {...rest}>{children}</Route>;
};

function PersonalApp() {
  return (
    <MainLayout>
      <Suspense fallback={<div className="flex h-full flex-1 items-center justify-center"><Loader2 className="h-8 w-8 animate-spin text-primary" /></div>}>
        <Switch>
          <ProtectedRoute path="/" component={Dashboard} />
          <ProtectedRoute path="/alunos" component={StudentsIndex} />
          <ProtectedRoute path="/alunos/novo" component={NewStudent} />
          <ProtectedRoute path="/alunos/:id">{(params: Params) => <StudentDetail id={params.id} />}</ProtectedRoute>
          <ProtectedRoute path="/alunos/editar/:id">{(params: Params) => <EditStudentPage id={params.id} />}</ProtectedRoute>
          <ProtectedRoute path="/treinos" component={TreinosPage} />
          <ProtectedRoute path="/exercises" component={ExercisesIndex} />
          <ProtectedRoute path="/sessoes" component={SessionsPage} />
          <ProtectedRoute path="/perfil/editar" component={ProfileEditPage} />
          <Route component={NotFound} />
        </Switch>
      </Suspense>
    </MainLayout>
  );
}

function AdminApp() {
  return (
    <MainLayout>
      <Suspense fallback={<div className="flex h-full flex-1 items-center justify-center"><Loader2 className="h-8 w-8 animate-spin text-primary" /></div>}>
        <Switch>
          <AdminRoute path="/" component={AdminDashboardPage} />
          <AdminRoute path="/exercises" component={ExercisesIndex} />
          <AdminRoute path="/admin/criar-personal" component={CriarPersonalPage} />
          <AdminRoute path="/admin/gerenciar-personais" component={ListarPersonaisPage} />
          <AdminRoute path="/admin/personais/editar/:id" component={EditarPersonalPage} />
          <AdminRoute path="/admin/convites" component={GerenciarConvitesPage} />
          <Route><Redirect to="/" /></Route>
        </Switch>
      </Suspense>
    </MainLayout>
  );
}

function AlunoApp() {
    return (
      <MainLayout>
        <Suspense fallback={<div className="flex h-full flex-1 items-center justify-center"><Loader2 className="h-8 w-8 animate-spin text-primary" /></div>}>
          <Switch>
            <AlunoProtectedRoute path="/aluno/dashboard" component={AlunoDashboardPage} />
            <AlunoProtectedRoute path="/aluno/ficha/:fichaId" component={AlunoFichaDetalhePage} />
            <AlunoProtectedRoute path="/aluno/historico" component={AlunoHistoricoPage} />
            <Route> <Redirect to="/aluno/dashboard" /> </Route>
          </Switch>
        </Suspense>
      </MainLayout>
    );
}

function PublicRoutes() {
  return (
    <Suspense fallback={<div className="flex h-screen w-full items-center justify-center"><Loader2 className="h-10 w-10 animate-spin text-primary" /></div>}>
      <Switch>
        <Route path="/login" component={LoginPage} />
        <Route path="/aluno/login" component={AlunoLoginPage} />
        <Route path="/cadastrar-personal/convite/:tokenDeConvite" component={CadastroPersonalPorConvitePage} />
        <Route path="/convite-aluno/:tokenPersonal" component={CadastroAlunoPorConvitePersonalPage} />
        <Route><Redirect to="/login" /></Route>
      </Switch>
    </Suspense>
  );
}

function AppContent() {
  const { user, isLoading: isUserLoading } = useContext(UserContext);
  const { aluno, isLoadingAluno } = useAluno();
  const [location] = useLocation();

  if (isUserLoading || isLoadingAluno) {
    return <div className="flex h-screen w-full items-center justify-center"><Loader2 className="h-10 w-10 animate-spin text-primary" /></div>;
  }
  
  if (user) { 
    const role = user.role?.toLowerCase();
    if (location === "/login" || location === "/aluno/login") {
        return <Redirect to="/" />;
    }
    if (role === 'admin') return <AdminApp />;
    if (role === 'personal') return <PersonalApp />;
    return <Redirect to="/login" />;
  } 
  
  if (aluno) {
    if (location === "/login" || location === "/aluno/login") {
        return <Redirect to="/aluno/dashboard" />;
    }
    return <AlunoApp />;
  } 
  
  return <PublicRoutes />;
}

function App() {
  return (
    <QueryClientProvider client={queryClient}>
      <ThemeProvider attribute="class" defaultTheme="light" enableSystem>
        <TooltipProvider>
          <UserProvider>
            <AlunoProvider>
              <Toaster />
              <AppContent />
            </AlunoProvider>
          </UserProvider>
        </TooltipProvider>
      </ThemeProvider>
    </QueryClientProvider>
  );
}

export default App;
