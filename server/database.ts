// server/database.ts
import mongoose from "mongoose";
import * as dotenv from "dotenv";
import path from "path";
import { fileURLToPath } from "url";

// Reconstruindo __dirname para ambientes ESM
const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

// Carrega o .env da raiz do projeto (assumindo que database.ts está em server/)
dotenv.config({ path: path.resolve(__dirname, "../.env") }); // Ajustado para ../.env

let isConnected = false; // Flag para controlar o estado da conexão

export async function connectToDatabase() {
  if (isConnected && mongoose.connection.readyState >= 1) {
    console.log("ℹ️  Já conectado ao MongoDB.");
    return;
  }

  try {
    const mongoUri = process.env.MONGODB_URI;

    if (!mongoUri) {
      throw new Error("❌ MONGODB_URI não definida no arquivo .env");
    }

    console.log("🟡 Conectando ao MongoDB Atlas...");
    await mongoose.connect(mongoUri, {
      dbName: "dyfit", // Nome do banco de dados especificado
    });

    isConnected = true;
    console.log("✅ Conectado ao MongoDB Atlas com sucesso!");

    mongoose.connection.on('error', (err) => {
      console.error("❌ Erro na conexão com MongoDB após conexão inicial:", err);
      isConnected = false;
    });

    mongoose.connection.on('disconnected', () => {
      console.log("ℹ️  Desconectado do MongoDB.");
      isConnected = false;
    });

  } catch (error) {
    console.error("❌ Erro ao conectar ao MongoDB Atlas:", error);
    process.exit(1);
  }
}

export async function disconnectFromDatabase() {
  if (mongoose.connection.readyState !== 0) {
    await mongoose.disconnect();
    isConnected = false; // Atualiza o flag
    console.log("ℹ️  Conexão com MongoDB fechada.");
  } else {
    console.log("ℹ️  Nenhuma conexão ativa para fechar.");
  }
}
