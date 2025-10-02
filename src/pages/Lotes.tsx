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
  FileText,
  ChevronLeft,
  ChevronRight
} from 'lucide-react';
import {
  Pagination,
  PaginationContent,
  PaginationItem,
  PaginationLink,
  PaginationNext,
  PaginationPrevious,
  PaginationEllipsis,
} from '@/components/ui/pagination';

import { useLotesManager } from '@/hooks/useLotesManager';
import { useHistoricoLotes } from '@/hooks/useHistoricoLotes';
import { useAdvancedPDFGenerator } from '@/hooks/useAdvancedPDFGenerator';
import { useExcelGenerator } from '@/hooks/useExcelGenerator';
import { CardHistoricoLote } from '@/components/CardHistoricoLote';
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
import { FotosLoteProntoModal } from '@/components/FotosLoteProntoModal';
import { ChainIntegrityMonitor } from '@/components/ChainIntegrityMonitor';
import { PageErrorBoundary } from '@/components/PageErrorBoundary';


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
    lotesFiltrados,
    loading: historicoLoading,
    filters,
    setFilters,
    refetch: refetchHistorico,
    totalLotes,
    lotesFiltradosCount,
    currentPage,
    setCurrentPage,
    totalPages,
    itemsPerPage
  } = useHistoricoLotes();

  const {
    generateNovoLotePDF,
    generateLoteFinalizadoPDF,
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

  const [fotosLoteProntoModal, setFotosLoteProntoModal] = useState({
    open: false,
    loteId: '',
    title: ''
  });

  const handleManejoClick = (lote: any) => {
    // Modal já é aberto pelo ManejoCard
    console.log('Manejo para lote:', lote.codigo);
  };

  const handleFinalizarClick = (lote: any) => {
    setSelectedLoteForFinalization(lote.id);
  };

  // History handlers  
  const handleViewPhotos = (loteId: string, title: string, isLoteProng?: boolean, entregaId?: string, manejoId?: string) => {
    if (isLoteProng) {
      // Para lotes prontos, usar o modal específico
      setFotosLoteProntoModal({
        open: true,
        loteId,
        title
      });
    } else {
      // Para lotes em processamento, usar o modal padrão
      setFotosModalData({
        open: true,
        loteId,
        title,
        entregaId,
        manejoId
      });
    }
  };

  const handleViewLotePhotos = (lote: any) => {
    setFotosModalData({
      open: true,
      loteId: lote.id,
      title: `Fotos das Entregas - ${lote.codigo}`,
      entregaId: undefined,
      manejoId: undefined
    });
  };

  const handleViewLoteProntoPhotos = (loteId: string, title: string) => {
    setFotosLoteProntoModal({
      open: true,
      loteId,
      title
    });
  };

  // PDF handlers
  const handleDownloadPDF = (lote: any) => {
    // Verificar se é um novo lote baseado na data de criação e status
    const dataInicio = new Date(lote.data_inicio);
    const hoje = new Date();
    const diasDesdeCriacao = Math.floor((hoje.getTime() - dataInicio.getTime()) / (1000 * 3600 * 24));
    
    // Se foi criado nos últimos 2 dias E não foi finalizado, é considerado "novo lote"
    const isNovoLote = diasDesdeCriacao <= 2 && !lote.data_encerramento;
    
    console.log('Lote:', lote.codigo, 'Dias desde criação:', diasDesdeCriacao, 'É novo lote:', isNovoLote);
    
    if (isNovoLote) {
      generateNovoLotePDF(lote);
    } else {
      generateLoteFinalizadoPDF(lote);
    }
  };

  const handleDownloadConsolidatedExcel = async () => {
    await generateConsolidatedExcel(lotesFiltrados);
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
    <PageErrorBoundary pageName="Lotes">
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
                onViewPhotos={handleViewPhotos}
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
            onDownloadPDF={() => {}}
            onDownloadExcel={handleDownloadConsolidatedExcel}
            totalEventos={totalLotes}
            eventosFiltrados={lotesFiltradosCount}
            loading={excelLoading}
          />

          {/* History Cards */}
          {historicoLoading ? (
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
              {Array.from({ length: 6 }).map((_, i) => (
                <div key={i} className="h-80 bg-muted animate-pulse rounded-lg" />
              ))}
            </div>
          ) : lotesFiltrados.length === 0 ? (
            <Card className="glass-light border-0">
              <CardContent className="p-12 text-center">
                <FileText className="h-12 w-12 mx-auto mb-4 text-muted-foreground/50" />
                <h3 className="text-lg font-medium mb-2">Nenhum lote encontrado</h3>
                <p className="text-muted-foreground">
                  Os lotes aparecerão aqui conforme forem criados e finalizados
                </p>
              </CardContent>
            </Card>
          ) : (
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
              {lotesFiltrados.map((lote) => (
                <CardHistoricoLote
                  key={lote.id}
                  lote={lote}
                  onViewPhotos={handleViewPhotos}
                  onDownloadPDF={() => handleDownloadPDF(lote)}
                  loading={pdfLoading}
                />
              ))}
            </div>
          )}

          {/* Pagination - Mobile First */}
          {totalPages > 1 && (
            <div className="flex flex-col items-center gap-4 mt-6">
              {/* Mobile: Simple prev/next */}
              <div className="flex md:hidden items-center justify-between w-full gap-2">
                <Button
                  variant="outline"
                  size="sm"
                  onClick={() => setCurrentPage(p => Math.max(1, p - 1))}
                  disabled={currentPage === 1}
                  className="flex-1"
                >
                  <ChevronLeft className="h-4 w-4 mr-1" />
                  Anterior
                </Button>
                <span className="text-sm text-muted-foreground px-4">
                  {currentPage} / {totalPages}
                </span>
                <Button
                  variant="outline"
                  size="sm"
                  onClick={() => setCurrentPage(p => Math.min(totalPages, p + 1))}
                  disabled={currentPage === totalPages}
                  className="flex-1"
                >
                  Próxima
                  <ChevronRight className="h-4 w-4 ml-1" />
                </Button>
              </div>

              {/* Desktop: Full pagination */}
              <Pagination className="hidden md:flex">
                <PaginationContent>
                  <PaginationItem>
                    <PaginationPrevious 
                      onClick={() => setCurrentPage(p => Math.max(1, p - 1))}
                      className={currentPage === 1 ? 'pointer-events-none opacity-50' : 'cursor-pointer'}
                    />
                  </PaginationItem>
                  
                  {Array.from({ length: totalPages }, (_, i) => i + 1)
                    .filter(page => {
                      // Mostrar primeira, última, atual e 1 antes/depois da atual
                      return page === 1 || 
                             page === totalPages || 
                             Math.abs(page - currentPage) <= 1;
                    })
                    .map((page, index, array) => {
                      // Adicionar ellipsis quando há gap
                      const prevPage = array[index - 1];
                      const showEllipsis = prevPage && page - prevPage > 1;
                      
                      return (
                        <>
                          {showEllipsis && (
                            <PaginationItem key={`ellipsis-${page}`}>
                              <PaginationEllipsis />
                            </PaginationItem>
                          )}
                          <PaginationItem key={page}>
                            <PaginationLink
                              onClick={() => setCurrentPage(page)}
                              isActive={currentPage === page}
                              className="cursor-pointer"
                            >
                              {page}
                            </PaginationLink>
                          </PaginationItem>
                        </>
                      );
                    })}
                  
                  <PaginationItem>
                    <PaginationNext 
                      onClick={() => setCurrentPage(p => Math.min(totalPages, p + 1))}
                      className={currentPage === totalPages ? 'pointer-events-none opacity-50' : 'cursor-pointer'}
                    />
                  </PaginationItem>
                </PaginationContent>
              </Pagination>

              {/* Results info */}
              <div className="text-center text-sm text-muted-foreground">
                Mostrando {((currentPage - 1) * itemsPerPage) + 1} - {Math.min(currentPage * itemsPerPage, lotesFiltradosCount)} de {lotesFiltradosCount} lotes
              </div>
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

      {/* Modal de Fotos do Lote Pronto */}
      <FotosLoteProntoModal
        isOpen={fotosLoteProntoModal.open}
        onClose={() => setFotosLoteProntoModal(prev => ({ ...prev, open: false }))}
        loteId={fotosLoteProntoModal.loteId}
        loteCodigo={fotosLoteProntoModal.title || ''}
        fotos={[]}
      />
      </div>
    </PageErrorBoundary>
  );
};

export default Lotes;