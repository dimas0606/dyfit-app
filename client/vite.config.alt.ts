import { defineConfig } from 'vite';
import react from '@vitejs/plugin-react';
import path from 'path';
import { fileURLToPath } from 'url';

const clientDir = path.dirname(fileURLToPath(import.meta.url));
const vitePort = 5174;
const gitpodWorkspaceUrl = process.env.GITPOD_WORKSPACE_URL;

function getGitpodBaseDomain(): string | undefined {
  if (!gitpodWorkspaceUrl) return undefined;
  try {
    return new URL(gitpodWorkspaceUrl).hostname;
  } catch (e) {
    return undefined;
  }
}
const gitpodDomain = getGitpodBaseDomain();

console.log("[vite.config.alt.ts] Rodando com porta:", vitePort);
console.log("[vite.config.alt.ts] gitpodDomain (para HMR):", gitpodDomain);

export default defineConfig({
  root: clientDir, // 👈 ADICIONADO AQUI
  plugins: [react()],
  resolve: {
    alias: { '@': path.resolve(clientDir, 'src') },
  },
  server: {
    host: '0.0.0.0',
    port: vitePort,
    strictPort: true,
    proxy: {
      '/api': {
        target: 'http://localhost:5000',
        changeOrigin: true,
        secure: false,
        ws: true,
      },
    },
    allowedHosts: ['localhost', '.gitpod.io'],
    hmr: gitpodWorkspaceUrl
      ? {
          host: gitpodDomain || undefined,
          protocol: 'wss',
        }
      : undefined,
  },
  build: {
    outDir: path.resolve(clientDir, 'dist'),
    emptyOutDir: true,
  },
});
