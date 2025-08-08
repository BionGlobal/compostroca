import { useState, useEffect, useCallback } from 'react';
import { useToast } from '@/hooks/use-toast';

interface DeviceInfo {
  isIOS: boolean;
  isInAppBrowser: boolean;
  isSafari: boolean;
  isPWA: boolean;
  isHTTPS: boolean;
  userAgent: string;
  version?: string;
}

interface PermissionState {
  camera: 'prompt' | 'granted' | 'denied' | 'unknown';
  geolocation: 'prompt' | 'granted' | 'denied' | 'unknown';
}

export const useIOSPermissions = () => {
  const [deviceInfo, setDeviceInfo] = useState<DeviceInfo | null>(null);
  const [permissions, setPermissions] = useState<PermissionState>({
    camera: 'unknown',
    geolocation: 'unknown'
  });
  const [isCheckingPermissions, setIsCheckingPermissions] = useState(false);
  const { toast } = useToast();

  // Detectar informações do dispositivo e navegador
  const detectDevice = useCallback((): DeviceInfo => {
    const userAgent = navigator.userAgent;
    const isIOS = /iPad|iPhone|iPod/.test(userAgent);
    const isSafari = /Safari/.test(userAgent) && !/Chrome|CriOS|FxiOS/.test(userAgent);
    const isInAppBrowser = /FBAN|FBAV|Instagram|Twitter|Line|WhatsApp/.test(userAgent);
    const isPWA = window.matchMedia('(display-mode: standalone)').matches || 
                  (window.navigator as any).standalone === true;
    const isHTTPS = location.protocol === 'https:';
    
    // Detectar versão do iOS
    let version;
    if (isIOS) {
      const match = userAgent.match(/OS (\d+)_(\d+)_?(\d+)?/);
      if (match) {
        version = `${match[1]}.${match[2]}${match[3] ? '.' + match[3] : ''}`;
      }
    }

    return {
      isIOS,
      isInAppBrowser,
      isSafari,
      isPWA,
      isHTTPS,
      userAgent,
      version
    };
  }, []);

  // Verificar permissões usando Permissions API quando disponível
  const checkPermissions = useCallback(async () => {
    setIsCheckingPermissions(true);
    
    try {
      // Tentar usar Permissions API (disponível em alguns navegadores iOS)
      if ('permissions' in navigator) {
        try {
          const cameraPermission = await navigator.permissions.query({ name: 'camera' as PermissionName });
          const geoPermission = await navigator.permissions.query({ name: 'geolocation' as PermissionName });
          
          setPermissions({
            camera: cameraPermission.state,
            geolocation: geoPermission.state
          });
          
          // Log para debugging
          console.log('📱 Permissions API - Camera:', cameraPermission.state, 'Geolocation:', geoPermission.state);
          
        } catch (error) {
          console.log('📱 Permissions API não disponível:', error);
          setPermissions({
            camera: 'unknown',
            geolocation: 'unknown'
          });
        }
      } else {
        console.log('📱 Permissions API não suportada');
        setPermissions({
          camera: 'unknown',
          geolocation: 'unknown'
        });
      }
    } catch (error) {
      console.error('📱 Erro ao verificar permissões:', error);
    } finally {
      setIsCheckingPermissions(false);
    }
  }, []);

  // Tentar acessar câmera com retry e fallbacks
  const requestCameraAccess = useCallback(async (retryCount = 0): Promise<MediaStream | null> => {
    const maxRetries = 3;
    
    try {
      console.log(`📱 Tentativa ${retryCount + 1} de acesso à câmera`);
      
      // Configurações específicas para iOS
      const constraints: MediaStreamConstraints = {
        video: {
          facingMode: 'environment',
          width: { ideal: 1280, max: 1920 },
          height: { ideal: 720, max: 1080 },
          frameRate: { ideal: 30, max: 60 }
        }
      };

      // Para iOS < 14.3, usar configurações mais simples
      if (deviceInfo?.isIOS && deviceInfo?.version && parseFloat(deviceInfo.version) < 14.3) {
        constraints.video = { facingMode: 'environment' };
      }

      const stream = await navigator.mediaDevices.getUserMedia(constraints);
      
      setPermissions(prev => ({ ...prev, camera: 'granted' }));
      console.log('✅ Câmera acessada com sucesso');
      
      return stream;
      
    } catch (error: any) {
      console.error(`❌ Erro na tentativa ${retryCount + 1}:`, error);
      
      // Log detalhado do erro
      if (error.name === 'NotAllowedError') {
        setPermissions(prev => ({ ...prev, camera: 'denied' }));
        console.log('📱 Permissão de câmera negada pelo usuário');
        
        if (deviceInfo?.isIOS) {
          toast({
            title: "Câmera Bloqueada",
            description: "Para usar a câmera, vá em Configurações > Safari > Câmera e permita o acesso.",
            variant: "destructive"
          });
        }
      } else if (error.name === 'NotFoundError') {
        console.log('📱 Câmera não encontrada no dispositivo');
        toast({
          title: "Câmera Não Encontrada",
          description: "Nenhuma câmera foi encontrada neste dispositivo.",
          variant: "destructive"
        });
      } else if (error.name === 'NotReadableError') {
        console.log('📱 Câmera está sendo usada por outro aplicativo');
        
        // Retry para este erro específico
        if (retryCount < maxRetries) {
          console.log(`📱 Tentando novamente em 2 segundos...`);
          await new Promise(resolve => setTimeout(resolve, 2000));
          return requestCameraAccess(retryCount + 1);
        }
      }
      
      return null;
    }
  }, [deviceInfo, toast]);

  // Tentar acessar geolocalização com configurações otimizadas para iOS
  const requestGeolocationAccess = useCallback(async (): Promise<GeolocationPosition | null> => {
    return new Promise((resolve) => {
      if (!navigator.geolocation) {
        console.log('📱 Geolocalização não suportada');
        toast({
          title: "Geolocalização Não Suportada",
          description: "Este navegador não suporta geolocalização.",
          variant: "destructive"
        });
        resolve(null);
        return;
      }

      console.log('📱 Solicitando acesso à geolocalização');

      // Configurações otimizadas para iOS
      const options: PositionOptions = {
        enableHighAccuracy: true,
        timeout: deviceInfo?.isIOS ? 30000 : 15000, // Timeout maior para iOS
        maximumAge: 60000 // Permite cache de 1 minuto
      };

      const successCallback = (position: GeolocationPosition) => {
        setPermissions(prev => ({ ...prev, geolocation: 'granted' }));
        console.log('✅ Geolocalização obtida:', position.coords.latitude, position.coords.longitude);
        resolve(position);
      };

      const errorCallback = (error: GeolocationPositionError) => {
        console.error('❌ Erro de geolocalização:', error);
        
        switch (error.code) {
          case error.PERMISSION_DENIED:
            setPermissions(prev => ({ ...prev, geolocation: 'denied' }));
            console.log('📱 Permissão de geolocalização negada');
            
            if (deviceInfo?.isIOS) {
              toast({
                title: "Localização Bloqueada",
                description: "Para usar a localização, vá em Configurações > Privacidade > Serviços de Localização e permita o acesso para Safari.",
                variant: "destructive"
              });
            }
            break;
            
          case error.POSITION_UNAVAILABLE:
            console.log('📱 Localização indisponível');
            toast({
              title: "Localização Indisponível",
              description: "Não foi possível obter sua localização atual.",
              variant: "destructive"
            });
            break;
            
          case error.TIMEOUT:
            console.log('📱 Timeout de geolocalização');
            toast({
              title: "Tempo Esgotado",
              description: "A obtenção da localização demorou muito tempo.",
              variant: "destructive"
            });
            break;
        }
        
        resolve(null);
      };

      navigator.geolocation.getCurrentPosition(successCallback, errorCallback, options);
    });
  }, [deviceInfo, toast]);

  // Verificar se estamos em contexto seguro
  const checkSecureContext = useCallback(() => {
    const isSecure = window.isSecureContext;
    console.log('📱 Contexto seguro:', isSecure);
    
    if (!isSecure && deviceInfo?.isIOS) {
      toast({
        title: "Contexto Inseguro",
        description: "Para acessar câmera e localização, é necessário usar HTTPS.",
        variant: "destructive"
      });
    }
    
    return isSecure;
  }, [deviceInfo, toast]);

  // Mostrar instruções específicas para iOS
  const showIOSInstructions = useCallback(() => {
    if (!deviceInfo?.isIOS) return;
    
    const instructions = [];
    
    if (permissions.camera === 'denied') {
      instructions.push("• Vá em Configurações > Safari > Câmera > Permitir");
    }
    
    if (permissions.geolocation === 'denied') {
      instructions.push("• Vá em Configurações > Privacidade > Serviços de Localização > Safari > Permitir");
    }
    
    if (instructions.length > 0) {
      toast({
        title: "Configurações do iOS",
        description: "Para usar todas as funcionalidades:\n" + instructions.join('\n'),
        duration: 10000
      });
    }
  }, [deviceInfo, permissions, toast]);

  // Log detalhado para debugging
  const logDiagnostics = useCallback(() => {
    if (!deviceInfo) return;
    
    console.group('📱 Diagnóstico do Dispositivo');
    console.log('Sistema:', deviceInfo.isIOS ? `iOS ${deviceInfo.version}` : 'Outro');
    console.log('Navegador:', deviceInfo.isSafari ? 'Safari' : 'Outro');
    console.log('In-App Browser:', deviceInfo.isInAppBrowser);
    console.log('PWA:', deviceInfo.isPWA);
    console.log('HTTPS:', deviceInfo.isHTTPS);
    console.log('User Agent:', deviceInfo.userAgent);
    console.log('Permissões - Câmera:', permissions.camera, 'Localização:', permissions.geolocation);
    console.log('MediaDevices disponível:', !!navigator.mediaDevices);
    console.log('Geolocation disponível:', !!navigator.geolocation);
    console.log('Permissions API disponível:', !!navigator.permissions);
    console.groupEnd();
  }, [deviceInfo, permissions]);

  // Inicializar na montagem do hook
  useEffect(() => {
    const info = detectDevice();
    setDeviceInfo(info);
    
    if (info.isIOS) {
      console.log('📱 Dispositivo iOS detectado, iniciando verificações...');
      checkPermissions();
    }
  }, [detectDevice, checkPermissions]);

  // Log diagnósticos quando device info ou permissões mudarem
  useEffect(() => {
    if (deviceInfo) {
      logDiagnostics();
    }
  }, [deviceInfo, permissions, logDiagnostics]);

  return {
    deviceInfo,
    permissions,
    isCheckingPermissions,
    requestCameraAccess,
    requestGeolocationAccess,
    checkPermissions,
    checkSecureContext,
    showIOSInstructions,
    logDiagnostics
  };
};