import { motion, AnimatePresence } from "framer-motion";

interface ModalConfirmacaoProps {
  isOpen: boolean;
  onClose: () => void;
  onConfirm: () => void;
  titulo?: string;
  mensagem?: string;
  textoConfirmar?: string;
  textoCancelar?: string;
}

export function ModalConfirmacao({
  isOpen,
  onClose,
  onConfirm,
  titulo = "Confirmação",
  mensagem = "Tem certeza que deseja continuar?",
  textoConfirmar = "Confirmar",
  textoCancelar = "Cancelar",
}: ModalConfirmacaoProps) {
  return (
    <AnimatePresence>
      {isOpen && (
        <motion.div
          className="fixed inset-0 z-50 flex items-center justify-center bg-black bg-opacity-50"
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          exit={{ opacity: 0 }}
        >
          <motion.div
            className="bg-white p-6 rounded-lg shadow-lg w-full max-w-sm"
            initial={{ scale: 0.9, opacity: 0 }}
            animate={{ scale: 1, opacity: 1 }}
            exit={{ scale: 0.9, opacity: 0 }}
            transition={{ duration: 0.2 }}
          >
            <h2 className="text-lg font-semibold mb-4">{titulo}</h2>
            <p className="mb-6">{mensagem}</p>
            <div className="flex justify-end gap-4">
              <button
                className="px-4 py-2 bg-gray-300 text-gray-800 rounded hover:bg-gray-400 transition"
                onClick={onClose}
              >
                {textoCancelar}
              </button>
              <button
                className="px-4 py-2 bg-red-500 text-white rounded hover:bg-red-600 transition"
                onClick={onConfirm}
              >
                {textoConfirmar}
              </button>
            </div>
          </motion.div>
        </motion.div>
      )}
    </AnimatePresence>
  );
}
