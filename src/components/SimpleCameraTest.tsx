import React, { useState, useEffect } from 'react';
import { Button } from '@/components/ui/button';
import { Card } from '@/components/ui/card';
import { useSimpleMobileCamera } from '@/hooks/useSimpleMobileCamera';
import { 
  Camera, 
  RotateCcw, 
  Upload,
  X,
  CheckCircle,
  AlertCircle,
  Loader2
} from 'lucide-react';
import { cn } from '@/lib/utils';

interface SimpleCameraTestProps {
  onPhotoCapture: (dataUrl: string, metadata: any) => void;
  onCancel: () => void;
  className?: string;
}

export const SimpleCameraTest: React.FC<SimpleCameraTestProps> = ({
  onPhotoCapture,
  onCancel,
  className
}) => {
  const [showUploadOption, setShowUploadOption] = useState(false);
  const [capturedImage, setCapturedImage] = useState<string | null>(null);
  const [isInitializing, setIsInitializing] = useState(true);
  const [localError, setLocalError] = useState<string | null>(null);

  const {
    isActive,
    isCapturing,
    error,
    facingMode,
    hasFrontCamera,
    hasBackCamera,
    permissions,
    deviceInfo,
    videoRef,
    canvasRef,
    startCamera,
    stopCamera,
    switchCamera,
    capturePhoto,
    requestCameraAccess
  } = useSimpleMobileCamera();

  // Inicializar câmera automaticamente
  useEffect(() => {
    const initializeCamera = async () => {
      console.log('🔍 [SimpleCameraTest] Iniciando câmera...');
      console.log('🔍 [SimpleCameraTest] DeviceInfo:', deviceInfo);
      setIsInitializing(true);
      
      try {
        // Solicitar permissões primeiro se estiver no iOS
        if (deviceInfo?.isIOS) {
          console.log('🔍 [SimpleCameraTest] iOS detectado, solicitando permissões...');
          await requestCameraAccess();
        }
        
        console.log('🔍 [SimpleCameraTest] Iniciando câmera ambiente...');
        await startCamera('environment');
        console.log('🔍 [SimpleCameraTest] Câmera iniciada com sucesso!');
      } catch (error) {
        console.error('❌ [SimpleCameraTest] Erro ao iniciar câmera:', error);
        setShowUploadOption(true);
      } finally {
        setIsInitializing(false);
      }
    };

    if (deviceInfo) {
      console.log('🔍 [SimpleCameraTest] DeviceInfo disponível, inicializando...');
      initializeCamera();
    } else {
      console.log('🔍 [SimpleCameraTest] Aguardando deviceInfo...');
    }
  }, [deviceInfo, startCamera, requestCameraAccess]);

  const handleCapturePhoto = async () => {
    try {
      const { dataUrl, metadata } = await capturePhoto();
      setCapturedImage(dataUrl);
    } catch (error) {
      console.error('Erro ao capturar foto:', error);
      setShowUploadOption(true);
    }
  };

  const handleConfirmPhoto = () => {
    if (capturedImage) {
      onPhotoCapture(capturedImage, {});
      setCapturedImage(null);
    }
  };

  const handleRetakePhoto = () => {
    setCapturedImage(null);
  };

  const handleFileUpload = (event: React.ChangeEvent<HTMLInputElement>) => {
    const file = event.target.files?.[0];
    if (file) {
      const reader = new FileReader();
      reader.onload = (e) => {
        const dataUrl = e.target?.result as string;
        onPhotoCapture(dataUrl, { uploadMethod: 'file' });
      };
      reader.readAsDataURL(file);
    }
  };

  return (
    <div className={cn("min-h-screen bg-background flex flex-col", className)}>
      {/* Header fixo */}
      <div className="sticky top-0 z-10 bg-background/95 backdrop-blur-sm border-b border-border p-4">
        <div className="flex items-center justify-between mb-3">
          <Button 
            variant="ghost" 
            size="icon" 
            onClick={onCancel}
            className="text-muted-foreground"
          >
            <X className="h-5 w-5" />
          </Button>
          
          <div className="text-center">
            <h2 className="text-lg font-semibold text-foreground">
              Teste da Câmera
            </h2>
            <p className="text-sm text-muted-foreground">
              Capture uma foto para testar a câmera
            </p>
          </div>
          
          <div className="w-10" /> {/* Spacer */}
        </div>
      </div>

      {/* Área principal de captura */}
      <div className="flex-1 flex flex-col p-4">
        <Card className="flex-1 overflow-hidden relative min-h-[400px]">
          {/* Visualização da câmera ou imagem capturada */}
          {capturedImage ? (
            <div className="h-full flex flex-col">
              <img 
                src={capturedImage} 
                alt="Foto capturada" 
                className="flex-1 w-full object-cover rounded-t-lg"
              />
              
              <div className="p-4 bg-background/95 backdrop-blur-sm">
                <div className="flex gap-2">
                  <Button 
                    variant="outline" 
                    onClick={handleRetakePhoto}
                    className="flex-1"
                  >
                    <RotateCcw className="w-4 h-4 mr-2" />
                    Refazer
                  </Button>
                  <Button 
                    onClick={handleConfirmPhoto}
                    className="flex-1 bg-gradient-primary text-primary-foreground"
                  >
                    <CheckCircle className="w-4 h-4 mr-2" />
                    Confirmar
                  </Button>
                </div>
              </div>
            </div>
          ) : (
            <div className="h-full flex flex-col relative">
              {/* Vídeo da câmera */}
              {isActive && !error ? (
                <>
                  <video
                    ref={videoRef}
                    autoPlay
                    playsInline
                    muted
                    className="flex-1 w-full object-cover"
                  />
                  
                  {/* Sobreposição com guias visuais */}
                  <div className="absolute inset-0 pointer-events-none">
                    <div className="w-full h-full border-2 border-primary/30 rounded-lg m-4"></div>
                  </div>
                </>
              ) : (
                <div className="flex-1 flex items-center justify-center bg-muted/20 min-h-[300px]">
                  {isInitializing ? (
                    <div className="text-center">
                      <Loader2 className="w-8 h-8 animate-spin mx-auto mb-2 text-primary" />
                      <p className="text-sm text-muted-foreground">Iniciando câmera...</p>
                      <p className="text-xs text-muted-foreground/60 mt-1">
                        Estado: {isActive ? 'Ativa' : 'Inativa'} | 
                        Erro: {error || localError ? 'Sim' : 'Não'} | 
                        Upload: {showUploadOption ? 'Disponível' : 'Não'}
                      </p>
                    </div>
                  ) : error || showUploadOption ? (
                    <div className="text-center p-6">
                      <AlertCircle className="w-12 h-12 mx-auto mb-4 text-warning" />
                      <p className="text-sm text-muted-foreground mb-4">
                        {error || localError || 'Câmera não disponível'}
                      </p>
                      
                      {/* Upload de arquivo */}
                      <div className="space-y-3">
                        <label className="block">
                          <input
                            type="file"
                            accept="image/*"
                            onChange={handleFileUpload}
                            className="hidden"
                          />
                          <Button variant="outline" className="w-full" asChild>
                            <span>
                              <Upload className="w-4 h-4 mr-2" />
                              Selecionar da Galeria
                            </span>
                          </Button>
                        </label>
                        
                        {/* Tentar câmera novamente */}
                        <Button 
                          variant="ghost" 
                          size="sm"
                          onClick={() => {
                            console.log('🔄 [SimpleCameraTest] Tentando reiniciar câmera...');
                            setShowUploadOption(false);
                            setLocalError(null);
                            startCamera('environment');
                          }}
                          className="w-full"
                        >
                          Tentar Câmera Novamente
                        </Button>
                      </div>
                    </div>
                  ) : !isActive && !isInitializing ? (
                    <div className="text-center p-6">
                      <Camera className="w-12 h-12 mx-auto mb-4 text-muted-foreground" />
                      <p className="text-sm text-muted-foreground mb-4">
                        Câmera não está ativa
                      </p>
                      <Button 
                        onClick={() => startCamera('environment')}
                        className="bg-gradient-primary text-primary-foreground"
                      >
                        <Camera className="w-4 h-4 mr-2" />
                        Iniciar Câmera
                      </Button>
                    </div>
                  ) : null}
                </div>
              )}
            </div>
          )}
        </Card>

        {/* Controles da câmera */}
        {isActive && !capturedImage && !error && (
          <div className="mt-4 flex items-center justify-center gap-6">
            {/* Trocar câmera */}
            {(hasFrontCamera && hasBackCamera) && (
              <Button
                variant="outline"
                size="icon"
                onClick={switchCamera}
                className="rounded-full w-12 h-12"
                disabled={isCapturing}
              >
                <RotateCcw className="w-5 h-5" />
              </Button>
            )}

            {/* Botão principal de captura */}
            <Button
              onClick={handleCapturePhoto}
              disabled={isCapturing}
              className="rounded-full w-16 h-16 bg-primary text-primary-foreground shadow-lg"
              size="icon"
            >
              {isCapturing ? (
                <Loader2 className="w-6 h-6 animate-spin" />
              ) : (
                <Camera className="w-6 h-6" />
              )}
            </Button>

            {/* Upload alternativo */}
            <label className="block">
              <input
                type="file"
                accept="image/*"
                onChange={handleFileUpload}
                className="hidden"
              />
              <Button
                variant="outline"
                size="icon"
                className="rounded-full w-12 h-12"
                asChild
              >
                <span>
                  <Upload className="w-5 h-5" />
                </span>
              </Button>
            </label>
          </div>
        )}
      </div>

      {/* Canvas oculto para captura */}
      <canvas ref={canvasRef} style={{ display: 'none' }} />
    </div>
  );
};