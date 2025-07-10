// shared/types/express/index.d.ts
interface UserPayload {
  id: string;
  role: string;
}

declare namespace Express {
  export interface Request {
    user?: UserPayload;
  }
}
