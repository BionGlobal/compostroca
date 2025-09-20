import { useState, useRef, useCallback, useEffect } from 'react';
import { useToast } from '@/hooks/use-toast';
import { useIOSPermissions } from '@/hooks/useIOSPermissions';

interface CameraMetadata {
  timestamp: number;
  deviceType: string;
  facingMode: string;
  resolution?: string;
  gpsCoords?: { latitude: number; longitude: number };
  deviceInfo?: any;
}

export const useSimpleMobileCamera = () => {
  const [isActive, setIsActive] = useState(false);
  const [stream, setStream] = useState<MediaStream | null>(null);
  const [facingMode, setFacingMode] = useState<'user' | 'environment'>('environment');
  const [isCapturing, setIsCapturing] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [hasFrontCamera, setHasFrontCamera] = useState(false);
  const [hasBackCamera, setHasBackCamera] = useState(false);
  
  const videoRef = useRef<HTMLVideoElement>(null);
  const canvasRef = useRef<HTMLCanvasElement>(null);
  
  const { toast } = useToast();
  const { 
    deviceInfo, 
    permissions, 
    requestCameraAccess, 
    requestGeolocationAccess,
    showIOSInstructions 
  } = useIOSPermissions();

  // Detectar câmeras disponíveis de forma simples
  const detectCameras = useCallback(async () => {
    try {
      if (!navigator.mediaDevices?.enumerateDevices) return;
      
      const devices = await navigator.mediaDevices.enumerateDevices();
      const videoDevices = devices.filter(device => device.kind === 'videoinput');
      
      setHasFrontCamera(videoDevices.some(device => 
        device.label.toLowerCase().includes('front') ||
        device.label.toLowerCase().includes('user')
      ));
      
      setHasBackCamera(videoDevices.some(device => 
        device.label.toLowerCase().includes('back') ||
        device.label.toLowerCase().includes('environment') ||
        !device.label.toLowerCase().includes('front')
      ));
    } catch (error) {
      console.log('Camera detection failed:', error);
    }
  }, []);

  // Iniciar câmera com fallback progressivo
  const startCamera = useCallback(async (preferredFacingMode: 'user' | 'environment' = 'environment') => {
    console.log('🔍 [useSimpleMobileCamera] startCamera chamado com facingMode:', preferredFacingMode);
    
    try {
      setError(null);
      setIsActive(false); // Reset primeiro
      
      console.log('🔍 [useSimpleMobileCamera] Verificando suporte getUserMedia...');
      if (!navigator.mediaDevices || !navigator.mediaDevices.getUserMedia) {
        throw new Error('Navigator.mediaDevices não está disponível');
      }
      
      console.log('🔍 [useSimpleMobileCamera] getUserMedia disponível, configurando constraints...');

      // Configurações progressivas do mais específico para o mais genérico
      const constraints = [
        // Configuração otimizada para mobile
        {
          video: {
            facingMode: { exact: preferredFacingMode },
            width: { ideal: 1280, max: 1920 },
            height: { ideal: 720, max: 1080 },
            frameRate: { ideal: 30 }
          }
        },
        // Fallback sem exact
        {
          video: {
            facingMode: preferredFacingMode,
            width: { ideal: 1280 },
            height: { ideal: 720 }
          }
        },
        // Fallback básico
        {
          video: {
            width: { ideal: 640 },
            height: { ideal: 480 }
          }
        },
        // Último recurso
        { video: true }
      ];

      let currentStream: MediaStream | null = null;

      for (const [index, constraint] of constraints.entries()) {
        try {
          console.log(`🔍 [useSimpleMobileCamera] Tentando constraint ${index + 1}:`, constraint);
          currentStream = await navigator.mediaDevices.getUserMedia(constraint);
          console.log(`✅ [useSimpleMobileCamera] Constraint ${index + 1} funcionou!`);
          break;
        } catch (err) {
          console.log(`❌ [useSimpleMobileCamera] Constraint ${index + 1} falhou:`, err);
          continue;
        }
      }

      if (!currentStream) {
        throw new Error('Não foi possível acessar a câmera com nenhuma configuração');
      }

      console.log('🔍 [useSimpleMobileCamera] Stream obtido, configurando video element...');
      setStream(currentStream);
      setFacingMode(preferredFacingMode);

      if (videoRef.current) {
        console.log('🔍 [useSimpleMobileCamera] Configurando srcObject no video element...');
        videoRef.current.srcObject = currentStream;
        
        // Aguardar o video estar pronto para reproduzir
        const playPromise = videoRef.current.play();
        if (playPromise !== undefined) {
          await playPromise;
        }
        
        console.log('✅ [useSimpleMobileCamera] Video está reproduzindo!');
      }

      setIsActive(true);
      console.log('✅ [useSimpleMobileCamera] Câmera iniciada com sucesso!');

      return currentStream;
    } catch (error) {
      console.error('❌ [useSimpleMobileCamera] Erro ao iniciar câmera:', error);
      setError(`Erro ao acessar câmera: ${error.message}`);
      setIsActive(false);
      
      // Mostrar instruções específicas para iOS se necessário
      if (deviceInfo?.isIOS && deviceInfo?.isInAppBrowser) {
        console.log('🔍 [useSimpleMobileCamera] Mostrando instruções iOS...');
        showIOSInstructions();
      }
      
      throw error;
    }
  }, [deviceInfo, showIOSInstructions]);

  // Alternar entre câmeras
  const switchCamera = useCallback(async () => {
    if (!stream) return;
    
    const newFacingMode = facingMode === 'user' ? 'environment' : 'user';
    
    // Parar stream atual
    stream.getTracks().forEach(track => track.stop());
    
    try {
      await startCamera(newFacingMode);
    } catch (error) {
      toast({
        title: 'Erro',
        description: 'Não foi possível alternar câmera',
        variant: 'destructive'
      });
    }
  }, [stream, facingMode, startCamera, toast]);

  // Parar câmera
  const stopCamera = useCallback(() => {
    if (stream) {
      stream.getTracks().forEach(track => track.stop());
      setStream(null);
    }
    setIsActive(false);
    setError(null);
  }, [stream]);

  // Capturar foto com metadados
  const capturePhoto = useCallback(async (): Promise<{ dataUrl: string; metadata: CameraMetadata }> => {
    if (!videoRef.current || !canvasRef.current || !stream) {
      throw new Error('Câmera não está ativa');
    }

    setIsCapturing(true);

    try {
      const video = videoRef.current;
      const canvas = canvasRef.current;
      const ctx = canvas.getContext('2d');

      if (!ctx) throw new Error('Erro ao acessar canvas');

      // Definir tamanho do canvas baseado no vídeo
      canvas.width = video.videoWidth;
      canvas.height = video.videoHeight;

      // Espelhar imagem se for câmera frontal
      if (facingMode === 'user') {
        ctx.scale(-1, 1);
        ctx.drawImage(video, -canvas.width, 0, canvas.width, canvas.height);
      } else {
        ctx.drawImage(video, 0, 0, canvas.width, canvas.height);
      }

      const dataUrl = canvas.toDataURL('image/jpeg', 0.8);

      // Coletar GPS se possível
      let gpsCoords;
      try {
        const position = await requestGeolocationAccess();
        if (position) {
          gpsCoords = {
            latitude: position.coords.latitude,
            longitude: position.coords.longitude
          };
        }
      } catch (error) {
        console.log('GPS não disponível:', error);
      }

      // Metadados da captura
      const metadata: CameraMetadata = {
        timestamp: Date.now(),
        deviceType: deviceInfo?.deviceModel || 'Unknown',
        facingMode,
        resolution: `${canvas.width}x${canvas.height}`,
        gpsCoords,
        deviceInfo: {
          platform: deviceInfo?.platform,
          isIOS: deviceInfo?.isIOS,
          isMobile: deviceInfo?.isMobile,
          userAgent: deviceInfo?.userAgent
        }
      };

      return { dataUrl, metadata };
    } finally {
      setIsCapturing(false);
    }
  }, [facingMode, stream, deviceInfo, requestGeolocationAccess]);

  // Limpar ao desmontar
  useEffect(() => {
    return () => {
      stopCamera();
    };
  }, [stopCamera]);

  // Detectar câmeras ao montar
  useEffect(() => {
    detectCameras();
  }, [detectCameras]);

  return {
    // Estado
    isActive,
    isCapturing,
    error,
    facingMode,
    hasFrontCamera,
    hasBackCamera,
    permissions,
    deviceInfo,
    
    // Refs
    videoRef,
    canvasRef,
    
    // Funções
    startCamera,
    stopCamera,
    switchCamera,
    capturePhoto,
    
    // Utilities
    requestCameraAccess,
    requestGeolocationAccess
  };
};