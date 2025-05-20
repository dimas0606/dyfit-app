// client/vite.config.ts
import { defineConfig, type ProxyOptions } from 'vite';
import react from '@vitejs/plugin-react';
import path from 'path';
import { fileURLToPath } from 'url';
import type { IncomingMessage, ServerResponse } from 'http';

const clientDir = path.dirname(fileURLToPath(import.meta.url));
// Definir a porta do Vite aqui ou ler de .env se preferir
const vitePort = 5173;
const gitpodWorkspaceUrl = process.env.GITPOD_WORKSPACE_URL;

// Função auxiliar para obter o host do Gitpod com a porta correta
function getGitpodHostWithPort(port: number): string | undefined {
    if (!gitpodWorkspaceUrl) return undefined;
    try {
        const url = new URL(gitpodWorkspaceUrl);
        // Substitui o início 'https://' por 'https://<port>-'
        return url.href.replace('https://', `https://${port}-`);
    } catch (e) {
        console.error("Erro ao processar GITPOD_WORKSPACE_URL:", e);
        return undefined;
    }
}

// Função auxiliar para obter apenas o domínio base do Gitpod
function getGitpodBaseDomain(): string | undefined {
     if (!gitpodWorkspaceUrl) return undefined;
     try {
        // Pega o hostname completo (ex: *.ws-us118.gitpod.io)
        return new URL(gitpodWorkspaceUrl).hostname;
     } catch (e) {
         console.error("Erro ao processar GITPOD_WORKSPACE_URL:", e);
         return undefined;
     }
}

const viteHostUrl = getGitpodHostWithPort(vitePort);
const gitpodDomain = getGitpodBaseDomain(); // Ex: *.ws-us118.gitpod.io

console.log("[vite.config.ts] GITPOD_WORKSPACE_URL:", gitpodWorkspaceUrl);
console.log("[vite.config.ts] viteHostUrl (Esperado):", viteHostUrl);
console.log("[vite.config.ts] gitpodDomain (Base):", gitpodDomain);

// ---> Helper para extrair apenas o hostname da URL completa com porta <---
function getHostnameFromUrl(url?: string): string | undefined {
    if (!url) return undefined;
    try {
        return new URL(url).hostname;
    } catch {
        return undefined;
    }
}
const viteHostname = getHostnameFromUrl(viteHostUrl); // Ex: 5173-....ws-us118.gitpod.io
// --------------------------------------------------------------------------

export default defineConfig({
  root: clientDir,
  plugins: [react()],
  resolve: {
    alias: { '@': path.resolve(clientDir, 'src') },
  },
  server: {
    host: '0.0.0.0', // Permite acesso de qualquer IP (importante para contêineres)
    port: vitePort,
    strictPort: true, // Garante que a porta especificada seja usada
    proxy: {
       '/api': { // Proxy para requisições /api para o backend
          target: 'http://localhost:5000', // Seu backend Express rodando na porta 5000
          changeOrigin: true, // Necessário para virtual hosted sites
          secure: false, // Não estamos usando HTTPS para o proxy interno
          ws: true, // Habilita proxy para WebSockets (se o backend usar)
          configure: (proxy, _options) => {
            proxy.on('error', (err, _req, _res) => console.error('[VITE PROXY ERROR]', err));
            proxy.on('proxyReq', (proxyReq, req: IncomingMessage, _res) => console.log(`[VITE PROXY REQ] ${req.method} ${req.url} -> ${proxyReq.path}`));
            proxy.on('proxyRes', (proxyRes, req: IncomingMessage, _res) => console.log(`[VITE PROXY RES] ${req.method} ${req.url} <- ${proxyRes.statusCode}`));
          },
       },
    },
    // Lista de hosts permitidos para acessar o servidor de desenvolvimento
    allowedHosts: [
        'localhost',
        ...(viteHostname ? [viteHostname] : []), // Adiciona o hostname específico com porta (ex: 5173-*.gitpod.io)
        ...(gitpodDomain ? [`.${gitpodDomain}`] : []), // Permite subdomínios (ex: *.ws-*.gitpod.io)
        '.gitpod.io', // Um fallback mais genérico para o Gitpod
    ],
    // Configuração do Hot Module Replacement (HMR)
    hmr: gitpodWorkspaceUrl && viteHostname ? {
        protocol: 'wss', // Usar WebSocket Seguro
        host: viteHostname, // O host que o Gitpod expõe para a porta do Vite (ex: 5173-dimas0606-dyfitapp-27c1nicna52.ws-us118.gitpod.io)
        clientPort: 443, // O cliente deve se conectar à porta 443 (HTTPS padrão)
                         // O Gitpod faz o roteamento interno para a porta correta do WebSocket do Vite
    } : undefined, // Se não estiver no Gitpod, usa a configuração padrão do HMR
  },
  build: {
    outDir: path.resolve(clientDir, 'dist'), // Diretório de saída para o build
    emptyOutDir: true, // Limpa o diretório de saída antes de cada build
  },
});
