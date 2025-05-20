// server/scripts/createPersonal.ts
import mongoose from 'mongoose';
import dotenv from 'dotenv';
import PersonalTrainer, { IPersonalTrainer } from '../models/PersonalTrainer'; // Ajuste o caminho se necessário
import { connectToDatabase, disconnectFromDatabase } from '../database'; // Ajuste o caminho se necessário

dotenv.config({ path: '../../.env' }); // Carrega variáveis de ambiente do .env na raiz do projeto

async function createPersonal() {
  // Pega os argumentos da linha de comando: nome, email, senha
  // Exemplo de como rodar: ts-node server/scripts/createPersonal.ts "Nome do Personal" "email@example.com" "senha123"
  const args = process.argv.slice(2); // Os dois primeiros args são 'node' e o nome do script

  if (args.length < 3) {
    console.error('Uso: ts-node server/scripts/createPersonal.ts "<Nome Completo>" "<email>" "<senha>" [role]');
    console.error('Exemplo: ts-node server/scripts/createPersonal.ts "João Silva" "joao@example.com" "senhaSegura"');
    process.exit(1);
  }

  const [nome, email, passwordInput] = args;
  const roleInput = args[3] || 'Personal Trainer'; // Pega o quarto argumento como role, ou usa o default

  if (!['Personal Trainer', 'Admin'].includes(roleInput)) {
    console.error(`Role inválido: "${roleInput}". Use "Personal Trainer" ou "Admin".`);
    process.exit(1);
  }

  try {
    await connectToDatabase();
    console.log('Conectado ao banco de dados...');

    const existingPersonal = await PersonalTrainer.findOne({ email: email.toLowerCase() });
    if (existingPersonal) {
      console.warn(`Já existe um personal trainer com o email: ${email}`);
      await disconnectFromDatabase();
      process.exit(1);
    }

    console.log(`Criando personal: ${nome}, Email: ${email}, Role: ${roleInput}`);

    // Criamos a instância com a senha em texto plano.
    // O middleware pre('save') no modelo PersonalTrainer cuidará do hashing.
    const newPersonal = new PersonalTrainer({
      nome,
      email: email.toLowerCase(),
      passwordHash: passwordInput, // O middleware pre-save irá hashear este campo
      role: roleInput as IPersonalTrainer['role'],
      // tokenCadastroAluno será gerado automaticamente pelo middleware pre-save
      // statusAssinatura e limiteAlunos usarão os defaults do schema
    });

    await newPersonal.save();

    // O token é gerado no pre-save, então podemos logá-lo aqui se quisermos
    console.log('Personal Trainer criado com sucesso!');
    console.log('Detalhes:');
    console.log(`  ID: ${newPersonal._id}`);
    console.log(`  Nome: ${newPersonal.nome}`);
    console.log(`  Email: ${newPersonal.email}`);
    console.log(`  Role: ${newPersonal.role}`);
    console.log(`  Token de Cadastro de Aluno: ${newPersonal.tokenCadastroAluno}`);
    console.log(`  Status da Assinatura: ${newPersonal.statusAssinatura}`);

  } catch (error) {
    console.error('Erro ao criar Personal Trainer:', error);
  } finally {
    await disconnectFromDatabase();
    console.log('Desconectado do banco de dados.');
    process.exit(0);
  }
}

createPersonal();
