import { Card, CardContent } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { QRCodeSVG } from 'qrcode.react';
import QRCode from 'qrcode';
import { Copy, MapPin, Calendar, CheckCircle2, ExternalLink, Download, Navigation } from 'lucide-react';
import { toast } from 'sonner';

interface LoteHeaderProps {
  codigoLote: string;
  codigoUnico: string;
  statusLote: 'em_producao' | 'certificado';
  unidade: {
    nome: string;
    codigo: string;
    localizacao: string;
    latitude?: number | null;
    longitude?: number | null;
  };
  dataInicio: Date;
  dataFinalizacao: Date | null;
  hashRastreabilidade: string;
  latitude: number | null;
  longitude: number | null;
}

export const LoteHeader = ({
  codigoLote,
  codigoUnico,
  statusLote,
  unidade,
  dataInicio,
  dataFinalizacao,
  hashRastreabilidade,
  latitude,
  longitude
}: LoteHeaderProps) => {
  const currentUrl = window.location.href;

  const handleCopyHash = () => {
    navigator.clipboard.writeText(hashRastreabilidade);
    toast.success('Hash copiado para a área de transferência');
  };

  const handleDownloadQR = async () => {
    try {
      // Generate high-resolution QR code directly at 1024x1024
      const canvas = document.createElement('canvas');
      canvas.width = 1024;
      canvas.height = 1024;
      
      await QRCode.toCanvas(canvas, currentUrl, {
        width: 1024,
        margin: 4,
        errorCorrectionLevel: 'H',
        color: {
          dark: '#000000',
          light: '#FFFFFF'
        }
      });
      
      // Download the canvas as PNG
      canvas.toBlob((blob) => {
        if (!blob) return;
        const url = URL.createObjectURL(blob);
        const a = document.createElement('a');
        a.href = url;
        a.download = `qrcode-${codigoUnico}.png`;
        a.click();
        URL.revokeObjectURL(url);
        toast.success('QR Code baixado com sucesso');
      }, 'image/png', 1.0);
    } catch (error) {
      console.error('Erro ao gerar QR Code:', error);
      toast.error('Erro ao baixar QR Code');
    }
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
              <Badge 
                variant={statusLote === 'certificado' ? 'success' : 'warning'} 
                className="text-xs sm:text-sm"
              >
                <CheckCircle2 className="w-3 h-3 sm:w-4 sm:h-4 mr-1" />
                {statusLote === 'certificado' ? 'Lote Certificado' : 'Lote em Produção'}
              </Badge>
            </div>

            <div>
              <h1 className="text-2xl sm:text-3xl lg:text-4xl font-bold text-foreground mb-2">
                {codigoUnico}
              </h1>
              {hashRastreabilidade && (
                <div className="flex items-center gap-2 flex-wrap">
                  <code className="text-xs sm:text-sm font-mono bg-muted px-2 py-1 rounded break-all">
                    {hashRastreabilidade.substring(0, 12)}...{hashRastreabilidade.substring(hashRastreabilidade.length - 8)}
                  </code>
                  <Button
                    size="sm"
                    variant="ghost"
                    onClick={handleCopyHash}
                    className="h-7 px-2"
                  >
                    <Copy className="w-3 h-3" />
                  </Button>
                </div>
              )}
            </div>

            <div className="space-y-2">
              <div className="flex items-start gap-2">
                <MapPin className="w-4 h-4 sm:w-5 sm:h-5 text-primary mt-0.5 flex-shrink-0" />
                <div className="text-sm sm:text-base space-y-1">
                  <p className="font-medium text-foreground">{unidade.nome}</p>
                  <p className="text-muted-foreground">Código: {unidade.codigo}</p>
              <p className="text-muted-foreground">{unidade.localizacao}</p>
              
              {/* Coordenadas da Unidade */}
              {unidade.latitude && unidade.longitude && (
                <div className="flex items-center gap-2 text-xs text-muted-foreground mt-1">
                  <Navigation className="w-3 h-3" />
                  <code className="font-mono">
                    {unidade.latitude.toFixed(6)}, {unidade.longitude.toFixed(6)}
                  </code>
                </div>
              )}
              
              {unidade.latitude && unidade.longitude && (
                <a 
                  href={`https://www.google.com/maps?q=${unidade.latitude},${unidade.longitude}`}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="text-primary hover:underline flex items-center gap-1 text-sm mt-1"
                >
                  <ExternalLink className="w-3 h-3" />
                  Ver no mapa
                </a>
              )}
                </div>
              </div>

              <div className="flex items-center gap-2">
                <Calendar className="w-4 h-4 sm:w-5 sm:h-5 text-primary flex-shrink-0" />
                <div className="text-sm sm:text-base">
                  <span className="text-muted-foreground">Período: </span>
                  <span className="font-medium text-foreground">
                    {formatDate(dataInicio)}
                    {dataFinalizacao ? ` → ${formatDate(dataFinalizacao)}` : ' → Em aberto'}
                  </span>
                </div>
              </div>
            </div>
          </div>

          {/* QR Code */}
          <div className="flex justify-center lg:justify-end">
            <div className="glass p-3 sm:p-4 rounded-xl border border-border/50 space-y-2">
              <QRCodeSVG
                id="qr-code-svg"
                value={currentUrl}
                size={128}
                level="H"
                className="w-28 h-28 sm:w-32 sm:h-32"
                fgColor="hsl(var(--foreground))"
                bgColor="transparent"
              />
              <Button
                variant="ghost"
                size="sm"
                onClick={handleDownloadQR}
                className="w-full text-xs"
              >
                <Download className="w-3 h-3 mr-1" />
                Baixar
              </Button>
            </div>
          </div>
        </div>
      </CardContent>
    </Card>
  );
};
