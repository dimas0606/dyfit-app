// client/src/components/ErrorMessage.tsx
import { AlertTriangle } from "lucide-react";

interface ErrorMessageProps {
  title?: string;
  message: string;
}

export default function ErrorMessage({ title = "Erro", message }: ErrorMessageProps) {
  return (
    <div className="bg-red-100 border border-red-300 text-red-800 p-4 rounded-md flex items-start space-x-2">
      <AlertTriangle className="w-5 h-5 mt-0.5 text-red-600" />
      <div>
        <p className="font-semibold">{title}</p>
        <p className="text-sm">{message}</p>
      </div>
    </div>
  );
}
