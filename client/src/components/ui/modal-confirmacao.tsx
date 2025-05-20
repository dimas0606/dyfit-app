// client/src/components/ui/modal-confirmacao.tsx
import { Button } from "@/components/ui/button";
import {
  Dialog,
  DialogContent,
  DialogFooter,
  DialogHeader,
  DialogTitle,
  DialogDescription, // Importar DialogDescription se quiser usá-la
} from "@/components/ui/dialog";
// ---> ADICIONADO: Importar Loader2 <---
import { Loader2 } from "lucide-react";

interface ModalConfirmacaoProps {
  isOpen: boolean;
  onClose: () => void;
  onConfirm: () => void;
  titulo?: string;
  mensagem?: string | React.ReactNode; // Permitir ReactNode para mais flexibilidade
  textoConfirmar?: string;
  textoCancelar?: string;
  isLoadingConfirm?: boolean; // ---> ADICIONADO: Nova prop para estado de loading <---
}

export function ModalConfirmacao({
  isOpen,
  onClose,
  onConfirm,
  titulo = "Confirmação",
  mensagem = "Tem certeza que deseja continuar?",
  textoConfirmar = "Confirmar",
  textoCancelar = "Cancelar",
  isLoadingConfirm = false, // ---> ADICIONADO: Valor padrão false <---
}: ModalConfirmacaoProps) {
  return (
    // Controla a abertura/fechamento do Dialog pelo estado externo 'isOpen'
    // onOpenChange chama onClose quando o usuário tenta fechar (clique fora, Esc)
    <Dialog open={isOpen} onOpenChange={(open) => !open && onClose()}>
      <DialogContent className="max-w-md w-full p-6 rounded-lg bg-background shadow-lg space-y-4">
        <DialogHeader className="text-center sm:text-left"> {/* Ajuste de alinhamento */}
          <DialogTitle className="text-lg font-semibold"> {/* Ajuste de tamanho/peso */}
            {titulo}
          </DialogTitle>
          {/* Opcional: Usar DialogDescription para a mensagem principal */}
           {typeof mensagem === 'string' ? (
             <DialogDescription className="text-sm text-muted-foreground pt-2">
               {mensagem}
             </DialogDescription>
           ) : (
             // Renderiza diretamente se for um ReactNode
             <div className="text-sm text-muted-foreground pt-2">{mensagem}</div>
           )}
        </DialogHeader>

        {/* Removido div extra, mensagem agora está no Header com DialogDescription */}
        {/* <div className="text-center text-gray-600 dark:text-gray-300">
          {mensagem}
        </div> */}

        <DialogFooter className="flex flex-col-reverse sm:flex-row sm:justify-end sm:space-x-2 pt-2"> {/* Ajustes de layout do footer */}
          {/* Botão Cancelar */}
          <Button
            variant="outline"
            onClick={onClose}
            disabled={isLoadingConfirm} // Desabilita durante o loading
          >
            {textoCancelar}
          </Button>
          {/* Botão Confirmar (Destrutivo) */}
          <Button
            variant="destructive" // Mantém variante destrutiva
            onClick={onConfirm}
            disabled={isLoadingConfirm} // Desabilita durante o loading
          >
            {/* Mostra spinner se estiver carregando */}
            {isLoadingConfirm && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
            {textoConfirmar}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}