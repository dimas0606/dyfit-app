// server/src/routes/alunos.ts
import express, { Request, Response } from "express";
import mongoose from "mongoose";
import Aluno from "../../models/Aluno";
import crypto from 'crypto'; // Para gerar senhas temporárias

// Não precisamos importar AuthenticatedRequest se express.d.ts estiver funcionando globalmente
// import { AuthenticatedRequest } from '../../middlewares/authenticateToken'; 

console.log("--- [server/src/routes/alunos.ts] Ficheiro carregado (com geração de senha temp e verificação de email duplicado) ---");

const router = express.Router();

// --- ROTAS ---

// POST /api/alunos - Cadastrar novo aluno
router.post("/", async (req: Request, res: Response) => {
  console.log("--- ROTA POST /api/alunos ATINGIDA ---");
  console.log("📦 Dados recebidos para cadastro:", req.body);
  try {
    const {
      nome, email, birthDate, gender, goal, weight, height, startDate,
      phone, status, notes, trainerId // trainerId deve ser o ID do personal logado
    } = req.body;

    // Validação adicional: Verificar se o trainerId foi fornecido e é válido
    if (!trainerId || !mongoose.Types.ObjectId.isValid(trainerId)) {
      return res.status(400).json({ erro: "ID do treinador (trainerId) inválido ou não fornecido." });
    }
    // Validação adicional: Verificar se o trainerId corresponde ao usuário logado (se não for admin)
    // req.user é populado pelo authenticateToken
    if (req.user && req.user.role === 'Personal Trainer' && req.user.id !== trainerId) {
      return res.status(403).json({ erro: "Personal Trainers só podem cadastrar alunos para si mesmos." });
    }

    // Verificar se já existe um aluno com este email
    const existingAluno = await Aluno.findOne({ email: email.toLowerCase() });
    if (existingAluno) {
      return res.status(409).json({ erro: `Já existe um aluno cadastrado com o email: ${email}` });
    }

    // Gerar uma senha temporária para o aluno
    // O hook pre-save no modelo Aluno cuidará do hashing
    const temporaryPassword = crypto.randomBytes(8).toString('hex'); // Gera uma string hexadecimal de 16 caracteres

    const novoAluno = new Aluno({
      nome,
      email: email.toLowerCase(), // Garante que o email seja salvo em minúsculas
      passwordHash: temporaryPassword, // Senha temporária que será hasheada
      birthDate,
      gender,
      goal,
      weight,
      height,
      startDate,
      phone,
      status,
      notes,
      trainerId
    });

    const alunoSalvo = await novoAluno.save();
    console.log(`✅ Aluno salvo: ${alunoSalvo.email} com senha temporária.`);

    // IMPORTANTE: Não retorne a senha temporária (nem o hash) para o cliente.
    // O aluno deverá ter um fluxo para definir sua própria senha (ex: "esqueci minha senha" ou primeiro login).
    const alunoParaRetornar = { ...alunoSalvo.toObject() };
    delete alunoParaRetornar.passwordHash; // Remove o hash da senha da resposta

    res.status(201).json(alunoParaRetornar);

  } catch (error: any) {
    console.error("❌ Erro ao cadastrar aluno:", error);
    if (error.name === 'ValidationError') {
      return res.status(400).json({
        erro: "Dados inválidos para cadastro",
        detalhes: error.errors
      });
    }
    // Tratamento de erro duplicado caso a verificação findOne falhe por alguma race condition
    if (error.code === 11000 && error.keyPattern?.email) {
        return res.status(409).json({ erro: `Já existe um aluno cadastrado com o email: ${req.body.email}` });
    }
    res.status(500).json({
      erro: "Erro interno ao cadastrar aluno",
      detalhes: error?.message || error
    });
  }
});

// GET /api/alunos - Listar alunos
// MODIFICADO: Agora filtra alunos pelo trainerId do personal logado
// ou mostra todos se for Admin.
router.get("/", async (req: Request, res: Response) => {
  console.log("--- ROTA GET /api/alunos ATINGIDA (FILTRANDO POR PERSONAL/ADMIN) ---");
  
  try {
    const user = req.user;

    if (!user || !user.id) {
      return res.status(401).json({ erro: "Usuário não autenticado corretamente." });
    }

    let query = {};

    if (user.role === 'Personal Trainer') {
      console.log(`   -> Personal Trainer ID: ${user.id} buscando seus alunos.`);
      query = { trainerId: user.id };
    } else if (user.role === 'Admin') {
      console.log(`   -> Admin ID: ${user.id} buscando todos os alunos.`);
    } else {
      console.warn(`   -> Usuário com role não reconhecida ('${user.role}') tentando listar alunos.`);
      return res.status(403).json({ erro: "Acesso não permitido para esta funcionalidade." });
    }

    const alunos = await Aluno.find(query).sort({ nome: 1 }).select('-passwordHash'); // Não retorna passwordHash
    console.log(`   -> Encontrados ${alunos.length} alunos.`);
    res.status(200).json(alunos);

  } catch (error: any) {
    console.error("❌ Erro ao buscar alunos:", error);
    res.status(500).json({ erro: "Erro interno ao buscar alunos", detalhes: error?.message || error });
  }
});

// GET /api/alunos/:id - Buscar um aluno pelo ID 
router.get("/:id", async (req: Request, res: Response) => {
  const { id } = req.params;
  const user = req.user;

  console.log(`--- ROTA GET /api/alunos/${id} ATINGIDA ---`);
  
  if (!user || !user.id) {
    return res.status(401).json({ erro: "Usuário não autenticado corretamente." });
  }

  if (!mongoose.Types.ObjectId.isValid(id)) {
     console.log(`   -> ID de aluno inválido fornecido: ${id}`);
     return res.status(400).json({ erro: "ID do aluno inválido" }); 
  }

  try {
    let query: mongoose.FilterQuery<any> = { _id: id };

    if (user.role === 'Personal Trainer') {
      query.trainerId = user.id;
    }

    const aluno = await Aluno.findOne(query).select('-passwordHash'); // Não retorna passwordHash

    if (!aluno) {
      console.log(`   -> Aluno com ID ${id} não encontrado ou não pertence a este personal.`);
      return res.status(404).json({ erro: "Aluno não encontrado" });
    }

    console.log(`   -> Aluno encontrado:`, aluno);
    res.status(200).json(aluno);

  } catch (error: any) {
     console.error(`❌ Erro ao buscar aluno ${id}:`, error);
     res.status(500).json({ erro: "Erro interno ao buscar aluno", detalhes: error?.message || error });
  }
});


// PUT /api/alunos/:id - Editar aluno 
router.put("/:id", async (req: Request, res: Response) => {
   const { id } = req.params;
   const user = req.user;
   console.log(`--- ROTA PUT /api/alunos/${id} ATINGIDA ---`);
   console.log("📦 Dados recebidos para atualização:", req.body);

   if (!user || !user.id) {
     return res.status(401).json({ erro: "Usuário não autenticado corretamente." });
   }
   if (!mongoose.Types.ObjectId.isValid(id)) {
     console.log(`   -> ID inválido para atualização: ${id}`);
     return res.status(400).json({ erro: "ID do aluno inválido" }); 
   }

  try {
    const updateData = { ...req.body };
    // Nunca permitir atualização direta do passwordHash ou trainerId (exceto por admin em rota específica)
    delete updateData.passwordHash;
    if (user.role === 'Personal Trainer') {
        delete updateData.trainerId; // Personal não pode mudar o trainerId de um aluno
    }


    let query: mongoose.FilterQuery<any> = { _id: id };
    if (user.role === 'Personal Trainer') {
      query.trainerId = user.id;
    }
    
    if (user.role === 'Personal Trainer') {
        const alunoParaVerificar = await Aluno.findOne(query);
        if (!alunoParaVerificar) {
            console.log(`   -> Aluno com ID ${id} não encontrado ou não pertence a este personal para atualização.`);
            return res.status(404).json({ erro: "Aluno não encontrado ou sem permissão para atualizar" });
        }
    }
    
    // Se o email estiver sendo atualizado, verificar se o novo email já existe para outro aluno
    if (updateData.email) {
        const alunoComNovoEmail = await Aluno.findOne({ 
            email: updateData.email.toLowerCase(), 
            _id: { $ne: id } // Exclui o próprio aluno da verificação
        });
        if (alunoComNovoEmail) {
            return res.status(409).json({ erro: `O email ${updateData.email} já está em uso por outro aluno.` });
        }
        updateData.email = updateData.email.toLowerCase(); // Garante lowercase
    }


    const alunoAtualizado = await Aluno.findOneAndUpdate(query, updateData, { 
        new: true, 
        runValidators: true 
    }).select('-passwordHash'); // Não retorna passwordHash

    if (!alunoAtualizado) {
      console.log(`   -> Aluno com ID ${id} não encontrado ou não pertence a este personal para atualizar.`);
      return res.status(404).json({ erro: "Aluno não encontrado ou sem permissão para atualizar" });
    }

    console.log("✅ Aluno atualizado:", alunoAtualizado);
    res.status(200).json(alunoAtualizado);

  } catch (error: any) {
    console.error(`❌ Erro ao atualizar aluno ${id}:`, error);
    if (error.name === 'ValidationError') {
       return res.status(400).json({ 
           erro: "Dados inválidos para atualização", 
           detalhes: error.errors 
       });
    }
    if (error.code === 11000 && error.keyPattern?.email) {
        return res.status(409).json({ erro: `O email ${req.body.email} já está em uso por outro aluno.` });
    }
    res.status(500).json({ erro: "Erro interno ao atualizar aluno", detalhes: error?.message || error });
  }
});


// DELETE /api/alunos/:id - Deletar aluno
router.delete("/:id", async (req: Request, res: Response) => {
  const { id } = req.params;
  const user = req.user;
  console.log(`--- ROTA DELETE /api/alunos/${id} ATINGIDA ---`);

  if (!user || !user.id) {
    return res.status(401).json({ erro: "Usuário não autenticado corretamente." });
  }
  if (!mongoose.Types.ObjectId.isValid(id)) {
    console.log(`   -> ID inválido para remoção: ${id}`);
    return res.status(400).json({ erro: "ID do aluno inválido" }); 
  }

  try {
    let query: mongoose.FilterQuery<any> = { _id: id };
    if (user.role === 'Personal Trainer') {
      query.trainerId = user.id;
    }

    const result = await Aluno.findOneAndDelete(query);

    if (!result) {
        console.log(`   -> Aluno com ID ${id} não encontrado ou não pertence a este personal para remoção.`);
        return res.status(404).json({ erro: "Aluno não encontrado ou sem permissão para remover" });
    }

    console.log(`✅ Aluno removido: ${id}`);
    // TODO: Considerar remover dados associados ao aluno (fichas, sessões, etc.) ou arquivá-los.
    res.status(200).json({ mensagem: "Aluno removido com sucesso" });

  } catch (error: any) {
    console.error(`❌ Erro ao remover aluno ${id}:`, error);
    res.status(500).json({ erro: "Erro interno ao remover aluno", detalhes: error?.message || error });
  }
});

export default router;
