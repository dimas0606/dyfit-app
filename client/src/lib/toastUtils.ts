// client/src/lib/toastUtils.ts
import { toast as toastInternal } from "@/hooks/use-toast"; // Importa a função interna do hook

// 👇 Definindo o tipo aqui baseado nas props esperadas pela função toast interna 👇
type ToastProps = Parameters<typeof toastInternal>[0];

// Função para disparar toasts de fora de componentes React
export function showToast(props: ToastProps) { // Usa o tipo definido acima
  // Chama a função toast interna exportada pelo hook
  toastInternal(props);
}

// Exporta o tipo para quem precisar usar showToast
export type { ToastProps as ShowToastProps }; // Exporta com um alias para evitar conflito se necessário

// Exemplo de uso em handleApiError.ts:
// import { showToast, ShowToastProps } from '@/lib/toastUtils';
// const toastOptions: ShowToastProps = { title: "Erro", description: "Falha", variant: "destructive"};
// showToast(toastOptions);