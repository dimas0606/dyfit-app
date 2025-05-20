// Caminho: ./client/src/components/layout/MobileNav.tsx
import React, { useState } from 'react';
// Removido 'navigate' da importação de 'wouter'
import { Link as WouterLink, useLocation } from "wouter"; 
import { Home, Users, Dumbbell, Menu as MenuIcon, ListChecks } from "lucide-react"; // Removido BarChart2 se não usado
import { useUser } from "@/context/UserContext";
import { useAluno } from "@/context/AlunoContext";
import { Sheet, SheetContent, SheetTrigger } from "@/components/ui/sheet";
import Sidebar from "./sidebar";
import AlunoSidebar from "./AlunoSidebar";

export default function MobileNav() {
  // useLocation retorna [currentLocation, navigateFunction]
  const [location, setLocation] = useLocation(); // <<< AJUSTE AQUI: setLocation é a função de navegação
  const { user } = useUser();
  const { aluno } = useAluno();

  const [isSheetOpen, setIsSheetOpen] = useState(false);
  const closeSheet = () => setIsSheetOpen(false);

  // A função navigate que você talvez quisesse usar seria o setLocation.
  // Exemplo de como usá-la, se necessário (não parece ser usado neste componente diretamente para navegação):
  // const navigateTo = (path: string) => setLocation(path);

  const isActive = (path: string): boolean => {
    // Para o link "Início" do aluno e do personal, verificar correspondência exata.
    if (path === "/aluno/dashboard" && location === "/aluno/dashboard") return true;
    if (path === "/" && location === "/") return true;

    // Para links com # (ex: Fichas do Aluno que aponta para /aluno/dashboard#minhas-fichas)
    if (path.includes("#")) {
        const [basePath, hash] = path.split("#");
        // Ativo se a base da URL e o hash da janela corresponderem
        return location === basePath && window.location.hash === `#${hash}`;
    }
    // Para outras rotas, verifica se o location começa com o path.
    // Evita que "/" seja ativo para todas as sub-rotas.
    return path !== "/" && path !== "/aluno/dashboard" && location.startsWith(path);
  };
  
  // Função para obter classes de links de navegação direta
  const getNavLinkClasses = (path: string): string => {
    return `flex flex-col items-center justify-center flex-1 py-2 text-xs
      ${isActive(path) ? "text-primary dark:text-primary" : "text-muted-foreground hover:text-foreground"
    }`;
  };
  
  // Função para obter classes de botões que abrem o Sheet (não devem ter estado "ativo")
  const getButtonSheetClasses = (): string => {
      return `flex flex-col items-center justify-center flex-1 py-2 text-xs text-muted-foreground hover:text-foreground`;
  };


  if (aluno) {
    return (
      <nav className="md:hidden fixed bottom-0 left-0 right-0 bg-card border-t border-border flex justify-around items-stretch h-16 z-20">
        <WouterLink href="/aluno/dashboard" className={getNavLinkClasses("/aluno/dashboard")}>
          <Home size={22} strokeWidth={isActive("/aluno/dashboard") ? 2.5 : 2} />
          <span className="mt-1">Início</span>
        </WouterLink>
        <WouterLink href="/aluno/dashboard#minhas-fichas" className={getNavLinkClasses("/aluno/dashboard#minhas-fichas")}>
          <ListChecks size={22} strokeWidth={isActive("/aluno/dashboard#minhas-fichas") ? 2.5 : 2} />
          <span className="mt-1">Fichas</span>
        </WouterLink>
        
        <Sheet open={isSheetOpen} onOpenChange={setIsSheetOpen}>
          <SheetTrigger asChild>
            <button className={getButtonSheetClasses()}>
              <MenuIcon size={22} strokeWidth={2} />
              <span className="mt-1">Mais</span>
            </button>
          </SheetTrigger>
          <SheetContent side="left" className="p-0 w-72 bg-card border-r dark:border-border/50">
            <AlunoSidebar onNavigate={closeSheet} />
          </SheetContent>
        </Sheet>
      </nav>
    );
  } else if (user) {
    return (
      <nav className="md:hidden fixed bottom-0 left-0 right-0 bg-card border-t border-border flex justify-around items-stretch h-16 z-20">
        <WouterLink href="/" className={getNavLinkClasses("/")}>
          <Home size={22} strokeWidth={isActive("/") ? 2.5 : 2} />
          <span className="mt-1">Início</span>
        </WouterLink>
        <WouterLink href="/alunos" className={getNavLinkClasses("/alunos")}>
          <Users size={22} strokeWidth={isActive("/alunos") ? 2.5 : 2} />
          <span className="mt-1">Alunos</span>
        </WouterLink>
        <WouterLink href="/treinos" className={getNavLinkClasses("/treinos")}>
          <Dumbbell size={22} strokeWidth={isActive("/treinos") ? 2.5 : 2} />
          <span className="mt-1">Treinos</span>
        </WouterLink>
        <Sheet open={isSheetOpen} onOpenChange={setIsSheetOpen}>
          <SheetTrigger asChild>
            <button className={getButtonSheetClasses()}>
              <MenuIcon size={22} strokeWidth={2} />
              <span className="mt-1">Menu</span>
            </button>
          </SheetTrigger>
          <SheetContent side="left" className="p-0 w-72 bg-card border-r dark:border-border/50">
            {/* Assumindo que Sidebar foi ajustado para aceitar onNavigate */}
            <Sidebar onNavigate={closeSheet} /> 
          </SheetContent>
        </Sheet>
      </nav>
    );
  }

  return null;
}