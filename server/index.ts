// server/index.ts
// ESTAS DUAS LINHAS DEVEM SER AS PRIMEIRAS DO ARQUIVO!
import dotenv from 'dotenv';
dotenv.config();

// --- INÍCIO DO CÓDIGO DE DEPURAÇÃO (DEIXAR PARA VERIFICAR O CARREGAMENTO DAS VARS) ---
// Estes logs AGORA DEVERÃO aparecer, pois dotenv.config() já foi executado.
console.log('--- VARIÁVEIS DE AMBIENTE CARREGADAS (DEBUG) ---');
console.log(`process.env.JWT_SECRET: ${process.env.JWT_SECRET ? 'DEFINIDO' : 'NÃO DEFINIDO'}`);
console.log(`process.env.JWT_EXPIRES_IN: ${process.env.JWT_EXPIRES_IN || 'NÃO DEFINIDO'}`);
console.log(`process.env.JWT_ALUNO_EXPIRES_IN: ${process.env.JWT_ALUNO_EXPIRES_IN || 'NÃO DEFINIDO'}`);
console.log(`process.env.MONGODB_URI (parcial): ${process.env.MONGODB_URI ? process.env.MONGODB_URI.substring(0, 30) + '...' : 'NÃO DEFINIDO'}`);
console.log(`process.env.FRONTEND_URL: ${process.env.FRONTEND_URL || 'NÃO DEFINIDO'}`);
console.log(`process.env.PORT: ${process.env.PORT || 'NÃO DEFINIDO'}`);
console.log('--- FIM DO DEBUG ---');
// --- FIM DO CÓDIGO DE DEPURAÇÃO ---

// --- OUTRAS IMPORTAÇÕES VÊM DEPOIS DO DOTENV ---
import express from 'express';
import mongoose from 'mongoose';
import cors from 'cors'; // <--- CORRIGIDO AQUI! Era uma URL incorreta.
// Certifique-se que o nome do arquivo é 'auth.ts' e não 'authRoutes.ts'
import authRoutes from './src/routes/auth';
import dashboardRoutes from './src/routes/dashboardGeralRoutes';
import alunoRoutes from './src/routes/alunos';
import treinoRoutes from './src/routes/treinos';
import exercicioRoutes from './src/routes/exercicios';
import sessionsRoutes from './src/routes/sessionsRoutes';
import pastaRoutes from './src/routes/pastasTreinos';
import { authenticateToken } from './middlewares/authenticateToken';


const app = express();

// --- Configuração de CORS Correta e Simplificada ---
const frontendUrl = process.env.FRONTEND_URL;

if (!frontendUrl) {
  console.warn('[CORS] A variável de ambiente FRONTEND_URL não está definida. A comunicação com o frontend pode falhar em produção.');
}

const corsOptions = {
  origin: frontendUrl || 'http://localhost:5173',
  methods: 'GET,HEAD,PUT,PATCH,POST,DELETE',
  credentials: true,
  optionsSuccessStatus: 204
};

console.log(`[CORS] Configurando para permitir a origem: ${corsOptions.origin}`);
app.use(cors(corsOptions));
// --- Fim da Configuração de CORS ---


// Middleware para parse de JSON
app.use(express.json());

// --- Conexão com Banco de Dados ---
const MONGO_URI = process.env.MONGODB_URI;

if (!MONGO_URI) {
  console.error('FATAL_ERROR: A variável de ambiente MONGODB_URI não está definida.');
  process.exit(1);
}

console.log('Tentando conectar ao MongoDB...');
mongoose.connect(MONGO_URI)
  .then(() => console.log('Conectado ao MongoDB com sucesso!'))
  .catch(err => {
    console.error('Falha ao conectar com o MongoDB:', err);
    process.exit(1);
  });

// --- Definição das Rotas da API ---
app.get('/api/health', (_req, res) => {
  res.status(200).json({ status: 'API está funcionando!', environment: process.env.NODE_ENV });
});

// Rotas públicas
app.use('/api/auth', authRoutes);

// Rotas protegidas (exigem autenticação)
app.use('/api/dashboard/geral', authenticateToken, dashboardRoutes);
app.use('/api/alunos', authenticateToken, alunoRoutes);
app.use('/api/treinos', authenticateToken, treinoRoutes);
app.use('/api/exercicios', authenticateToken, exercicioRoutes);
app.use('/api/sessions', authenticateToken, sessionsRoutes);
app.use('/api/pastas/treinos', authenticateToken, pastaRoutes);


// --- Inicialização do Servidor ---
const PORT = process.env.PORT || 8080;

app.listen(PORT, () => {
  console.log('--- Informações do Ambiente ---');
  console.log(`NODE_ENV: ${process.env.NODE_ENV}`);
  console.log(`FRONTEND_URL (para CORS): ${frontendUrl}`);
  console.log(`Servidor Express rodando na porta ${PORT}`);
  console.log('---------------------------------');
});