import { useState } from 'react';
import { Button } from './ui/button';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from './ui/card';
import { Badge } from './ui/badge';
import { supabase } from '@/integrations/supabase/client';
import { useToast } from '@/hooks/use-toast';
import { History, AlertCircle, CheckCircle2, Loader2 } from 'lucide-react';

export const MigracaoEventosButton = () => {
  const [loading, setLoading] = useState(false);
  const [resultado, setResultado] = useState<any>(null);
  const { toast } = useToast();

  const executarMigracao = async () => {
    try {
      setLoading(true);
      setResultado(null);

      toast({
        title: "Iniciando migração",
        description: "Gerando eventos retroativos para lotes históricos...",
      });

      const { data, error } = await supabase.functions.invoke('migrar-eventos-lote', {
        body: { force: true }
      });

      if (error) {
        throw error;
      }

      setResultado(data);

      toast({
        title: "Migração concluída!",
        description: `${data.lotesMigrados} lotes processados com sucesso`,
      });

    } catch (error) {
      console.error('Erro na migração:', error);
      toast({
        title: "Erro na migração",
        description: error instanceof Error ? error.message : "Erro desconhecido",
        variant: "destructive",
      });
    } finally {
      setLoading(false);
    }
  };

  return (
    <Card className="border-amber-200 dark:border-amber-800">
      <CardHeader>
        <CardTitle className="flex items-center gap-2">
          <History className="h-5 w-5 text-amber-600" />
          Migração de Eventos Históricos
        </CardTitle>
        <CardDescription>
          Gera eventos de rastreabilidade retroativos para lotes que ainda não possuem a trilha completa de 8 etapas
        </CardDescription>
      </CardHeader>
      <CardContent className="space-y-4">
        <div className="flex items-start gap-3 p-3 bg-amber-50 dark:bg-amber-950/30 rounded-lg border border-amber-200 dark:border-amber-800">
          <AlertCircle className="h-5 w-5 text-amber-600 mt-0.5 flex-shrink-0" />
          <div className="text-sm text-amber-900 dark:text-amber-100">
            <p className="font-medium mb-1">⚠️ Atenção:</p>
            <ul className="list-disc list-inside space-y-1 text-amber-700 dark:text-amber-300">
              <li>Esta operação gera eventos históricos para lotes sem rastreabilidade completa</li>
              <li>Os eventos são criados com base em dados existentes de entregas e lotes</li>
              <li>Recomendado executar apenas uma vez por lote</li>
            </ul>
          </div>
        </div>

        <Button 
          onClick={executarMigracao}
          disabled={loading}
          className="w-full"
        >
          {loading ? (
            <>
              <Loader2 className="mr-2 h-4 w-4 animate-spin" />
              Processando migração...
            </>
          ) : (
            <>
              <History className="mr-2 h-4 w-4" />
              Executar Migração Retroativa
            </>
          )}
        </Button>

        {resultado && (
          <div className="space-y-3 p-4 bg-green-50 dark:bg-green-950/30 rounded-lg border border-green-200 dark:border-green-800">
            <div className="flex items-center gap-2">
              <CheckCircle2 className="h-5 w-5 text-green-600" />
              <span className="font-semibold text-green-900 dark:text-green-100">
                Migração concluída com sucesso!
              </span>
            </div>
            
            <div className="grid grid-cols-2 gap-2 text-sm">
              <div className="flex flex-col gap-1">
                <span className="text-muted-foreground">Lotes Processados:</span>
                <Badge variant="secondary" className="w-fit">
                  {resultado.totalLotesProcessados || 0}
                </Badge>
              </div>
              
              <div className="flex flex-col gap-1">
                <span className="text-muted-foreground">Lotes Migrados:</span>
                <Badge variant="default" className="w-fit bg-green-600">
                  {resultado.lotesMigrados || 0}
                </Badge>
              </div>

              {resultado.erros && resultado.erros.length > 0 && (
                <div className="col-span-2 flex flex-col gap-1">
                  <span className="text-muted-foreground">Erros:</span>
                  <Badge variant="destructive" className="w-fit">
                    {resultado.erros.length}
                  </Badge>
                </div>
              )}
            </div>

            {resultado.detalhes && (
              <details className="text-xs text-muted-foreground">
                <summary className="cursor-pointer hover:text-foreground">
                  Ver detalhes completos
                </summary>
                <pre className="mt-2 p-2 bg-background rounded border overflow-x-auto">
                  {JSON.stringify(resultado.detalhes, null, 2)}
                </pre>
              </details>
            )}
          </div>
        )}
      </CardContent>
    </Card>
  );
};
