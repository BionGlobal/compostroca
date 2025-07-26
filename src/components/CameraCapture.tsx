import React, { useRef, useCallback, useState } from 'react';
import { Camera, X, Check } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Dialog, DialogContent, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { supabase } from '@/integrations/supabase/client';
import { useToast } from '@/hooks/use-toast';

interface CameraCaptureProps {
  onPhotoCapture: (url: string) => void;
  isOpen: boolean;
  onClose: () => void;
  title: string;
  entregaId?: string;
  photoType: 'conteudo' | 'pesagem' | 'destino';
}

export const CameraCapture: React.FC<CameraCaptureProps> = ({
  onPhotoCapture,
  isOpen,
  onClose,
  title,
  entregaId,
  photoType
}) => {
  const videoRef = useRef<HTMLVideoElement>(null);
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const streamRef = useRef<MediaStream | null>(null);
  const [isStreaming, setIsStreaming] = useState(false);
  const [capturedPhoto, setCapturedPhoto] = useState<string | null>(null);
  const [isUploading, setIsUploading] = useState(false);
  const { toast } = useToast();

  const startCamera = useCallback(async () => {
    try {
      const stream = await navigator.mediaDevices.getUserMedia({
        video: { 
          facingMode: 'environment',
          width: { ideal: 720 },
          height: { ideal: 1280 }
        }
      });
      
      streamRef.current = stream;
      if (videoRef.current) {
        videoRef.current.srcObject = stream;
        videoRef.current.play();
        setIsStreaming(true);
      }
    } catch (error) {
      console.error('Erro ao acessar câmera:', error);
      toast({
        title: "Erro",
        description: "Não foi possível acessar a câmera",
        variant: "destructive",
      });
    }
  }, [toast]);

  const stopCamera = useCallback(() => {
    if (streamRef.current) {
      streamRef.current.getTracks().forEach(track => track.stop());
      streamRef.current = null;
      setIsStreaming(false);
    }
  }, []);

  const capturePhoto = useCallback(() => {
    if (videoRef.current && canvasRef.current) {
      const canvas = canvasRef.current;
      const video = videoRef.current;
      const context = canvas.getContext('2d');
      
      canvas.width = video.videoWidth;
      canvas.height = video.videoHeight;
      
      if (context) {
        context.drawImage(video, 0, 0);
        const dataUrl = canvas.toDataURL('image/jpeg', 0.8);
        setCapturedPhoto(dataUrl);
        stopCamera();
      }
    }
  }, [stopCamera]);

  const uploadPhoto = useCallback(async () => {
    if (!capturedPhoto) return;
    
    setIsUploading(true);
    try {
      // Convert base64 to blob
      const response = await fetch(capturedPhoto);
      const blob = await response.blob();
      
      // Generate unique filename
      const timestamp = Date.now();
      const filename = `entregas/${entregaId || timestamp}/${photoType}_${timestamp}.jpg`;
      
      // Upload to Supabase storage
      const { data, error } = await supabase.storage
        .from('volunteer-photos')
        .upload(filename, blob, {
          contentType: 'image/jpeg',
          upsert: true
        });

      if (error) throw error;

      // Get public URL
      const { data: urlData } = supabase.storage
        .from('volunteer-photos')
        .getPublicUrl(filename);

      onPhotoCapture(urlData.publicUrl);
      toast({
        title: "Sucesso",
        description: "Foto capturada com sucesso!",
      });
      handleClose();
    } catch (error) {
      console.error('Erro ao fazer upload:', error);
      toast({
        title: "Erro",
        description: `Falha no upload da foto: ${error instanceof Error ? error.message : 'Erro desconhecido'}`,
        variant: "destructive",
      });
    } finally {
      setIsUploading(false);
    }
  }, [capturedPhoto, entregaId, photoType, onPhotoCapture, toast]);

  const handleClose = useCallback(() => {
    stopCamera();
    setCapturedPhoto(null);
    onClose();
  }, [stopCamera, onClose]);

  React.useEffect(() => {
    if (isOpen && !capturedPhoto) {
      startCamera();
    }
    
    return () => {
      stopCamera();
    };
  }, [isOpen, capturedPhoto, startCamera, stopCamera]);

  return (
    <Dialog open={isOpen} onOpenChange={handleClose}>
      <DialogContent className="max-w-lg w-full max-h-[90vh]">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <Camera size={20} />
            {title}
          </DialogTitle>
        </DialogHeader>
        
        <div className="space-y-4">
          {capturedPhoto ? (
            <div className="space-y-4">
              <img
                src={capturedPhoto}
                alt="Foto capturada"
                className="w-full rounded-lg"
              />
              <div className="flex gap-2">
                <Button
                  variant="outline"
                  onClick={() => {
                    setCapturedPhoto(null);
                    startCamera();
                  }}
                  className="flex-1"
                >
                  Tirar Novamente
                </Button>
                <Button
                  onClick={uploadPhoto}
                  disabled={isUploading}
                  className="flex-1"
                >
                  <Check size={16} className="mr-2" />
                  {isUploading ? 'Salvando...' : 'Confirmar'}
                </Button>
              </div>
            </div>
          ) : (
            <div className="space-y-4">
              <div className="relative aspect-[3/4] bg-black rounded-lg overflow-hidden">
                <video
                  ref={videoRef}
                  className="w-full h-full object-cover"
                  autoPlay
                  playsInline
                  muted
                />
                <canvas ref={canvasRef} className="hidden" />
              </div>
              
              {isStreaming && (
                <Button
                  onClick={capturePhoto}
                  size="lg"
                  className="w-full"
                >
                  <Camera size={20} className="mr-2" />
                  Capturar Foto
                </Button>
              )}
            </div>
          )}
          
          <Button
            variant="outline"
            onClick={handleClose}
            className="w-full"
          >
            <X size={16} className="mr-2" />
            Cancelar
          </Button>
        </div>
      </DialogContent>
    </Dialog>
  );
};