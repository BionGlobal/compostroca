import { useState, useEffect, useCallback } from 'react';
import { useToast } from '@/hooks/use-toast';

interface DeviceInfo {
  isIOS: boolean;
  isAndroid: boolean;
  isMobile: boolean;
  isInAppBrowser: boolean;
  isSafari: boolean;
  isChrome: boolean;
  isPWA: boolean;
  isHTTPS: boolean;
  userAgent: string;
  version?: string;
  deviceModel?: string;
  isStandalone: boolean;
  supportsMediaDevices: boolean;
  supportsGeolocation: boolean;
  supportsPermissionsAPI: boolean;
  platform: string;
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

  // Detectar informações do dispositivo e navegador com mais detalhes
  const detectDevice = useCallback((): DeviceInfo => {
    const userAgent = navigator.userAgent;
    const isIOS = /iPad|iPhone|iPod/.test(userAgent);
    const isAndroid = /Android/.test(userAgent);
    const isMobile = isIOS || isAndroid || /Mobile|Tablet/.test(userAgent);
    const isSafari = /Safari/.test(userAgent) && !/Chrome|CriOS|FxiOS|EdgiOS/.test(userAgent);
    const isChrome = /Chrome/.test(userAgent) && !/Edge/.test(userAgent);
    
    // Detectar navegadores in-app mais comuns
    const inAppBrowsers = [
      'FBAN', 'FBAV', 'Instagram', 'Twitter', 'Line', 'WhatsApp', 
      'TikTok', 'LinkedIn', 'Snapchat', 'Pinterest', 'Messenger'
    ];
    const isInAppBrowser = inAppBrowsers.some(browser => userAgent.includes(browser));
    
    const isPWA = window.matchMedia('(display-mode: standalone)').matches;
    const isStandalone = (window.navigator as any).standalone === true;
    const isHTTPS = location.protocol === 'https:' || location.hostname === 'localhost';
    
    // Detectar modelo do dispositivo e versão
    let deviceModel;
    let version;
    let platform = 'Unknown';
    
    if (isIOS) {
      platform = 'iOS';
      // Versão do iOS
      const versionMatch = userAgent.match(/OS (\d+)_(\d+)_?(\d+)?/);
      if (versionMatch) {
        version = `${versionMatch[1]}.${versionMatch[2]}${versionMatch[3] ? '.' + versionMatch[3] : ''}`;
      }
      
      // Modelo do dispositivo
      if (userAgent.includes('iPhone')) {
        deviceModel = 'iPhone';
      } else if (userAgent.includes('iPad')) {
        deviceModel = 'iPad';
      } else if (userAgent.includes('iPod')) {
        deviceModel = 'iPod';
      }
    } else if (isAndroid) {
      platform = 'Android';
      // Versão do Android
      const versionMatch = userAgent.match(/Android (\d+(?:\.\d+)*)/);
      if (versionMatch) {
        version = versionMatch[1];
      }
      
      // Modelo do dispositivo Android (mais genérico)
      if (userAgent.includes('Mobile')) {
        deviceModel = 'Android Phone';
      } else if (userAgent.includes('Tablet')) {
        deviceModel = 'Android Tablet';
      } else {
        deviceModel = 'Android Device';
      }
    } else if (isMobile) {
      platform = 'Mobile';
      deviceModel = 'Mobile Device';
    } else {
      platform = 'Desktop';
      deviceModel = 'Desktop';
    }

    return {
      isIOS,
      isAndroid,
      isMobile,
      isInAppBrowser,
      isSafari,
      isChrome,
      isPWA: isPWA || isStandalone,
      isStandalone,
      isHTTPS,
      userAgent,
      version,
      deviceModel,
      platform,
      supportsMediaDevices: !!navigator.mediaDevices,
      supportsGeolocation: !!navigator.geolocation,
      supportsPermissionsAPI: !!navigator.permissions
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

  // Tentar acessar câmera com retry inteligente e fallbacks progressivos
  const requestCameraAccess = useCallback(async (retryCount = 0, useFrontCamera = false): Promise<MediaStream | null> => {
    const maxRetries = 3;
    
    try {
      console.log(`📱 Tentativa ${retryCount + 1} de acesso à câmera${useFrontCamera ? ' (frontal)' : ''}`);
      
      // Verificar se MediaDevices está disponível
      if (!navigator.mediaDevices || !navigator.mediaDevices.getUserMedia) {
        throw new Error('MediaDevices API não suportada');
      }
      
      // Configurações progressivas baseadas na tentativa
      let constraints: MediaStreamConstraints;
      
      if (retryCount === 0) {
        // Primeira tentativa: configurações ideais
        constraints = {
          video: {
            facingMode: useFrontCamera ? 'user' : 'environment',
            width: { ideal: 1280, max: 1920 },
            height: { ideal: 720, max: 1080 },
            frameRate: { ideal: 30, max: 60 }
          }
        };
      } else if (retryCount === 1) {
        // Segunda tentativa: configurações médias
        constraints = {
          video: {
            facingMode: useFrontCamera ? 'user' : 'environment',
            width: { ideal: 640 },
            height: { ideal: 480 }
          }
        };
      } else {
        // Última tentativa: configurações mínimas
        constraints = {
          video: useFrontCamera ? { facingMode: 'user' } : { facingMode: 'environment' }
        };
      }

      // Para navegadores in-app ou dispositivos móveis, usar configurações mais simples
      if (deviceInfo?.isInAppBrowser || (deviceInfo?.isMobile && retryCount > 0)) {
        constraints.video = useFrontCamera ? { facingMode: 'user' } : true;
      }

      const stream = await navigator.mediaDevices.getUserMedia(constraints);
      
      setPermissions(prev => ({ ...prev, camera: 'granted' }));
      console.log('✅ Câmera acessada com sucesso');
      
      return stream;
      
    } catch (error: any) {
      console.error(`❌ Erro na tentativa ${retryCount + 1}:`, error);
      
      if (error.name === 'NotAllowedError') {
        setPermissions(prev => ({ ...prev, camera: 'denied' }));
        console.log('📱 Permissão de câmera negada pelo usuário');
        
        if (deviceInfo?.isInAppBrowser) {
          toast({
            title: "Navegador In-App Detectado",
            description: deviceInfo.isIOS 
              ? "Para usar a câmera, abra este site no Safari."
              : "Para usar a câmera, abra este site no navegador principal.",
            variant: "destructive"
          });
        } else if (deviceInfo?.isIOS) {
          toast({
            title: "Câmera Bloqueada",
            description: "Vá em Configurações > Safari > Câmera > Permitir",
            variant: "destructive"
          });
        } else if (deviceInfo?.isAndroid) {
          toast({
            title: "Câmera Bloqueada",
            description: "Permita o acesso à câmera quando solicitado ou nas configurações do navegador.",
            variant: "destructive"
          });
        } else {
          toast({
            title: "Câmera Bloqueada",
            description: "Permita o acesso à câmera nas configurações do navegador.",
            variant: "destructive"
          });
        }
      } else if (error.name === 'NotFoundError') {
        console.log('📱 Câmera não encontrada');
        
        // Tentar câmera frontal se estava tentando a traseira
        if (!useFrontCamera && retryCount === 0) {
          console.log('📱 Tentando câmera frontal...');
          return requestCameraAccess(0, true);
        }
        
        toast({
          title: "Câmera Não Encontrada",
          description: "Nenhuma câmera foi encontrada neste dispositivo.",
          variant: "destructive"
        });
      } else if (error.name === 'NotReadableError' || error.name === 'AbortError') {
        console.log('📱 Câmera em uso ou erro de hardware');
        
        if (retryCount < maxRetries) {
          console.log(`📱 Tentando novamente em ${(retryCount + 1) * 2} segundos...`);
          await new Promise(resolve => setTimeout(resolve, (retryCount + 1) * 2000));
          return requestCameraAccess(retryCount + 1, useFrontCamera);
        }
        
        toast({
          title: "Câmera Indisponível",
          description: "A câmera pode estar sendo usada por outro aplicativo.",
          variant: "destructive"
        });
      } else if (error.name === 'OverconstrainedError') {
        console.log('📱 Configurações não suportadas');
        
        if (retryCount < maxRetries) {
          return requestCameraAccess(retryCount + 1, useFrontCamera);
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
            } else if (deviceInfo?.isAndroid) {
              toast({
                title: "Localização Bloqueada",
                description: "Permita o acesso à localização quando solicitado ou nas configurações do navegador.",
                variant: "destructive"
              });
            } else {
              toast({
                title: "Localização Bloqueada",
                description: "Permita o acesso à localização nas configurações do navegador.",
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
    console.log('Sistema:', `${deviceInfo.platform} ${deviceInfo.version || ''}`);
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
    
    if (info.isMobile) {
      console.log(`📱 Dispositivo ${info.platform} detectado, iniciando verificações...`);
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