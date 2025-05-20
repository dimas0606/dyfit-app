import { Dialog, DialogContent } from "@/components/ui/dialog";

interface VideoPlayerModalProps {
  videoUrl: string | null;
  onClose: () => void;
}

export default function VideoPlayerModal({ videoUrl, onClose }: VideoPlayerModalProps) {
  return (
    <Dialog open={!!videoUrl} onOpenChange={onClose}>
      <DialogContent className="max-w-2xl w-full aspect-video">
        {videoUrl && (
          <iframe
            src={videoUrl.includes("watch?v=") ? videoUrl.replace("watch?v=", "embed/") : videoUrl}
            className="w-full h-full rounded-md"
            allow="accelerometer; autoplay; clipboard-write; encrypted-media; gyroscope; picture-in-picture"
            allowFullScreen
            title="Visualizador de Vídeo"
          ></iframe>
        )}
      </DialogContent>
    </Dialog>
  );
}
