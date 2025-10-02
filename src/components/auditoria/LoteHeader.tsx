import { Card, CardContent } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { QRCodeSVG } from 'qrcode.react';
import { Copy, MapPin, Calendar, CheckCircle2 } from 'lucide-react';
import { toast } from 'sonner';

interface LoteHeaderProps {
  codigoLote: string;
  codigoUnico: string;
  unidade: {
    nome: string;
    codigo: string;
    localizacao: string;
  };
  dataInicio: Date;
  dataFinalizacao: Date | null;
  hashRastreabilidade: string;
}

export const LoteHeader = ({
  codigoLote,
  codigoUnico,
  unidade,
  dataInicio,
  dataFinalizacao,
  hashRastreabilidade
}: LoteHeaderProps) => {
  const currentUrl = window.location.href;

  const handleCopyHash = () => {
    navigator.clipboard.writeText(hashRastreabilidade);
    toast.success('Hash copiado para a área de transferência');
  };

  const formatDate = (date: Date) => {
    return new Intl.DateTimeFormat('pt-BR', {
      day: '2-digit',
      month: 'short',
      year: 'numeric'
    }).format(date);
  };

  return (
    <Card className="border-success/20">
      <CardContent className="p-4 sm:p-6">
        <div className="flex flex-col lg:flex-row lg:items-start lg:justify-between gap-6">
          {/* Informações principais */}
          <div className="flex-1 space-y-4">
            <div className="flex items-center gap-2 flex-wrap">
              <Badge variant="success" className="text-xs sm:text-sm">
                <CheckCircle2 className="w-3 h-3 sm:w-4 sm:h-4 mr-1" />
                Lote Certificado
              </Badge>
            </div>

            <div>
              <h1 className="text-2xl sm:text-3xl lg:text-4xl font-bold text-foreground mb-2">
                {codigoLote}
              </h1>
              <p className="text-sm sm:text-base text-muted-foreground">
                Código único: <span className="font-mono text-foreground">{codigoUnico}</span>
              </p>
            </div>

            <div className="space-y-2">
              <div className="flex items-start gap-2">
                <MapPin className="w-4 h-4 sm:w-5 sm:h-5 text-primary mt-0.5 flex-shrink-0" />
                <div className="text-sm sm:text-base">
                  <p className="font-medium text-foreground">{unidade.nome}</p>
                  <p className="text-muted-foreground">{unidade.localizacao}</p>
                  <p className="text-xs text-muted-foreground">Código: {unidade.codigo}</p>
                </div>
              </div>

              <div className="flex items-center gap-2">
                <Calendar className="w-4 h-4 sm:w-5 sm:h-5 text-primary flex-shrink-0" />
                <div className="text-sm sm:text-base">
                  <span className="text-muted-foreground">Período: </span>
                  <span className="font-medium text-foreground">
                    {formatDate(dataInicio)}
                    {dataFinalizacao && ` → ${formatDate(dataFinalizacao)}`}
                  </span>
                </div>
              </div>
            </div>

            {hashRastreabilidade && (
              <div className="space-y-2">
                <p className="text-xs sm:text-sm font-medium text-muted-foreground">
                  Hash de Integridade:
                </p>
                <div className="flex items-center gap-2 flex-wrap">
                  <code className="text-xs sm:text-sm font-mono bg-muted px-2 py-1 rounded break-all flex-1 min-w-0">
                    {hashRastreabilidade}
                  </code>
                  <Button
                    size="sm"
                    variant="outline"
                    onClick={handleCopyHash}
                    className="flex-shrink-0"
                  >
                    <Copy className="w-3 h-3 sm:w-4 sm:h-4" />
                  </Button>
                </div>
              </div>
            )}
          </div>

          {/* QR Code */}
          <div className="flex justify-center lg:justify-end">
            <div className="glass p-3 sm:p-4 rounded-xl">
              <QRCodeSVG
                value={currentUrl}
                size={120}
                level="H"
                className="w-24 h-24 sm:w-32 sm:h-32"
              />
              <p className="text-xs text-center text-muted-foreground mt-2">
                Escaneie para verificar
              </p>
            </div>
          </div>
        </div>
      </CardContent>
    </Card>
  );
};
