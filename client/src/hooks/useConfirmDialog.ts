// client/src/hooks/useConfirmDialog.ts
import React, { useState } from "react"; // Import React para React.ReactNode

interface ConfirmDialogOptions {
  titulo?: string;
  mensagem?: string | React.ReactNode; // <<< ALTERADO AQUI para aceitar ReactNode
  textoConfirmar?: string;
  textoCancelar?: string;
  onConfirm?: () => void;
}

export function useConfirmDialog() {
  const [isOpen, setIsOpen] = useState(false);
  const [options, setOptions] = useState<ConfirmDialogOptions>({});

  const openConfirmDialog = (options: ConfirmDialogOptions) => {
    setOptions(options);
    setIsOpen(true);
  };

  const closeConfirmDialog = () => {
    setIsOpen(false);
    // É uma boa prática resetar as options ao fechar para evitar que dados antigos persistam
    // se o modal for reaberto rapidamente com outras opções antes do setOptions ser chamado.
    // setOptions({}); // Descomente se achar necessário.
  };

  const confirm = () => {
    if (options.onConfirm) {
      options.onConfirm();
    }
    closeConfirmDialog();
  };

  return {
    isOpen,
    options,
    openConfirmDialog,
    closeConfirmDialog,
    confirm,
  };
}
