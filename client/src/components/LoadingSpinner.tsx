import { Loader2 } from "lucide-react";

// 1. Definir uma interface para as props
interface LoadingSpinnerProps {
  text?: string; // A prop 'text' é opcional (pode usar só o ícone)
}

// 2. Usar a interface de props e desestruturar 'text'
export default function LoadingSpinner({ text }: LoadingSpinnerProps) {
  return (
    // 3. Ajustar o layout para acomodar o texto (flex-col) e adicionar o texto
    <div className="flex flex-col justify-center items-center h-32 gap-3"> {/* Adicionado flex-col e gap */}
      <Loader2 className="h-6 w-6 animate-spin text-primary" />
      {/* 4. Renderizar o texto apenas se ele for fornecido */}
      {text && <p className="text-sm text-muted-foreground">{text}</p>}
    </div>
  );
}