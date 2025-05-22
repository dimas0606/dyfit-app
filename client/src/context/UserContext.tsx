// client/src/context/UserContext.tsx
import React, { createContext, useContext, useState, ReactNode, useEffect } from "react";
import { useLocation } from "wouter"; // <<< ADICIONADO IMPORT

// Interface para o objeto do usuário
export interface User {
  id: string;
  username: string;
  firstName: string;
  lastName: string;
  email: string;
  role: string;
}

// Interface para o valor do contexto
interface UserContextType {
  user: User | null;
  setUser: (user: User | null) => void;
  logout: (options?: { redirect?: boolean }) => void; // Adicionado options
  isLoading: boolean;
}

// Criação do contexto com valores padrão
export const UserContext = createContext<UserContextType>({
  user: null,
  setUser: () => { console.warn("setUser called outside UserProvider"); },
  logout: () => { console.warn("logout called outside UserProvider"); },
  isLoading: true,
});

// Componente Provedor do Contexto
export function UserProvider({ children }: { children: ReactNode }) {
  const [user, setUserState] = useState<User | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [, setLocationWouter] = useLocation(); // <<< USADO PARA REDIRECIONAMENTO

  // Tenta carregar do localStorage na montagem
  useEffect(() => {
    try {
      const storedUserData = localStorage.getItem('userData');
      if (storedUserData) {
        const parsedUser: User = JSON.parse(storedUserData);
         if (parsedUser && parsedUser.id) {
            setUserState(parsedUser);
         } else {
            console.warn("Dados do usuário no localStorage inválidos.");
            localStorage.removeItem('userData');
         }
      }
    } catch (error) {
      console.error("Erro ao carregar usuário do localStorage:", error);
      localStorage.removeItem('userData');
    } finally {
      setIsLoading(false);
    }
  }, []);

  const handleSetUser = (newUser: User | null) => {
    setUserState(newUser);
    if (newUser) {
      localStorage.setItem('userData', JSON.stringify(newUser));
    } else {
      localStorage.removeItem('userData');
      localStorage.removeItem('authToken');
    }
  };

  const logout = (options?: { redirect?: boolean }) => {
    const shouldRedirect = options?.redirect ?? true; // Redireciona por padrão
    console.log(`[UserContext] logout chamado. Limpando dados do Personal/Admin. Redirecionar: ${shouldRedirect}`);
    handleSetUser(null);
    if (shouldRedirect) {
      console.log("[UserContext] Redirecionando para /login após logout do Personal/Admin.");
      setLocationWouter("/login");
      // Forçar um reload pode ser necessário se o wouter não atualizar a view corretamente
      // setTimeout(() => window.location.reload(), 50); 
    }
  };

  // <<< NOVO useEffect PARA OUVIR EVENTO 'auth-failed' >>>
  useEffect(() => {
    const handleAuthFailed = (event: Event) => {
      const customEvent = event as CustomEvent;
      console.log("[UserContext] Evento 'auth-failed' recebido:", customEvent.detail);
      if (customEvent.detail && customEvent.detail.status === 401) {
        if (customEvent.detail.forPersonalAdmin && user) { // Somente faz logout se for um erro para Personal/Admin e existir um usuário Personal/Admin logado
          console.warn("[UserContext] Falha de autenticação (401) para Personal/Admin detectada. Fazendo logout...");
          logout(); // logout já redireciona
        }
      }
    };

    window.addEventListener('auth-failed', handleAuthFailed);
    console.log("[UserContext] Event listener para 'auth-failed' adicionado.");

    return () => {
      window.removeEventListener('auth-failed', handleAuthFailed);
      console.log("[UserContext] Event listener para 'auth-failed' removido.");
    };
  }, [user, setLocationWouter]); // Adiciona 'user' e 'setLocationWouter' como dependências para garantir que logout tenha acesso ao 'user' atual e à função de redirecionamento.

  const value: UserContextType = {
      user,
      setUser: handleSetUser,
      logout,
      isLoading
    };

  return (
    <UserContext.Provider value={value}>
      {children}
    </UserContext.Provider>
  );
}

// Hook customizado para consumir o contexto
export function useUser() {
  const context = useContext(UserContext);
  if (context === undefined) {
    throw new Error("useUser must be used within a UserProvider");
  }
  return context;
}