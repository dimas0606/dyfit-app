// server/index.ts
import dotenv from 'dotenv';
// É crucial que dotenv.config() seja chamado o mais cedo possível
// para que as variáveis de ambiente (incluindo PORT) estejam disponíveis.
dotenv.config(); 

import express from 'express';
import mongoose from 'mongoose';
import cors from 'cors'; // Importe o CORS se ainda não o fez
// ... outras importações de rotas, middlewares, etc.

const app = express();

// Configuração CORS - MUITO IMPORTANTE para produção
const allowedOrigins = [
  'http://localhost:5173', // Para desenvolvimento local
  process.env.FRONTEND_URL // A URL do seu frontend no Vercel
];

app.use(cors({
  origin: function (origin, callback) {
    if (!origin) return callback(null, true); // Permite requisições sem 'origin' (ex: Postman)
    if (allowedOrigins.indexOf(origin) === -1) {
      const msg = `A política CORS para este site não permite acesso da Origem especificada: ${origin}`;
      return callback(new Error(msg), false);
    }
    return callback(null, true);
  },
  credentials: true // Se você usa cookies ou headers de autorização
}));

app.use(express.json()); // Para parsear JSON no corpo das requisições

// Conexão com o MongoDB
// Certifique-se de que MONGODB_URI está configurado nas variáveis de ambiente da Vercel
mongoose.connect(process.env.MONGODB_URI as string)
  .then(() => console.log('Conectado ao MongoDB!'))
  .catch(err => console.error('Erro ao conectar ao MongoDB:', err));

// Exemplo de rota de teste (adicione se não tiver uma)
app.get('/api/health', (req, res) => {
  res.status(200).json({ status: 'API está funcionando!', environment: process.env.NODE_ENV });
});

// Suas rotas da API
// Exemplo: app.use('/api/auth', authRoutes);
// Exemplo: app.use('/api/users', userRoutes);
// ... adicione todas as suas rotas aqui

// A porta que o servidor Express vai escutar.
// process.env.PORT é a porta que a Vercel (ou qualquer ambiente de produção) fornece.
// O || 8080 é um fallback para desenvolvimento local, se PORT não estiver definido.
const PORT = process.env.PORT || 8080; 

app.listen(PORT, () => {
  console.log(`Servidor Express rodando na porta ${PORT}`);
});
