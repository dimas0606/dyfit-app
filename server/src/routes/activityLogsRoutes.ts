// server/src/routes/activityLogsRoutes.ts
import express, { Response, NextFunction } from 'express';
import { authenticateToken, AuthenticatedRequest } from '../../middlewares/authenticateToken';
// Futuramente, você importaria seu modelo ActivityLog aqui
// import ActivityLog from '../../models/ActivityLog'; 

const router = express.Router();

console.log("--- [server/src/routes/activityLogsRoutes.ts] Ficheiro carregado ---");

// GET /api/activity-logs - Placeholder
router.get('/', authenticateToken, async (req: AuthenticatedRequest, res: Response, next: NextFunction) => {
    const trainerId = req.user?.id;
    const limitParam = req.query.limit;
    const limit = typeof limitParam === 'string' && parseInt(limitParam) > 0 ? parseInt(limitParam) : 5; // Padrão de 5 se não especificado

    if (!trainerId) {
        return res.status(401).json({ mensagem: "Usuário não autenticado." });
    }

    console.log(`[GET /api/activity-logs] (Placeholder) Buscando logs para trainerId: ${trainerId} com limite: ${limit}`);

    try {
        // TODO: Implementar a lógica real para buscar logs de atividade do banco de dados
        // Por enquanto, retorna um array vazio para evitar o erro 404 no frontend.
        const mockActivities: any[] = [
            // Exemplo de dados mockados, se quiser testar a UI com algo:
            // { id: '1', activityType: 'student-added', details: { name: 'Aluno Teste 1' }, timestamp: new Date().toISOString() },
            // { id: '2', activityType: 'workout-created', details: { name: 'Treino Peito Intenso' }, timestamp: new Date(Date.now() - 3600000).toISOString() },
        ];
        
        res.json(mockActivities);

    } catch (error) {
        console.error("[GET /api/activity-logs] (Placeholder) Erro:", error);
        next(error);
    }
});

export default router;