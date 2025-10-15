import { useParams, useNavigate } from 'react-router-dom';
import { ArrowLeft, Loader2 } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Alert, AlertDescription } from '@/components/ui/alert';
import { usePublicLoteAuditoria } from '@/hooks/usePublicLoteAuditoria';
import { LoteHeader } from '@/components/auditoria/LoteHeader';
import { ImpactMetrics } from '@/components/auditoria/ImpactMetrics';
import { TraceabilityTimeline } from '@/components/auditoria/TraceabilityTimeline';
import { VolunteerDetails } from '@/components/auditoria/VolunteerDetails';

export default function LoteAuditoria() {
  const { codigoUnico } = useParams<{ codigoUnico: string }>();
  const navigate = useNavigate();
  const { data, loading, error } = usePublicLoteAuditoria(codigoUnico);

  // Loading state
  if (loading) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-gradient-subtle">
        <div className="text-center space-y-4">
          <Loader2 className="w-12 h-12 animate-spin text-primary mx-auto" />
          <p className="text-lg text-muted-foreground">Carregando certificado...</p>
        </div>
      </div>
    );
  }

  // Error state
  if (error || !data) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-gradient-subtle p-4">
        <div className="max-w-md w-full space-y-4">
          <Alert variant="destructive">
            <AlertDescription className="text-sm sm:text-base">
              {error || 'Lote não encontrado'}
            </AlertDescription>
          </Alert>
          <Button
            variant="outline"
            onClick={() => navigate('/')}
            className="w-full"
          >
            <ArrowLeft className="w-4 h-4 mr-2" />
            Voltar para o início
          </Button>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gradient-subtle">
      {/* Header com botão voltar */}
      <header className="sticky top-0 z-10 glass-light border-b border-border/50 backdrop-blur-sm">
        <div className="container mx-auto px-4 py-3 sm:py-4">
          <Button
            variant="ghost"
            size="sm"
            onClick={() => navigate('/')}
            className="text-sm sm:text-base"
          >
            <ArrowLeft className="w-4 h-4 mr-2" />
            Voltar
          </Button>
        </div>
      </header>

      {/* Conteúdo principal */}
      <main className="container mx-auto px-4 py-6 sm:py-8 lg:py-12 space-y-6 sm:space-y-8 lg:space-y-12">
        {/* Seção 1: Cabeçalho do Lote */}
        <LoteHeader
          codigoLote={data.codigo_lote}
          codigoUnico={data.codigo_unico}
          statusLote={data.status_lote}
          unidade={data.unidade}
          dataInicio={data.data_inicio}
          dataFinalizacao={data.data_finalizacao}
          hashRastreabilidade={data.hash_rastreabilidade}
          latitude={data.latitude}
          longitude={data.longitude}
        />

        {/* Seção 2: Métricas de Impacto */}
        <ImpactMetrics
          pesoInicial={data.peso_inicial}
          pesoFinal={data.peso_final}
          duracaoDias={data.duracao_dias}
          co2eqEvitado={data.co2eq_evitado}
          creditosCau={data.creditos_cau}
          totalVoluntarios={data.total_voluntarios}
          mediaRating={data.media_rating}
          statusLote={data.status_lote}
        />

        {/* Seção 3: Linha do Tempo da Rastreabilidade */}
        <TraceabilityTimeline eventos={data.eventos} />

        {/* Seção 4: Detalhes Adicionais */}
        <VolunteerDetails
          voluntarios={data.voluntarios}
          validadores={data.validadores}
        />

        {/* Footer */}
        <footer className="text-center py-8 border-t border-border">
          <div className="flex flex-col items-center gap-3">
            <img
              src="/lovable-uploads/powered-by-bion.png"
              alt="Powered by Bion"
              className="h-8 sm:h-10 opacity-70 hover:opacity-100 transition-opacity"
            />
            <p className="text-xs sm:text-sm text-muted-foreground">
              Certificado de Rastreabilidade Blockchain
            </p>
          </div>
        </footer>
      </main>
    </div>
  );
}
