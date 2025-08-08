import React from 'react';
import { Alert, AlertDescription, AlertTitle } from '@/components/ui/alert';
import { Button } from '@/components/ui/button';
import { AlertTriangle, Settings, Info, CheckCircle, XCircle } from 'lucide-react';
import { useIOSPermissions } from '@/hooks/useIOSPermissions';

interface IOSPermissionsAlertProps {
  showOnlyWhenNeeded?: boolean;
  compact?: boolean;
}

export const IOSPermissionsAlert: React.FC<IOSPermissionsAlertProps> = ({
  showOnlyWhenNeeded = true,
  compact = false
}) => {
  const { 
    deviceInfo, 
    permissions, 
    checkPermissions,
    showIOSInstructions,
    logDiagnostics 
  } = useIOSPermissions();

  // Não mostrar se não for iOS
  if (!deviceInfo?.isIOS) return null;

  // Se showOnlyWhenNeeded for true, só mostrar quando há problemas
  if (showOnlyWhenNeeded) {
    const hasPermissionIssues = permissions.camera === 'denied' || permissions.geolocation === 'denied';
    const hasContextIssues = !deviceInfo.isHTTPS && !window.location.hostname.includes('localhost');
    
    if (!hasPermissionIssues && !hasContextIssues) return null;
  }

  const getPermissionIcon = (state: string) => {
    switch (state) {
      case 'granted':
        return <CheckCircle className="h-4 w-4 text-green-500" />;
      case 'denied':
        return <XCircle className="h-4 w-4 text-red-500" />;
      default:
        return <Info className="h-4 w-4 text-yellow-500" />;
    }
  };

  const getPermissionText = (state: string) => {
    switch (state) {
      case 'granted':
        return 'Permitido';
      case 'denied':
        return 'Negado';
      case 'prompt':
        return 'Aguardando';
      default:
        return 'Desconhecido';
    }
  };

  const hasContextIssues = !deviceInfo.isHTTPS && !window.location.hostname.includes('localhost');
  const hasDeniedPermissions = permissions.camera === 'denied' || permissions.geolocation === 'denied';

  if (compact) {
    return (
      <Alert className="border-orange-200 bg-orange-50">
        <AlertTriangle className="h-4 w-4 text-orange-600" />
        <AlertTitle className="text-orange-800">Configurações do iOS</AlertTitle>
        <AlertDescription className="text-orange-700">
          <div className="space-y-2">
            {hasContextIssues && (
              <p className="text-sm">⚠️ HTTPS necessário para acesso às permissões</p>
            )}
            
            {hasDeniedPermissions && (
              <p className="text-sm">
                Permissões bloqueadas. Vá em <strong>Configurações → Safari</strong>
              </p>
            )}
            
            <Button
              onClick={showIOSInstructions}
              size="sm"
              variant="outline"
              className="mt-2"
            >
              Ver Instruções
            </Button>
          </div>
        </AlertDescription>
      </Alert>
    );
  }

  return (
    <Alert className="border-blue-200 bg-blue-50">
      <Info className="h-4 w-4 text-blue-600" />
      <AlertTitle className="text-blue-800">
        Status das Permissões - iOS {deviceInfo.version}
      </AlertTitle>
      <AlertDescription className="text-blue-700">
        <div className="space-y-4 mt-3">
          {/* Informações do dispositivo */}
          <div className="grid grid-cols-2 gap-4 text-sm">
            <div>
              <p><strong>Navegador:</strong> {deviceInfo.isSafari ? 'Safari' : 'Outro'}</p>
              <p><strong>PWA:</strong> {deviceInfo.isPWA ? 'Sim' : 'Não'}</p>
            </div>
            <div>
              <p><strong>HTTPS:</strong> {deviceInfo.isHTTPS ? 'Sim' : 'Não'}</p>
              <p><strong>In-App:</strong> {deviceInfo.isInAppBrowser ? 'Sim' : 'Não'}</p>
            </div>
          </div>

          {/* Status das permissões */}
          <div className="space-y-2">
            <h4 className="font-semibold text-blue-800">Permissões:</h4>
            <div className="space-y-1">
              <div className="flex items-center gap-2 text-sm">
                {getPermissionIcon(permissions.camera)}
                <span><strong>Câmera:</strong> {getPermissionText(permissions.camera)}</span>
              </div>
              <div className="flex items-center gap-2 text-sm">
                {getPermissionIcon(permissions.geolocation)}
                <span><strong>Localização:</strong> {getPermissionText(permissions.geolocation)}</span>
              </div>
            </div>
          </div>

          {/* Alertas de contexto */}
          {hasContextIssues && (
            <Alert className="border-orange-200 bg-orange-50">
              <AlertTriangle className="h-4 w-4 text-orange-600" />
              <AlertDescription className="text-orange-700">
                <strong>Contexto Inseguro:</strong> HTTPS é necessário para acessar câmera e localização no iOS.
              </AlertDescription>
            </Alert>
          )}

          {/* Instruções para permissões negadas */}
          {hasDeniedPermissions && (
            <div className="space-y-2">
              <h4 className="font-semibold text-blue-800">Para corrigir permissões negadas:</h4>
              <ol className="text-sm space-y-1 ml-4 list-decimal">
                <li>Abra as <strong>Configurações</strong> do iPhone</li>
                <li>Vá em <strong>Safari</strong></li>
                {permissions.camera === 'denied' && (
                  <li>Toque em <strong>Câmera</strong> → Selecione <strong>Permitir</strong></li>
                )}
                {permissions.geolocation === 'denied' && (
                  <li>Vá em <strong>Privacidade e Segurança</strong> → <strong>Serviços de Localização</strong> → <strong>Safari</strong> → Ative</li>
                )}
                <li>Recarregue esta página</li>
              </ol>
            </div>
          )}

          {/* Botões de ação */}
          <div className="flex gap-2 flex-wrap">
            <Button
              onClick={checkPermissions}
              size="sm"
              variant="outline"
            >
              <Settings className="h-4 w-4 mr-2" />
              Verificar Novamente
            </Button>
            
            <Button
              onClick={showIOSInstructions}
              size="sm"
              variant="outline"
            >
              Mostrar Instruções
            </Button>
            
            <Button
              onClick={logDiagnostics}
              size="sm"
              variant="ghost"
              className="text-xs"
            >
              Debug Console
            </Button>
          </div>

          {/* Informações técnicas para debugging */}
          {process.env.NODE_ENV === 'development' && (
            <details className="text-xs text-blue-600">
              <summary className="cursor-pointer font-medium">
                Informações Técnicas (Dev)
              </summary>
              <pre className="mt-2 text-xs bg-blue-100 p-2 rounded overflow-x-auto">
                {JSON.stringify({
                  deviceInfo,
                  permissions,
                  userAgent: navigator.userAgent,
                  mediaDevices: !!navigator.mediaDevices,
                  geolocation: !!navigator.geolocation,
                  permissionsAPI: !!navigator.permissions,
                  secureContext: window.isSecureContext
                }, null, 2)}
              </pre>
            </details>
          )}
        </div>
      </AlertDescription>
    </Alert>
  );
};