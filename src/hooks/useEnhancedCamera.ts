import { useState, useRef, useCallback } from 'react';
import { useIOSPermissions } from '@/hooks/useIOSPermissions';
import { useToast } from '@/hooks/use-toast';

interface CameraConstraints {
  video: {
    width?: { ideal: number; max: number };
    height?: { ideal: number; max: number };
    facingMode?: { exact: string } | string;
    aspectRatio?: number;
  };
}

interface CameraCapabilities {
  hasMultipleCameras: boolean;
  supportsFrontCamera: boolean;
  supportsBackCamera: boolean;
  availableDevices: MediaDeviceInfo[];
}

export const useEnhancedCamera = () => {
  const videoRef = useRef<HTMLVideoElement>(null);
  const canvasRef = useRef<HTMLCanvasElement>(null);
  
  const [stream, setStream] = useState<MediaStream | null>(null);
  const [cameraActive, setCameraActive] = useState(false);
  const [currentFacing, setCurrentFacing] = useState<'front' | 'back'>('back');
  const [capabilities, setCapabilities] = useState<CameraCapabilities>({
    hasMultipleCameras: false,
    supportsFrontCamera: false,
    supportsBackCamera: false,
    availableDevices: [],
  });
  const [cameraError, setCameraError] = useState<string | null>(null);

  const { deviceInfo, requestCameraAccess, checkSecureContext } = useIOSPermissions();
  const { toast } = useToast();

  const detectCameraCapabilities = useCallback(async () => {
    try {
      if (!navigator.mediaDevices?.enumerateDevices) {
        console.warn('📹 Device enumeration not supported');
        return;
      }

      const devices = await navigator.mediaDevices.enumerateDevices();
      const videoDevices = devices.filter(device => device.kind === 'videoinput');
      
      const capabilities: CameraCapabilities = {
        hasMultipleCameras: videoDevices.length > 1,
        supportsFrontCamera: videoDevices.some(device => 
          device.label.toLowerCase().includes('front') || 
          device.label.toLowerCase().includes('user')
        ),
        supportsBackCamera: videoDevices.some(device => 
          device.label.toLowerCase().includes('back') || 
          device.label.toLowerCase().includes('environment') ||
          !device.label.toLowerCase().includes('front')
        ),
        availableDevices: videoDevices,
      };

      // Fallback: if we can't determine from labels, assume capabilities exist
      if (videoDevices.length > 0 && !capabilities.supportsFrontCamera && !capabilities.supportsBackCamera) {
        capabilities.supportsBackCamera = true;
        if (videoDevices.length > 1) {
          capabilities.supportsFrontCamera = true;
        }
      }

      setCapabilities(capabilities);
      console.log('📹 Camera capabilities detected:', capabilities);
    } catch (error) {
      console.error('📹 Error detecting camera capabilities:', error);
    }
  }, []);

  const startCamera = useCallback(async (facingMode: 'front' | 'back' = 'back') => {
    try {
      console.log(`📹 Starting camera with facing: ${facingMode}`);
      
      // Stop existing stream
      if (stream) {
        stream.getTracks().forEach(track => track.stop());
        setStream(null);
      }

      setCameraActive(false);
      setCameraError(null);

      // Check secure context
      if (!checkSecureContext()) {
        setCameraError('É necessário usar HTTPS para acessar a câmera.');
        return null;
      }

      // Portrait-oriented constraints for mobile
      const constraints: CameraConstraints = {
        video: {
          width: { ideal: 720, max: 1920 },
          height: { ideal: 960, max: 1920 },
          facingMode: facingMode === 'front' ? 'user' : 'environment',
          aspectRatio: 3/4, // Portrait 3:4 ratio
        }
      };

      console.log('📹 Camera constraints:', constraints);

      let mediaStream: MediaStream | null = null;
      
      try {
        // Try exact facing mode first
        mediaStream = await navigator.mediaDevices.getUserMedia({
          video: {
            ...constraints.video,
            facingMode: { exact: facingMode === 'front' ? 'user' : 'environment' }
          }
        });
      } catch (exactError) {
        console.log('📹 Exact facing mode failed, trying ideal:', exactError);
        
        // Fallback to ideal facing mode
        try {
          mediaStream = await navigator.mediaDevices.getUserMedia(constraints);
        } catch (idealError) {
          console.log('📹 Ideal constraints failed, trying basic:', idealError);
          
          // Last resort: basic video only
          mediaStream = await navigator.mediaDevices.getUserMedia({
            video: {
              facingMode: facingMode === 'front' ? 'user' : 'environment'
            }
          });
        }
      }

      if (mediaStream && videoRef.current) {
        const video = videoRef.current;
        video.srcObject = mediaStream;
        setStream(mediaStream);
        setCurrentFacing(facingMode);

        const handleLoadedMetadata = () => {
          console.log('📹 Video metadata loaded, camera active');
          console.log(`📹 Video dimensions: ${video.videoWidth}x${video.videoHeight}`);
          setCameraActive(true);
        };

        video.onloadedmetadata = handleLoadedMetadata;
        video.oncanplay = () => setCameraActive(true);
        
        // Auto-play with error handling
        try {
          await video.play();
        } catch (playError) {
          console.warn('📹 Auto-play failed, user interaction may be required:', playError);
        }

        // Detect actual capabilities after successful stream
        await detectCameraCapabilities();

        return mediaStream;
      }

      return null;
    } catch (error) {
      console.error('📹 Error starting camera:', error);
      setCameraError(`Erro ao acessar a câmera: ${error instanceof Error ? error.message : 'Erro desconhecido'}`);
      return null;
    }
  }, [stream, checkSecureContext, detectCameraCapabilities]);

  const switchCamera = useCallback(async () => {
    const newFacing = currentFacing === 'front' ? 'back' : 'front';
    console.log(`📹 Switching camera from ${currentFacing} to ${newFacing}`);
    
    // Check if the desired camera is available
    const isAvailable = newFacing === 'front' ? capabilities.supportsFrontCamera : capabilities.supportsBackCamera;
    
    if (!isAvailable) {
      toast({
        title: "Câmera não disponível",
        description: `Câmera ${newFacing === 'front' ? 'frontal' : 'traseira'} não está disponível neste dispositivo.`,
        variant: "destructive",
      });
      return false;
    }

    const newStream = await startCamera(newFacing);
    return !!newStream;
  }, [currentFacing, capabilities, startCamera, toast]);

  const stopCamera = useCallback(() => {
    console.log('📹 Stopping camera');
    if (stream) {
      stream.getTracks().forEach(track => track.stop());
      setStream(null);
    }
    setCameraActive(false);
  }, [stream]);

  const capturePhoto = useCallback((): string | null => {
    if (!videoRef.current || !canvasRef.current || !cameraActive) {
      console.error('📹 Camera not ready for capture');
      return null;
    }

    const video = videoRef.current;
    const canvas = canvasRef.current;

    if (video.videoWidth === 0 || video.videoHeight === 0) {
      console.error('📹 Invalid video dimensions');
      setCameraError('Erro: câmera não está pronta');
      return null;
    }

    // Set canvas to match video dimensions
    canvas.width = video.videoWidth;
    canvas.height = video.videoHeight;

    const ctx = canvas.getContext('2d');
    if (!ctx) {
      console.error('📹 Cannot get canvas context');
      return null;
    }

    try {
      // For front camera, flip horizontally to match user expectation
      if (currentFacing === 'front') {
        ctx.scale(-1, 1);
        ctx.drawImage(video, -canvas.width, 0);
        ctx.scale(-1, 1); // Reset transform
      } else {
        ctx.drawImage(video, 0, 0);
      }

      const imageData = canvas.toDataURL('image/jpeg', 0.9);
      console.log('📹 Photo captured successfully');
      return imageData;
    } catch (error) {
      console.error('📹 Error capturing photo:', error);
      setCameraError('Erro ao capturar a foto');
      return null;
    }
  }, [cameraActive, currentFacing]);

  const getCameraMetadata = useCallback(() => {
    if (!videoRef.current) return null;

    const video = videoRef.current;
    return {
      width: video.videoWidth,
      height: video.videoHeight,
      facingMode: currentFacing,
      aspectRatio: video.videoWidth / video.videoHeight,
      deviceInfo: {
        userAgent: navigator.userAgent,
        platform: navigator.platform,
        isIOS: deviceInfo?.isIOS || false,
        isMobile: deviceInfo?.isMobile || false,
      },
      streamSettings: stream?.getVideoTracks()[0]?.getSettings() || null,
    };
  }, [currentFacing, deviceInfo, stream]);

  return {
    videoRef,
    canvasRef,
    stream,
    cameraActive,
    currentFacing,
    capabilities,
    cameraError,
    startCamera,
    switchCamera,
    stopCamera,
    capturePhoto,
    getCameraMetadata,
    detectCameraCapabilities,
  };
};