import React, { Component, ErrorInfo, ReactNode } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { AlertTriangle, RefreshCw, ArrowLeft } from 'lucide-react';
import { logger } from '@/utils/errorLogger';

interface Props {
  children: ReactNode;
  pageName: string;
  fallbackComponent?: ReactNode;
  onError?: (error: Error, errorInfo: ErrorInfo) => void;
}

interface State {
  hasError: boolean;
  error?: Error;
  errorInfo?: ErrorInfo;
  retryCount: number;
}

export class PageErrorBoundary extends Component<Props, State> {
  public state: State = {
    hasError: false,
    retryCount: 0,
  };

  public static getDerivedStateFromError(error: Error): State {
    return { hasError: true, error, retryCount: 0 };
  }

  public componentDidCatch(error: Error, errorInfo: ErrorInfo) {
    const { pageName, onError } = this.props;
    
    // Log estruturado específico da página
    logger.error(
      `PAGE_ERROR_${pageName.toUpperCase()}`,
      `Erro na página ${pageName}`,
      {
        pageName,
        componentStack: errorInfo.componentStack,
        retryCount: this.state.retryCount,
        userContext: {
          isAuthenticated: !!localStorage.getItem('supabase.auth.token'),
          timestamp: new Date().toISOString(),
        }
      },
      error
    );

    this.setState({
      error,
      errorInfo,
    });

    // Callback personalizado se fornecido
    if (onError) {
      onError(error, errorInfo);
    }
  }

  private handleRetry = () => {
    const newRetryCount = this.state.retryCount + 1;
    
    logger.info(
      `PAGE_RETRY_${this.props.pageName.toUpperCase()}`,
      `Tentativa de retry ${newRetryCount} na página ${this.props.pageName}`
    );

    this.setState({ 
      hasError: false, 
      error: undefined, 
      errorInfo: undefined,
      retryCount: newRetryCount
    });
  };

  private handleGoBack = () => {
    logger.info(
      `PAGE_NAVIGATION_${this.props.pageName.toUpperCase()}`,
      `Usuário voltou da página ${this.props.pageName} após erro`
    );
    
    window.history.back();
  };

  private handleReload = () => {
    logger.info(
      `PAGE_RELOAD_${this.props.pageName.toUpperCase()}`,
      `Recarregamento forçado da página ${this.props.pageName}`
    );
    
    window.location.reload();
  };

  public render() {
    if (this.state.hasError) {
      // Se há um componente fallback personalizado, usar ele
      if (this.props.fallbackComponent) {
        return this.props.fallbackComponent;
      }

      // Fallback padrão
      return (
        <div className="min-h-[50vh] flex items-center justify-center p-4">
          <Card className="max-w-md w-full border-destructive/20">
            <CardHeader>
              <CardTitle className="flex items-center gap-2 text-destructive">
                <AlertTriangle className="h-5 w-5" />
                Erro na página {this.props.pageName}
              </CardTitle>
            </CardHeader>
            <CardContent className="space-y-4">
              <p className="text-sm text-muted-foreground">
                Ocorreu um erro inesperado. Tente uma das opções abaixo para continuar.
              </p>
              
              {this.state.retryCount > 0 && (
                <div className="text-xs text-muted-foreground bg-muted p-2 rounded">
                  Tentativas de recuperação: {this.state.retryCount}
                </div>
              )}

              {process.env.NODE_ENV === 'development' && this.state.error && (
                <details className="text-xs bg-muted p-2 rounded max-h-32 overflow-y-auto">
                  <summary className="cursor-pointer font-medium">Detalhes técnicos</summary>
                  <pre className="mt-2 whitespace-pre-wrap">{this.state.error.message}</pre>
                  {this.state.error.stack && (
                    <pre className="mt-1 text-xs opacity-70">{this.state.error.stack.slice(0, 300)}...</pre>
                  )}
                </details>
              )}

              <div className="flex flex-col gap-2">
                <Button onClick={this.handleRetry} className="w-full">
                  <RefreshCw className="h-4 w-4 mr-2" />
                  Tentar Novamente
                </Button>
                
                <div className="grid grid-cols-2 gap-2">
                  <Button onClick={this.handleGoBack} variant="outline" size="sm">
                    <ArrowLeft className="h-4 w-4 mr-1" />
                    Voltar
                  </Button>
                  
                  <Button onClick={this.handleReload} variant="outline" size="sm">
                    <RefreshCw className="h-4 w-4 mr-1" />
                    Recarregar
                  </Button>
                </div>
              </div>
            </CardContent>
          </Card>
        </div>
      );
    }

    return this.props.children;
  }
}