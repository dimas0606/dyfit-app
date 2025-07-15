// client/src/lib/apiClient.ts

export const fetchWithAuth = async <T = any>(
    url: string,
    options: RequestInit = {}
  ): Promise<T> => {
    const apiUrlBase = import.meta.env.VITE_API_URL || 'http://localhost:5000';
    const fullUrl = url.startsWith('/') ? `${apiUrlBase}${url}` : `${apiUrlBase}/${url}`;
    
    let token: string | null = null;
    let tokenTypeUsed: string = "Nenhum";
  
    // --- LÓGICA DE SELEÇÃO DE TOKEN CORRIGIDA E FINAL ---
    // A rota é para um ALUNO se começar com /api/aluno/ E NÃO for /gerenciar E NÃO for /convite
    if (
        url.startsWith('/api/aluno/') && 
        !url.startsWith('/api/aluno/gerenciar') &&
        !url.startsWith('/api/aluno/convite')
    ) {
      token = localStorage.getItem('alunoAuthToken');
      tokenTypeUsed = "alunoAuthToken";
      console.log('[fetchWithAuth] Rota de Aluno detectada. Tentando usar alunoAuthToken.');
    } else {
      // Para todas as outras rotas, incluindo as de gerenciamento e convite.
      token = localStorage.getItem('authToken'); // Token de Personal/Admin
      tokenTypeUsed = "authToken";
      console.log(`[fetchWithAuth] Rota de Personal/Admin ('${url}') detectada. Tentando usar authToken.`);
    }
  
    const headers = new Headers(options.headers || {});
    headers.set('Accept', 'application/json');
  
    if (token) {
      headers.set('Authorization', `Bearer ${token}`);
      console.log(`[fetchWithAuth] Token ${tokenTypeUsed} ('${token.substring(0,10)}...') adicionado ao header para ${url}.`);
    } else {
      console.log(`[fetchWithAuth] Nenhum token ${tokenTypeUsed} encontrado no localStorage para a rota: ${url}`);
    }
  
    if (options.body && typeof options.body === 'string') {
      if (!headers.has('Content-Type')) {
        headers.set('Content-Type', 'application/json');
      }
    }
  
    console.log(`[fetchWithAuth] Making ${options.method || 'GET'} request to: ${fullUrl}`);
  
    try {
      const response = await fetch(fullUrl, {
        ...options,
        headers,
      });
  
      if (response.status === 204) {
        return null as T; 
      }
  
      const responseText = await response.text();
      let data;
      try {
        data = responseText ? JSON.parse(responseText) : null;
      } catch (parseError) {
        throw new Error(`Erro ${response.status}: Resposta inválida do servidor (não é JSON).`);
      }
      
      console.log(`[fetchWithAuth] Response from ${fullUrl} (Status: ${response.status}):`, data);
  
      if (!response.ok) {
        console.error(`[fetchWithAuth] API Error [${response.status} - ${response.statusText}] for ${fullUrl}:`, data);
  
        if (response.status === 401) {
          window.dispatchEvent(new CustomEvent('auth-failed', { 
            detail: { 
              status: 401, 
              forAluno: tokenTypeUsed === 'alunoAuthToken',
              forPersonalAdmin: tokenTypeUsed === 'authToken'
            } 
          }));
        }
        
        const errorMessage = data?.message || data?.mensagem || data?.erro || `Erro ${response.status}: ${response.statusText || 'Ocorreu um erro na comunicação.'}`;
        throw new Error(errorMessage);
      }
      return data as T;
  
    } catch (error) {
      console.error(`[fetchWithAuth] Network or other error for ${fullUrl}:`, error);
      if (error instanceof Error) {
        throw error; 
      } else {
        throw new Error('Erro desconhecido durante a requisição.');
      }
    }
  };