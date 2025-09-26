import { useState } from 'react';
import { useParams, Navigate } from 'react-router-dom';
import { usePublicProductionBelt } from '@/hooks/usePublicProductionBelt';
import { PublicProductionBelt } from '@/components/PublicProductionBelt';
import { FotosGalleryModal } from '@/components/FotosGalleryModal';
import { Card, CardContent } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Skeleton } from '@/components/ui/skeleton';
import { Clock, MapPin, RefreshCw, Users, Leaf, Scale, Recycle } from 'lucide-react';
import { formatPesoDisplay } from '@/lib/organizationUtils';
import { ORGANIZATION_UNITS } from '@/lib/organizationUtils';

const compostrocaIcon = '/lovable-uploads/compostroca-app-logo.png';

export default function ProductionBeltPublic() {
  const { unitCode } = useParams<{ unitCode: string }>();
  
  // Validar se a unidade existe
  if (!unitCode || !(unitCode in ORGANIZATION_UNITS)) {
    return <Navigate to="/404" replace />;
  }

  const { data, loading, error } = usePublicProductionBelt(unitCode);

  // Estado para modal de fotos - igual à página Lotes
  const [fotosModalData, setFotosModalData] = useState<{
    open: boolean;
    loteId: string;
    title: string;
    entregaId?: string;
    manejoId?: string;
  }>({
    open: false,
    loteId: '',
    title: '',
    entregaId: undefined,
    manejoId: undefined
  });

  // Handler para visualizar fotos - igual à página Lotes
  const handleViewPhotos = (loteId: string, title: string) => {
    setFotosModalData({
      open: true,
      loteId,
      title,
      entregaId: undefined,
      manejoId: undefined
    });
  };

  if (loading) {
    return (
      <div className="min-h-screen bg-gradient-to-br from-background via-muted/20 to-background p-4">
        <div className="max-w-7xl mx-auto space-y-6">
          {/* Header Skeleton */}
          <div className="text-center space-y-4">
            <Skeleton className="h-12 w-64 mx-auto" />
            <Skeleton className="h-6 w-80 mx-auto" />
          </div>
          
          {/* Metrics Skeleton */}
          <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
            {Array.from({ length: 4 }).map((_, i) => (
              <Skeleton key={i} className="h-24" />
            ))}
          </div>
          
          {/* Production Belt Skeleton */}
          <div className="flex gap-3 overflow-x-auto">
            {Array.from({ length: 7 }).map((_, i) => (
              <Skeleton key={i} className="min-w-[280px] h-64 flex-shrink-0" />
            ))}
          </div>
        </div>
      </div>
    );
  }

  if (error || !data) {
    return (
      <div className="min-h-screen bg-gradient-to-br from-background via-muted/20 to-background flex items-center justify-center p-4">
        <Card className="glass-light max-w-md w-full">
          <CardContent className="p-6 text-center">
            <div className="text-destructive mb-2">⚠️</div>
            <h2 className="text-lg font-semibold mb-2">Erro ao Carregar Dados</h2>
            <p className="text-muted-foreground">
              {error || 'Não foi possível carregar os dados da unidade.'}
            </p>
          </CardContent>
        </Card>
      </div>
    );
  }

  const formatLastUpdate = (dateString: string) => {
    return new Date(dateString).toLocaleString('pt-BR', {
      day: '2-digit',
      month: '2-digit',
      year: 'numeric',
      hour: '2-digit',
      minute: '2-digit'
    });
  };

  return (
    <div className="min-h-screen bg-gradient-to-br from-background via-muted/20 to-background">
      {/* Header */}
      <header className="glass-light border-0 border-b border-border/20 p-6 sticky top-0 z-10">
        <div className="max-w-7xl mx-auto">
          <div className="flex flex-col items-center gap-4 sm:flex-row sm:justify-between">
            <div className="flex items-center gap-3 text-center sm:text-left">
              <img src={compostrocaIcon} alt="Compostroca" className="h-10 w-10 float" />
              <div>
                <h1 className="text-2xl font-bold bg-gradient-primary bg-clip-text text-transparent">
                  {data.unitName}
                </h1>
                <div className="flex items-center gap-2 text-sm text-muted-foreground">
                  <MapPin className="w-4 h-4" />
                  <span>{data.address}</span>
                </div>
              </div>
            </div>
            
            <div className="flex items-center gap-2 text-xs text-muted-foreground">
              <div className="w-2 h-2 bg-green-500 rounded-full animate-pulse"></div>
              <span>Dados ao vivo • {formatLastUpdate(data.lastUpdate)}</span>
            </div>
          </div>
        </div>
      </header>

      <main className="max-w-7xl mx-auto p-4 space-y-8">
        {/* Métricas Principais - Parcial + Total */}
        <section>
          <h2 className="text-xl font-semibold text-foreground mb-4 text-center">
            Indicadores da Unidade
          </h2>
          
          <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
            {/* Lotes */}
            <Card className="glass-light organic-hover">
              <CardContent className="p-4 text-center">
                <div className="flex items-center justify-center gap-2 mb-2">
                  <Leaf className="w-5 h-5 text-success" />
                  <Badge variant="secondary" className="text-xs">Lotes</Badge>
                </div>
                <div className="text-2xl font-bold text-success">
                  {data.metrics.lotesAtivos}
                </div>
                <div className="text-xs text-muted-foreground mb-1">
                  Ativos
                </div>
                <div className="text-xs text-muted-foreground">
                  Total: {data.metrics.lotesTotal}
                </div>
              </CardContent>
            </Card>

            {/* Peso */}
            <Card className="glass-light organic-hover">
              <CardContent className="p-4 text-center">
                <div className="flex items-center justify-center gap-2 mb-2">
                  <Scale className="w-5 h-5 text-primary" />
                  <Badge variant="outline" className="text-xs">Peso</Badge>
                </div>
                <div className="text-2xl font-bold text-primary">
                  {formatPesoDisplay(data.metrics.pesoAtivo)}
                </div>
                <div className="text-xs text-muted-foreground mb-1">
                  Ativos
                </div>
                <div className="text-xs text-muted-foreground">
                  Total: {data.metrics.pesoTotal.toFixed(1)} ton
                </div>
              </CardContent>
            </Card>

            {/* Voluntários */}
            <Card className="glass-light organic-hover">
              <CardContent className="p-4 text-center">
                <div className="flex items-center justify-center gap-2 mb-2">
                  <Users className="w-5 h-5 text-secondary" />
                  <Badge variant="default" className="text-xs">Voluntários</Badge>
                </div>
                <div className="text-2xl font-bold text-secondary">
                  {data.metrics.voluntariosEngajados}
                </div>
                <div className="text-xs text-muted-foreground mb-1">
                  Engajados
                </div>
                <div className="text-xs text-muted-foreground">
                  Total: {data.metrics.voluntariosTotal} ({data.metrics.engajamentoPercentual.toFixed(0)}%)
                </div>
              </CardContent>
            </Card>

            {/* CO2e Evitado */}
            <Card className="glass-light organic-hover">
              <CardContent className="p-4 text-center">
                <div className="flex items-center justify-center gap-2 mb-2">
                  <Recycle className="w-5 h-5 text-earth" />
                  <Badge variant="outline" className="text-xs">CO₂e</Badge>
                </div>
                <div className="text-xl font-bold text-earth">
                  {data.metrics.co2eAtivo.toFixed(0)} kg
                </div>
                <div className="text-xs text-muted-foreground mb-1">
                  Evitado Ativo
                </div>
                <div className="text-xs text-muted-foreground">
                  Total: {data.metrics.co2eTotal.toFixed(1)} ton
                </div>
              </CardContent>
            </Card>
          </div>
        </section>

        {/* Esteira de Produção */}
        <section>
          <h2 className="text-xl font-semibold text-foreground mb-4 text-center">
            Esteira de Produção ao Vivo
          </h2>
          
          <PublicProductionBelt 
            lotesAtivos={data.lotesAtivos} 
            onViewPhotos={handleViewPhotos}
          />
        </section>

        {/* Footer com "Powered by Bion" */}
        <footer className="border-t bg-card/50 py-6">
          <div className="container mx-auto px-4 text-center">
            <div className="flex items-center justify-center space-x-4">
              <a 
                href="https://www.bion.global" 
                target="_blank" 
                rel="noopener noreferrer"
                className="transition-all duration-300 hover:scale-105"
              >
                <img 
                  src="/lovable-uploads/powered-by-bion.png" 
                  alt="Powered by Bion" 
                  className="h-12 opacity-80 hover:opacity-100 transition-opacity"
                />
              </a>
            </div>
          </div>
        </footer>
      </main>

      {/* Modal de Galeria de Fotos - igual à página Lotes */}
      <FotosGalleryModal
        isOpen={fotosModalData.open}
        onClose={() => setFotosModalData(prev => ({ ...prev, open: false }))}
        loteId={fotosModalData.loteId}
        title={fotosModalData.title}
        entregaId={fotosModalData.entregaId}
        manejoId={fotosModalData.manejoId}
      />
    </div>
  );
}