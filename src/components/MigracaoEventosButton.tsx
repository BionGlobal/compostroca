import { useState } from 'react';
import { Button } from '@/components/ui/button';
import { RefreshCw, CheckCircle, AlertCircle } from 'lucide-react';
import { supabase } from '@/integrations/supabase/client';
import { useToast } from '@/hooks/use-toast';
import { Alert, AlertDescription } from '@/components/ui/alert';

export const MigracaoEventosButton = () => {
  const [loading, setLoading] = useState(false);
  const [resultado, setResultado] = useState<any>(null);
  const { toast } = useToast();

  const executarMigracao = async () => {
    setLoading(true);
    setResultado(null);

    try {
      const { data, error } = await supabase.functions.invoke('migrar-eventos-historicos', {});

      if (error) {
        throw error;
      }

      setResultado(data);

      if (data.success) {
        toast({
          title: 'Migração Concluída',
          description: `${data.eventos_adicionados} eventos criados com sucesso`,
        });
      } else {
        toast({
          title: 'Erro na Migração',
          description: data.error || 'Erro desconhecido',
          variant: 'destructive',
        });
      }
    } catch (error) {
      console.error('Erro ao executar migração:', error);
      toast({
        title: 'Erro',
        description: 'Não foi possível executar a migração de eventos',
        variant: 'destructive',
      });
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="space-y-4">
      <Button
        onClick={executarMigracao}
        disabled={loading}
        variant="outline"
        className="w-full"
      >
        {loading ? (
          <RefreshCw className="mr-2 h-4 w-4 animate-spin" />
        ) : (
          <RefreshCw className="mr-2 h-4 w-4" />
        )}
        Migrar Eventos Históricos
      </Button>

      {resultado && (
        <Alert variant={resultado.success ? 'default' : 'destructive'}>
          {resultado.success ? (
            <CheckCircle className="h-4 w-4" />
          ) : (
            <AlertCircle className="h-4 w-4" />
          )}
          <AlertDescription>
            <div className="space-y-1">
              <p className="font-semibold">
                {resultado.success ? 'Migração Concluída' : 'Erro na Migração'}
              </p>
              {resultado.success && (
                <>
                  <p className="text-sm">Lotes processados: {resultado.total_lotes_processados}</p>
                  <p className="text-sm">Eventos criados: {resultado.eventos_adicionados}</p>
                  <p className="text-sm">Eventos já existentes: {resultado.eventos_ja_existentes}</p>
                  {resultado.erros > 0 && (
                    <p className="text-sm text-destructive">Erros: {resultado.erros}</p>
                  )}
                </>
              )}
            </div>
          </AlertDescription>
        </Alert>
      )}
    </div>
  );
};
