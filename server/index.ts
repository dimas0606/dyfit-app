// server/index.ts
import dotenv from 'dotenv';
dotenv.config();

import express from 'express';
import mongoose from 'mongoose';
import cors, { CorsOptions } from 'cors';

// Importação das rotas
import authRoutes from './src/routes/auth';
import convitePublicRoutes from './src/routes/convitePublicRoutes'; // Rota pública
import dashboardRoutes from './src/routes/dashboardGeralRoutes';
import alunoRoutes from './src/routes/alunos';
import treinoRoutes from './src/routes/treinos';
import exercicioRoutes from './src/routes/exercicios';
import sessionsRoutes from './src/routes/sessionsRoutes';
import pastaRoutes from './src/routes/pastasTreinos';
import alunoApiRoutes from './src/routes/alunoApiRoutes';
import adminRoutes from './src/routes/adminRoutes';

// Importação dos middlewares
import { authenticateToken } from './middlewares/authenticateToken';
import { authorizeAdmin } from './middlewares/authorizeAdmin';

const app = express();

const allowedOrigins = [
  'http://localhost:5173',
  'http://localhost:4173',
  process.env.FRONTEND_URL
].filter(Boolean);

const corsOptions: CorsOptions = {
  origin: (origin, callback) => {
    if (!origin || allowedOrigins.includes(origin)) {
      callback(null, true);
    } else {
      callback(new Error('Not allowed by CORS'));
    }
  },
  methods: 'GET,HEAD,PUT,PATCH,POST,DELETE',
  credentials: true,
  optionsSuccessStatus: 200
};

app.options('*', cors(corsOptions));
app.use(cors(corsOptions));
app.use(express.json());

const MONGO_URI = process.env.MONGODB_URI;
if (!MONGO_URI) {
  console.error('FATAL_ERROR: MONGODB_URI não está definida.');
  process.exit(1);
}
mongoose.connect(MONGO_URI)
  .then(() => console.log('Conectado ao MongoDB com sucesso!'))
  .catch(err => console.error('Falha ao conectar com o MongoDB:', err));


// =======================================================
// --- ESTRUTURA DE ROTAS CORRETA E FINAL ---
// =======================================================

// 1. Rotas Públicas (NÃO precisam de token)
//    Qualquer rota registrada aqui será acessível sem login.
app.use('/api/auth', authRoutes);
app.use('/api/public/convites', convitePublicRoutes); // <-- Registrada ANTES do middleware de autenticação.

// 2. Middleware de Autenticação Global
//    A partir deste ponto, TODAS as rotas abaixo exigirão um token JWT válido.
app.use(authenticateToken);

// 3. Rotas Protegidas

// Rotas de Admin (exigem token E permissão de admin)
app.use('/api/admin', authorizeAdmin, adminRoutes);

// Rotas de Personal Trainer (exigem token)
app.use('/api/dashboard/geral', dashboardRoutes);
app.use('/api/alunos', alunoRoutes);
app.use('/api/treinos', treinoRoutes);
app.use('/api/exercicios', exercicioRoutes);
app.use('/api/sessions', sessionsRoutes);
app.use('/api/pastas/treinos', pastaRoutes);

// Rotas Específicas de Aluno (exigem um tipo específico de token, tratado internamente)
app.use('/api/aluno', alunoApiRoutes);


const PORT = process.env.PORT || 5000;
app.listen(PORT, () => {
  console.log(`Servidor Express rodando na porta ${PORT}`);
});
