import { useState } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Textarea } from '@/components/ui/textarea';
import { Badge } from '@/components/ui/badge';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from '@/components/ui/dialog';
import { Camera, MapPin, Clock, Scale, Settings, AlertTriangle } from 'lucide-react';
import { LoteExtended } from '@/hooks/useLotesManager';
import { EntregaFotosCapture } from '@/components/EntregaFotosCapture';

interface ManejoCardProps {
  lote: LoteExtended;
  onRegistrarManejo: (
    loteId: string,
    pesoNovo: number,
    fotoUrl?: string,
    observacoes?: string
  ) => void;
}

export const ManejoCard = ({ lote, onRegistrarManejo }: ManejoCardProps) => {
  const [isDialogOpen, setIsDialogOpen] = useState(false);
  const [peso, setPeso] = useState('');
  const [observacoes, setObservacoes] = useState('');
  const [fotoUrl, setFotoUrl] = useState<string>();
  const [loading, setLoading] = useState(false);

  const handleSubmit = async () => {
    if (!peso || parseFloat(peso) <= 0) {
      return;
    }

    setLoading(true);
    try {
      await onRegistrarManejo(
        lote.id,
        parseFloat(peso),
        fotoUrl,
        observacoes || undefined
      );
      
      // Reset form
      setPeso('');
      setObservacoes('');
      setFotoUrl(undefined);
      setIsDialogOpen(false);
    } catch (error) {
      console.error('Erro ao registrar manejo:', error);
    } finally {
      setLoading(false);
    }
  };

  const getStatusIcon = () => {
    switch (lote.statusManejo) {
      case 'atrasado':
        return <AlertTriangle className="h-4 w-4 text-destructive" />;
      case 'pendente':
        return <Clock className="h-4 w-4 text-warning" />;
      default:
        return <Settings className="h-4 w-4 text-primary" />;
    }
  };

  const getStatusColor = () => {
    switch (lote.statusManejo) {
      case 'atrasado':
        return 'destructive';
      case 'pendente':
        return 'secondary';
      default:
        return 'outline';
    }
  };

  const getStatusText = () => {
    switch (lote.statusManejo) {
      case 'atrasado':
        return 'Transferência Atrasada';
      case 'pendente':
        return 'Manejo Pendente';
      default:
        return 'Manejo Disponível';
    }
  };

  const calcularPesoEsperado = () => {
    // Redução de 3.54% do peso atual
    return lote.peso_atual * 0.9646;
  };

  const formatarData = (data: string) => {
    return new Date(data).toLocaleDateString('pt-BR', {
      day: '2-digit',
      month: '2-digit',
      year: 'numeric',
    });
  };

  return (
    <Card className="glass-light border-0 organic-hover">
      <CardHeader className="pb-3">
        <div className="flex items-center justify-between">
          <CardTitle className="text-base flex items-center gap-2">
            {getStatusIcon()}
            Box {lote.caixa_atual} → Box {lote.caixa_atual + 1}
          </CardTitle>
          <Badge variant={getStatusColor() as any}>
            {getStatusText()}
          </Badge>
        </div>
      </CardHeader>

      <CardContent className="space-y-4">
        {/* Informações do Lote */}
        <div className="space-y-3">
          <div>
            <p className="text-sm font-medium">{lote.codigo}</p>
            <p className="text-xs text-muted-foreground">
              Iniciado em {formatarData(lote.data_inicio)}
            </p>
          </div>

          <div className="grid grid-cols-2 gap-4">
            <div>
              <p className="text-xs text-muted-foreground">Peso Atual</p>
              <p className="text-lg font-bold">{lote.peso_atual.toFixed(1)}kg</p>
            </div>
            <div>
              <p className="text-xs text-muted-foreground">Semana</p>
              <p className="text-lg font-bold">{lote.semana_atual}/7</p>
            </div>
          </div>

          <div className="grid grid-cols-2 gap-4">
            <div>
              <p className="text-xs text-muted-foreground">Redução Total</p>
              <p className="text-sm font-medium text-success">
                -{lote.reducaoAcumulada.toFixed(1)}%
              </p>
            </div>
            <div>
              <p className="text-xs text-muted-foreground">Voluntários</p>
              <p className="text-sm font-medium">{lote.voluntariosUnicos}</p>
            </div>
          </div>

          {/* Progresso Visual */}
          <div className="space-y-1">
            <div className="flex justify-between text-xs text-muted-foreground">
              <span>Progresso</span>
              <span>{lote.progressoPercentual.toFixed(0)}%</span>
            </div>
            <div className="w-full bg-muted rounded-full h-2">
              <div
                className="bg-primary rounded-full h-2 transition-all duration-500"
                style={{ width: `${lote.progressoPercentual}%` }}
              />
            </div>
          </div>
        </div>

        {/* Ação de Manejo */}
        <Dialog open={isDialogOpen} onOpenChange={setIsDialogOpen}>
          <DialogTrigger asChild>
            <Button 
              className="w-full" 
              variant={lote.statusManejo === 'atrasado' ? 'destructive' : 'default'}
            >
              <Settings className="h-4 w-4 mr-2" />
              Registrar Manejo Semanal
            </Button>
          </DialogTrigger>

          <DialogContent className="sm:max-w-[425px]">
            <DialogHeader>
              <DialogTitle className="flex items-center gap-2">
                <Settings className="h-5 w-5" />
                Manejo - Box {lote.caixa_atual} → Box {lote.caixa_atual + 1}
              </DialogTitle>
            </DialogHeader>

            <div className="space-y-4">
              {/* Informações do Lote */}
              <div className="glass-light rounded-lg p-3">
                <p className="font-medium text-sm">{lote.codigo}</p>
                <p className="text-xs text-muted-foreground">
                  Peso atual: {lote.peso_atual.toFixed(1)}kg
                </p>
              </div>

              {/* Peso após manejo */}
              <div className="space-y-2">
                <label className="text-sm font-medium flex items-center gap-2">
                  <Scale className="h-4 w-4" />
                  Peso após revirada (kg)
                </label>
                <Input
                  type="number"
                  step="0.1"
                  placeholder={`Ex: ${calcularPesoEsperado().toFixed(1)}`}
                  value={peso}
                  onChange={(e) => setPeso(e.target.value)}
                />
                <p className="text-xs text-muted-foreground">
                  Peso esperado: ~{calcularPesoEsperado().toFixed(1)}kg (redução de 3,54%)
                </p>
              </div>

              {/* Captura de Foto */}
              <div className="space-y-2">
                <label className="text-sm font-medium flex items-center gap-2">
                  <Camera className="h-4 w-4" />
                  Foto do processo (opcional)
                </label>
                <Button
                  type="button"
                  variant="outline"
                  className="w-full"
                  onClick={() => {
                    // Implementar captura de foto posteriormente
                    console.log('Implementar captura de foto');
                  }}
                >
                  <Camera className="h-4 w-4 mr-2" />
                  Capturar Foto
                </Button>
              </div>

              {/* Observações */}
              <div className="space-y-2">
                <label className="text-sm font-medium">
                  Observações (opcional)
                </label>
                <Textarea
                  placeholder="Ex: Material bem decomposto, boa umidade..."
                  value={observacoes}
                  onChange={(e) => setObservacoes(e.target.value)}
                  rows={3}
                />
              </div>

              {/* Informações automáticas */}
              <div className="glass-light rounded-lg p-3 space-y-2 text-xs text-muted-foreground">
                <div className="flex items-center gap-2">
                  <MapPin className="h-3 w-3" />
                  <span>Localização será capturada automaticamente</span>
                </div>
                <div className="flex items-center gap-2">
                  <Clock className="h-3 w-3" />
                  <span>Data/hora: {new Date().toLocaleString('pt-BR')}</span>
                </div>
              </div>

              {/* Botões de ação */}
              <div className="flex gap-2">
                <Button
                  variant="outline"
                  className="flex-1"
                  onClick={() => setIsDialogOpen(false)}
                  disabled={loading}
                >
                  Cancelar
                </Button>
                <Button
                  className="flex-1"
                  onClick={handleSubmit}
                  disabled={!peso || parseFloat(peso) <= 0 || loading}
                >
                  {loading ? 'Registrando...' : 'Confirmar Transferência'}
                </Button>
              </div>
            </div>
          </DialogContent>
        </Dialog>
      </CardContent>
    </Card>
  );
};