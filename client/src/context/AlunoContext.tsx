// client/src/context/AlunoContext.tsx
import React, { createContext, useState, useEffect, useContext, ReactNode, useCallback } from 'react';
import { jwtDecode } from 'jwt-decode';

// Interface do Aluno, agora esperando 'aluno' em minúsculo
export interface AlunoLogado {
  id: string;
  nome: string;
  role: 'aluno'; // ---> CORREÇÃO: Espera o role em minúsculo
  email: string; // Garantir que o email esteja presente
  personalId?: string;
  exp?: number;
  iat?: number;
}

interface AlunoContextType {
  aluno: AlunoLogado | null;
  tokenAluno: string | null;
  isLoadingAluno: boolean;
  loginAluno: (token: string) => void;
  logoutAluno: () => void;
  checkAlunoSession: () => void;
}

export const AlunoContext = createContext<AlunoContextType | undefined>(undefined);

export const AlunoProvider: React.FC<{ children: ReactNode }> = ({ children }) => {
  const [aluno, setAluno] = useState<AlunoLogado | null>(null);
  const [tokenAluno, setTokenAluno] = useState<string | null>(null);
  const [isLoadingAluno, setIsLoadingAluno] = useState<boolean>(true);

  const ALUNO_TOKEN_KEY = 'alunoAuthToken';
  const ALUNO_DATA_KEY = 'alunoData';

  const logoutAluno = useCallback(() => {
    setAluno(null);
    setTokenAluno(null);
    localStorage.removeItem(ALUNO_TOKEN_KEY);
    localStorage.removeItem(ALUNO_DATA_KEY);
    console.log("Contexto Aluno: Aluno deslogado.");
  }, []);

  const setAlunoFromToken = useCallback((token: string): AlunoLogado | null => {
    try {
      const decodedToken = jwtDecode<AlunoLogado>(token);
      if (decodedToken.exp && decodedToken.exp * 1000 < Date.now()) {
        console.warn("Contexto Aluno: Token de aluno expirado ao tentar decodificar.");
        logoutAluno();
        return null;
      }
      
      // ---> CORREÇÃO: Verifica por 'aluno' em minúsculo
      if (decodedToken.id && decodedToken.role === 'aluno') {
        const alunoData: AlunoLogado = {
          id: decodedToken.id,
          nome: decodedToken.nome,
          role: decodedToken.role,
          email: decodedToken.email,
          personalId: decodedToken.personalId,
          exp: decodedToken.exp,
          iat: decodedToken.iat,
        };
        setAluno(alunoData);
        setTokenAluno(token);
        localStorage.setItem(ALUNO_TOKEN_KEY, token);
        localStorage.setItem(ALUNO_DATA_KEY, JSON.stringify(alunoData));
        console.log("Contexto Aluno: Dados do aluno definidos a partir do token:", alunoData);
        return alunoData;
      } else {
        console.error("Contexto Aluno: Payload do token de aluno inválido (role incorreto ou id faltando):", decodedToken);
        logoutAluno();
        return null;
      }
    } catch (error) {
      console.error("Contexto Aluno: Erro ao decodificar token de aluno:", error);
      logoutAluno();
      return null;
    }
  }, [logoutAluno]);
  
  // O resto do arquivo (loginAluno, checkAlunoSession, etc.) não precisa de alterações
  const loginAluno = useCallback((token: string) => {
    setIsLoadingAluno(true);
    setAlunoFromToken(token);
    setIsLoadingAluno(false);
  }, [setAlunoFromToken]);

  const checkAlunoSession = useCallback(() => {
    console.log("Contexto Aluno: Verificando sessão do aluno...");
    setIsLoadingAluno(true);
    const storedToken = localStorage.getItem(ALUNO_TOKEN_KEY);
    if (storedToken) {
      // Simplifica a lógica: sempre re-valida o token ao carregar
      setAlunoFromToken(storedToken);
    } else {
      console.log("Contexto Aluno: Nenhum token de aluno encontrado no localStorage.");
    }
    setIsLoadingAluno(false);
  }, [setAlunoFromToken]);

  useEffect(() => {
    checkAlunoSession();
  }, [checkAlunoSession]);

  useEffect(() => {
    const handleStorageChange = (event: StorageEvent) => {
      if (event.key === ALUNO_TOKEN_KEY && event.newValue === null) {
        logoutAluno();
      }
    };
    window.addEventListener('storage', handleStorageChange);
    return () => {
      window.removeEventListener('storage', handleStorageChange);
    };
  }, [logoutAluno]);

  return (
    <AlunoContext.Provider value={{ aluno, tokenAluno, isLoadingAluno, loginAluno, logoutAluno, checkAlunoSession }}>
      {children}
    </AlunoContext.Provider>
  );
};

export const useAluno = (): AlunoContextType => {
  const context = useContext(AlunoContext);
  if (context === undefined) {
    throw new Error('useAluno deve ser usado dentro de um AlunoProvider');
  }
  return context;
};