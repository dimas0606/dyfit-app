// client/lib/queryClient.ts
import { QueryClient } from "@tanstack/react-query";
import { fetchWithAuth } from './apiClient';

// Mantemos sua função apiRequest que já funciona
export async function apiRequest<T = unknown>(
  method: string,
  url: string,
  data?: unknown | undefined,
): Promise<T> {
  const relativeUrl = url.startsWith('/') ? url : `/${url}`;
  const options: RequestInit = { method };
  if (data !== undefined) {
    options.body = JSON.stringify(data);
  }
  try {
    return await fetchWithAuth<T>(relativeUrl, options);
  } catch (error) {
    // Silenciando o console.error aqui para manter o log mais limpo durante a depuração
    // console.error(`[apiRequest] Erro na requisição: ${method} ${relativeUrl}`, error);
    throw error;
  }
}

// Criamos o client sem nenhuma configuração padrão para que
// as configurações locais em cada `useQuery` tenham prioridade total.
export const queryClient = new QueryClient();
