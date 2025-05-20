// server/index.ts
import "dotenv/config";
import express, { RequestHandler, ErrorRequestHandler } from "express";
import cors from "cors";

// --- Importação das Rotas ---
import alunosRoutes from "./src/routes/alunos";
import exerciciosRouter from "./src/routes/exercicios";
import treinosRouter from "./src/routes/treinos";
import authRoutes from "./src/routes/auth";
import profileRoutes from "./src/routes/profile";
import pastasTreinosRouter from "./src/routes/pastasTreinos";
import dashboardGeralRoutes from "./src/routes/dashboardGeralRoutes";
import sessionsRoutes from "./src/routes/sessionsRoutes";
import activityLogsRoutes from "./src/routes/activityLogsRoutes";
import publicContatosRoutes from "./src/routes/publicContatosRoutes";
import adminRoutes from "./src/routes/adminRoutes";
import convitePublicRoutes from "./src/routes/convitePublicRoutes";
// ***** NOVA IMPORTAÇÃO PARA ROTAS DA API DO ALUNO *****
import alunoApiRoutes from "./src/routes/alunoApiRoutes"; // <<< ADICIONADO

// --- Importação dos Middlewares ---
import { errorHandler } from "./middlewares/errorHandler";
import { authenticateToken } from "./middlewares/authenticateToken"; // Para Personal/Admin
import { authorizeAdmin } from "./middlewares/authorizeAdmin";
// ***** NOVA IMPORTAÇÃO PARA MIDDLEWARE DE AUTENTICAÇÃO DO ALUNO *****
import { authenticateAlunoToken } from "./middlewares/authenticateAlunoToken"; // <<< ADICIONADO

// --- Conexão com Banco de Dados ---
import { connectToDatabase } from "./database";

async function startServer() {
    await connectToDatabase();

    const app = express();
    const PORT = process.env.PORT || 5000;

    app.use(cors({
        origin: process.env.FRONTEND_URL || "http://localhost:5173",
        methods: ["GET", "POST", "PUT", "DELETE", "PATCH", "OPTIONS"],
        allowedHeaders: ["Content-Type", "Authorization"],
        credentials: true,
    }));
    app.use(express.json());
    app.use(express.urlencoded({ extended: true }));

    app.use((req, res, next) => {
        console.log(`[${new Date().toISOString()}] ${req.method} ${req.originalUrl}`);
        next();
    });
    
    console.log("🔄 Registrando rotas da API...");

    // --- ROTAS PÚBLICAS (sem autenticação obrigatória global) ---
    // Rotas de autenticação para Personal/Admin e Aluno, registro de aluno por convite, etc.
    app.use("/api/auth", authRoutes); 
    app.use("/api/public/contatos", publicContatosRoutes);
    app.use("/api/convites", convitePublicRoutes); // Rotas públicas para validar e usar convites de Personal
    console.log("✅ Rotas públicas (/api/auth, /api/public/contatos, /api/convites) registradas.");

    // --- ROTAS PROTEGIDAS PARA ALUNOS ---
    // Estas rotas exigem um token JWT de Aluno válido.
    // O middleware authenticateAlunoToken verificará isso.
    // Todas as rotas dentro de alunoApiRoutes (ex: /api/aluno/meus-treinos) serão protegidas.
    app.use("/api/aluno", authenticateAlunoToken as RequestHandler, alunoApiRoutes); // <<< ADICIONADO
    console.log("🧑‍🎓 Rotas da API do Aluno (/api/aluno) registradas e protegidas para role 'Aluno'.");
    
    // --- APLICA MIDDLEWARE DE AUTENTICAÇÃO GERAL PARA OUTRAS ROTAS /api/* (Personal/Admin) ---
    // Todas as rotas definidas abaixo desta linha exigirão um token JWT válido de Personal ou Admin.
    // O authenticateToken verifica o token, mas não impede o acesso se for um token de Aluno.
    // A autorização específica (ex: authorizeAdmin ou lógica dentro das rotas) deve tratar disso.
    app.use("/api/*", authenticateToken as RequestHandler);
    console.log("🔒 Middleware de autenticação geral (Personal/Admin) aplicado às demais rotas /api/*.");

    // --- ROTAS ESPECÍFICAS DE ADMIN (Personal/Admin já autenticado, authorizeAdmin verifica a role) ---
    app.use("/api/admin", authorizeAdmin as RequestHandler, adminRoutes);
    console.log("👑 Rotas de Admin (/api/admin) registradas e protegidas para role 'Admin'.");

    // --- ROTAS PROTEGIDAS PARA PERSONAL/ADMIN ---
    // Acessíveis por Personal ou Admin autenticado.
    // A lógica interna da rota pode ter mais verificações se necessário.
    app.use("/api/alunos", alunosRoutes);
    app.use("/api/exercicios", exerciciosRouter);
    app.use("/api/treinos", treinosRouter);
    app.use("/api/profile", profileRoutes);
    app.use("/api/pastas/treinos", pastasTreinosRouter);
    app.use("/api/dashboard/geral", dashboardGeralRoutes);
    app.use("/api/sessions", sessionsRoutes);
    app.use("/api/activity-logs", activityLogsRoutes);
    console.log("✅ Rotas protegidas gerais (Personal/Admin) registradas.");

    app.use(errorHandler as ErrorRequestHandler);
    console.log("✅ Middleware de tratamento de erros registrado.");

    app.listen(PORT, () => {
        console.log(`🚀 Servidor backend rodando na porta ${PORT}`);
        console.log(`🔗 Frontend esperado em: ${process.env.FRONTEND_URL || 'http://localhost:5173'}`);
    });
}

startServer().catch(error => {
    console.error("❌ Falha ao iniciar o servidor:", error);
    process.exit(1);
});
