// client/vite.config.ts
import { defineConfig } from 'vite';
import react from '@vitejs/plugin-react';
import path from 'path';

// Função para obter o hostname público do Gitpod para a porta do Vite
function getGitpodHost(port: number): string | undefined {
  const gitpodWorkspaceUrl = process.env.GITPOD_WORKSPACE_URL;
  if (!gitpodWorkspaceUrl) {
    return undefined;
  }
  try {
    const url = new URL(gitpodWorkspaceUrl);
    // Substitui o início 'https://' por 'https://<port>-'
    const hostWithPort = url.href.replace('https://', `https://${port}-`);
    // Retorna apenas o hostname, ex: 5173-seu-workspace.ws-regiao.gitpod.io
    return new URL(hostWithPort).hostname;
  } catch (e) {
    console.error("Erro ao processar GITPOD_WORKSPACE_URL:", e);
    return undefined;
  }
}

const vitePort = 5173;
const viteGitpodHost = getGitpodHost(vitePort);

export default defineConfig({
  // Define que a raiz do projeto do frontend está na pasta 'client'.
  // O Vite irá operar a partir daqui, procurando o index.html.
  root: 'client',

  plugins: [react()],
  
  resolve: {
    alias: {
      // Como o 'root' é 'client', o alias para '@' aponta para o diretório 'src'
      // que está dentro da nova raiz ('client').
      '@': path.resolve(__dirname, 'src'),
    },
  },
  
  server: {
    host: '0.0.0.0', // Permite acesso externo no contêiner
    port: vitePort,
    strictPort: true, // Falha se a porta já estiver em uso
    
    // Configuração para o Hot Module Replacement (HMR) funcionar no Gitpod
    hmr: viteGitpodHost ? {
        host: viteGitpodHost,
        protocol: 'wss', // Usa WebSocket seguro
    } : undefined,
    
    // <<< CORREÇÃO PRINCIPAL: Adiciona o host do Gitpod à lista de permitidos >>>
    allowedHosts: viteGitpodHost ? [viteGitpodHost] : [],
  },
});