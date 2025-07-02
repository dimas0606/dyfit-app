// server/index.ts
import dotenv from 'dotenv';
import path from 'path';
import { fileURLToPath } from 'url';
const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);
dotenv.config({ path: path.resolve(__dirname, '../.env') });

import express from 'express';
import mongoose from 'mongoose';
import cors from 'cors';

import authRoutes from './src/routes/authRoutes';
import dashboardRoutes from './src/routes/dashboardGeralRoutes';
import alunoRoutes from './src/routes/alunos';
import treinoRoutes from './src/routes/treinos';
import exercicioRoutes from './src/routes/exercicios';
import sessionsRoutes from './src/routes/sessionsRoutes';
import pastaRoutes from './src/routes/pastasTreinos';
import { authenticateToken } from './middlewares/authenticateToken';

const app = express();

const allowedOrigins = [
  'http://localhost:5173',
  process.env.FRONTEND_URL
];

app.use(cors({
  origin: function (origin, callback) {
    if (!origin) return callback(null, true);
    if (allowedOrigins.indexOf(origin) === -1) {
      const msg = `A política CORS para este site não permite acesso da Origem especificada: ${origin}`;
      return callback(new Error(msg), false);
    }
    return callback(null, true);
  },
  credentials: true
}));

app.use(express.json());

console.log('--- [server/models/Aluno.ts] Modelo Carregado (com funcionalidade de senha) ---');
console.log('--- [server/src/routes/dashboardGeralRoutes.ts] Ficheiro carregado e rota GET / definida ---');
console.log('Tentando conectar ao MongoDB...');

mongoose.connect(process.env.MONGODB_URI as string)
  .then(() => console.log('Conectado ao MongoDB!'))
  .catch(err => {
    console.error('Erro FATAL ao conectar ao MongoDB:', err);
  });

app.get('/api/health', (_req, res) => {
  res.status(200).json({ status: 'API está funcionando!', environment: process.env.NODE_ENV });
});

app.use('/api/auth', authRoutes);
app.use('/api/dashboard/geral', dashboardRoutes);
app.use('/api/alunos', authenticateToken, alunoRoutes);
app.use('/api/treinos', authenticateToken, treinoRoutes);
app.use('/api/exercicios', authenticateToken, exercicioRoutes);
app.use('/api/sessions', authenticateToken, sessionsRoutes);
app.use('/api/pastas/treinos', authenticateToken, pastaRoutes);

const PORT = process.env.PORT || 8080;

console.log(`Variáveis de Ambiente:`);
console.log(`NODE_ENV: ${process.env.NODE_ENV}`);
console.log(`FRONTEND_URL: ${process.env.FRONTEND_URL}`);
console.log(`MONGODB_URI (primeiros 10 chars): ${process.env.MONGODB_URI?.substring(0, 10)}...`);
console.log(`JWT_SECRET (presente?): ${!!process.env.JWT_SECRET}`);
console.log(`PORT: ${PORT}`);

app.listen(PORT, () => {
  console.log(`Servidor Express rodando na porta ${PORT}`);
});
