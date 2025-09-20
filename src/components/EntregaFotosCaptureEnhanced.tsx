import React, { useState, useRef, useEffect } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Camera, Check, RotateCcw, X, AlertCircle } from 'lucide-react';
import { useLoteFotos } from '@/hooks/useLoteFotos';
import { useIOSPermissions } from '@/hooks/useIOSPermissions';

interface EntregaFotosCaptureProps {
  entregaId: string;
  loteId: string;
  onComplete: () => void;
  onCancel: () => void;
}

const FOTO_INSTRUCTIONS = {
  'entrega_conteudo': {
    title: 'Foto do Conteúdo',
    description: 'Fotografe o conteúdo orgânico que está sendo entregue'
  },
  'entrega_pesagem': {
    title: 'Foto da Pesagem',
    description: 'Fotografe a balança mostrando o peso do material'
  },
  'entrega_destino': {
    title: 'Foto do Destino',
    description: 'Fotografe o material sendo depositado na composteira'
  }
} as const;

const FOTO_STEPS: Array<keyof typeof FOTO_INSTRUCTIONS> = [
  'entrega_conteudo',
  'entrega_pesagem', 
  'entrega_destino'
];

export const EntregaFotosCaptureEnhanced: React.FC<EntregaFotosCaptureProps> = ({
  entregaId,
  loteId,
  onComplete,
  onCancel
}) => {
  const [currentStep, setCurrentStep] = useState(0);
  const [cameraActive, setCameraActive] = useState(false);
  const [stream, setStream] = useState<MediaStream | null>(null);
  const [capturedImage, setCapturedImage] = useState<string | null>(null);
  const [cameraError, setCameraError] = useState<string | null>(null);
  
  const videoRef = useRef<HTMLVideoElement>(null);
  const canvasRef = useRef<HTMLCanvasElement>(null);
  
  const { uploadFoto, uploading } = useLoteFotos(loteId);
  const { requestCameraAccess } = useIOSPermissions();

  const currentFotoType = FOTO_STEPS[currentStep];
  const instruction = FOTO_INSTRUCTIONS[currentFotoType];

  const startCamera = async () => {
    try {
      setCameraError(null);
      
      // Verificar se está em contexto seguro
      if (!navigator.mediaDevices || !navigator.mediaDevices.getUserMedia) {
        throw new Error('Acesso à câmera não disponível. Certifique-se de estar usando HTTPS.');
      }

      // Para iOS, usar a função de acesso da câmera
      if (/iPad|iPhone|iPod/.test(navigator.userAgent)) {
        const stream = await requestCameraAccess();
        if (!stream) {
          throw new Error('Permissão da câmera negada');
        }
        setStream(stream);
        if (videoRef.current) {
          videoRef.current.srcObject = stream;
          videoRef.current.play();
        }
        setCameraActive(true);
        return;
      }

      const mediaStream = await navigator.mediaDevices.getUserMedia({
        video: { 
          facingMode: 'environment',
          width: { ideal: 1920 },
          height: { ideal: 1080 }
        }
      });

      setStream(mediaStream);
      if (videoRef.current) {
        videoRef.current.srcObject = mediaStream;
        videoRef.current.play();
      }
      setCameraActive(true);
    } catch (error: any) {
      console.error('Erro ao iniciar câmera:', error);
      setCameraError(error.message);
    }
  };

  const stopCamera = () => {
    if (stream) {
      stream.getTracks().forEach(track => track.stop());
      setStream(null);
    }
    setCameraActive(false);
  };

  const capturePhoto = () => {
    if (!videoRef.current || !canvasRef.current) return;

    const video = videoRef.current;
    const canvas = canvasRef.current;
    const context = canvas.getContext('2d');

    if (!context) return;

    canvas.width = video.videoWidth;
    canvas.height = video.videoHeight;
    context.drawImage(video, 0, 0);

    const imageDataUrl = canvas.toDataURL('image/jpeg', 0.8);
    setCapturedImage(imageDataUrl);
    stopCamera();
  };

  const dataURLtoFile = (dataurl: string, filename: string): File => {
    const arr = dataurl.split(',');
    const mime = arr[0].match(/:(.*?);/)?.[1];
    const bstr = atob(arr[1]);
    let n = bstr.length;
    const u8arr = new Uint8Array(n);
    
    while (n--) {
      u8arr[n] = bstr.charCodeAt(n);
    }
    
    return new File([u8arr], filename, { type: mime });
  };

  const savePhoto = async () => {
    if (!capturedImage) return;

    try {
      const file = dataURLtoFile(capturedImage, `${currentFotoType}_${Date.now()}.jpg`);
      
      const success = await uploadFoto(
        file,
        currentFotoType,
        loteId,
        entregaId
      );

      if (success) {
        setCapturedImage(null);
        
        // Avançar para próxima foto ou finalizar
        if (currentStep < FOTO_STEPS.length - 1) {
          setCurrentStep(prev => prev + 1);
        } else {
          onComplete();
        }
      }
    } catch (error) {
      console.error('Erro ao salvar foto:', error);
    }
  };

  const retakePhoto = () => {
    setCapturedImage(null);
    startCamera();
  };

  const handleCancel = () => {
    stopCamera();
    onCancel();
  };

  // Iniciar câmera quando muda o step
  useEffect(() => {
    if (!capturedImage) {
      startCamera();
    }
    
    return () => stopCamera();
  }, [currentStep]);

  return (
    <Card className="w-full max-w-2xl mx-auto">
      <CardHeader>
        <div className="flex items-center justify-between">
          <CardTitle className="text-lg">{instruction.title}</CardTitle>
          <Badge variant="secondary">
            {currentStep + 1} de {FOTO_STEPS.length}
          </Badge>
        </div>
        <p className="text-sm text-muted-foreground">
          {instruction.description}
        </p>
      </CardHeader>

      <CardContent className="space-y-4">
        {/* Progresso */}
        <div className="flex space-x-2">
          {FOTO_STEPS.map((_, index) => (
            <div
              key={index}
              className={`h-2 flex-1 rounded ${
                index <= currentStep ? 'bg-primary' : 'bg-muted'
              }`}
            />
          ))}
        </div>

        {/* Camera/Preview */}
        <div className="relative aspect-video bg-muted rounded-lg overflow-hidden">
          {capturedImage ? (
            <img
              src={capturedImage}
              alt="Foto capturada"
              className="w-full h-full object-cover"
            />
          ) : cameraActive ? (
            <video
              ref={videoRef}
              className="w-full h-full object-cover"
              autoPlay
              muted
              playsInline
            />
          ) : cameraError ? (
            <div className="flex flex-col items-center justify-center h-full text-center p-4">
              <AlertCircle className="h-12 w-12 text-destructive mb-2" />
              <p className="text-sm text-destructive mb-2">{cameraError}</p>
              {cameraError.includes('negada') && (
                <p className="text-xs text-muted-foreground">
                  Para dispositivos iOS: Vá em Configurações → Safari → Câmera e permita o acesso
                </p>
              )}
              <Button onClick={startCamera} variant="outline" size="sm" className="mt-2">
                Tentar Novamente
              </Button>
            </div>
          ) : (
            <div className="flex items-center justify-center h-full">
              <Button onClick={startCamera} variant="outline" size="sm">
                <Camera className="h-4 w-4 mr-2" />
                Iniciar Câmera
              </Button>
            </div>
          )}
        </div>

        {/* Controles */}
        <div className="flex justify-between">
          <Button variant="outline" onClick={handleCancel}>
            <X className="h-4 w-4 mr-2" />
            Cancelar
          </Button>

          <div className="flex space-x-2">
            {capturedImage ? (
              <>
                <Button variant="outline" onClick={retakePhoto}>
                  <RotateCcw className="h-4 w-4 mr-2" />
                  Refazer
                </Button>
                <Button onClick={savePhoto} disabled={uploading}>
                  <Check className="h-4 w-4 mr-2" />
                  {uploading ? 'Salvando...' : 'Salvar'}
                </Button>
              </>
            ) : cameraActive ? (
              <Button onClick={capturePhoto}>
                <Camera className="h-4 w-4 mr-2" />
                Capturar
              </Button>
            ) : null}
          </div>
        </div>

        {/* Canvas oculto para processamento */}
        <canvas ref={canvasRef} className="hidden" />
      </CardContent>
    </Card>
  );
};