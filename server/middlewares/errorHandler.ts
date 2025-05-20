// server/middlewares/errorHandler.ts
import { Request, Response, NextFunction } from "express";

export interface AppError extends Error {
  statusCode?: number;
  isOperational?: boolean;
}

export function errorHandler(
  err: AppError,
  req: Request,
  res: Response,
  next: NextFunction
) {
  console.error("❌ Erro capturado pelo middleware:", err.stack);

  const statusCode = err.statusCode || 500;
  const response = {
    sucesso: false,
    mensagem: err.message || "Erro interno no servidor.",
    ...(process.env.NODE_ENV === "development" && { detalhes: err.stack }),
  };

  res.status(statusCode).json(response);
}
