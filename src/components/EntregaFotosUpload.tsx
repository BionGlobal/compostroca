import React, { useRef, useState, useEffect } from 'react';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Camera, RotateCcw, Check, X, AlertTriangle, Upload, ImageIcon, RotateCw } from 'lucide-react';
import { useEntregaFotos } from '@/hooks/useEntregaFotos';
import { useIOSPermissions } from '@/hooks/useIOSPermissions';
import { cn } from '@/lib/utils';

interface EntregaFotosUploadProps {
  entregaId: string;
  onComplete: () => void;
  onCancel: () => void;
}

const FOTO_INSTRUCTIONS = {
  conteudo: {
    title: "Foto 1: Conteúdo",
    description: "Enquadre o conteúdo do balde juntamente com seu número"
  },
  pesagem: {
    title: "Foto 2: Pesagem", 
    description: "Registre o balde sendo pesado com os dados da balança e seu número"
  },
  destino: {
    title: "Foto 3: Destino",
    description: "Registre o balde sendo despejado na Caixa 1"
  }
};

type CaptureMode = 'camera' | 'upload';

export const EntregaFotosUpload: React.FC<EntregaFotosUploadProps> = ({
  entregaId,
  onComplete,
  onCancel
}) => {
  const videoRef = useRef<HTMLVideoElement>(null);
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const fileInputRef = useRef<HTMLInputElement>(null);
  
  const [currentStep, setCurrentStep] = useState<'conteudo' | 'pesagem' | 'destino'>('conteudo');
  const [captureMode, setCaptureMode] = useState<CaptureMode>('camera');
  const [cameraActive, setCameraActive] = useState(false);
  const [capturedImage, setCapturedImage] = useState<string | null>(null);
  const [selectedFile, setSelectedFile] = useState<File | null>(null);
  const [stream, setStream] = useState<MediaStream | null>(null);
  const [cameraError, setCameraError] = useState<string | null>(null);
  const [isDragOver, setIsDragOver] = useState(false);
  const [useFrontCamera, setUseFrontCamera] = useState(false);

  const { uploadFoto, uploading } = useEntregaFotos(entregaId);
  const { 
    deviceInfo, 
    permissions, 
    requestCameraAccess, 
    checkSecureContext,
    showIOSInstructions 
  } = useIOSPermissions();

  const startCamera = async () => {
    try {
      console.log('📷 Iniciando câmera...');
      
      if (stream) {
        console.log('📷 Parando stream anterior...');
        stream.getTracks().forEach(track => track.stop());
      }
      
      setCameraActive(false);
      setCameraError(null);
      
      if (!checkSecureContext()) {
        setCameraError('É necessário usar HTTPS para acessar a câmera.');
        return;
      }
      
      console.log('📷 Solicitando acesso à câmera...', useFrontCamera ? 'frontal' : 'traseira');
      const mediaStream = await requestCameraAccess(0, useFrontCamera);
      
      if (mediaStream) {
        console.log('📷 Stream obtida com sucesso');
        if (videoRef.current) {
          const video = videoRef.current;
          video.srcObject = mediaStream;
          setStream(mediaStream);
          
          const handleMetadataLoaded = () => {
            console.log('📷 Metadata carregada, câmera ativa');
            setCameraActive(true);
          };
          
          const handleCanPlay = () => {
            console.log('📷 Video pode ser reproduzido');
            setCameraActive(true);
          };
          
          const handleError = (e: Event) => {
            console.error('📷 Erro no elemento video:', e);
            setCameraError('Erro no carregamento do vídeo');
          };
          
          video.onloadedmetadata = handleMetadataLoaded;
          video.oncanplay = handleCanPlay;
          video.onerror = handleError;
          
          // Fallback para garantir que a câmera seja ativada
          setTimeout(() => {
            if (video && video.readyState >= 2) {
              console.log('📷 Forçando ativação da câmera via timeout');
              setCameraActive(true);
            }
          }, 1500);
          
          // Tentar reproduzir o vídeo explicitamente
          video.play().catch(error => {
            console.error('📷 Erro ao reproduzir vídeo:', error);
          });
        }
      } else {
        console.error('📷 Não foi possível obter o stream da câmera');
        setCameraError('Não foi possível acessar a câmera.');
        
        if (deviceInfo?.isIOS) {
          showIOSInstructions();
        }
      }
    } catch (error) {
      console.error('📷 Erro ao acessar câmera:', error);
      setCameraError(`Erro ao acessar a câmera: ${error instanceof Error ? error.message : 'Erro desconhecido'}`);
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
    if (videoRef.current && canvasRef.current) {
      const canvas = canvasRef.current;
      const video = videoRef.current;
      
      console.log('📷 Capturando foto...');
      console.log('📷 Video dimensions:', video.videoWidth, 'x', video.videoHeight);
      
      if (video.videoWidth === 0 || video.videoHeight === 0) {
        console.error('📷 Dimensões do vídeo inválidas');
        setCameraError('Erro: dimensões do vídeo inválidas');
        return;
      }
      
      canvas.width = video.videoWidth;
      canvas.height = video.videoHeight;
      
      const ctx = canvas.getContext('2d');
      if (ctx) {
        try {
          ctx.drawImage(video, 0, 0);
          const imageData = canvas.toDataURL('image/jpeg', 0.8);
          console.log('📷 Foto capturada com sucesso');
          setCapturedImage(imageData);
        } catch (error) {
          console.error('📷 Erro ao capturar foto:', error);
          setCameraError('Erro ao capturar a foto');
        }
      } else {
        console.error('📷 Não foi possível obter o contexto do canvas');
        setCameraError('Erro interno do canvas');
      }
    } else {
      console.error('📷 Video ou canvas não disponível');
      setCameraError('Erro: câmera não está pronta');
    }
  };

  const compressImage = (file: File): Promise<File> => {
    return new Promise((resolve) => {
      const canvas = document.createElement('canvas');
      const ctx = canvas.getContext('2d');
      const img = new Image();
      
      img.onload = () => {
        const MAX_WIDTH = 1920;
        const MAX_HEIGHT = 1080;
        let { width, height } = img;
        
        if (width > height) {
          if (width > MAX_WIDTH) {
            height = (height * MAX_WIDTH) / width;
            width = MAX_WIDTH;
          }
        } else {
          if (height > MAX_HEIGHT) {
            width = (width * MAX_HEIGHT) / height;
            height = MAX_HEIGHT;
          }
        }
        
        canvas.width = width;
        canvas.height = height;
        
        ctx?.drawImage(img, 0, 0, width, height);
        
        canvas.toBlob((blob) => {
          if (blob) {
            const compressedFile = new File([blob], file.name, {
              type: 'image/jpeg',
              lastModified: Date.now()
            });
            resolve(compressedFile);
          } else {
            resolve(file);
          }
        }, 'image/jpeg', 0.8);
      };
      
      img.src = URL.createObjectURL(file);
    });
  };

  const handleFileSelect = async (file: File) => {
    // Validate file type
    if (!file.type.startsWith('image/')) {
      return;
    }
    
    // Validate file size (10MB limit)
    if (file.size > 10 * 1024 * 1024) {
      return;
    }
    
    const compressedFile = await compressImage(file);
    setSelectedFile(compressedFile);
    
    // Create preview
    const reader = new FileReader();
    reader.onload = (e) => {
      setCapturedImage(e.target?.result as string);
    };
    reader.readAsDataURL(compressedFile);
  };

  const handleDragOver = (e: React.DragEvent) => {
    e.preventDefault();
    setIsDragOver(true);
  };

  const handleDragLeave = (e: React.DragEvent) => {
    e.preventDefault();
    setIsDragOver(false);
  };

  const handleDrop = (e: React.DragEvent) => {
    e.preventDefault();
    setIsDragOver(false);
    
    const files = Array.from(e.dataTransfer.files);
    if (files.length > 0) {
      handleFileSelect(files[0]);
    }
  };

  const handleFileInputChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const files = e.target.files;
    if (files && files[0]) {
      handleFileSelect(files[0]);
    }
  };

  const savePhoto = async () => {
    let fileToUpload: File;
    
    if (captureMode === 'camera' && capturedImage) {
      const response = await fetch(capturedImage);
      const blob = await response.blob();
      fileToUpload = new File([blob], `${currentStep}_${Date.now()}.jpg`, { type: 'image/jpeg' });
    } else if (captureMode === 'upload' && selectedFile) {
      fileToUpload = selectedFile;
    } else {
      return;
    }

    const success = await uploadFoto(fileToUpload, currentStep, entregaId);
    
    if (success) {
      setCapturedImage(null);
      setSelectedFile(null);
      
      if (currentStep === 'conteudo') {
        setCurrentStep('pesagem');
      } else if (currentStep === 'pesagem') {
        setCurrentStep('destino');
      } else {
        stopCamera();
        onComplete();
      }
    }
  };

  const retakePhoto = () => {
    console.log('📷 Refazendo foto...');
    setCapturedImage(null);
    setSelectedFile(null);
    setCameraError(null);
    
    if (captureMode === 'camera') {
      setCameraActive(false);
      setTimeout(() => {
        startCamera();
      }, 100);
    }
  };

  const handleCancel = () => {
    stopCamera();
    onCancel();
  };

  const switchCamera = async () => {
    console.log('📷 Trocando câmera...');
    setUseFrontCamera(!useFrontCamera);
    setCameraActive(false);
    setCameraError(null);
    
    setTimeout(() => {
      startCamera();
    }, 100);
  };

  const switchToCamera = () => {
    console.log('📷 Mudando para modo câmera...');
    setCaptureMode('camera');
    setCapturedImage(null);
    setSelectedFile(null);
    setCameraError(null);
    setCameraActive(false);
    setTimeout(() => {
      startCamera();
    }, 100);
  };

  const switchToUpload = () => {
    setCaptureMode('upload');
    setCapturedImage(null);
    setSelectedFile(null);
    stopCamera();
  };

  useEffect(() => {
    console.log('📷 Efeito inicial - modo:', captureMode);
    if (captureMode === 'camera') {
      startCamera();
    }
    
    return () => {
      console.log('📷 Cleanup - parando câmera');
      stopCamera();
    };
  }, []);

  useEffect(() => {
    console.log('📷 Mudança de step:', currentStep, 'Modo:', captureMode, 'Imagem capturada:', !!capturedImage);
    if (currentStep && !capturedImage && captureMode === 'camera' && !cameraActive) {
      console.log('📷 Reiniciando câmera para novo step');
      startCamera();
    }
  }, [currentStep]);

  const currentInstruction = FOTO_INSTRUCTIONS[currentStep];
  const progressStep = currentStep === 'conteudo' ? 1 : currentStep === 'pesagem' ? 2 : 3;

  return (
    <Card className="w-full max-w-2xl mx-auto">
      <CardHeader>
        <CardTitle className="flex items-center gap-2">
          <Camera className="h-5 w-5" />
          {currentInstruction.title}
        </CardTitle>
        <div className="flex gap-2">
          {[1, 2, 3].map((step) => (
            <div
              key={step}
              className={`h-2 flex-1 rounded-full ${
                step <= progressStep ? 'bg-primary' : 'bg-muted'
              }`}
            />
          ))}
        </div>
      </CardHeader>
      
      <CardContent className="space-y-4">
        <p className="text-sm text-muted-foreground text-center">
          {currentInstruction.description}
        </p>

        {/* Mode Toggle */}
        <div className="flex gap-2 p-1 bg-muted rounded-lg">
          <Button
            variant={captureMode === 'camera' ? 'default' : 'ghost'}
            size="sm"
            onClick={switchToCamera}
            className="flex-1"
          >
            <Camera className="h-4 w-4 mr-2" />
            Câmera
          </Button>
          <Button
            variant={captureMode === 'upload' ? 'default' : 'ghost'}
            size="sm"
            onClick={switchToUpload}
            className="flex-1"
          >
            <Upload className="h-4 w-4 mr-2" />
            Galeria
          </Button>
        </div>

        <div className="relative aspect-[3/4] bg-black rounded-lg overflow-hidden">
          {captureMode === 'camera' ? (
            // Camera Mode
            cameraError ? (
              <div className="absolute inset-0 flex flex-col items-center justify-center p-4 text-center bg-black/80">
                {deviceInfo?.isIOS && permissions.camera === 'denied' ? (
                  <AlertTriangle className="h-12 w-12 mb-2 text-orange-500" />
                ) : (
                  <Camera className="h-12 w-12 mb-2 text-muted-foreground" />
                )}
                
                <p className="text-sm text-white mb-4 break-words max-w-full">{cameraError}</p>
                
                {deviceInfo?.isIOS && permissions.camera === 'denied' && (
                  <div className="text-xs text-gray-300 space-y-1 max-w-xs">
                    <p className="font-medium">Para habilitar a câmera:</p>
                    <p>Configurações → Safari → Câmera → Permitir</p>
                  </div>
                )}
                
                <Button
                  onClick={startCamera}
                  variant="outline"
                  size="sm"
                  className="mt-2"
                >
                  Tentar Novamente
                </Button>
              </div>
            ) : !capturedImage ? (
              <>
                {!cameraActive && (
                  <div className="absolute inset-0 flex items-center justify-center bg-black/80">
                    <div className="text-center">
                      <Camera className="h-12 w-12 mb-2 text-white animate-pulse mx-auto" />
                      <p className="text-white text-sm">Carregando câmera...</p>
                    </div>
                  </div>
                )}
                <video
                  ref={videoRef}
                  autoPlay
                  playsInline
                  muted
                  className={`w-full h-full object-cover ${!cameraActive ? 'opacity-0' : 'opacity-100'} transition-opacity duration-500`}
                />
                
                {/* Camera Switch Button */}
                {cameraActive && !capturedImage && (
                  <button
                    onClick={switchCamera}
                    className="absolute top-4 right-4 bg-black/50 backdrop-blur-sm text-white p-2 rounded-full hover:bg-black/70 transition-colors"
                    title={useFrontCamera ? "Trocar para câmera traseira" : "Trocar para câmera frontal"}
                  >
                    <RotateCw className="h-4 w-4" />
                  </button>
                )}
              </>
            ) : (
              <img
                src={capturedImage}
                alt="Foto capturada"
                className="w-full h-full object-cover"
              />
            )
          ) : (
            // Upload Mode
            !capturedImage ? (
              <div
                className={cn(
                  "absolute inset-0 flex flex-col items-center justify-center p-8 text-center",
                  "border-2 border-dashed border-muted-foreground/30 rounded-lg",
                  "transition-colors duration-200",
                  isDragOver && "border-primary bg-primary/5"
                )}
                onDragOver={handleDragOver}
                onDragLeave={handleDragLeave}
                onDrop={handleDrop}
              >
                <ImageIcon className="h-16 w-16 mb-4 text-muted-foreground" />
                <p className="text-white mb-2 font-medium">
                  Arraste uma foto aqui
                </p>
                <p className="text-sm text-gray-300 mb-4">
                  ou clique para selecionar
                </p>
                <Button
                  variant="outline"
                  size="sm"
                  onClick={() => fileInputRef.current?.click()}
                >
                  <Upload className="h-4 w-4 mr-2" />
                  Escolher Arquivo
                </Button>
                <input
                  ref={fileInputRef}
                  type="file"
                  accept="image/*"
                  onChange={handleFileInputChange}
                  className="hidden"
                />
              </div>
            ) : (
              <img
                src={capturedImage}
                alt="Foto selecionada"
                className="w-full h-full object-cover"
              />
            )
          )}
          
          <canvas ref={canvasRef} className="hidden" />
        </div>

        <div className="flex gap-2 justify-center">
          {!capturedImage ? (
            <>
              <Button
                variant="outline"
                onClick={handleCancel}
                className="flex-1"
              >
                <X className="h-4 w-4 mr-2" />
                Cancelar
              </Button>
              
              {captureMode === 'camera' ? (
                <Button
                  onClick={capturePhoto}
                  disabled={!cameraActive || !!cameraError}
                  className="flex-1"
                >
                  <Camera className="h-4 w-4 mr-2" />
                  Capturar
                </Button>
              ) : (
                <Button
                  onClick={() => fileInputRef.current?.click()}
                  className="flex-1"
                >
                  <Upload className="h-4 w-4 mr-2" />
                  Selecionar Foto
                </Button>
              )}
            </>
          ) : (
            <>
              <Button
                variant="outline"
                onClick={retakePhoto}
                className="flex-1"
              >
                <RotateCcw className="h-4 w-4 mr-2" />
                {captureMode === 'camera' ? 'Repetir' : 'Trocar'}
              </Button>
              
              <Button
                onClick={savePhoto}
                disabled={uploading}
                className="flex-1"
              >
                <Check className="h-4 w-4 mr-2" />
                {uploading ? 'Salvando...' : 'Salvar'}
              </Button>
            </>
          )}
        </div>
      </CardContent>
    </Card>
  );
};