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
  Activity,
  Sprout
} from 'lucide-react';

import { useLotesManager } from '@/hooks/useLotesManager';
import { ProductionBelt } from '@/components/ProductionBelt';
import { ManejoCard } from '@/components/ManejoCard';
import { ManejoSemanal } from '@/components/ManejoSemanal';
import { PerformanceCharts } from '@/components/PerformanceCharts';
import { FinalizationModal } from '@/components/FinalizationModal';
import { StatCard } from '@/components/StatCard';

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
        <TabsList className="grid w-full grid-cols-4">
          <TabsTrigger value="producao">Produção</TabsTrigger>
          <TabsTrigger value="manejo">Manejo</TabsTrigger>
          <TabsTrigger value="historico">Histórico</TabsTrigger>
          <TabsTrigger value="analise">Análise</TabsTrigger>
        </TabsList>

        {/* Tab: Produção */}
        <TabsContent value="producao" className="space-y-6">
          <Card className="glass-light border-0">
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <Package className="h-5 w-5" />
                Esteira de Produção
              </CardTitle>
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

        {/* Tab: Manejo */}
        <TabsContent value="manejo" className="space-y-6">
          <Card className="glass-light border-0">
            <CardHeader>
              <div className="flex items-center justify-between">
                <div>
                  <CardTitle className="flex items-center gap-2">
                    <BarChart3 className="h-5 w-5" />
                    Manejo Semanal
                  </CardTitle>
                  <p className="text-sm text-muted-foreground mt-1">
                    Processo integrado de transferência e finalização dos lotes
                  </p>
                </div>
                <Button 
                  onClick={() => setShowManejoSemanal(true)}
                  disabled={lotesAtivos.length < 7}
                  className="gap-2"
                >
                  <Clock className="h-4 w-4" />
                  Iniciar Manejo
                </Button>
              </div>
            </CardHeader>
            <CardContent>
              {lotesAtivos.length === 0 ? (
                <div className="text-center py-8">
                  <Package className="h-12 w-12 mx-auto mb-4 text-muted-foreground/50" />
                  <h3 className="text-lg font-medium mb-2">Nenhum lote ativo</h3>
                  <p className="text-muted-foreground">
                    Não há lotes em processamento no momento
                  </p>
                </div>
              ) : lotesAtivos.length < 7 ? (
                <div className="text-center py-8">
                  <AlertTriangle className="h-12 w-12 mx-auto mb-4 text-warning" />
                  <h3 className="text-lg font-medium mb-2">Lotes insuficientes</h3>
                  <p className="text-muted-foreground">
                    É necessário ter lotes em todas as 7 caixas para realizar o manejo semanal.
                  </p>
                  <p className="text-sm text-muted-foreground mt-2">
                    Lotes ativos: {lotesAtivos.length}/7
                  </p>
                </div>
              ) : (
                <div className="space-y-4">
                  <div className="bg-green-50 border border-green-200 rounded-lg p-4">
                    <div className="flex items-center gap-2 mb-2">
                      <CheckCircle className="h-5 w-5 text-green-500" />
                      <h4 className="font-medium text-green-800">Sistema pronto para manejo</h4>
                    </div>
                    <p className="text-sm text-green-700">
                      Todas as 7 caixas possuem lotes ativos. Você pode iniciar o processo de manejo semanal.
                    </p>
                  </div>

                  <div className="grid grid-cols-7 gap-2">
                    {Array.from({ length: 7 }, (_, i) => i + 1).map(caixa => {
                      const lote = lotesAtivos.find(l => l.caixa_atual === caixa);
                      return (
                        <Card key={caixa} className="text-center">
                          <CardContent className="p-3">
                            <div className="text-xs text-muted-foreground mb-1">Caixa {caixa}</div>
                            {lote ? (
                              <>
                                <div className="text-sm font-medium">{lote.codigo}</div>
                                <div className="text-xs text-muted-foreground">
                                  {lote.peso_atual.toFixed(1)}kg
                                </div>
                                <Badge variant="default" className="text-xs mt-1">
                                  Ativo
                                </Badge>
                              </>
                            ) : (
                              <div className="text-xs text-muted-foreground">Vazia</div>
                            )}
                          </CardContent>
                        </Card>
                      );
                    })}
                  </div>

                  <div className="text-center">
                    <Button 
                      onClick={() => setShowManejoSemanal(true)}
                      size="lg"
                      className="gap-2"
                    >
                      <Clock className="h-5 w-5" />
                      Iniciar Processo de Manejo Semanal
                    </Button>
                  </div>
                </div>
              )}
            </CardContent>
          </Card>
        </TabsContent>

        {/* Tab: Histórico */}
        <TabsContent value="historico" className="space-y-6">
          <div className="grid gap-4">
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
              lotesFinalizados.map(lote => (
                <Card key={lote.id} className="glass-light border-0 organic-hover">
                  <CardContent className="p-4">
                    <div className="flex items-center justify-between mb-3">
                      <div>
                        <h4 className="font-semibold">{lote.codigo}</h4>
                        <p className="text-sm text-muted-foreground">
                          {formatarData(lote.data_inicio)} - {formatarData(lote.data_encerramento || lote.data_inicio)}
                        </p>
                      </div>
                      <Badge variant="outline" className="text-success border-success">
                        Finalizado
                      </Badge>
                    </div>

                    <div className="grid grid-cols-3 gap-4 text-sm">
                      <div>
                        <p className="text-xs text-muted-foreground">Peso Inicial</p>
                        <p className="font-medium">{lote.peso_inicial.toFixed(1)}kg</p>
                      </div>
                      <div>
                        <p className="text-xs text-muted-foreground">Peso Final</p>
                        <p className="font-medium">{lote.peso_atual.toFixed(1)}kg</p>
                      </div>
                      <div>
                        <p className="text-xs text-muted-foreground">Redução</p>
                        <p className="font-medium text-success">
                          -{lote.reducaoAcumulada.toFixed(1)}%
                        </p>
                      </div>
                    </div>
                  </CardContent>
                </Card>
              ))
            )}
          </div>
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

      {/* Modal de Manejo Semanal */}
      <ManejoSemanal
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