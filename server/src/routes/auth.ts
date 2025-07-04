// server/src/routes/auth.ts
import { Router, Request, Response, NextFunction } from 'express';
import mongoose from 'mongoose';
import PersonalTrainer, { IPersonalTrainer } from '../../models/PersonalTrainer';
import Aluno, { IAluno } from '../../models/Aluno';
import jwt, { Secret, SignOptions } from 'jsonwebtoken';
import ms from 'ms';

const router = Router();

// Configuração JWT
const JWT_SECRET_FROM_ENV = process.env.JWT_SECRET;
const JWT_EXPIRES_IN_STRING = process.env.JWT_EXPIRES_IN;
const JWT_ALUNO_EXPIRES_IN_STRING = process.env.JWT_ALUNO_EXPIRES_IN;

// REMOVIDO: process.exit(1) para evitar que o servidor encerre a execução
// imediatamente se JWT_SECRET não estiver definido no momento da importação do módulo.
// O ideal é que JWT_SECRET esteja SEMPRE definido no .env em produção.
if (!JWT_SECRET_FROM_ENV) {
    console.error("🔴 ERRO: JWT_SECRET não está definido. Verifique o arquivo .env na raiz do projeto. Isso pode causar falhas em rotas que usam JWT.");
}
// Adiciona um fallback para JWT_SECRET. Em produção, esta variável DEVE ser definida.
const JWT_SECRET: Secret = JWT_SECRET_FROM_ENV || 'fallback_secret_para_desenvolvimento_nao_usar_em_prod';

const calculateExpiresInSeconds = (expiresInStringInput: string | undefined, defaultDuration: string): number => {
    const targetString = expiresInStringInput || defaultDuration;
    let seconds: number;
    try {
        const durationMs = ms(targetString as any);
        if (typeof durationMs === 'number' && !isNaN(durationMs)) {
            seconds = Math.floor(durationMs / 1000);
        } else {
            console.warn(`🟡 Aviso: Formato inválido para JWT_EXPIRES_IN ('${targetString}'). Usando padrão de ${defaultDuration}.`);
            const defaultMs = ms(defaultDuration as any);
            seconds = typeof defaultMs === 'number' ? Math.floor(defaultMs / 1000) : 3600;
        }
    } catch (e) {
        console.warn(`🟡 Aviso: Exceção ao processar JWT_EXPIRES_IN ('${targetString}'). Usando padrão de ${defaultDuration}. Erro: ${e}`);
        const defaultMs = ms(defaultDuration as any);
        seconds = typeof defaultMs === 'number' ? Math.floor(defaultMs / 1000) : 3600;
    }
    return seconds;
};

const personalExpiresInSeconds = calculateExpiresInSeconds(JWT_EXPIRES_IN_STRING, '1h');
const alunoExpiresInSeconds = calculateExpiresInSeconds(JWT_ALUNO_EXPIRES_IN_STRING, '7d');


// --- Rota de Login de Personal/Admin [POST /api/auth/login] ---
router.post('/login', async (req: Request, res: Response, next: NextFunction) => {
    const { email, password } = req.body;
    console.log(`[POST /api/auth/login] Tentativa de login de Personal/Admin. Email: ${email}`);

    if (!email || !password) { return res.status(400).json({ message: 'Email e senha são obrigatórios.' }); }

    try {
        const user: IPersonalTrainer | null = await PersonalTrainer.findOne({ email: email.toLowerCase() }).select('+passwordHash +role');

        if (!user || !user._id) {
            console.warn(`[LOGIN PERSONAL/ADMIN] Usuário não encontrado com o email: ${email}`);
            return res.status(401).json({ message: 'Credenciais inválidas.' });
        }

        const isPasswordValid = await user.comparePassword(password);
        if (!isPasswordValid) {
            console.warn(`[LOGIN PERSONAL/ADMIN] Senha inválida para o usuário com email: ${email}`);
            return res.status(401).json({ message: 'Credenciais inválidas.' });
        }

        const firstName = user.nome.split(' ')[0] || '';
        const lastName = user.nome.split(' ').slice(1).join(' ') || '';
        const userRole = user.role || 'Personal Trainer';

        const tokenPayload = {
            id: (user._id as mongoose.Types.ObjectId).toString(),
            email: user.email, firstName: firstName, lastName: lastName, role: userRole
        };
        const signOptions: SignOptions = { expiresIn: personalExpiresInSeconds };
        const token = jwt.sign(tokenPayload, JWT_SECRET, signOptions);

        console.log(`✅ Login de Personal/Admin bem-sucedido para: ${user.email} (Role: ${userRole})`);
        res.json({
            message: 'Login bem-sucedido!', token: token,
            user: {
                id: (user._id as mongoose.Types.ObjectId).toString(),
                username: user.email, firstName: firstName,
                lastName: lastName, email: user.email, role: userRole
            }
        });
    } catch (error) {
        console.error("🔴 Erro na rota /api/auth/login:", error);
        next(error);
    }
});

// --- Rota de Registro de Personal/Admin [POST /api/auth/register] ---
router.post('/register', async (req: Request, res: Response, next: NextFunction) => {
    const { nome, email, password, role } = req.body;
    console.log(`[POST /api/auth/register] Tentativa de registro de Personal/Admin. Email: ${email}`);

    if (!nome || !email || !password) { return res.status(400).json({ message: 'Nome, email e senha são obrigatórios.' }); }
    if (password.length < 6) { return res.status(400).json({ message: 'A senha deve ter pelo menos 6 caracteres.' }); }

    try {
        const existingUser = await PersonalTrainer.findOne({ email: email.toLowerCase() });
        if (existingUser) { return res.status(409).json({ message: 'Este email já está cadastrado.' }); }

        const newUser = new PersonalTrainer({ nome, email: email.toLowerCase(), passwordHash: password, ...(role && { role }) });
        const savedUser: IPersonalTrainer = await newUser.save();

        if (!savedUser || !savedUser._id) {
             console.error("🔴 Erro crítico: Usuário salvo não retornou _id.");
             throw new Error('Falha ao obter ID do usuário após registro.');
        }

        const firstName = savedUser.nome.split(' ')[0] || '';
        const lastName = savedUser.nome.split(' ').slice(1).join(' ') || '';
        const userRole = savedUser.role;

        const responseForFrontend = {
            id: (savedUser._id as mongoose.Types.ObjectId).toString(),
            username: savedUser.email,
            firstName: firstName, lastName: lastName, email: savedUser.email, role: userRole
        };

        console.log(`✅ Usuário Personal/Admin registrado com sucesso: ${savedUser.email} (Role: ${userRole})`);
        res.status(201).json({ message: 'Usuário registrado com sucesso!', user: responseForFrontend });

    } catch (error: any) {
        console.error("🔴 Erro na rota /api/auth/register:", error);
        if (error.name === 'ValidationError') {
            const errors = Object.values(error.errors).map((el: any) => el.message);
            return res.status(400).json({ message: 'Erro de validação', errors: errors });
        }
        next(error);
    }
});

// --- Rota de Registro de Aluno via Link de Convite do Personal ---
// POST /api/auth/aluno/registrar-por-convite-personal/:tokenPersonal
router.post('/aluno/registrar-por-convite-personal/:tokenPersonal', async (req: Request, res: Response, next: NextFunction) => {
    const { tokenPersonal } = req.params;
    const {
        nome, email, password, birthDate, gender, goal, weight, height, startDate, phone, notes
    } = req.body;

    console.log(`[POST /api/auth/aluno/registrar-por-convite-personal/${tokenPersonal}] Tentativa de registrar aluno. Email: ${email}`);

    if (!nome || !email || !password || !birthDate || !gender || !goal || !weight || !height || !startDate) {
        return res.status(400).json({ message: 'Todos os campos obrigatórios devem ser preenchidos.' });
    }
    if (password.length < 6) {
        return res.status(400).json({ message: 'A senha deve ter pelo menos 6 caracteres.' });
    }

    try {
        const personalTrainer: IPersonalTrainer | null = await PersonalTrainer.findOne({ tokenCadastroAluno: tokenPersonal });
        if (!personalTrainer || !personalTrainer._id) {
            return res.status(404).json({ message: 'Link de convite inválido ou expirado.' });
        }

        const existingAluno = await Aluno.findOne({ email: email.toLowerCase() });
        if (existingAluno) {
            return res.status(409).json({ message: 'Este email já está cadastrado para um aluno.' });
        }

        const novoAluno = new Aluno({
            nome, email: email.toLowerCase(), passwordHash: password,
            birthDate, gender, goal, weight, height, startDate, phone, notes,
            status: 'active',
            trainerId: personalTrainer._id
        });

        const alunoSalvo: IAluno = await novoAluno.save();

        const alunoTokenPayload = {
            id: (alunoSalvo._id as mongoose.Types.ObjectId).toString(),
            email: alunoSalvo.email,
            nome: alunoSalvo.nome,
            role: 'Aluno',
            personalId: (personalTrainer._id as mongoose.Types.ObjectId).toString()
        };
        const signOptions: SignOptions = { expiresIn: alunoExpiresInSeconds };
        const token = jwt.sign(alunoTokenPayload, JWT_SECRET, signOptions);

        console.log(`✅ Aluno registrado com sucesso via convite: ${alunoSalvo.email}`);
        res.status(201).json({
            message: 'Aluno registrado com sucesso!',
            token: token,
            aluno: {
                id: (alunoSalvo._id as mongoose.Types.ObjectId).toString(),
                nome: alunoSalvo.nome,
                email: alunoSalvo.email,
                role: 'Aluno',
                personalId: (personalTrainer._id as mongoose.Types.ObjectId).toString()
            }
        });

    } catch (error: any) {
        console.error("🔴 Erro na rota /api/auth/aluno/registrar-por-convite-personal:", error);
        if (error.name === 'ValidationError') {
            const errors = Object.values(error.errors).map((el: any) => el.message);
            return res.status(400).json({ message: 'Erro de validação ao criar aluno.', errors });
        }
        next(error);
    }
});


// ***** NOVA ROTA: Login de Aluno [POST /api/auth/aluno/login] *****
router.post('/aluno/login', async (req: Request, res: Response, next: NextFunction) => {
    const { email, password } = req.body;
    console.log(`[POST /api/auth/aluno/login] Tentativa de login do aluno. Email: ${email}`);

    if (!email || !password) {
        return res.status(400).json({ message: 'Email e senha são obrigatórios.' });
    }

    try {
        // 1. Encontrar o aluno pelo email e selecionar o passwordHash
        const aluno: IAluno | null = await Aluno.findOne({ email: email.toLowerCase() }).select('+passwordHash');

        if (!aluno || !aluno._id) { // Verifica se aluno e _id existem
            console.warn(`[LOGIN ALUNO] Aluno não encontrado com o email: ${email}`);
            return res.status(401).json({ message: 'Credenciais inválidas.' });
        }

        // 2. Comparar a senha fornecida com o hash armazenado
        const isPasswordValid = await aluno.comparePassword(password);
        if (!isPasswordValid) {
            console.warn(`[LOGIN ALUNO] Senha inválida para o aluno com email: ${email}`);
            return res.status(401).json({ message: 'Credenciais inválidas.' });
        }

        // 3. Gerar o token JWT para o aluno
        const alunoTokenPayload = {
            id: (aluno._id as mongoose.Types.ObjectId).toString(),
            email: aluno.email,
            nome: aluno.nome,
            role: 'Aluno',
            personalId: aluno.trainerId.toString()
        };
        const signOptions: SignOptions = { expiresIn: alunoExpiresInSeconds };
        const token = jwt.sign(alunoTokenPayload, JWT_SECRET, signOptions);

        console.log(`✅ Login de Aluno bem-sucedido para: ${aluno.email}`);

        // 4. Enviar resposta
        res.json({
            message: 'Login de aluno bem-sucedido!',
            token: token,
            aluno: {
                id: (aluno._id as mongoose.Types.ObjectId).toString(),
                nome: aluno.nome,
                email: aluno.email,
                role: 'Aluno',
                personalId: aluno.trainerId.toString()
            }
        });

    } catch (error: any) {
        console.error("🔴 Erro na rota /api/auth/aluno/login:", error);
        next(error); // Passa para o errorHandler geral
    }
});

export default router;