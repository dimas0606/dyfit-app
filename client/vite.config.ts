// client/vite.config.ts
import { defineConfig } from 'vite';
import react from '@vitejs/plugin-react'; // Usar @vitejs/plugin-react em vez de @vitejs/plugin-react-swc se for o caso
import path from 'path';

// Não é necessário fileURLToPath para a configuração simplificada
const clientDir = __dirname;

export default defineConfig({
  root: clientDir, // Define a raiz do projeto Vite como a pasta 'client'
  plugins: [react()],
  resolve: {
    alias: { '@': path.resolve(clientDir, 'src') },
  },
  server: {
    // A configuração do servidor é para desenvolvimento local e não afeta o build da Vercel
    // Mas vamos manter para o seu ambiente Gitpod funcionar
    host: '0.0.0.0', 
    port: 5173,
    strictPort: true,
  },
  build: {
    // Define o diretório de saída relativo à raiz do projeto Vite ('client')
    outDir: 'dist', 
    emptyOutDir: true,
  },
});