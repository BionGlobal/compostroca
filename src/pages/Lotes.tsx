import { useState } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { 
  RotateCcw, 
  Scale, 
  Leaf, 
  Users,
  Gauge, 
  Package,
  Clock,
  CheckCircle,
  AlertTriangle,
  BarChart3,
  Camera,
  Sprout,
  Download,
  FileText
} from 'lucide-react';

import { useLotesManager } from '@/hooks/useLotesManager';
import { useHistoricoLotes } from '@/hooks/useHistoricoLotes';
import { useAdvancedPDFGenerator } from '@/hooks/useAdvancedPDFGenerator';
import { useExcelGenerator } from '@/hooks/useExcelGenerator';
import { ProductionBelt } from '@/components/ProductionBelt';
import { ManejoCard } from '@/components/ManejoCard';
import { ManejoSimplificado } from '@/components/ManejoSimplificado';
import { PerformanceCharts } from '@/components/PerformanceCharts';
import { FinalizationModal } from '@/components/FinalizationModal';
import { StatCard } from '@/components/StatCard';
import { HistoricoSearch } from '@/components/HistoricoSearch';
import { NovoLoteCardFlip } from '@/components/NovoLoteCardFlip';
import { ManutencaoCardFlip } from '@/components/ManutencaoCardFlip';
import { LoteProntoCard } from '@/components/LoteProntoCard';
import { FotosGalleryModal } from '@/components/FotosGalleryModal';

const Lotes = () => {
  const {
    lotesAtivos,
    lotesFinalizados,
    metrics,
    loading,
    registrarManejo,
    finalizarLote,
    refetch
  } = useLotesManager();

  // History system hooks
  const {
    historico,
    loading: historicoLoading,
    filters,
    setFilters,
    refetch: refetchHistorico,
    totalEventos,
    eventosFiltrados
  } = useHistoricoLotes();

  const {
    generateNovoLotePDF,
    generateManutencaoPDF,
    generateLoteFinalizadoPDF,
    generateConsolidatedPDF,
    loading: pdfLoading
  } = useAdvancedPDFGenerator();

  const {
    generateConsolidatedExcel,
    loading: excelLoading
  } = useExcelGenerator();

  // State for modals and interactions
  const [selectedLoteForFinalization, setSelectedLoteForFinalization] = useState<string | null>(null);
  const [showManejoSemanal, setShowManejoSemanal] = useState(false);
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

  const handleManejoClick = (lote: any) => {
    // Modal já é aberto pelo ManejoCard
    console.log('Manejo para lote:', lote.codigo);
  };

  const handleFinalizarClick = (lote: any) => {
    setSelectedLoteForFinalization(lote.id);
  };

  // History handlers
  const handleViewPhotos = (loteId: string, title: string, entregaId?: string, manejoId?: string) => {
    setFotosModalData({
      open: true,
      loteId,
      title,
      entregaId,
      manejoId
    });
  };

  const handleDownloadPDF = async (evento: any) => {
    switch (evento.tipo) {
      case 'novo_lote':
        await generateNovoLotePDF(evento);
        break;
      case 'manutencao':
        await generateManutencaoPDF(evento);
        break;
      case 'lote_finalizado':
        await generateLoteFinalizadoPDF(evento);
        break;
    }
  };

  const handleDownloadConsolidatedPDF = async () => {
    await generateConsolidatedPDF(historico);
  };

  const handleDownloadConsolidatedExcel = async () => {
    await generateConsolidatedExcel(historico);
  };

  const renderHistoricoCard = (evento: any) => {
    const commonProps = {
      key: evento.id,
      evento,
      onDownloadPDF: () => handleDownloadPDF(evento),
      loading: pdfLoading || excelLoading
    };

    switch (evento.tipo) {
      case 'novo_lote':
        return (
          <NovoLoteCardFlip
            {...commonProps}
            onViewPhotos={() => handleViewPhotos(
              evento.lote_id,
              'Fotos das Entregas',
              evento.entrega_id
            )}
          />
        );
      case 'manutencao':
        return (
          <ManutencaoCardFlip
            {...commonProps}
            onViewPhotos={evento.manejo_id ? () => handleViewPhotos(
              evento.lote_id,
              'Fotos da Manutenção',
              undefined,
              evento.manejo_id
            ) : undefined}
          />
        );
      case 'lote_finalizado':
        return (
          <LoteProntoCard
            {...commonProps}
            onViewPhotos={() => handleViewPhotos(
              evento.lote_id,
              'Fotos do Lote Finalizado'
            )}
          />
        );
      default:
        return null;
    }
  };

  const loteToFinalize = lotesAtivos.find(l => l.id === selectedLoteForFinalization);

  const formatarData = (data: string) => {
    return new Date(data).toLocaleDateString('pt-BR', {
      day: '2-digit',
      month: '2-digit',
      year: 'numeric',
    });
  };

  if (loading) {
    return (
      <div className="p-4 space-y-6">
        <div className="flex items-center justify-center h-64">
          <div className="text-center">
            <Package className="h-8 w-8 animate-spin mx-auto mb-2 text-primary" />
            <p className="text-muted-foreground">Carregando dados dos lotes...</p>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="p-4 space-y-6">
      {/* Header com título e refresh */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold">Sistema de Lotes</h1>
          <p className="text-muted-foreground">
            Controle inteligente da esteira de compostagem
          </p>
        </div>
        <Button variant="outline" onClick={refetch} disabled={loading}>
          <RotateCcw className="h-4 w-4 mr-2" />
          Atualizar
        </Button>
      </div>

      {/* Métricas Rápidas */}
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
        <StatCard
          title="Lotes Ativos"
          value={`${metrics.totalLotesAtivos}`}
          description="na esteira"
          icon={<Package className="h-6 w-6" />}
          variant="default"
        />
        <StatCard
          title="Peso Total"
          value={`${(metrics.pesoBrutoProcessamento || 0).toFixed(1)}kg`}
          description="peso atual dos ativos"
          icon={<Scale className="h-6 w-6" />}
          variant="primary"
        />
        <StatCard
          title="Voluntários"
          value={`${metrics.voluntariosEngajadosAtivos || 0}`}
          description={`${metrics.totalVoluntariosUnidade > 0 ? Math.round(((metrics.voluntariosEngajadosAtivos || 0) / metrics.totalVoluntariosUnidade) * 100) : 0}% engajados (${metrics.voluntariosEngajadosAtivos || 0}/${metrics.totalVoluntariosUnidade || 0})`}
          icon={<Users className="h-6 w-6" />}
          variant="default"
        />
        <StatCard
          title="CO2e Evitado"
          value={`${(metrics.co2eEvitadoAtivosKg || 0).toFixed(0)}kg`}
          description="evitado pelos ativos"
          icon={<Leaf className="h-6 w-6" />}
          variant="earth"
        />
      </div>

      {/* Tabs de navegação */}
      <Tabs defaultValue="producao" className="space-y-6">
        <TabsList className="grid w-full grid-cols-3">
          <TabsTrigger value="producao">Produção</TabsTrigger>
          <TabsTrigger value="historico">Histórico</TabsTrigger>
          <TabsTrigger value="analise">Análise</TabsTrigger>
        </TabsList>

        {/* Tab: Produção */}
        <TabsContent value="producao" className="space-y-6">
          {/* Card de Manutenção Semanal - Simplificado */}
          <Card className="border-emerald-200/50 bg-gradient-to-r from-emerald-500/10 to-green-500/10 shadow-lg hover:shadow-emerald-200/20 transition-all duration-300">
            <CardHeader>
              <CardTitle className="flex items-center gap-2 text-emerald-800 dark:text-emerald-300">
                <Camera className="h-5 w-5" />
                Manutenção Semanal
              </CardTitle>
              <p className="text-sm text-emerald-700 dark:text-emerald-400 mt-1">
                Registre o processo semanal com fotos e observações
              </p>
            </CardHeader>
            <CardContent>
              <div className="flex flex-col md:flex-row md:items-center md:justify-between gap-4">
                <div className="text-center md:text-left">
                  <p className="text-sm text-emerald-700 dark:text-emerald-400">
                    A esteira avançará automaticamente após o registro
                  </p>
                </div>
                <Button 
                  onClick={() => setShowManejoSemanal(true)}
                  disabled={lotesAtivos.length === 0}
                  className="w-full md:w-auto gap-2 bg-emerald-600 hover:bg-emerald-700 text-white shadow-md hover:shadow-lg transition-all duration-200"
                >
                  <Camera className="h-4 w-4" />
                  Começar
                </Button>
              </div>
            </CardContent>
          </Card>

          <Card className="glass-light border-0">
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <Package className="h-5 w-5" />
                Esteira de Produção
                <Badge variant="outline" className="text-sm ml-auto">
                  {lotesAtivos.length}/7 caixas ocupadas
                </Badge>
              </CardTitle>
              <p className="text-sm text-muted-foreground mt-1">
                Processo de compostagem em 7 semanas
              </p>
            </CardHeader>
            <CardContent>
              <ProductionBelt
                lotesAtivos={lotesAtivos}
                onManejoClick={handleManejoClick}
                onFinalizarClick={handleFinalizarClick}
              />
            </CardContent>
          </Card>

          {/* Alertas e Notificações */}
          {lotesAtivos.some(lote => lote.statusManejo !== 'realizado') && (
            <Card className="border-warning/20 bg-warning/5">
              <CardContent className="p-4">
                <div className="flex items-center gap-3">
                  <AlertTriangle className="h-5 w-5 text-warning" />
                  <div>
                    <h4 className="font-medium">Ações Pendentes</h4>
                    <p className="text-sm text-muted-foreground">
                      {lotesAtivos.filter(l => l.statusManejo === 'pendente').length} manejos pendentes,{' '}
                      {lotesAtivos.filter(l => l.statusManejo === 'atrasado').length} atrasados
                    </p>
                  </div>
                  <Button variant="outline" size="sm" className="ml-auto">
                    Ver Detalhes
                  </Button>
                </div>
              </CardContent>
            </Card>
          )}
        </TabsContent>


        {/* Tab: Histórico */}
        <TabsContent value="historico" className="space-y-6">
          {/* Search and Filters */}
          <HistoricoSearch
            filters={filters}
            onFiltersChange={setFilters}
            onDownloadPDF={handleDownloadConsolidatedPDF}
            onDownloadExcel={handleDownloadConsolidatedExcel}
            totalEventos={totalEventos}
            eventosFiltrados={eventosFiltrados}
            loading={pdfLoading || excelLoading}
          />

          {/* History Cards */}
          {historicoLoading ? (
            <div className="grid gap-4">
              {[1, 2, 3].map((i) => (
                <Card key={i} className="glass-light border-0">
                  <CardContent className="p-6">
                    <div className="animate-pulse space-y-3">
                      <div className="h-4 bg-muted rounded w-3/4"></div>
                      <div className="h-3 bg-muted rounded w-1/2"></div>
                      <div className="h-3 bg-muted rounded w-5/6"></div>
                    </div>
                  </CardContent>
                </Card>
              ))}
            </div>
          ) : historico.length === 0 ? (
            <Card className="glass-light border-0">
              <CardContent className="p-12 text-center">
                <FileText className="h-12 w-12 mx-auto mb-4 text-muted-foreground/50" />
                <h3 className="text-lg font-medium mb-2">Nenhum evento encontrado</h3>
                <p className="text-muted-foreground">
                  {filters.query || filters.tipo !== 'all' || filters.dataInicio || filters.dataFim
                    ? 'Ajuste os filtros para ver mais resultados'
                    : 'Os eventos de histórico aparecerão aqui conforme ações forem realizadas'}
                </p>
              </CardContent>
            </Card>
          ) : (
            <div className="space-y-4">
              {/* Info sobre limitação dos últimos 10 eventos */}
              <div className="text-center text-sm text-muted-foreground bg-muted/30 p-3 rounded-lg">
                Mostrando os últimos 10 eventos. Use os filtros para refinar sua busca.
              </div>
              <div className="grid gap-4 sm:gap-6">
                {historico.map(renderHistoricoCard)}
              </div>
            </div>
          )}

          {/* Results summary for mobile */}
          {historico.length > 0 && (
            <div className="md:hidden text-center text-sm text-muted-foreground">
              {eventosFiltrados} de {totalEventos} eventos
            </div>
          )}
        </TabsContent>

        {/* Tab: Análise */}
        <TabsContent value="analise" className="space-y-6">
          <Card className="glass-light border-0">
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <BarChart3 className="h-5 w-5" />
                Análise de Performance
              </CardTitle>
            </CardHeader>
            <CardContent>
              <PerformanceCharts
                metrics={metrics}
                lotesAtivos={lotesAtivos}
                lotesFinalizados={lotesFinalizados}
              />
            </CardContent>
          </Card>
        </TabsContent>
      </Tabs>

      {/* Modal de Finalização */}
      {loteToFinalize && (
        <FinalizationModal
          lote={loteToFinalize}
          open={selectedLoteForFinalization !== null}
          onOpenChange={(open) => !open && setSelectedLoteForFinalization(null)}
          onFinalizar={finalizarLote}
        />
      )}

      {/* Modal de Manejo Simplificado */}
      <ManejoSimplificado
        open={showManejoSemanal}
        onClose={() => setShowManejoSemanal(false)}
        lotes={lotesAtivos}
        organizacao="CWB001"
        onManejoCompleto={refetch}
      />

      {/* Modal de Galeria de Fotos */}
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
};

export default Lotes;