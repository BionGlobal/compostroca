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
  Sprout
} from 'lucide-react';

import { useLotesManager } from '@/hooks/useLotesManager';
import { ProductionBelt } from '@/components/ProductionBelt';
import { ManejoCard } from '@/components/ManejoCard';
import { ManejoSimplificado } from '@/components/ManejoSimplificado';
// import { PerformanceCharts } from '@/components/PerformanceCharts';
import { FinalizationModal } from '@/components/FinalizationModal';
import { StatCard } from '@/components/StatCard';
import { LoteHistoricoCard } from '@/components/LoteHistoricoCard';
import { LoteDetalhesModal } from '@/components/LoteDetalhesModal';
import { toast } from '@/components/ui/use-toast';

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

  const [selectedLoteForFinalization, setSelectedLoteForFinalization] = useState<string | null>(null);
  const [showManejoSemanal, setShowManejoSemanal] = useState(false);

  const handleManejoClick = (lote: any) => {
    // Modal já é aberto pelo ManejoCard
    console.log('Manejo para lote:', lote.codigo);
  };

  const handleFinalizarClick = (lote: any) => {
    setSelectedLoteForFinalization(lote.id);
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
      <div className="grid grid-cols-2 lg:grid-cols-6 gap-4">
        <StatCard
          title="Capacidade"
          value={`${metrics.capacidadeUtilizada.toFixed(0)}%`}
          description="da esteira ocupada"
          icon={<Gauge className="h-6 w-6" />}
          variant={metrics.capacidadeUtilizada > 85 ? 'earth' : 'default'}
        />
        <StatCard
          title="Peso Total"
          value={`${metrics.pesoTotalCompostado.toFixed(1)}T`}
          description="resíduo compostado"
          icon={<Scale className="h-6 w-6" />}
          variant={metrics.pesoTotalCompostado > 5 ? 'primary' : 'default'}
        />
        <StatCard
          title="CO2e Evitado"
          value={`${metrics.co2eEvitado.toFixed(1)}T`}
          description="impacto ambiental"
          icon={<Leaf className="h-6 w-6" />}
          variant="earth"
        />
        <StatCard
          title="Entregas"
          value={`${metrics.totalEntregas}`}
          description="validadas realizadas"
          icon={<Package className="h-6 w-6" />}
          variant="default"
        />
        <StatCard
          title="Voluntários"
          value={`${metrics.totalVoluntarios}`}
          description="que fizeram entregas"
          icon={<Users className="h-6 w-6" />}
          variant="default"
        />
        <StatCard
          title="Composto"
          value={`${(metrics.compostoProduzido || 0) >= 1000 
            ? `${((metrics.compostoProduzido || 0) / 1000).toFixed(1)}T` 
            : `${(metrics.compostoProduzido || 0).toFixed(1)}kg`}`}
          description="produzido finalizado"
          icon={<Sprout className="h-6 w-6" />}
          variant="earth"
        />
      </div>

      {/* Tabs de navegação */}
      <Tabs defaultValue="producao" className="space-y-6">
        <TabsList className="grid w-full grid-cols-3">
          <TabsTrigger value="producao">Produção</TabsTrigger>
          <TabsTrigger value="historico">Histórico</TabsTrigger>
          <TabsTrigger value="analise" onClick={() => toast({ title: 'Em desenvolvimento', description: 'Em breve você poderá acompanhar indicadores avançados.' })}>Análise</TabsTrigger>
        </TabsList>

        {/* Tab: Produção */}
        <TabsContent value="producao" className="space-y-6">
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
          {lotesFinalizados.length === 0 ? (
            <Card className="glass-light border-0">
              <CardContent className="p-8 text-center">
                <CheckCircle className="h-12 w-12 mx-auto mb-4 text-muted-foreground/50" />
                <h3 className="text-lg font-medium mb-2">Nenhum lote finalizado</h3>
                <p className="text-muted-foreground">
                  Os lotes finalizados aparecerão aqui
                </p>
              </CardContent>
            </Card>
          ) : (
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
              {lotesFinalizados.map((lote) => (
                <LoteDetalhesModal key={lote.id} loteId={lote.id} loteCode={lote.codigo}>
                  <LoteHistoricoCard 
                    lote={lote as any}
                    onClick={() => {}}
                  />
                </LoteDetalhesModal>
              ))}
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
              <div className="p-8 text-center text-muted-foreground">
                Em desenvolvimento. Em breve você poderá acompanhar indicadores e comparativos avançados.
              </div>
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
    </div>
  );
};

export default Lotes;