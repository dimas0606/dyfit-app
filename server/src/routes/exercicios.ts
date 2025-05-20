// server/src/routes/exercicios.ts
import express, { Request, Response, Router, NextFunction } from "express";
import mongoose from "mongoose";
import Exercicio, { IExercicio } from "../../models/Exercicio"; // Certifique-se que IExercicio está exportada
import { authenticateToken, AuthenticatedRequest } from '../../middlewares/authenticateToken';

const router: Router = express.Router();

// Função auxiliar de filtro (pode ser mantida ou simplificada se não usada por outras rotas)
const buildFilterQuery = (baseFilter: mongoose.FilterQuery<IExercicio>, req: Request): mongoose.FilterQuery<IExercicio> => {
    const query: mongoose.FilterQuery<IExercicio> = { ...baseFilter };
    const { grupo, categoria, nome } = req.query;
    const ALL_VALUE = "all";

    if (grupo && typeof grupo === 'string' && grupo !== ALL_VALUE) {
        query.grupoMuscular = grupo;
    }
    if (categoria && typeof categoria === 'string' && categoria !== ALL_VALUE) {
        // Assumindo que 'categoria' no frontend corresponde a 'tipo' no schema do exercício
        query.tipo = categoria; 
    }
    if (nome && typeof nome === 'string') {
         query.nome = { $regex: nome, $options: 'i' };
    }
    console.log(`[buildFilterQuery] Query Mongoose aplicada: ${JSON.stringify(query)}`);
    return query;
};

// --- ROTAS EXISTENTES (GET /app, /meus, /favoritos, POST, PUT, DELETE) ---
// MANTENHA-AS COMO ESTÃO

// Rota para buscar exercícios do App (com filtros)
router.get("/app", authenticateToken, async (req: AuthenticatedRequest, res: Response, next: NextFunction) => {
  const userId = req.user?.id; 
  try {
    const filterQuery = buildFilterQuery({ isCustom: false }, req); 
    const exerciciosApp = await Exercicio.find(filterQuery).lean();
    const exerciciosComFavorito = exerciciosApp.map(ex => ({
      ...ex,
      isFavoritedByCurrentUser: ex.favoritedBy?.some(favId => favId.equals(new mongoose.Types.ObjectId(userId))) ?? false
    }));
    res.status(200).json(exerciciosComFavorito);
  } catch (error) {
    console.error(`❌ Erro ao buscar exercícios do App:`, error);
    next(error); 
  }
});

// Rota para buscar exercícios do personal (com filtros)
router.get("/meus", authenticateToken, async (req: AuthenticatedRequest, res: Response, next: NextFunction) => {
  const creatorId = req.user?.id;
  try {
    if (!creatorId) { return res.status(401).json({ erro: "Usuário não autenticado." }); }
    const filterQuery = buildFilterQuery({ creatorId: new mongoose.Types.ObjectId(creatorId), isCustom: true }, req);
    const exercicios = await Exercicio.find(filterQuery).lean();
    const exerciciosComFavorito = exercicios.map(ex => ({
      ...ex,
      isFavoritedByCurrentUser: ex.favoritedBy?.some(favId => favId.equals(new mongoose.Types.ObjectId(creatorId))) ?? false
    }));
    res.status(200).json(exerciciosComFavorito);
  } catch (error) {
     console.error(`❌ Erro ao buscar exercícios personalizados:`, error);
     next(error);
  }
});

// Rota para buscar exercícios favoritos (com filtros)
router.get("/favoritos", authenticateToken, async (req: AuthenticatedRequest, res: Response, next: NextFunction) => {
  const userId = req.user?.id;
  try {
    if (!userId) { return res.status(401).json({ erro: "Usuário não autenticado." }); }
    const filterQuery = buildFilterQuery({ favoritedBy: new mongoose.Types.ObjectId(userId) }, req);
    const favoritos = await Exercicio.find(filterQuery).lean();
    const exerciciosComFavorito = favoritos.map(ex => ({
      ...ex,
      isFavoritedByCurrentUser: true 
    }));
    res.status(200).json(exerciciosComFavorito);
  } catch (error) {
     console.error(`❌ Erro ao buscar favoritos:`, error);
     next(error);
  }
});


// <<<< NOVA ROTA PARA AUTOCOMPLETE >>>>
interface ExercicioAutocomplete {
  _id: string;
  nome: string;
  grupoMuscular?: string;
  isCustom: boolean; // Para o frontend saber a origem
}

router.get("/autocomplete", authenticateToken, async (req: AuthenticatedRequest, res: Response, next: NextFunction) => {
    const personalId = req.user?.id;
    const searchTerm = req.query.nome as string; // Termo de busca para o nome
    const limit = parseInt(req.query.limit as string) || 10; // Limite de resultados, padrão 10

    if (!personalId) {
        return res.status(401).json({ mensagem: "Usuário não autenticado." });
    }
    if (!searchTerm || typeof searchTerm !== 'string' || searchTerm.trim().length < 2) { // Exige pelo menos 2 caracteres
        return res.status(400).json({ mensagem: "Termo de busca para nome é obrigatório e deve ter pelo menos 2 caracteres." });
    }

    try {
        const searchRegex = new RegExp(searchTerm.trim(), 'i'); // 'i' para case-insensitive

        // Condição de busca:
        // 1. Exercícios do app (isCustom: false) que correspondem ao searchTerm
        // OU
        // 2. Exercícios customizados pelo personal logado (isCustom: true, creatorId: personalId) que correspondem ao searchTerm
        const queryConditions = {
            nome: searchRegex,
            $or: [
                { isCustom: false },
                { isCustom: true, creatorId: new mongoose.Types.ObjectId(personalId) }
            ]
        };

        const exerciciosEncontrados = await Exercicio.find(queryConditions)
            .select('_id nome grupoMuscular isCustom') // Seleciona apenas os campos necessários
            .limit(limit)
            .sort({ nome: 1 }) // Ordena por nome
            .lean<ExercicioAutocomplete[]>(); // Usa a interface específica para autocomplete

        console.log(`[GET /api/exercicios/autocomplete] Termo: "${searchTerm}", Encontrados: ${exerciciosEncontrados.length}`);
        res.json(exerciciosEncontrados);

    } catch (error) {
        console.error("[GET /api/exercicios/autocomplete] Erro ao buscar exercícios para autocomplete:", error);
        next(error);
    }
});


// Criar exercício
router.post("/", authenticateToken, async (req: AuthenticatedRequest, res: Response, next: NextFunction) => {
    const creatorId = req.user?.id;
    // Ajuste para pegar os campos corretos conforme o schema IExercicio
    const { nome, descricao, categoria, grupoMuscular, tipo, urlVideo } = req.body; 

    if (!nome) { return res.status(400).json({ erro: "O nome é obrigatório." }); }
    if (!creatorId) { return res.status(401).json({ erro: "Usuário não autenticado." }); }
    
    try {
        const jaExiste = await Exercicio.findOne({
            nome: nome.trim(),
            creatorId: new mongoose.Types.ObjectId(creatorId),
            isCustom: true
        });
        if (jaExiste) { return res.status(409).json({ erro: "Você já possui um exercício personalizado com esse nome." }); }

        const novoExercicio = await Exercicio.create({
            nome: nome.trim(), 
            descricao, 
            categoria, // Usado para filtro "tipo" no frontend
            grupoMuscular, 
            tipo, // Pode ser o campo "tipo" do seu schema original de exercício
            urlVideo,
            isCustom: true, 
            creatorId: new mongoose.Types.ObjectId(creatorId), 
            favoritedBy: [],
        });
        console.log(`✅ Exercício criado por ${creatorId}:`, novoExercicio.nome);
        res.status(201).json(novoExercicio);
    } catch (error) { next(error); }
});

// Atualizar exercício
router.put("/:id", authenticateToken, async (req: AuthenticatedRequest, res: Response, next: NextFunction) => {
    const userId = req.user?.id;
    const { id } = req.params;
    const updates = req.body;
    delete updates._id; delete updates.creatorId; delete updates.isCustom; delete updates.favoritedBy;
    
    if (!mongoose.Types.ObjectId.isValid(id)) { return res.status(400).json({ erro: "ID inválido." }); }
    if (!userId) { return res.status(401).json({ erro: "Não autorizado." }); }

    try {
        const exercicio = await Exercicio.findById(id);
        if (!exercicio) { return res.status(404).json({ erro: "Exercício não encontrado." }); }
        
        if (!exercicio.isCustom || !exercicio.creatorId || !exercicio.creatorId.equals(new mongoose.Types.ObjectId(userId))) {
             return res.status(403).json({ erro: "Permissão negada para editar." });
        }
        
        // Aplicar apenas os campos permitidos para atualização
        const camposPermitidos: (keyof IExercicio)[] = ['nome', 'descricao', 'categoria', 'grupoMuscular', 'tipo', 'urlVideo'];
        for (const campo of camposPermitidos) {
            if (updates[campo] !== undefined) {
                (exercicio as any)[campo] = updates[campo];
            }
        }

        await exercicio.save();
        res.status(200).json(exercicio);
    } catch (error) { next(error); }
});

// Favoritar
router.post("/:id/favorite", authenticateToken, async (req: AuthenticatedRequest, res: Response, next: NextFunction) => {
    const userId = req.user?.id;
    const { id } = req.params;
    if (!mongoose.Types.ObjectId.isValid(id)) { return res.status(400).json({ erro: "ID inválido." }); }
    if (!userId) { return res.status(401).json({ erro: "Não autorizado." }); }
    try {
        await Exercicio.updateOne({ _id: id }, { $addToSet: { favoritedBy: new mongoose.Types.ObjectId(userId) } });
        res.status(200).json({ message: "Exercício favoritado." });
    } catch (error) { next(error); }
});

// Desfavoritar
router.delete("/:id/favorite", authenticateToken, async (req: AuthenticatedRequest, res: Response, next: NextFunction) => {
    const userId = req.user?.id;
    const { id } = req.params;
    if (!mongoose.Types.ObjectId.isValid(id)) { return res.status(400).json({ erro: "ID inválido." }); }
    if (!userId) { return res.status(401).json({ erro: "Não autorizado." }); }
    try {
        await Exercicio.updateOne({ _id: id }, { $pull: { favoritedBy: new mongoose.Types.ObjectId(userId) } });
        res.status(200).json({ message: "Exercício desfavoritado." });
    } catch (error) { next(error); }
});

// Deletar exercício
router.delete("/:id", authenticateToken, async (req: AuthenticatedRequest, res: Response, next: NextFunction) => {
    const userId = req.user?.id;
    const { id } = req.params;
    if (!mongoose.Types.ObjectId.isValid(id)) { return res.status(400).json({ erro: "ID inválido." }); }
    if (!userId) { return res.status(401).json({ erro: "Não autorizado." }); }
    try {
        const exercicio = await Exercicio.findById(id);
        if (!exercicio) { return res.status(404).json({ erro: "Exercício não encontrado." }); }
        
        if (!exercicio.isCustom || !exercicio.creatorId || !exercicio.creatorId.equals(new mongoose.Types.ObjectId(userId))) {
             return res.status(403).json({ erro: "Permissão negada para deletar." });
        }
        await exercicio.deleteOne(); // Correção: usar deleteOne() na instância do documento
        res.status(200).json({ message: "Exercício deletado com sucesso." });
    } catch (error) { next(error); }
});

export default router;