// Caminho: ./client/src/components/layout/main-layout.tsx
import { ReactNode, useContext } from "react";
import Sidebar from "./sidebar"; // Sidebar para Personal/Admin
import AlunoSidebar from "./AlunoSidebar"; // Importar AlunoSidebar
import Header from "./header";
import MobileNav from "./mobile-nav";
import { UserContext } from "@/context/UserContext"; // Para verificar Personal/Admin
import { useAluno } from "@/context/AlunoContext";   // Para verificar Aluno

export default function MainLayout({ children }: { children: ReactNode }) {
  const { user } = useContext(UserContext); // Se Personal/Admin está logado
  const { aluno } = useAluno();             // Se Aluno está logado

  // Determina qual sidebar usar para a visualização desktop fixa
  const DesktopSpecificSidebar = aluno && !user ? AlunoSidebar : (user ? Sidebar : null);
  // Se apenas o aluno está logado -> AlunoSidebar
  // Se user (personal/admin) está logado (mesmo que aluno também esteja, o que não deveria acontecer) -> Sidebar (Personal)
  // Se ninguém logado (não deveria chegar aqui se MainLayout é para áreas logadas) -> null

  return (
    <div className="flex h-screen bg-background text-foreground"> {/* Container Pai Flex */}
      {/* Sidebar Fixo para Desktop (oculto em mobile) */}
      {DesktopSpecificSidebar && ( // Renderiza o sidebar fixo apenas se houver um determinado
        <div className="hidden md:flex md:flex-shrink-0">
          <div className="flex flex-col w-64 lg:w-72"> {/* Largura explícita */}
            <DesktopSpecificSidebar /> {/* Renderiza o sidebar correto */}
          </div>
        </div>
      )}

      {/* Bloco do Conteúdo Principal + Header */}
      <div className="flex flex-col flex-1 w-0 overflow-hidden">
        <Header /> {/* O Header já tem lógica para mostrar AlunoSidebar ou Sidebar no Sheet mobile */}

        {/* AJUSTE: Removida a margem esquerda condicional daqui */}
        <main className="flex-1 relative overflow-y-auto focus:outline-none p-4 md:p-6 pb-16 md:pb-0">
          {children}
        </main>

        {/* Renderiza MobileNav apenas se houver um usuário ou aluno logado (para consistência com sidebars) */}
        {(user || aluno) && <MobileNav />}
      </div>
    </div>
  );
}