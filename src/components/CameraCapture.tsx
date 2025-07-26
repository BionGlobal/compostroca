import React, { useRef, useState, useEffect } from 'react';
import { Camera, X, Check, RotateCcw } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Dialog, DialogContent, DialogTitle } from '@/components/ui/dialog';
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

interface PhotoExifData {
  captured_at: string;
  device_info: string;
  location?: { latitude: number; longitude: number };
  resolution: { width: number; height: number };
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
  
  const [isReady, setIsReady] = useState(false);
  const [capturedPhoto, setCapturedPhoto] = useState<string | null>(null);
  const [isUploading, setIsUploading] = useState(false);
  const [uploadError, setUploadError] = useState<string | null>(null);
  const { toast } = useToast();
  const { user } = useAuth();

  // Cleanup simples
  const cleanup = () => {
    if (streamRef.current) {
      streamRef.current.getTracks().forEach(track => track.stop());
      streamRef.current = null;
    }
    setIsReady(false);
    setCapturedPhoto(null);
    setUploadError(null);
  };

  // Inicializar câmera simplificado
  const startCamera = async () => {
    try {
      // Constraints mais compatíveis
      const stream = await navigator.mediaDevices.getUserMedia({
        video: { facingMode: 'environment' }
      });
      
      streamRef.current = stream;
      
      if (videoRef.current) {
        videoRef.current.srcObject = stream;
        videoRef.current.oncanplay = () => {
          setIsReady(true);
        };
      }
    } catch (error) {
      console.error('Erro câmera:', error);
      toast({
        title: "Erro na Câmera",
        description: "Não foi possível acessar a câmera",
        variant: "destructive",
      });
    }
  };

  // Capturar foto simples
  const capturePhoto = async () => {
    if (!videoRef.current || !canvasRef.current || !isReady) return;
    
    const canvas = canvasRef.current;
    const video = videoRef.current;
    const context = canvas.getContext('2d');
    
    if (!context) return;
    
    canvas.width = video.videoWidth;
    canvas.height = video.videoHeight;
    context.drawImage(video, 0, 0);
    
    const dataUrl = canvas.toDataURL('image/jpeg', 0.8);
    setCapturedPhoto(dataUrl);
    cleanup();
  };

  // Upload com retry automático
  const uploadPhoto = async (retryCount = 0) => {
    if (!capturedPhoto || !user) return;
    
    setIsUploading(true);
    setUploadError(null);
    
    try {
      console.log(`Tentativa ${retryCount + 1} de upload...`);
      
      // Converter base64 para blob
      const response = await fetch(capturedPhoto);
      const blob = await response.blob();
      console.log('Blob criado:', { size: blob.size, type: blob.type });
      
      // Validar tamanho do arquivo (máx 10MB)
      if (blob.size > 10 * 1024 * 1024) {
        throw new Error('Arquivo muito grande (máx 10MB)');
      }
      
      const timestamp = Date.now();
      const filename = `${user.id}/${entregaId || timestamp}/${photoType}_${timestamp}.jpg`;
      console.log('Fazendo upload para:', filename);
      
      // Upload com timeout de 30 segundos
      const uploadPromise = supabase.storage
        .from('volunteer-photos')
        .upload(filename, blob, {
          contentType: 'image/jpeg',
          upsert: true
        });
      
      const timeoutPromise = new Promise((_, reject) => 
        setTimeout(() => reject(new Error('Upload timeout')), 30000)
      );
      
      const { data, error: uploadError } = await Promise.race([uploadPromise, timeoutPromise]) as any;
      
      if (uploadError) {
        console.error('Erro no upload:', uploadError);
        throw uploadError;
      }
      
      console.log('Upload bem-sucedido:', data);
      
      const { data: urlData } = supabase.storage
        .from('volunteer-photos')
        .getPublicUrl(filename);
      
      console.log('URL pública gerada:', urlData.publicUrl);

      // EXIF data simples para log
      const exifData: PhotoExifData = {
        captured_at: new Date().toISOString(),
        device_info: navigator.userAgent,
        resolution: { 
          width: canvasRef.current?.width || 0, 
          height: canvasRef.current?.height || 0 
        }
      };
      
      console.log('Foto salva com EXIF:', exifData);
      
      onPhotoCapture(urlData.publicUrl);
      toast({
        title: "Sucesso", 
        description: "Foto salva com sucesso!",
      });
      onClose();
      
    } catch (error: any) {
      console.error(`Erro na tentativa ${retryCount + 1}:`, error);
      
      // Retry automático até 3 tentativas
      if (retryCount < 2) {
        console.log(`Tentando novamente em 2 segundos... (tentativa ${retryCount + 2})`);
        setTimeout(() => uploadPhoto(retryCount + 1), 2000);
        return;
      }
      
      // Falha definitiva após 3 tentativas
      const errorMessage = error.message || 'Erro desconhecido';
      setUploadError(errorMessage);
      
      toast({
        title: "Erro ao Salvar",
        description: `Falha após 3 tentativas: ${errorMessage}`,
        variant: "destructive",
      });
    } finally {
      setIsUploading(false);
    }
  };

  // Retomar foto
  const retakePhoto = () => {
    setCapturedPhoto(null);
    startCamera();
  };

  // Effect simples
  useEffect(() => {
    if (isOpen && !capturedPhoto) {
      startCamera();
    }
    return cleanup;
  }, [isOpen]);

  if (!isOpen) return null;

  return (
    <Dialog open={isOpen} onOpenChange={onClose}>
      <DialogContent className="w-full h-full max-w-none max-h-none m-0 p-0 bg-black">
        <DialogTitle className="sr-only">{title}</DialogTitle>
        
        {/* Header */}
        <div className="absolute top-0 left-0 right-0 z-10 bg-black/50 p-4">
          <div className="flex items-center justify-between text-white">
            <h2 className="text-lg font-medium">{title}</h2>
            <Button
              variant="ghost"
              size="icon"
              onClick={onClose}
              className="text-white hover:bg-white/20"
            >
              <X size={24} />
            </Button>
          </div>
        </div>

        {/* Content */}
        <div className="w-full h-full pt-16">
          {capturedPhoto ? (
            // Preview
            <div className="relative w-full h-full">
              <img
                src={capturedPhoto}
                alt="Foto"
                className="w-full h-full object-cover"
              />
              
              <div className="absolute bottom-0 left-0 right-0 bg-black/50 p-4">
                <div className="flex gap-4">
                  <Button
                    variant="secondary"
                    onClick={retakePhoto}
                    disabled={isUploading}
                    className="flex-1"
                  >
                    <RotateCcw size={20} className="mr-2" />
                    Nova Foto
                  </Button>
                  <Button
                    onClick={() => uploadPhoto()}
                    disabled={isUploading}
                    className="flex-1"
                  >
                    <Check size={20} className="mr-2" />
                    {isUploading ? 'Salvando...' : 'Salvar'}
                  </Button>
                </div>
              </div>
            </div>
          ) : (
            // Camera view
            <div className="relative w-full h-full">
              {!isReady && (
                <div className="absolute inset-0 flex items-center justify-center bg-black">
                  <div className="text-white text-center">
                    <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-white mx-auto mb-2"></div>
                    <p>Carregando câmera...</p>
                  </div>
                </div>
              )}
              
              <video
                ref={videoRef}
                className="w-full h-full object-cover"
                autoPlay
                playsInline
                muted
              />
              <canvas ref={canvasRef} className="hidden" />
              
              {isReady && (
                <div className="absolute bottom-0 left-0 right-0 bg-black/50 p-6">
                  <div className="flex justify-center">
                    <Button
                      onClick={capturePhoto}
                      size="lg"
                      className="w-16 h-16 rounded-full bg-white hover:bg-gray-200 text-black"
                    >
                      <Camera size={24} />
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