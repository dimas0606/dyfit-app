// Caminho: server/src/types/express/index.d.ts
// Certifique-se de que este caminho é incluído pelo seu tsconfig.json

// Importa DecodedTokenPayload diretamente do seu local original.
// Ajuste o caminho relativo se necessário.
// Partindo de server/src/types/express/index.d.ts para server/middlewares/authenticateToken.ts
import { DecodedTokenPayload } from '../../../middlewares/authenticateToken';

declare global {
  namespace Express {
    interface Request {
      user?: DecodedTokenPayload; // Usa a interface importada diretamente
    }
  }
}

// Linha vazia intencional para garantir que o arquivo seja tratado como um módulo.
// Isso é importante para que 'declare global' funcione como esperado.
export {};
