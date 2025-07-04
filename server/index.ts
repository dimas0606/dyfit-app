// server/index.ts
import dotenv from 'dotenv';
dotenv.config();

import express from 'express';
import mongoose from 'mongoose';
import cors from 'cors';

// Importação das rotas
import authRoutes from './src/routes/auth';
import dashboardRoutes from './src/routes/dashboardGeralRoutes';
import alunoRoutes from './src/routes/alunos';
import treinoRoutes from './src/routes/treinos';
import exercicioRoutes from './src/routes/exercicios';
import sessionsRoutes from './src/routes/sessionsRoutes';
import pastaRoutes from './src/routes/pastasTreinos';
import alunoApiRoutes from './src/routes/alunoApiRoutes';
import adminRoutes from './src/routes/adminRoutes'; // Importa as rotas do admin

// Importação dos middlewares
import { authenticateToken } from './middlewares/authenticateToken';
import { authorizeAdmin } from './middlewares/authorizeAdmin'; // Importa o autorizador do admin

const app = express();

const frontendUrl = process.env.FRONTEND_URL;
app.use(cors({
  origin: frontendUrl || 'http://localhost:5173',
  methods: 'GET,HEAD,PUT,PATCH,POST,DELETE',
  credentials: true,
  optionsSuccessStatus: 204
}));
app.use(express.json());

const MONGO_URI = process.env.MONGODB_URI;
if (!MONGO_URI) {
  console.error('FATAL_ERROR: MONGODB_URI não está definida.');
  process.exit(1);
}
mongoose.connect(MONGO_URI)
  .then(() => console.log('Conectado ao MongoDB com sucesso!'))
  .catch(err => console.error('Falha ao conectar com o MongoDB:', err));


// --- ESTRUTURA DE ROTAS CORRIGIDA ---

// 1. Rotas Públicas (não precisam de token)
app.use('/api/auth', authRoutes);

// 2. Middleware de Autenticação Global
// A partir daqui, todas as rotas exigem um token válido.
app.use(authenticateToken);

// 3. Rotas de Admin (exigem token E permissão de admin)
// O fluxo é: Requisição -> authenticateToken -> authorizeAdmin -> adminRoutes
app.use('/api/admin', authorizeAdmin, adminRoutes);

// 4. Rotas de Personal Trainer (exigem token, mas não necessariamente de admin)
// (Um admin também pode acessar, pois nosso authenticateToken popula req.user para ele)
app.use('/api/dashboard/geral', dashboardRoutes);
app.use('/api/alunos', alunoRoutes);
app.use('/api/treinos', treinoRoutes);
app.use('/api/exercicios', exercicioRoutes);
app.use('/api/sessions', sessionsRoutes);
app.use('/api/pastas/treinos', pastaRoutes);

// 5. Rotas Específicas de Aluno (exigem token de aluno)
app.use('/api/aluno', alunoApiRoutes);


// --- FIM DA ESTRUTURA DE ROTAS ---

const PORT = process.env.PORT || 8080;
app.listen(PORT, () => {
  console.log(`Servidor Express rodando na porta ${PORT}`);
});