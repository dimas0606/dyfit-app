// Caminho: ./client/src/components/layout/sidebar.tsx
// A importação explícita de 'React' foi removida para limpar o aviso do TypeScript.

import { Link, useLocation } from "wouter";
import { Home, Users, Dumbbell, List, LogOut, UserPlus, UserCog, Mail } from "lucide-react";
import { useUser, User } from "../../context/UserContext";
import { Button } from "../ui/button";
import { Avatar, AvatarFallback } from "../ui/avatar";

const DefaultSidebarLinks = [
  { href: "/", label: "Início", icon: Home },
  { href: "/alunos", label: "Alunos", icon: Users },
  { href: "/treinos", label: "Treinos", icon: Dumbbell },
  { href: "/exercises", label: "Exercícios", icon: List },
];
const AdminSidebarLinks = [
  { href: "/admin/criar-personal", label: "Criar Personal", icon: UserPlus },
  { href: "/admin/gerenciar-personais", label: "Gerenciar Personais", icon: UserCog },
  { href: "/admin/convites", label: "Gerenciar Convites", icon: Mail },
];

interface SidebarProps {
  onNavigate?: () => void;
}

export default function Sidebar({ onNavigate }: SidebarProps) {
  const [location] = useLocation();
  const { user, logout: logoutUser } = useUser();

  const handleLinkClick = () => {
    if (onNavigate) {
      onNavigate();
    }
  };

  const handleLogoutClick = () => {
    logoutUser();
    if (onNavigate) {
      onNavigate();
    }
  };

  const isActive = (path: string): boolean => {
    if (path === "/" && location === "/") return true;
    return path !== '/' && location.startsWith(path);
  };

  const getLinkClasses = (path: string): string => {
    return `flex items-center px-3 py-2.5 rounded-lg transition-colors duration-150 text-sm w-full text-left ${
      isActive(path)
        ? "bg-primary text-white font-medium dark:bg-sky-600 dark:text-white"
        : "text-gray-600 hover:bg-gray-100 dark:text-gray-300 dark:hover:bg-gray-700"
    }`;
  };
  
  const getDisplayName = (currentUser: User | null): string => {
    if (!currentUser) return "Usuário";
    return `${currentUser.firstName} ${currentUser.lastName || ''}`.trim();
  };

  const getInitials = (currentUser: User | null): string => {
    if (!currentUser) return '?';
    const first = currentUser.firstName?.[0] || '';
    const last = currentUser.lastName?.[0] || '';
    const initials = `${first}${last}`.toUpperCase();
    return initials.length > 0 ? initials : (currentUser.username?.[0]?.toUpperCase()) || '?';
  };

  const getRoleDisplay = (currentUser: User | null): string => {
    if (!currentUser) return "";
    return currentUser.role;
  }

  if (!user) {
      return null;
  }

  return (
    <aside className="flex flex-col h-full md:w-64 lg:w-72 border-r border-gray-200 bg-white dark:bg-gray-800 dark:border-gray-700 z-30 overflow-y-auto">
      <div className="flex flex-col items-center justify-center h-auto px-6 py-4 border-b border-gray-200 dark:border-gray-700 shrink-0">
        <Link href="/" onClick={handleLinkClick}>
            <img
              src="/logodyfit.png"
              alt="Logo DyFit"
              className="h-14 w-auto object-contain cursor-pointer"
            />
        </Link>
      </div>

      <div className="flex-1 py-4 px-3">
        <div className="mb-6">
          <div className="flex items-center space-x-3 px-3 py-2">
            <Avatar className="h-10 w-10 border-2 border-primary dark:border-sky-500 shrink-0 bg-muted text-primary dark:text-sky-400">
              <AvatarFallback className="font-semibold">
                  {getInitials(user)}
              </AvatarFallback>
            </Avatar>
            <div className="truncate">
              <p className="font-medium text-sm text-gray-900 dark:text-gray-100 truncate">
                {getDisplayName(user)}
              </p>
              <p className="text-xs text-gray-500 dark:text-gray-400 capitalize truncate">
                {getRoleDisplay(user)}
              </p>
            </div>
          </div>
        </div>

        <nav className="space-y-1">
          {DefaultSidebarLinks.map((link) => (
            <Link key={link.label} href={link.href} onClick={handleLinkClick} className={getLinkClasses(link.href)}>
              <link.icon className="w-5 h-5 mr-3" />
              {link.label}
            </Link>
          ))}
        </nav>

        {user.role?.toLowerCase() === 'admin' && (
          <>
            <div className="my-3 border-t border-gray-200 dark:border-gray-700"></div>
            <p className="px-3 pt-2 pb-1 text-xs font-semibold uppercase text-gray-500 dark:text-gray-400">
              Administração
            </p>
            <nav className="space-y-1">
              {AdminSidebarLinks.map((link) => (
                <Link key={link.label} href={link.href} onClick={handleLinkClick} className={getLinkClasses(link.href)}>
                  <link.icon className="w-5 h-5 mr-3" />
                  {link.label}
                </Link>
              ))}
            </nav>
          </>
        )}
      </div>

      <div className="mt-auto p-3 border-t border-gray-200 dark:border-gray-700">
        <Button
          variant="ghost"
          onClick={handleLogoutClick}
          className="w-full justify-start text-gray-600 hover:bg-gray-100 dark:text-gray-300 dark:hover:bg-gray-700"
        >
          <LogOut className="w-5 h-5 mr-3" />
          Sair
        </Button>
      </div>
    </aside>
  );
}