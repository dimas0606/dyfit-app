// client/src/context/UserContext.tsx
import React, { createContext, useContext, useState, ReactNode, useEffect } from "react"; // Adicionado React e useEffect

// <<< ADICIONADO export >>>
// Interface para o objeto do usuário
export interface User {
  id: string; // API retorna ID do Mongo como string
  username: string; // Pode ser o email ou outro campo
  firstName: string;
  lastName: string;
  email: string;
  role: string; // 'admin' ou outro
}

// Interface para o valor do contexto
interface UserContextType {
  user: User | null;
  setUser: (user: User | null) => void;
  logout: () => void;
  isLoading: boolean; // Adicionado estado de carregamento
}

// <<< ADICIONADO export >>>
// Criação do contexto com valores padrão
export const UserContext = createContext<UserContextType>({
  user: null,
  setUser: () => { console.warn("setUser called outside UserProvider"); },
  logout: () => { console.warn("logout called outside UserProvider"); },
  isLoading: true, // Começa carregando
});

// Componente Provedor do Contexto
// (Mantém exportação)
export function UserProvider({ children }: { children: ReactNode }) {
  const [user, setUserState] = useState<User | null>(null);
  const [isLoading, setIsLoading] = useState(true); // Estado de loading

  // Tenta carregar do localStorage na montagem
  useEffect(() => {
    try {
      const storedUserData = localStorage.getItem('userData');
      if (storedUserData) {
        const parsedUser: User = JSON.parse(storedUserData);
         // Validação básica (ex: verificar se tem id)
         if (parsedUser && parsedUser.id) {
            setUserState(parsedUser);
         } else {
            console.warn("Dados do usuário no localStorage inválidos.");
            localStorage.removeItem('userData');
         }
      }
    } catch (error) {
      console.error("Erro ao carregar usuário do localStorage:", error);
      localStorage.removeItem('userData'); // Limpa se inválido
    } finally {
      setIsLoading(false); // Finaliza o carregamento
    }
  }, []); // Roda só uma vez

  // Função para atualizar o estado e persistir
  const handleSetUser = (newUser: User | null) => {
    setUserState(newUser);
    if (newUser) {
      localStorage.setItem('userData', JSON.stringify(newUser));
      // Token já foi salvo no login.tsx
    } else {
      // Limpa tudo no logout
      localStorage.removeItem('userData');
      localStorage.removeItem('authToken');
    }
  };


  const logout = () => {
    handleSetUser(null); // Chama a função que limpa state e localStorage
    console.log("User logged out via context.");
    // O redirecionamento geralmente é feito no componente que chama logout
  };

  // O valor fornecido pelo provider
  const value: UserContextType = {
      user,
      setUser: handleSetUser, // Usa a função que lida com localStorage
      logout,
      isLoading // Inclui isLoading no contexto
    };

  return (
    <UserContext.Provider value={value}>
      {children}
    </UserContext.Provider>
  );
}

// Hook customizado para consumir o contexto
// (Mantém exportação)
export function useUser() {
  const context = useContext(UserContext);
  if (context === undefined) {
    throw new Error("useUser must be used within a UserProvider");
  }
  return context;
}