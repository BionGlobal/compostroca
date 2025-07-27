import { useState } from 'react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Dialog, DialogContent, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { Package, CheckCircle } from 'lucide-react';
import { LoteExtended } from '@/hooks/useLotesManager';

interface FinalizationModalProps {
  lote: LoteExtended;
  open: boolean;
  onOpenChange: (open: boolean) => void;
  onFinalizar: (loteId: string, pesoFinal: number) => void;
}

export const FinalizationModal = ({ 
  lote, 
  open, 
  onOpenChange, 
  onFinalizar 
}: FinalizationModalProps) => {
  const [pesoFinal, setPesoFinal] = useState('');
  const [loading, setLoading] = useState(false);

  const handleFinalizar = async () => {
    if (!pesoFinal || parseFloat(pesoFinal) <= 0) return;

    setLoading(true);
    try {
      await onFinalizar(lote.id, parseFloat(pesoFinal));
      setPesoFinal('');
      onOpenChange(false);
    } catch (error) {
      console.error('Erro ao finalizar:', error);
    } finally {
      setLoading(false);
    }
  };

  const pesoEsperado = lote.peso_inicial * 0.78; // 22% de redução

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-[425px]">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <CheckCircle className="h-5 w-5 text-success" />
            Finalizar Lote - Box 7
          </DialogTitle>
        </DialogHeader>

        <div className="space-y-4">
          <div className="glass-light rounded-lg p-3">
            <p className="font-medium text-sm">{lote.codigo}</p>
            <p className="text-xs text-muted-foreground">
              Peso inicial: {lote.peso_inicial.toFixed(1)}kg
            </p>
          </div>

          <div className="space-y-2">
            <label className="text-sm font-medium flex items-center gap-2">
              <Package className="h-4 w-4" />
              Peso final do composto (kg)
            </label>
            <Input
              type="number"
              step="0.1"
              placeholder={`Ex: ${pesoEsperado.toFixed(1)}`}
              value={pesoFinal}
              onChange={(e) => setPesoFinal(e.target.value)}
            />
            <p className="text-xs text-muted-foreground">
              Peso esperado: ~{pesoEsperado.toFixed(1)}kg (redução de 22%)
            </p>
          </div>

          <div className="glass-light rounded-lg p-3 text-xs text-muted-foreground">
            <p className="font-medium text-sm text-foreground mb-2">Confirme que:</p>
            <ul className="space-y-1">
              <li>✓ O composto está pronto para distribuição</li>
              <li>✓ A caixa 7 foi completamente esvaziada</li>
              <li>✓ O peso foi verificado corretamente</li>
            </ul>
          </div>

          <div className="flex gap-2">
            <Button
              variant="outline"
              className="flex-1"
              onClick={() => onOpenChange(false)}
              disabled={loading}
            >
              Cancelar
            </Button>
            <Button
              className="flex-1"
              onClick={handleFinalizar}
              disabled={!pesoFinal || parseFloat(pesoFinal) <= 0 || loading}
            >
              {loading ? 'Finalizando...' : 'Finalizar Lote'}
            </Button>
          </div>
        </div>
      </DialogContent>
    </Dialog>
  );
};