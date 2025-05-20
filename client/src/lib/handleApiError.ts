// client/src/lib/handleApiError.ts
// 👇 REMOVIDO 'Toast' ou 'ShowToastProps' do import, pois não é usado aqui 👇
import { showToast } from '@/lib/toastUtils';

// Interface interna para tentar parsear a resposta de erro
interface ApiErrorResponse {
    message?: string;
    erro?: string;
    errors?: string[] | Record<string, { message: string }>;
}

/**
 * Processa um erro capturado de uma chamada API (fetch, axios, react-query).
 * Exibe um toast com uma mensagem de erro útil.
 *
 * @param error O objeto de erro capturado.
 * @param fallbackTitle Título padrão para o toast se o erro não fornecer um.
 */
export function handleApiError(error: unknown, fallbackTitle: string = "Erro Inesperado"): void {
    let title = fallbackTitle;
    let description = "Ocorreu um problema. Tente novamente mais tarde.";

    console.error("API Error:", error); // Loga o erro completo

    if (error instanceof Error) {
        try {
            // Tenta parsear como JSON apenas se parecer um JSON
             if (typeof error.message === 'string' && error.message.trim().startsWith('{')) {
                const errorJson = JSON.parse(error.message) as ApiErrorResponse;
                description = errorJson.message || errorJson.erro || description;
            } else if (typeof error.message === 'string') {
                 description = error.message; // Usa a mensagem direta se não for JSON
            }
        } catch (parseError) {
            // Se não for JSON, usa a mensagem de erro direta
           if (typeof error.message === 'string') {
               description = error.message;
           }
        }

        // Tenta extrair status da mensagem (se existir)
        const statusMatch = typeof error.message === 'string' ? error.message.match(/Erro (\d+):?/) : null;
        if (statusMatch?.[1]) { // Usa optional chaining
            title = `Erro ${statusMatch[1]}`;
            if (statusMatch[1] === '401') title = "Não Autorizado";
            else if (statusMatch[1] === '403') title = "Acesso Proibido";
            else if (statusMatch[1] === '404') title = "Não Encontrado";
            // Adicionar outros códigos de status se necessário
        }

    } else if (typeof error === 'string') {
        description = error;
    }

    // Chama a função showToast importada
    showToast({
        title: title,
        description: description,
        variant: "destructive",
    });
}