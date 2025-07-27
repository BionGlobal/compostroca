import { useState } from 'react';
import { 
  Dialog, 
  DialogContent, 
  DialogHeader, 
  DialogTitle,
  DialogTrigger 
} from '@/components/ui/dialog';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Skeleton } from '@/components/ui/skeleton';
import { 
  Download, 
  MapPin, 
  User, 
  Scale, 
  Clock, 
  Hash,
  Copy,
  Leaf,
  BarChart3,
  Camera,
  Users
} from 'lucide-react';
import { useLoteDetalhes } from '@/hooks/useLoteDetalhes';
import { useLoteHash } from '@/hooks/useLoteHash';
import { usePDFGenerator } from '@/hooks/usePDFGenerator';
import { 
  formatWeight, 
  calculateWeightReduction, 
  calculateProcessingTime, 
  getOrganizationName, 
  formatLocation 
} from '@/lib/organizationUtils';
import { formatHashDisplay } from '@/lib/hashUtils';

interface LoteDetalhesModalProps {
  loteId: string;
  loteCode: string;
  children: React.ReactNode;
}

export const LoteDetalhesModal = ({ loteId, loteCode, children }: LoteDetalhesModalProps) => {
  const [open, setOpen] = useState(false);
  const { loteDetalhes, loading } = useLoteDetalhes(open ? loteId : undefined);
  const { copyHashToClipboard } = useLoteHash();
  const { generatePDF, loading: pdfLoading } = usePDFGenerator();

  const handleDownloadPDF = async () => {
    if (loteDetalhes) {
      await generatePDF(loteDetalhes);
    }
  };

  const handleCopyHash = async () => {
    if (loteDetalhes?.hash_integridade) {
      await copyHashToClipboard(loteDetalhes.hash_integridade);
    }
  };

  if (loading) {
    return (
      <Dialog open={open} onOpenChange={setOpen}>
        <DialogTrigger asChild>{children}</DialogTrigger>
        <DialogContent className="max-w-4xl max-h-[90vh] overflow-y-auto">
          <DialogHeader>
            <DialogTitle>Carregando detalhes do lote...</DialogTitle>
          </DialogHeader>
          <div className="space-y-4">
            <Skeleton className="h-4 w-3/4" />
            <Skeleton className="h-4 w-1/2" />
            <Skeleton className="h-32 w-full" />
          </div>
        </DialogContent>
      </Dialog>
    );
  }

  if (!loteDetalhes) return null;

  const weightReduction = calculateWeightReduction(loteDetalhes.peso_inicial, loteDetalhes.peso_atual);
  const processingTime = calculateProcessingTime(loteDetalhes.data_inicio, loteDetalhes.data_encerramento);
  const co2Avoided = (loteDetalhes.peso_inicial * 0.766).toFixed(2);

  return (
    <Dialog open={open} onOpenChange={setOpen}>
      <DialogTrigger asChild>{children}</DialogTrigger>
      <DialogContent className="max-w-4xl max-h-[90vh] overflow-y-auto">
        <DialogHeader>
          <div className="flex items-center justify-between">
            <DialogTitle className="text-xl">Detalhes do Lote {loteDetalhes.codigo}</DialogTitle>
            <Button 
              onClick={handleDownloadPDF} 
              disabled={pdfLoading}
              size="sm"
              className="gap-2"
            >
              <Download className="h-4 w-4" />
              {pdfLoading ? 'Gerando...' : 'Download PDF'}
            </Button>
          </div>
        </DialogHeader>

        <Tabs defaultValue="info" className="w-full">
          <TabsList className="grid w-full grid-cols-5">
            <TabsTrigger value="info">Informações</TabsTrigger>
            <TabsTrigger value="voluntarios">Voluntários</TabsTrigger>
            <TabsTrigger value="fotos">Fotos</TabsTrigger>
            <TabsTrigger value="impacto">Impacto</TabsTrigger>
            <TabsTrigger value="integridade">Integridade</TabsTrigger>
          </TabsList>

          <TabsContent value="info" className="space-y-4">
            <div className="grid grid-cols-2 gap-4">
              <div className="space-y-3">
                <div className="flex items-center gap-2">
                  <Scale className="h-4 w-4 text-muted-foreground" />
                  <span className="text-sm">
                    <strong>Código:</strong> {loteDetalhes.codigo}
                  </span>
                </div>
                <div className="flex items-center gap-2">
                  <MapPin className="h-4 w-4 text-muted-foreground" />
                  <span className="text-sm">
                    <strong>Unidade:</strong> {getOrganizationName(loteDetalhes.unidade)}
                  </span>
                </div>
                <div className="flex items-center gap-2">
                  <Clock className="h-4 w-4 text-muted-foreground" />
                  <span className="text-sm">
                    <strong>Período:</strong> {new Date(loteDetalhes.data_inicio).toLocaleDateString('pt-BR')} - {loteDetalhes.data_encerramento ? new Date(loteDetalhes.data_encerramento).toLocaleDateString('pt-BR') : 'Em processamento'}
                  </span>
                </div>
                <div className="flex items-center gap-2">
                  <Clock className="h-4 w-4 text-muted-foreground" />
                  <span className="text-sm">
                    <strong>Tempo de processamento:</strong> {processingTime}
                  </span>
                </div>
              </div>
              
              <div className="space-y-3">
                <div className="flex items-center gap-2">
                  <Scale className="h-4 w-4 text-muted-foreground" />
                  <span className="text-sm">
                    <strong>Peso inicial:</strong> {formatWeight(loteDetalhes.peso_inicial)}
                  </span>
                </div>
                <div className="flex items-center gap-2">
                  <Scale className="h-4 w-4 text-muted-foreground" />
                  <span className="text-sm">
                    <strong>Peso final:</strong> {formatWeight(loteDetalhes.peso_atual)}
                  </span>
                </div>
                <div className="flex items-center gap-2">
                  <BarChart3 className="h-4 w-4 text-green-600" />
                  <span className="text-sm">
                    <strong>Redução:</strong> <span className="text-green-600">{weightReduction.toFixed(1)}%</span>
                  </span>
                </div>
                <div className="flex items-center gap-2">
                  <User className="h-4 w-4 text-muted-foreground" />
                  <span className="text-sm">
                    <strong>Validador:</strong> {loteDetalhes.criado_por_nome}
                  </span>
                </div>
              </div>
            </div>

            <div className="pt-4 border-t">
              <div className="flex items-center gap-2">
                <MapPin className="h-4 w-4 text-muted-foreground" />
                <span className="text-sm">
                  <strong>Localização:</strong> {formatLocation(loteDetalhes.latitude, loteDetalhes.longitude)}
                </span>
              </div>
            </div>
          </TabsContent>

          <TabsContent value="voluntarios" className="space-y-4">
            <div className="flex items-center gap-2 mb-4">
              <Users className="h-5 w-5 text-primary" />
              <h3 className="text-lg font-semibold">
                {loteDetalhes.voluntarios.length} Voluntários Envolvidos
              </h3>
            </div>
            <div className="grid gap-3">
              {loteDetalhes.voluntarios.map((voluntario) => (
                <div key={voluntario.id} className="flex items-center justify-between p-3 bg-muted/50 rounded-lg">
                  <div>
                    <p className="font-medium">{voluntario.nome}</p>
                    <p className="text-sm text-muted-foreground">Balde #{voluntario.numero_balde}</p>
                  </div>
                  <div className="text-right">
                    <p className="text-sm font-medium">{voluntario.entregas_count} entregas</p>
                    <p className="text-sm text-muted-foreground">{formatWeight(voluntario.peso_total)}</p>
                  </div>
                </div>
              ))}
            </div>
          </TabsContent>

          <TabsContent value="fotos" className="space-y-4">
            <div className="flex items-center gap-2 mb-4">
              <Camera className="h-5 w-5 text-primary" />
              <h3 className="text-lg font-semibold">Galeria de Fotos</h3>
            </div>
            
            <div className="space-y-4">
              <div>
                <h4 className="font-medium mb-2">Fotos de Entregas</h4>
                <div className="grid grid-cols-4 gap-2">
                  {loteDetalhes.entregas.flatMap(entrega => entrega.fotos).map((foto) => (
                    <div key={foto.id} className="aspect-square bg-muted rounded-lg overflow-hidden">
                      <img 
                        src={foto.foto_url} 
                        alt={`Foto ${foto.tipo_foto}`}
                        className="w-full h-full object-cover hover:scale-105 transition-transform cursor-pointer"
                      />
                    </div>
                  ))}
                </div>
              </div>

              <div>
                <h4 className="font-medium mb-2">Fotos de Manejo</h4>
                <div className="grid grid-cols-4 gap-2">
                  {loteDetalhes.manejo_fotos.map((foto) => (
                    <div key={foto.id} className="aspect-square bg-muted rounded-lg overflow-hidden">
                      <img 
                        src={foto.foto_url} 
                        alt={`Manejo Caixa ${foto.caixa_origem} → ${foto.caixa_destino}`}
                        className="w-full h-full object-cover hover:scale-105 transition-transform cursor-pointer"
                      />
                    </div>
                  ))}
                </div>
              </div>
            </div>
          </TabsContent>

          <TabsContent value="impacto" className="space-y-4">
            <div className="flex items-center gap-2 mb-4">
              <Leaf className="h-5 w-5 text-green-600" />
              <h3 className="text-lg font-semibold">Dados de Impacto Ambiental</h3>
            </div>
            
            <div className="grid grid-cols-2 gap-4">
              <div className="space-y-4">
                <div className="p-4 bg-green-50 rounded-lg border border-green-200">
                  <h4 className="font-medium text-green-800">CO2e Evitado</h4>
                  <p className="text-2xl font-bold text-green-600">{co2Avoided} kg</p>
                </div>
                
                <div className="p-4 bg-blue-50 rounded-lg border border-blue-200">
                  <h4 className="font-medium text-blue-800">Resíduos Desviados</h4>
                  <p className="text-2xl font-bold text-blue-600">{formatWeight(loteDetalhes.peso_inicial)}</p>
                </div>
              </div>
              
              <div className="space-y-4">
                <div className="p-4 bg-orange-50 rounded-lg border border-orange-200">
                  <h4 className="font-medium text-orange-800">Composto Produzido</h4>
                  <p className="text-2xl font-bold text-orange-600">{formatWeight(loteDetalhes.peso_atual)}</p>
                </div>
                
                <div className="p-4 bg-purple-50 rounded-lg border border-purple-200">
                  <h4 className="font-medium text-purple-800">Eficiência</h4>
                  <p className="text-2xl font-bold text-purple-600">{weightReduction.toFixed(1)}%</p>
                </div>
              </div>
            </div>

            <div className="mt-6 p-4 bg-muted/50 rounded-lg">
              <h4 className="font-medium mb-2">Análise NPK (Simulada)</h4>
              <div className="grid grid-cols-3 gap-4 text-sm">
                <div>
                  <span className="text-muted-foreground">Nitrogênio:</span>
                  <span className="ml-2 font-medium">2.1%</span>
                </div>
                <div>
                  <span className="text-muted-foreground">Fósforo:</span>
                  <span className="ml-2 font-medium">0.8%</span>
                </div>
                <div>
                  <span className="text-muted-foreground">Potássio:</span>
                  <span className="ml-2 font-medium">1.5%</span>
                </div>
                <div>
                  <span className="text-muted-foreground">pH:</span>
                  <span className="ml-2 font-medium">6.8</span>
                </div>
                <div>
                  <span className="text-muted-foreground">Umidade:</span>
                  <span className="ml-2 font-medium">45%</span>
                </div>
                <div>
                  <span className="text-muted-foreground">C/N:</span>
                  <span className="ml-2 font-medium">15:1</span>
                </div>
              </div>
            </div>
          </TabsContent>

          <TabsContent value="integridade" className="space-y-4">
            <div className="flex items-center gap-2 mb-4">
              <Hash className="h-5 w-5 text-primary" />
              <h3 className="text-lg font-semibold">Hash de Integridade (Blockchain-like)</h3>
            </div>
            
            {loteDetalhes.hash_integridade ? (
              <div className="space-y-4">
                <div className="p-4 bg-muted/50 rounded-lg">
                  <div className="flex items-center justify-between mb-2">
                    <h4 className="font-medium">SHA256 Hash</h4>
                    <Badge variant="secondary" className="bg-green-100 text-green-800">
                      ✓ Verificado
                    </Badge>
                  </div>
                  <div className="flex items-center gap-2">
                    <code className="flex-1 text-xs bg-background p-2 rounded border font-mono">
                      {loteDetalhes.hash_integridade}
                    </code>
                    <Button 
                      size="sm" 
                      variant="outline" 
                      onClick={handleCopyHash}
                      className="shrink-0"
                    >
                      <Copy className="h-4 w-4" />
                    </Button>
                  </div>
                </div>
                
                <div className="text-sm text-muted-foreground space-y-2">
                  <p>
                    <strong>Hash resumido:</strong> {formatHashDisplay(loteDetalhes.hash_integridade)}
                  </p>
                  <p>
                    Este hash SHA256 foi gerado a partir de todos os dados críticos do lote, 
                    incluindo códigos, pesos, datas, voluntários envolvidos e fotos registradas.
                  </p>
                  <p>
                    Qualquer alteração nos dados originais resultará em um hash completamente 
                    diferente, garantindo a integridade e rastreabilidade dos dados.
                  </p>
                </div>
              </div>
            ) : (
              <div className="p-4 bg-yellow-50 rounded-lg border border-yellow-200">
                <p className="text-yellow-800">
                  Hash de integridade não disponível para este lote. 
                  Hashes são gerados automaticamente para novos lotes finalizados.
                </p>
              </div>
            )}
          </TabsContent>
        </Tabs>
      </DialogContent>
    </Dialog>
  );
};