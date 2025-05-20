// client/src/lib/apiClient.ts

/**
 * Realiza uma requisição fetch adicionando automaticamente o token JWT apropriado
 * (aluno ou personal/admin) do localStorage e tratando erros comuns.
 *
 * @param url O caminho da API (ex: '/api/alunos' ou '/api/aluno/meus-treinos').
 * @param options Opções adicionais do fetch (method, body, etc.).
 * @returns Uma Promise com os dados da resposta em JSON.
 * @throws Lança um erro se a requisição falhar ou a resposta não for OK.
 */
export const fetchWithAuth = async <T = any>(
    url: string, // Espera-se um caminho relativo, ex: /api/alunos
    options: RequestInit = {}
  ): Promise<T> => {
    // Obtém a URL base da API das variáveis de ambiente ou usa um padrão.
    const apiUrlBase = import.meta.env.VITE_API_URL || 'http://localhost:5000';
    const fullUrl = url.startsWith('/') ? `${apiUrlBase}${url}` : `${apiUrlBase}/${url}`; // Garante que a URL sempre comece com / se for relativa
    
    let token: string | null = null;
    let tokenTypeUsed: string = "Nenhum";
  
    // Determina qual token usar com base na URL da requisição
    if (url.startsWith('/api/aluno/')) {
      token = localStorage.getItem('alunoAuthToken');
      tokenTypeUsed = "alunoAuthToken";
      console.log('[fetchWithAuth] Rota de Aluno detectada. Tentando usar alunoAuthToken.');
    } else {
      // Para todas as outras rotas /api/* (que não são /api/aluno/) ou rotas públicas que podem tentar usar auth
      token = localStorage.getItem('authToken'); // Token de Personal/Admin
      tokenTypeUsed = "authToken";
      console.log('[fetchWithAuth] Rota de Personal/Admin ou Pública. Tentando usar authToken.');
    }
  
    const headers = new Headers(options.headers || {});
    headers.set('Accept', 'application/json');
  
    if (token) {
      headers.set('Authorization', `Bearer ${token}`);
      console.log(`[fetchWithAuth] Token ${tokenTypeUsed} ('${token.substring(0,10)}...') adicionado ao header para ${url}.`);
    } else {
      console.log(`[fetchWithAuth] Nenhum token ${tokenTypeUsed} encontrado no localStorage para a rota: ${url}`);
    }
  
    // Garante Content-Type para POST/PUT/PATCH com body JSON
    if (options.body && typeof options.body === 'string') { // Verifica se o body é uma string JSON
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
  
      if (response.status === 204) { // No Content
        console.log(`[fetchWithAuth] Received 204 No Content for ${fullUrl}`);
        return null as T; 
      }
  
      const responseText = await response.text();
      let data;
      try {
        data = responseText ? JSON.parse(responseText) : null; // Trata corpo vazio
      } catch (parseError) {
        console.error(`[fetchWithAuth] Failed to parse JSON response from ${fullUrl}. Status: ${response.status}. Response text:`, responseText);
        throw new Error(`Erro ${response.status}: Resposta inválida do servidor (não é JSON).`);
      }
      
      // Log da resposta completa para depuração, mesmo que seja um erro
      console.log(`[fetchWithAuth] Response from ${fullUrl} (Status: ${response.status}):`, data);
  
      if (!response.ok) {
        console.error(`[fetchWithAuth] API Error [${response.status} - ${response.statusText}] for ${fullUrl}:`, data);
  
        if (response.status === 401) {
          console.warn('[fetchWithAuth] Token expirado ou inválido detectado (status 401).');
          // Dispara evento para que os contextos de autenticação possam reagir (ex: fazer logout)
          window.dispatchEvent(new CustomEvent('auth-failed', { 
            detail: { 
              status: 401, 
              forAluno: url.startsWith('/api/aluno/'),
              forPersonalAdmin: !url.startsWith('/api/aluno/') // Indica se o token falhou para personal/admin
            } 
          }));
        }
        
        // Prioriza a mensagem de erro da API, se disponível
        const errorMessage = data?.message || data?.mensagem || data?.erro || `Erro ${response.status}: ${response.statusText || 'Ocorreu um erro na comunicação com o servidor.'}`;
        throw new Error(errorMessage);
      }
      return data as T;
  
    } catch (error) {
      // Log do erro já formatado ou erro de rede
      console.error(`[fetchWithAuth] Network or other error for ${fullUrl}:`, error);
      if (error instanceof Error) {
        throw error; 
      } else {
        // Captura qualquer outro tipo de erro e o converte para Error
        throw new Error('Erro desconhecido durante a requisição.');
      }
    }
  };
  