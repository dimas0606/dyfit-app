// server/index.ts
import dotenv from 'dotenv';
dotenv.config();

import express from 'express';
import mongoose from 'mongoose';
import cors, { CorsOptions } from 'cors';

// Importação das rotas
import authRoutes from './src/routes/auth';
import convitePublicRoutes from './src/routes/convitePublicRoutes';
import conviteAlunoPublicRoutes from './src/routes/conviteAlunoPublicRoutes';
import dashboardRoutes from './src/routes/dashboardGeralRoutes';
// import alunoRoutes from './src/routes/alunos'; // <<< REMOVIDO
import treinoRoutes from './src/routes/treinos';
import exercicioRoutes from './src/routes/exercicios';
import sessionsRoutes from './src/routes/sessionsRoutes';
import pastaRoutes from './src/routes/pastasTreinos';
import alunoApiRoutes from './src/routes/alunoApiRoutes'; // <<< AGORA É A ÚNICA FONTE
import adminRoutes from './src/routes/adminRoutes';

// Importação dos middlewares
import { authenticateToken } from './middlewares/authenticateToken';
import { authorizeAdmin } from './middlewares/authorizeAdmin';
import { errorHandler } from './middlewares/errorHandler';

const app = express();

const allowedOrigins = [
  'http://localhost:5173',
  'http://localhost:4173',
  process.env.FRONTEND_URL,
].filter(Boolean) as string[];

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

// --- ESTRUTURA DE ROTAS SIMPLIFICADA E CORRIGIDA ---
app.use('/api/public/convites', convitePublicRoutes); 
app.use('/api/public/convite-aluno', conviteAlunoPublicRoutes);
app.use('/api/auth', authRoutes);

app.use(authenticateToken);

app.use('/api/admin', authorizeAdmin, adminRoutes);
app.use('/api/dashboard/geral', dashboardRoutes);
app.use('/api/treinos', treinoRoutes);
app.use('/api/exercicios', exercicioRoutes);
app.use('/api/sessions', sessionsRoutes);
app.use('/api/pastas/treinos', pastaRoutes);
app.use('/api/aluno', alunoApiRoutes); // <<< UMA LINHA PARA TODAS AS ROTAS DE ALUNO

app.use(errorHandler);

const PORT = process.env.PORT || 5000;
app.listen(PORT, () => {
  console.log(`Servidor Express rodando na porta ${PORT}`);
});