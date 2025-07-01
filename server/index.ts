// server/index.ts
import "dotenv/config";
import express, { RequestHandler, ErrorRequestHandler, Response, NextFunction, Request } from "express";
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
import alunoApiRoutes from "./src/routes/alunoApiRoutes";

// --- Importação dos Middlewares ---
import { errorHandler } from "./middlewares/errorHandler";
import { authenticateToken } from "./middlewares/authenticateToken";
import { authorizeAdmin } from "./middlewares/authorizeAdmin";
import { authenticateAlunoToken } from "./middlewares/authenticateAlunoToken";

// --- Conexão com Banco de Dados ---
import { connectToDatabase } from "./database";

const app = express();

// Conectar banco uma única vez ao subir
connectToDatabase().catch(err => {
    console.error("❌ Erro ao conectar ao banco:", err);
    process.exit(1);
});

// Middlewares
app.use(cors({
    origin: process.env.FRONTEND_URL || "http://localhost:5173",
    methods: ["GET", "POST", "PUT", "DELETE", "PATCH", "OPTIONS"],
    allowedHeaders: ["Content-Type", "Authorization"],
    credentials: true,
}));
app.use(express.json());
app.use(express.urlencoded({ extended: true }));

app.use((req: Request, _res: Response, next: NextFunction) => {
    console.log(`[${new Date().toISOString()}] ${req.method} ${req.originalUrl}`);
    next();
});

console.log("🔄 Registrando rotas da API...");

// --- ROTAS PÚBLICAS ---
app.use("/api/auth", authRoutes);
app.use("/api/public/contatos", publicContatosRoutes);
app.use("/api/convites", convitePublicRoutes);

// --- ROTAS PROTEGIDAS PARA ALUNOS ---
app.use("/api/aluno", authenticateAlunoToken as RequestHandler, alunoApiRoutes);

// --- MIDDLEWARE DE AUTENTICAÇÃO GERAL (Personal/Admin) ---
app.use("/api/*", authenticateToken as RequestHandler);

// --- ROTAS ESPECÍFICAS DE ADMIN ---
app.use("/api/admin", authorizeAdmin as RequestHandler, adminRoutes);

// --- ROTAS PROTEGIDAS PARA PERSONAL/ADMIN ---
app.use("/api/alunos", alunosRoutes);
app.use("/api/exercicios", exerciciosRouter);
app.use("/api/treinos", treinosRouter);
app.use("/api/profile", profileRoutes);
app.use("/api/pastas/treinos", pastasTreinosRouter);
app.use("/api/dashboard/geral", dashboardGeralRoutes);
app.use("/api/sessions", sessionsRoutes);
app.use("/api/activity-logs", activityLogsRoutes);

app.use(errorHandler as ErrorRequestHandler);

console.log("✅ Middleware de tratamento de erros registrado.");

// 🔥 Diferencia ambiente local vs Vercel
if (process.env.VERCEL) {
    console.log("🚀 Executando na Vercel - exportando app.");
} else {
    const PORT = process.env.PORT || 5000;
    app.listen(PORT, () => {
        console.log(`🚀 Servidor backend rodando na porta ${PORT}`);
        console.log(`🔗 Frontend esperado em: ${process.env.FRONTEND_URL || 'http://localhost:5173'}`);
    });
}

export default app;
