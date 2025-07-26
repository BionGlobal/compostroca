import React, { useRef, useCallback, useState } from 'react';
import { Camera, X, Check, RotateCcw } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Dialog, DialogContent } from '@/components/ui/dialog';
import { supabase } from '@/integrations/supabase/client';
import { useToast } from '@/hooks/use-toast';
import { useAuth } from '@/hooks/useAuth';

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
  const [isLoading, setIsLoading] = useState(false);
  const { toast } = useToast();
  const { user } = useAuth();

  const startCamera = useCallback(async () => {
    try {
      console.log('Iniciando câmera...');
      setIsLoading(true);
      
      // Configuração mais compatível e simples
      const constraints = {
        video: {
          facingMode: 'environment',
          width: { ideal: 1280, max: 1920 },
          height: { ideal: 720, max: 1080 }
        }
      };

      console.log('Solicitando permissão da câmera...');
      const stream = await navigator.mediaDevices.getUserMedia(constraints);
      console.log('Stream obtido:', stream);
      
      streamRef.current = stream;
      if (videoRef.current) {
        videoRef.current.srcObject = stream;
        
        // Aguardar metadados e reproduzir
        videoRef.current.onloadedmetadata = () => {
          console.log('Metadados carregados, reproduzindo vídeo...');
          videoRef.current?.play().then(() => {
            console.log('Vídeo reproduzindo com sucesso');
            setIsStreaming(true);
            setIsLoading(false);
          }).catch((playError) => {
            console.error('Erro ao reproduzir vídeo:', playError);
            setIsLoading(false);
          });
        };
      }
    } catch (error) {
      console.error('Erro ao acessar câmera:', error);
      toast({
        title: "Erro na Câmera",
        description: "Verifique as permissões da câmera e tente novamente",
        variant: "destructive",
      });
      setIsLoading(false);
    }
  }, [toast]);

  const stopCamera = useCallback(() => {
    if (streamRef.current) {
      streamRef.current.getTracks().forEach(track => track.stop());
      streamRef.current = null;
      setIsStreaming(false);
    }
  }, []);

  const handleClose = useCallback(() => {
    stopCamera();
    setCapturedPhoto(null);
    onClose();
  }, [stopCamera, onClose]);

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
    if (!capturedPhoto || !user) return;
    
    console.log('Iniciando upload da foto...');
    setIsUploading(true);
    try {
      // Convert base64 to blob
      const response = await fetch(capturedPhoto);
      const blob = await response.blob();
      console.log('Blob criado, tamanho:', blob.size);
      
      // Generate unique filename with user.id as first folder
      const timestamp = Date.now();
      const filename = `${user.id}/entregas/${entregaId || timestamp}/${photoType}_${timestamp}.jpg`;
      console.log('Nome do arquivo:', filename);
      
      // Upload to Supabase storage
      const { data, error } = await supabase.storage
        .from('volunteer-photos')
        .upload(filename, blob, {
          contentType: 'image/jpeg',
          upsert: true
        });

      if (error) {
        console.error('Erro no upload:', error);
        throw error;
      }

      console.log('Upload realizado com sucesso:', data);

      // Get public URL
      const { data: urlData } = supabase.storage
        .from('volunteer-photos')
        .getPublicUrl(filename);

      console.log('URL pública gerada:', urlData.publicUrl);
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
  }, [capturedPhoto, entregaId, photoType, onPhotoCapture, toast, user, handleClose]);

  const retakePhoto = useCallback(() => {
    setCapturedPhoto(null);
    startCamera();
  }, [startCamera]);

  React.useEffect(() => {
    if (isOpen && !capturedPhoto) {
      console.log('Dialog aberto, iniciando câmera...');
      startCamera();
    }
    
    return () => {
      console.log('Limpando recursos da câmera...');
      stopCamera();
    };
  }, [isOpen, capturedPhoto, startCamera, stopCamera]);

  return (
    <Dialog open={isOpen} onOpenChange={handleClose}>
      <DialogContent className="w-full h-full max-w-none max-h-none m-0 p-0 bg-black border-none">
        {/* Header */}
        <div className="absolute top-0 left-0 right-0 z-10 bg-gradient-to-b from-black/80 to-transparent p-4">
          <div className="flex items-center justify-between text-white">
            <h2 className="text-lg font-medium flex items-center gap-2">
              <Camera size={20} />
              {title}
            </h2>
            <Button
              variant="ghost"
              size="icon"
              onClick={handleClose}
              className="text-white hover:bg-white/20"
            >
              <X size={24} />
            </Button>
          </div>
        </div>

        {/* Main Content */}
        <div className="relative w-full h-full">
          {capturedPhoto ? (
            // Photo Preview
            <div className="w-full h-full flex flex-col">
              <img
                src={capturedPhoto}
                alt="Foto capturada"
                className="flex-1 w-full object-cover"
              />
              
              {/* Bottom Controls for Preview */}
              <div className="absolute bottom-0 left-0 right-0 bg-gradient-to-t from-black/80 to-transparent p-6">
                <div className="flex gap-4">
                  <Button
                    variant="secondary"
                    onClick={retakePhoto}
                    disabled={isUploading}
                    className="flex-1 h-12"
                  >
                    <RotateCcw size={20} className="mr-2" />
                    Tirar Novamente
                  </Button>
                  <Button
                    onClick={uploadPhoto}
                    disabled={isUploading}
                    className="flex-1 h-12"
                  >
                    <Check size={20} className="mr-2" />
                    {isUploading ? 'Salvando...' : 'Confirmar'}
                  </Button>
                </div>
              </div>
            </div>
          ) : (
            // Camera View
            <div className="w-full h-full flex flex-col">
              {isLoading ? (
                <div className="flex-1 flex items-center justify-center text-white bg-black">
                  <div className="text-center">
                    <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-white mx-auto mb-4"></div>
                    <p className="text-lg">Inicializando câmera...</p>
                    <p className="text-sm text-gray-300 mt-2">Aguardando permissões</p>
                  </div>
                </div>
              ) : (
                <>
                  <video
                    ref={videoRef}
                    className="flex-1 w-full object-cover bg-black"
                    autoPlay
                    playsInline
                    muted
                  />
                  <canvas ref={canvasRef} className="hidden" />
                </>
              )}
              
              {/* Bottom Controls for Camera */}
              {isStreaming && (
                <div className="absolute bottom-0 left-0 right-0 bg-gradient-to-t from-black/80 to-transparent p-6">
                  <div className="flex justify-center">
                    <Button
                      onClick={capturePhoto}
                      size="lg"
                      className="w-20 h-20 rounded-full bg-white hover:bg-gray-200 text-black"
                    >
                      <Camera size={32} />
                    </Button>
                  </div>
                </div>
              )}
            </div>
          )}
        </div>
      </DialogContent>
    </Dialog>
  );
};