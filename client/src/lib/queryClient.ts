// client/src/lib/queryClient.ts
import { QueryClient, QueryFunction, QueryFunctionContext, QueryKey } from "@tanstack/react-query";
import { fetchWithAuth } from './apiClient'; // <<< IMPORTAR fetchWithAuth

// ... (função throwIfResponseNotOk pode continuar como está ou ser simplificada se fetchWithAuth já tratar) ...
// Vamos assumir que fetchWithAuth já trata erros de resposta não OK, então podemos simplificar.

// --- FUNÇÃO apiRequest MODIFICADA PARA USAR fetchWithAuth ---
export async function apiRequest<T = unknown>(
  method: string,
  url: string, // Espera-se um caminho relativo, ex: "/api/exercicios" ou "/api/exercicios/123"
  data?: unknown | undefined,
): Promise<T> {
  // Garante que a URL relativa comece com / (boa prática)
  const relativeUrl = url.startsWith('/') ? url : `/${url}`;
  console.log(`[apiRequest using fetchWithAuth] Usando caminho relativo: ${method} ${relativeUrl}`);

  const options: RequestInit = { method };

  if (data !== undefined) {
    // fetchWithAuth já adiciona Content-Type: application/json se houver body
    options.body = JSON.stringify(data);
  }

  try {
    // USA fetchWithAuth AQUI!
    // fetchWithAuth já lida com a URL base, token, Content-Type e erros de resposta.
    const responseData = await fetchWithAuth<T>(relativeUrl, options);
    return responseData;
  } catch (error) {
    console.error(`[apiRequest using fetchWithAuth] Erro na requisição: ${method} ${relativeUrl}`, error);
    throw error; // Re-lança para React Query ou chamador tratar
  }
}

export type FetchFnContext = QueryFunctionContext<QueryKey>;
type UnauthorizedBehavior = "returnNull" | "throw"; // Manter se quiser essa lógica no getQueryFn

// --- FUNÇÃO getQueryFn MODIFICADA PARA USAR fetchWithAuth ---
export const getQueryFn = <T>(options?: { on401?: UnauthorizedBehavior }): QueryFunction<T | null> => {
  const unauthorizedBehavior = options?.on401 ?? "throw"; // Se quiser manter essa lógica específica de 401

  return async ({ queryKey, signal }: FetchFnContext): Promise<T | null> => {
    const relativeUrl = queryKey[0] as string;
    const finalUrl = relativeUrl.startsWith('/') ? relativeUrl : `/${relativeUrl}`;
    console.log(`[getQueryFn using fetchWithAuth] Usando caminho relativo: GET ${finalUrl}`);

    const requestOptions: RequestInit = {
      signal, // Para cancelamento
      method: 'GET', // getQueryFn é geralmente para GET
    };

    try {
      // USA fetchWithAuth AQUI!
      const responseData = await fetchWithAuth<T>(finalUrl, requestOptions);
      return responseData;
    } catch (error: any) {
      // fetchWithAuth já lança erro. Se o token expirou, ele redireciona.
      // Podemos verificar se queremos a lógica de unauthorizedBehavior aqui
      if (error.message?.includes('Sessão expirada') || (error.response && error.response.status === 401)) {
         if (unauthorizedBehavior === "returnNull") {
           console.warn(`[getQueryFn using fetchWithAuth] Resposta 401 (Unauthorized), retornando null para ${finalUrl}`);
           return null;
         }
      }
      console.error(`[getQueryFn using fetchWithAuth] Erro na requisição: GET ${finalUrl}`, error);
      throw error;
    }
  };
};

// Configuração do React Query Client (permanece igual)
export const queryClient = new QueryClient({
  defaultOptions: {
    queries: {
      refetchInterval: false,
      refetchOnWindowFocus: false,
      staleTime: 1000 * 60 * 5,
      retry: 1,
    },
    mutations: {
      retry: false,
    },
  },
});

// Definir a queryFn padrão (permanece igual, mas agora getQueryFn usa fetchWithAuth)
queryClient.setDefaultOptions({
    queries: {
        queryFn: getQueryFn({ on401: "throw" }),
    },
});