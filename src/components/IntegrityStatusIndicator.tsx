import { Badge } from '@/components/ui/badge';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { CheckCircle, AlertTriangle, Info } from 'lucide-react';

interface IntegrityStatusProps {
  estatisticas: {
    total_fotos_entregas: number;
    total_fotos_manejo: number;
    total_fotos_unificadas: number;
    total_manejo_registros: number;
    duplicatas_detectadas: number;
    inconsistencias: string[];
  };
}

export const IntegrityStatusIndicator: React.FC<IntegrityStatusProps> = ({ estatisticas }) => {
  const hasIssues = estatisticas.inconsistencias.length > 0 || estatisticas.duplicatas_detectadas > 0;
  const status = hasIssues ? 'warning' : 'success';

  return (
    <Card className="w-full">
      <CardHeader>
        <CardTitle className="flex items-center gap-2 text-lg">
          {status === 'success' ? (
            <CheckCircle className="h-5 w-5 text-green-600" />
          ) : (
            <AlertTriangle className="h-5 w-5 text-amber-600" />
          )}
          Status da Integridade dos Dados
        </CardTitle>
        <CardDescription>
          Sistema unificado de fotos e validação de auditoria
        </CardDescription>
      </CardHeader>
      <CardContent className="space-y-4">
        <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
          <div className="text-center">
            <div className="text-2xl font-bold text-primary">
              {estatisticas.total_fotos_unificadas}
            </div>
            <div className="text-sm text-muted-foreground">Fotos Unificadas</div>
          </div>
          <div className="text-center">
            <div className="text-2xl font-bold text-blue-600">
              {estatisticas.total_fotos_entregas}
            </div>
            <div className="text-sm text-muted-foreground">Fotos Entregas</div>
          </div>
          <div className="text-center">
            <div className="text-2xl font-bold text-purple-600">
              {estatisticas.total_fotos_manejo}
            </div>
            <div className="text-sm text-muted-foreground">Fotos Manutenção</div>
          </div>
          <div className="text-center">
            <div className="text-2xl font-bold text-green-600">
              {estatisticas.total_manejo_registros}
            </div>
            <div className="text-sm text-muted-foreground">Registros Manejo</div>
          </div>
        </div>

        {estatisticas.duplicatas_detectadas > 0 && (
          <div className="flex items-center gap-2 p-3 bg-amber-50 rounded-lg border border-amber-200">
            <Info className="h-4 w-4 text-amber-600" />
            <span className="text-amber-700 text-sm">
              <strong>{estatisticas.duplicatas_detectadas}</strong> fotos duplicadas foram automaticamente removidas da exibição
            </span>
          </div>
        )}

        {estatisticas.inconsistencias.length > 0 && (
          <div className="space-y-2">
            <div className="flex items-center gap-2">
              <AlertTriangle className="h-4 w-4 text-amber-600" />
              <span className="font-medium text-amber-700">Avisos de Integridade:</span>
            </div>
            <div className="space-y-1">
              {estatisticas.inconsistencias.map((inconsistencia, index) => (
                <div key={index} className="text-sm text-amber-700 bg-amber-50 p-2 rounded border-l-4 border-amber-400">
                  • {inconsistencia}
                </div>
              ))}
            </div>
          </div>
        )}

        <div className="flex items-center justify-between pt-3 border-t">
          <Badge variant={status === 'success' ? 'default' : 'secondary'} className="px-3 py-1">
            {status === 'success' ? '✓ Sistema Íntegro' : '⚠ Avisos Detectados'}
          </Badge>
          <span className="text-xs text-muted-foreground">
            Última verificação: {new Date().toLocaleString('pt-BR')}
          </span>
        </div>
      </CardContent>
    </Card>
  );
};