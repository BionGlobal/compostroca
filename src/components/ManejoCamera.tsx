import React, { useRef, useEffect, useState } from 'react';
import { Button } from './ui/button';
import { Card, CardContent, CardHeader, CardTitle } from './ui/card';
import { Camera, RotateCcw, Check, Upload, AlertTriangle, Settings } from 'lucide-react';
import { useIOSPermissions } from '@/hooks/useIOSPermissions';

interface ManejoCameraProps {
  onPhotoCapture: (file: File) => void;
  onCancel: () => void;
  title: string;
  description: string;
}

export const ManejoCamera: React.FC<ManejoCameraProps> = ({
  onPhotoCapture,
  onCancel,
  title,
  description
}) => {
  const videoRef = useRef<HTMLVideoElement>(null);
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const fileInputRef = useRef<HTMLInputElement>(null);
  const [stream, setStream] = useState<MediaStream | null>(null);
  const [capturedImage, setCapturedImage] = useState<string | null>(null);
  const [cameraError, setCameraError] = useState<string | null>(null);
  const [isRetrying, setIsRetrying] = useState(false);

  const { 
    deviceInfo, 
    permissions, 
    requestCameraAccess, 
    checkSecureContext,
    showIOSInstructions 
  } = useIOSPermissions();

  useEffect(() => {
    startCamera();
    return () => {
      if (stream) {
        stream.getTracks().forEach(track => track.stop());
      }
    };
  }, []);

  const startCamera = async () => {
    try {
      setCameraError(null);
      setIsRetrying(true);
      
      // Verificar contexto seguro primeiro
      if (!checkSecureContext()) {
        setCameraError('É necessário usar HTTPS para acessar a câmera.');
        setIsRetrying(false);
        return;
      }
      
      // Usar o hook especializado para iOS
      const mediaStream = await requestCameraAccess();
      
      if (mediaStream) {
        setStream(mediaStream);
        if (videoRef.current) {
          videoRef.current.srcObject = mediaStream;
          
          // Aguardar o vídeo carregar
          videoRef.current.onloadedmetadata = () => {
            console.log('📹 Vídeo carregado com sucesso');
          };
          
          // Configurações específicas para iOS
          if (deviceInfo?.isIOS) {
            videoRef.current.setAttribute('playsinline', 'true');
            videoRef.current.setAttribute('webkit-playsinline', 'true');
          }
        }
      } else {
        // Erro específico baseado no contexto
        if (deviceInfo?.isInAppBrowser) {
          setCameraError('Para usar a câmera, abra este site no Safari.');
        } else if (!deviceInfo?.isHTTPS) {
          setCameraError('HTTPS é necessário para acessar a câmera.');
        } else {
          setCameraError('Não foi possível acessar a câmera. Você pode fazer upload de uma foto.');
        }
        
        // Mostrar instruções específicas para iOS
        if (deviceInfo?.isIOS) {
          showIOSInstructions();
        }
      }
    } catch (error) {
      console.error('Erro ao acessar câmera:', error);
      setCameraError('Não foi possível acessar a câmera. Você pode fazer upload de uma foto.');
    } finally {
      setIsRetrying(false);
    }
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
  };

  const retakePhoto = () => {
    setCapturedImage(null);
    startCamera();
  };

  const savePhoto = () => {
    if (!capturedImage) return;

    // Converter dataURL para File
    fetch(capturedImage)
      .then(res => res.blob())
      .then(blob => {
        const file = new File([blob], `manejo-${Date.now()}.jpg`, {
          type: 'image/jpeg'
        });
        onPhotoCapture(file);
      });
  };

  const handleFileUpload = (event: React.ChangeEvent<HTMLInputElement>) => {
    const file = event.target.files?.[0];
    if (file && file.type.startsWith('image/')) {
      onPhotoCapture(file);
    }
  };

  return (
    <Card className="w-full max-w-md mx-auto">
      <CardHeader>
        <CardTitle className="flex items-center gap-2">
          <Camera className="h-5 w-5" />
          {title}
        </CardTitle>
        <p className="text-sm text-muted-foreground">
          {description}
        </p>
      </CardHeader>
      
      <CardContent className="space-y-4">
        {!cameraError ? (
          <div className="relative">
            {!capturedImage ? (
              <video
                ref={videoRef}
                autoPlay
                playsInline
                className="w-full rounded-lg bg-black"
                style={{ aspectRatio: '16/9' }}
              />
            ) : (
              <img
                src={capturedImage}
                alt="Foto capturada"
                className="w-full rounded-lg"
                style={{ aspectRatio: '16/9', objectFit: 'cover' }}
              />
            )}
            
            <canvas
              ref={canvasRef}
              className="hidden"
            />
          </div>
        ) : (
          <div className="bg-muted rounded-lg p-8 text-center">
            <div className="flex flex-col items-center">
              {deviceInfo?.isInAppBrowser ? (
                <AlertTriangle className="h-12 w-12 mx-auto mb-2 text-red-500" />
              ) : deviceInfo?.isIOS && permissions.camera === 'denied' ? (
                <AlertTriangle className="h-12 w-12 mx-auto mb-2 text-orange-500" />
              ) : (
                <Upload className="h-12 w-12 mx-auto mb-2 text-muted-foreground" />
              )}
              
              <p className="text-sm text-muted-foreground mb-4">
                {cameraError}
              </p>
              
              {deviceInfo?.isInAppBrowser && (
                <div className="text-xs text-muted-foreground space-y-2 max-w-sm bg-red-50 border border-red-200 p-3 rounded">
                  <p className="font-medium text-red-800">Navegador In-App Detectado</p>
                  <p className="text-red-700">Para usar a câmera:</p>
                  <div className="text-left text-red-700">
                    <p>1. Toque no botão "..." ou compartilhar</p>
                    <p>2. Selecione <strong>"Abrir no Safari"</strong></p>
                    <p>3. Permita o acesso à câmera</p>
                  </div>
                </div>
              )}
              
              {deviceInfo?.isIOS && !deviceInfo.isInAppBrowser && permissions.camera === 'denied' && (
                <div className="text-xs text-muted-foreground space-y-2 max-w-sm">
                  <p className="font-medium">Para habilitar a câmera no iOS:</p>
                  <div className="text-left">
                    <p>1. Abra as <strong>Configurações</strong> do iPhone</p>
                    <p>2. Vá em <strong>Safari</strong></p>
                    <p>3. Toque em <strong>Câmera</strong></p>
                    <p>4. Selecione <strong>Permitir</strong></p>
                    <p>5. Recarregue esta página</p>
                  </div>
                </div>
              )}
              
              {deviceInfo?.isIOS && !deviceInfo.isHTTPS && (
                <p className="text-xs text-orange-600 mt-2">
                  ⚠️ HTTPS é necessário para acessar a câmera no iOS
                </p>
              )}
            </div>
          </div>
        )}

        <div className="flex gap-2">
          {!cameraError && !capturedImage && (
            <Button
              onClick={capturePhoto}
              className="flex-1"
              size="lg"
            >
              <Camera className="h-4 w-4 mr-2" />
              Capturar
            </Button>
          )}
          
          {cameraError && deviceInfo?.isIOS && permissions.camera === 'denied' && (
            <Button
              onClick={startCamera}
              variant="outline"
              className="flex-1"
              disabled={isRetrying}
            >
              <Settings className="h-4 w-4 mr-2" />
              {isRetrying ? 'Tentando...' : 'Tentar Novamente'}
            </Button>
          )}

          {capturedImage && (
            <>
              <Button
                onClick={retakePhoto}
                variant="outline"
                className="flex-1"
              >
                <RotateCcw className="h-4 w-4 mr-2" />
                Repetir
              </Button>
              <Button
                onClick={savePhoto}
                className="flex-1"
              >
                <Check className="h-4 w-4 mr-2" />
                Confirmar
              </Button>
            </>
          )}

          {(cameraError || !capturedImage) && (
            <>
              <input
                ref={fileInputRef}
                type="file"
                accept="image/*"
                onChange={handleFileUpload}
                className="hidden"
              />
              <Button
                onClick={() => fileInputRef.current?.click()}
                variant="outline"
                className={capturedImage ? "flex-1" : "flex-1"}
              >
                <Upload className="h-4 w-4 mr-2" />
                Upload
              </Button>
            </>
          )}
        </div>

        <Button
          onClick={onCancel}
          variant="ghost"
          className="w-full"
        >
          Cancelar
        </Button>
      </CardContent>
    </Card>
  );
};