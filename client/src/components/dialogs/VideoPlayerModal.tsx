import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription } from "@/components/ui/dialog";

interface VideoPlayerModalProps {
  videoUrl: string | null;
  onClose: () => void;
}

export default function VideoPlayerModal({ videoUrl, onClose }: VideoPlayerModalProps) {
  return (
    <Dialog open={!!videoUrl} onOpenChange={onClose}>
      <DialogContent className="max-w-2xl w-full p-0 border-0">
        {/* Adiciona um título e descrição para acessibilidade (sr-only os esconde visualmente) */}
        <DialogHeader className="sr-only">
          <DialogTitle>Vídeo do Exercício</DialogTitle>
          <DialogDescription>
            Um vídeo demonstrando a execução correta do exercício. Pressione a tecla Esc para fechar.
          </DialogDescription>
        </DialogHeader>

        {videoUrl && (
          <iframe
            src={videoUrl.includes("watch?v=") ? videoUrl.replace("watch?v=", "embed/") : videoUrl}
            className="w-full h-full rounded-md aspect-video"
            allow="accelerometer; autoplay; clipboard-write; encrypted-media; gyroscope; picture-in-picture"
            allowFullScreen
            title="Visualizador de Vídeo do Exercício"
          ></iframe>
        )}
      </DialogContent>
    </Dialog>
  );
}