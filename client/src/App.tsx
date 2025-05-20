// client/src/App.tsx
import React, { Suspense, lazy, useContext } from 'react';
import { Switch, Route, Redirect, useLocation, RouteProps, Params } from "wouter";
import { QueryClientProvider } from "@tanstack/react-query";
import { ThemeProvider } from "next-themes";
import { Toaster } from "@/components/ui/toaster";
import { TooltipProvider } from "@/components/ui/tooltip";
import MainLayout from "@/components/layout/main-layout";
import Dashboard from "@/pages/dashboard";
import StudentsIndex from "@/pages/alunos/index";
import NewStudent from "@/pages/alunos/new";
import StudentDetail from "@/pages/alunos/[id]";
import EditStudentPage from "@/pages/alunos/edit";
import ExercisesIndex from "@/pages/exercises/index";
import SessionsPage from "@/pages/sessoes/index";
import TreinosPage from "@/pages/treinos/index";
const ProfileEditPage = lazy(() => import('@/pages/perfil/editar'));
import NotFound from "@/pages/not-found";
import LoginPage from "@/pages/login"; // Login de Personal/Admin
import { UserProvider, UserContext } from "@/context/UserContext";
import { AlunoProvider, useAluno } from "@/context/AlunoContext";
import { queryClient } from "./lib/queryClient";
import { Loader2 } from "lucide-react";

// Páginas de Admin
const CriarPersonalPage = lazy(() => import("@/pages/admin/CriarPersonalPage"));
const ListarPersonaisPage = lazy(() => import("@/pages/admin/ListarPersonaisPage"));
const GerenciarConvitesPage = lazy(() => import("@/pages/admin/GerenciarConvitesPage"));

// Páginas Públicas
const CadastroPersonalPorConvitePage = lazy(() => import("@/pages/public/CadastroPersonalPorConvitePage"));
const CadastroAlunoPorConvitePersonalPage = lazy(() => import("@/pages/public/CadastroAlunoPorConvitePersonalPage"));
const AlunoLoginPage = lazy(() => import("@/pages/public/AlunoLoginPage"));

// Páginas do Aluno
const AlunoDashboardPage = lazy(() => import('@/pages/alunos/AlunoDashboardPage'));
const AlunoFichaDetalhePage = lazy(() => import('@/pages/alunos/AlunoFichaDetalhePage'));
const AlunoHistoricoPage = lazy(() => import('@/pages/alunos/AlunoHistoricoPage')); // <<< ADICIONADO IMPORT LAZY

interface CustomRouteProps extends Omit<RouteProps, 'component' | 'children'> {
  component?: React.ComponentType<any>;
  children?: React.ReactNode | ((params: Params) => React.ReactNode);
}

const ProtectedRoute: React.FC<CustomRouteProps> = ({ component: Component, children, ...rest }) => {
  const { user, isLoading: isUserContextLoading } = useContext(UserContext);
  if (isUserContextLoading) {
    return <div className="flex h-screen w-full items-center justify-center"><Loader2 className="h-10 w-10 animate-spin text-primary" /></div>;
  }
  if (!user) return <Redirect to="/login" />;
  if (Component) return <Route {...rest} component={Component} />;
  return <Route {...rest}>{children}</Route>;
};

const AdminRoute: React.FC<CustomRouteProps> = ({ component: Component, children, ...rest }) => {
  const { user, isLoading: isUserContextLoading } = useContext(UserContext);
  if (isUserContextLoading) {
    return <div className="flex h-screen w-full items-center justify-center"><Loader2 className="h-10 w-10 animate-spin text-primary" /></div>;
  }
  if (!user) return <Redirect to="/login" />;
  if (user.role !== 'Admin') return <Redirect to="/" />;
  if (Component) return <Route {...rest} component={Component} />;
  return <Route {...rest}>{children}</Route>;
};

const AlunoProtectedRoute: React.FC<CustomRouteProps> = ({ component: Component, children, ...rest }) => {
  const { aluno, isLoadingAluno } = useAluno();
  if (isLoadingAluno) {
    return <div className="flex h-screen w-full items-center justify-center"><Loader2 className="h-10 w-10 animate-spin text-primary" /> Carregando dados do aluno...</div>;
  }
  if (!aluno) return <Redirect to="/aluno/login" />;
  if (Component) return <Route {...rest} component={Component} />;
  return <Route {...rest}>{children}</Route>;
};


function AppContent() {
  const { user, isLoading: isUserContextLoading } = useContext(UserContext);
  const { aluno, isLoadingAluno } = useAluno();
  const [location] = useLocation();

  const isAuthLoading = isUserContextLoading || isLoadingAluno;
  const noUserOrAluno = !user && !aluno;
  const isPublicAuthRoute = location === "/login" ||
                            location === "/aluno/login" ||
                            location.startsWith("/cadastrar-personal/convite/") ||
                            location.startsWith("/convite-aluno/");

  if (isAuthLoading && noUserOrAluno && !isPublicAuthRoute) {
    return <div className="flex h-screen w-full items-center justify-center"><Loader2 className="h-10 w-10 animate-spin text-primary" /> Verificando sessão...</div>;
  }

  if (user) { // Se um Personal/Admin está logado
    if (isPublicAuthRoute && location !== "/login") return <Redirect to="/" />;
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

            <AdminRoute path="/admin/criar-personal" component={CriarPersonalPage} />
            <AdminRoute path="/admin/gerenciar-personais" component={ListarPersonaisPage} />
            <AdminRoute path="/admin/convites" component={GerenciarConvitesPage} />

            <Route component={NotFound} />
          </Switch>
        </Suspense>
      </MainLayout>
    );
  } else if (aluno) { // Se um Aluno está logado
     if (isPublicAuthRoute && location !== "/aluno/login") return <Redirect to="/aluno/dashboard" />;
    return (
      <MainLayout>
        <Suspense fallback={<div className="flex h-full flex-1 items-center justify-center"><Loader2 className="h-8 w-8 animate-spin text-primary" /></div>}>
          <Switch>
            <AlunoProtectedRoute path="/aluno/dashboard" component={AlunoDashboardPage} />
            <AlunoProtectedRoute path="/aluno/ficha/:fichaId" component={AlunoFichaDetalhePage} />
            <AlunoProtectedRoute path="/aluno/historico" component={AlunoHistoricoPage} /> {/* <<< ADICIONADA ROTA PROTEGIDA */}
            <Route> <Redirect to="/aluno/dashboard" /> </Route> {/* Fallback para rotas não encontradas na área do aluno */}
          </Switch>
        </Suspense>
      </MainLayout>
    );
  } else {
    // Ninguém logado - Rotas Públicas
    return (
      <Suspense fallback={<div className="flex h-screen w-full items-center justify-center"><Loader2 className="h-10 w-10 animate-spin text-primary" /></div>}>
        <Switch>
          <Route path="/login" component={LoginPage} />
          <Route path="/cadastrar-personal/convite/:tokenDeConvite" component={CadastroPersonalPorConvitePage} />
          <Route path="/convite-aluno/:tokenPersonal" component={CadastroAlunoPorConvitePersonalPage} />
          <Route path="/aluno/login" component={AlunoLoginPage} />
          <Route>
            {!isPublicAuthRoute ? <Redirect to="/login" /> : <LoginPage />}
          </Route>
        </Switch>
      </Suspense>
    );
  }
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