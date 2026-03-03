import { useState } from 'react';
import { Button } from '@/components/ui/button';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription, DialogFooter } from '@/components/ui/dialog';
import { Alert, AlertDescription } from '@/components/ui/alert';
import { supabase } from '@/integrations/supabase/client';
import { useAuth } from '@/hooks/useAuth';
import { AlertTriangle, CheckCircle, Loader2, TreePine } from 'lucide-react';
import { toast } from 'sonner';

export const AdminEncerramento = () => {
  const { profile } = useAuth();
  const [open, setOpen] = useState(false);
  const [loading, setLoading] = useState(false);
  const [resultado, setResultado] = useState<Record<string, unknown> | null>(null);

  if (!profile || profile.user_role !== 'super_admin') return null;

  const executarEncerramento = async () => {
    setLoading(true);
    try {
      const { data, error } = await supabase.functions.invoke('encerrar-lotes-ferias', {
        body: {
          unidade: 'CWB001',
          motivo: 'Recesso operacional Dez/2025-Fev/2026. Compostagem completou ciclo natural sem manejo formal registrado. Composto resultante foi distribuído.'
        }
      });

      if (error) throw error;
      setResultado(data);
      toast.success(`${data.total_lotes_encerrados} lotes encerrados com sucesso!`);
    } catch (err: unknown) {
      const message = err instanceof Error ? err.message : 'Erro desconhecido';
      toast.error('Erro no encerramento: ' + message);
    } finally {
      setLoading(false);
    }
  };

  return (
    <>
      <Button
        variant="destructive"
        className="w-full"
        onClick={() => setOpen(true)}
      >
        <TreePine className="h-4 w-4 mr-2" />
        Encerrar Lotes — Recesso Operacional
      </Button>

      <Dialog open={open} onOpenChange={setOpen}>
        <DialogContent className="max-w-md max-h-[80vh] overflow-y-auto">
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2">
              <AlertTriangle className="h-5 w-5 text-destructive" />
              Encerramento Administrativo
            </DialogTitle>
            <DialogDescription>
              Esta ação encerrará todos os lotes ativos da CWB001 com peso final estimado por decaimento.
            </DialogDescription>
          </DialogHeader>

          {resultado ? (
            <div className="space-y-3">
              <Alert>
                <CheckCircle className="h-4 w-4 text-green-600" />
                <AlertDescription>
                  <strong>{(resultado as { total_lotes_encerrados?: number }).total_lotes_encerrados}</strong> lotes encerrados.
                  {(resultado as { total_erros?: number }).total_erros > 0 && (
                    <span className="text-destructive"> ({(resultado as { total_erros?: number }).total_erros} erros)</span>
                  )}
                </AlertDescription>
              </Alert>
              <pre className="text-xs bg-muted p-3 rounded-lg overflow-auto max-h-60">
                {JSON.stringify(resultado, null, 2)}
              </pre>
              <DialogFooter>
                <Button onClick={() => { setOpen(false); window.location.reload(); }}>
                  Fechar e Atualizar
                </Button>
              </DialogFooter>
            </div>
          ) : (
            <DialogFooter className="gap-2">
              <Button variant="outline" onClick={() => setOpen(false)} disabled={loading}>
                Cancelar
              </Button>
              <Button variant="destructive" onClick={executarEncerramento} disabled={loading}>
                {loading ? <Loader2 className="h-4 w-4 animate-spin mr-2" /> : null}
                {loading ? 'Processando...' : 'Confirmar Encerramento'}
              </Button>
            </DialogFooter>
          )}
        </DialogContent>
      </Dialog>
    </>
  );
};
