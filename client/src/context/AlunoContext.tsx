// Localização: client/src/context/AlunoContext.tsx
import React, { createContext, useState, useEffect, useContext, ReactNode, useCallback } from 'react';
import { jwtDecode } from 'jwt-decode';

// ***** CORREÇÃO: Adicionar 'export' aqui *****
export interface AlunoLogado { // <<< EXPORT ADICIONADO
  id: string;
  email: string;
  nome?: string;
  role: 'Aluno';
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
      if (decodedToken.id && decodedToken.role === 'Aluno') {
        const alunoData: AlunoLogado = {
          id: decodedToken.id,
          email: decodedToken.email,
          nome: decodedToken.nome,
          role: decodedToken.role,
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
        console.error("Contexto Aluno: Payload do token de aluno inválido:", decodedToken);
        logoutAluno();
        return null;
      }
    } catch (error) {
      console.error("Contexto Aluno: Erro ao decodificar token de aluno:", error);
      logoutAluno();
      return null;
    }
  }, [logoutAluno]);

  const loginAluno = useCallback((token: string) => {
    setIsLoadingAluno(true);
    setAlunoFromToken(token);
    setIsLoadingAluno(false);
  }, [setAlunoFromToken]);

  const checkAlunoSession = useCallback(() => {
    console.log("Contexto Aluno: Verificando sessão do aluno...");
    setIsLoadingAluno(true);
    const storedToken = localStorage.getItem(ALUNO_TOKEN_KEY);
    const storedAlunoData = localStorage.getItem(ALUNO_DATA_KEY);

    if (storedToken) {
      try {
        const decoded = jwtDecode<AlunoLogado>(storedToken);
        if (decoded.exp && decoded.exp * 1000 < Date.now()) {
          console.log("Contexto Aluno: Sessão de aluno expirada no localStorage, limpando...");
          logoutAluno();
        } else if (storedAlunoData) {
          const parsedAlunoData: AlunoLogado = JSON.parse(storedAlunoData);
          if (parsedAlunoData.id && parsedAlunoData.role === 'Aluno') {
            setAluno(parsedAlunoData);
            setTokenAluno(storedToken);
            console.log("Contexto Aluno: Sessão de aluno restaurada do localStorage.");
          } else {
            console.warn("Contexto Aluno: Dados de aluno inválidos no localStorage, limpando...");
            logoutAluno();
          }
        } else {
           console.log("Contexto Aluno: Dados do aluno não encontrados no localStorage, tentando decodificar token armazenado...");
           setAlunoFromToken(storedToken);
        }
      } catch (error) {
        console.error("Contexto Aluno: Erro ao verificar sessão do aluno no localStorage, limpando:", error);
        logoutAluno();
      }
    } else {
        console.log("Contexto Aluno: Nenhum token de aluno encontrado no localStorage.");
    }
    setIsLoadingAluno(false);
  }, [logoutAluno, setAlunoFromToken]);


  useEffect(() => {
    checkAlunoSession();
  }, [checkAlunoSession]);

  useEffect(() => {
    const handleStorageChange = (event: StorageEvent) => {
      if (event.key === ALUNO_TOKEN_KEY && event.newValue === null) {
        console.log("Contexto Aluno: Token de aluno removido de outra aba/janela. Deslogando localmente...");
        setAluno(null);
        setTokenAluno(null);
      }
      if (event.key === ALUNO_DATA_KEY && event.newValue === null) {
        setAluno(null);
      }
    };
    window.addEventListener('storage', handleStorageChange);
    return () => {
      window.removeEventListener('storage', handleStorageChange);
    };
  }, []);


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