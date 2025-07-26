import React, { useRef, useCallback, useState, useEffect } from 'react';
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
  device_info: {
    userAgent: string;
    screen: { width: number; height: number };
    platform: string;
  };
  location?: {
    latitude: number;
    longitude: number;
    accuracy: number;
  };
  camera_settings: {
    resolution: { width: number; height: number };
    facing_mode: string;
  };
  file_info: {
    size: number;
    type: string;
  };
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
  const timeoutRef = useRef<NodeJS.Timeout | null>(null);
  
  const [status, setStatus] = useState<'idle' | 'loading' | 'streaming' | 'captured'>('idle');
  const [capturedPhoto, setCapturedPhoto] = useState<string | null>(null);
  const [isUploading, setIsUploading] = useState(false);
  const [exifData, setExifData] = useState<PhotoExifData | null>(null);
  const { toast } = useToast();
  const { user } = useAuth();

  // Cleanup função
  const cleanup = useCallback(() => {
    if (streamRef.current) {
      streamRef.current.getTracks().forEach(track => track.stop());
      streamRef.current = null;
    }
    if (timeoutRef.current) {
      clearTimeout(timeoutRef.current);
      timeoutRef.current = null;
    }
    setStatus('idle');
  }, []);

  // Obter localização
  const getLocation = useCallback((): Promise<PhotoExifData['location'] | undefined> => {
    return new Promise((resolve) => {
      if (!navigator.geolocation) {
        resolve(undefined);
        return;
      }
      
      navigator.geolocation.getCurrentPosition(
        (position) => {
          resolve({
            latitude: position.coords.latitude,
            longitude: position.coords.longitude,
            accuracy: position.coords.accuracy
          });
        },
        () => resolve(undefined),
        { timeout: 3000, enableHighAccuracy: true }
      );
    });
  }, []);

  // Inicializar câmera
  const startCamera = useCallback(async () => {
    try {
      setStatus('loading');
      
      // Timeout de 5 segundos
      timeoutRef.current = setTimeout(() => {
        console.error('Timeout na inicialização da câmera');
        cleanup();
        toast({
          title: "Timeout da Câmera",
          description: "A câmera demorou muito para responder",
          variant: "destructive",
        });
      }, 5000);

      // Constraints progressivos - começar simples
      const constraints = {
        video: {
          facingMode: 'environment',
          width: { ideal: 720 },
          height: { ideal: 480 }
        }
      };

      const stream = await navigator.mediaDevices.getUserMedia(constraints);
      streamRef.current = stream;
      
      if (videoRef.current) {
        videoRef.current.srcObject = stream;
        videoRef.current.onloadedmetadata = () => {
          videoRef.current?.play().then(() => {
            if (timeoutRef.current) {
              clearTimeout(timeoutRef.current);
              timeoutRef.current = null;
            }
            setStatus('streaming');
          });
        };
      }
    } catch (error) {
      console.error('Erro na câmera:', error);
      cleanup();
      toast({
        title: "Erro na Câmera",
        description: "Não foi possível acessar a câmera",
        variant: "destructive",
      });
    }
  }, [cleanup, toast]);

  // Fechar câmera
  const handleClose = useCallback(() => {
    cleanup();
    setCapturedPhoto(null);
    setExifData(null);
    onClose();
  }, [cleanup, onClose]);

  // Capturar foto com EXIF
  const capturePhoto = useCallback(async () => {
    if (!videoRef.current || !canvasRef.current) return;
    
    const canvas = canvasRef.current;
    const video = videoRef.current;
    const context = canvas.getContext('2d');
    
    if (!context) return;
    
    // Definir dimensões
    canvas.width = video.videoWidth;
    canvas.height = video.videoHeight;
    
    // Desenhar frame atual
    context.drawImage(video, 0, 0);
    const dataUrl = canvas.toDataURL('image/jpeg', 0.9);
    
    // Obter localização
    const location = await getLocation();
    
    // Criar dados EXIF
    const exif: PhotoExifData = {
      captured_at: new Date().toISOString(),
      device_info: {
        userAgent: navigator.userAgent,
        screen: { 
          width: window.screen.width, 
          height: window.screen.height 
        },
        platform: navigator.platform
      },
      location,
      camera_settings: {
        resolution: { 
          width: video.videoWidth, 
          height: video.videoHeight 
        },
        facing_mode: 'environment'
      },
      file_info: {
        size: Math.round(dataUrl.length * 0.75), // Estimativa do tamanho
        type: 'image/jpeg'
      }
    };
    
    setCapturedPhoto(dataUrl);
    setExifData(exif);
    setStatus('captured');
    cleanup();
  }, [cleanup, getLocation]);

  // Upload com dados EXIF
  const uploadPhoto = useCallback(async () => {
    if (!capturedPhoto || !user || !exifData) return;
    
    setIsUploading(true);
    try {
      // Converter para blob
      const response = await fetch(capturedPhoto);
      const blob = await response.blob();
      
      // Gerar nome único
      const timestamp = Date.now();
      const filename = `${user.id}/entregas/${entregaId || timestamp}/${photoType}_${timestamp}.jpg`;
      
      // Upload da foto
      const { error: uploadError } = await supabase.storage
        .from('volunteer-photos')
        .upload(filename, blob, {
          contentType: 'image/jpeg',
          upsert: true
        });

      if (uploadError) throw uploadError;

      // Obter URL pública
      const { data: urlData } = supabase.storage
        .from('volunteer-photos')
        .getPublicUrl(filename);

      // Log dos dados EXIF para debug
      console.log('EXIF Data:', exifData);
      
      onPhotoCapture(urlData.publicUrl);
      toast({
        title: "Sucesso", 
        description: "Foto salva com sucesso!",
      });
      handleClose();
    } catch (error) {
      console.error('Erro no upload:', error);
      toast({
        title: "Erro",
        description: "Falha ao salvar a foto",
        variant: "destructive",
      });
    } finally {
      setIsUploading(false);
    }
  }, [capturedPhoto, user, exifData, entregaId, photoType, onPhotoCapture, toast, handleClose]);

  // Tirar nova foto
  const retakePhoto = useCallback(() => {
    setCapturedPhoto(null);
    setExifData(null);
    setStatus('idle');
    startCamera();
  }, [startCamera]);

  // Effect para controlar o ciclo de vida
  useEffect(() => {
    if (isOpen && status === 'idle') {
      startCamera();
    }
    return cleanup;
  }, [isOpen, status, startCamera, cleanup]);

  return (
    <Dialog open={isOpen} onOpenChange={handleClose}>
      <DialogContent className="w-full h-full max-w-none max-h-none m-0 p-0 bg-black border-none">
        <DialogTitle className="sr-only">{title}</DialogTitle>
        
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
          {status === 'captured' && capturedPhoto ? (
            // Preview da foto
            <div className="w-full h-full">
              <img
                src={capturedPhoto}
                alt="Foto capturada"
                className="w-full h-full object-cover"
              />
              
              {/* Controles de confirmação */}
              <div className="absolute bottom-0 left-0 right-0 bg-gradient-to-t from-black/80 to-transparent p-6">
                <div className="flex gap-4">
                  <Button
                    variant="secondary"
                    onClick={retakePhoto}
                    disabled={isUploading}
                    className="flex-1 h-12"
                  >
                    <RotateCcw size={20} className="mr-2" />
                    Nova Foto
                  </Button>
                  <Button
                    onClick={uploadPhoto}
                    disabled={isUploading}
                    className="flex-1 h-12"
                  >
                    <Check size={20} className="mr-2" />
                    {isUploading ? 'Salvando...' : 'Salvar'}
                  </Button>
                </div>
              </div>
            </div>
          ) : (
            // Visualização da câmera
            <div className="w-full h-full">
              {status === 'loading' ? (
                <div className="flex items-center justify-center h-full text-white bg-black">
                  <div className="text-center">
                    <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-white mx-auto mb-4"></div>
                    <p className="text-lg">Abrindo câmera...</p>
                    <p className="text-sm text-gray-300 mt-2">Aguarde alguns segundos</p>
                  </div>
                </div>
              ) : (
                <>
                  <video
                    ref={videoRef}
                    className="w-full h-full object-cover bg-black"
                    autoPlay
                    playsInline
                    muted
                  />
                  <canvas ref={canvasRef} className="hidden" />
                </>
              )}
              
              {/* Botão de captura */}
              {status === 'streaming' && (
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