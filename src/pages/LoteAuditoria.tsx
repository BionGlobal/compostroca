import { useParams, Link } from 'react-router-dom';
import { ArrowLeft, Download, Shield, AlertTriangle, CheckCircle2, Clock, TrendingDown, Leaf } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Alert, AlertDescription } from '@/components/ui/alert';
import { Separator } from '@/components/ui/separator';
import { useLoteAuditoriaAprimorada } from '@/hooks/useLoteAuditoriaAprimorada';
import { TimelineEventoRastreabilidade } from '@/components/TimelineEventoRastreabilidade';
import { formatHashDisplay } from '@/lib/hashUtils';
import { Loader2 } from 'lucide-react';

export default function LoteAuditoriaRefatorada() {
  const { codigoUnico } = useParams<{ codigoUnico: string }>();
  const { loteAuditoria, loading } = useLoteAuditoriaAprimorada(codigoUnico || '');

  if (loading) {
    return (
      <div className="container mx-auto p-6 flex items-center justify-center min-h-screen">
        <div className="flex flex-col items-center gap-4">
          <Loader2 className="h-12 w-12 animate-spin text-primary" />
          <p className="text-muted-foreground">Carregando dados de rastreabilidade...</p>
        </div>
      </div>
    );
  }

  if (!loteAuditoria) {
    return (
      <div className="container mx-auto p-6">
        <Alert variant="destructive">
          <AlertTriangle className="h-4 w-4" />
          <AlertDescription>
            Lote não encontrado. Verifique o código e tente novamente.
          </AlertDescription>
        </Alert>
        <Link to="/lotes">
          <Button variant="outline" className="mt-4">
            <ArrowLeft className="mr-2 h-4 w-4" />
            Voltar para Lotes
          </Button>
        </Link>
      </div>
    );
  }

  const getStatusIntegridadeBadge = () => {
    const config = {
      'VÁLIDO': { variant: 'default' as const, icon: CheckCircle2, color: 'text-green-600' },
      'ALERTA': { variant: 'secondary' as const, icon: AlertTriangle, color: 'text-yellow-600' },
      'CRÍTICO': { variant: 'destructive' as const, icon: AlertTriangle, color: 'text-red-600' },
      'PENDENTE': { variant: 'outline' as const, icon: Clock, color: 'text-blue-600' }
    };

    const { variant, icon: Icon, color } = config[loteAuditoria.status_integridade];

    return (
      <Badge variant={variant} className="gap-1">
        <Icon className={`h-3 w-3 ${color}`} />
        {loteAuditoria.status_integridade}
      </Badge>
    );
  };

  return (
    <div className="container mx-auto p-4 md:p-6 space-y-6">
      {/* Header */}
      <div className="flex flex-col md:flex-row md:items-center md:justify-between gap-4">
        <div className="space-y-1">
          <Link to="/lotes">
            <Button variant="ghost" size="sm" className="mb-2">
              <ArrowLeft className="mr-2 h-4 w-4" />
              Voltar
            </Button>
          </Link>
          <h1 className="text-3xl font-bold">Rastreabilidade do Lote</h1>
          <p className="text-muted-foreground">Trilha completa de 8 eventos do processo de compostagem</p>
        </div>
        <div className="flex gap-2">
          <Button variant="outline">
            <Download className="mr-2 h-4 w-4" />
            Baixar PDF
          </Button>
        </div>
      </div>

      {/* Identificação e Status de Integridade */}
      <Card>
        <CardHeader>
          <div className="flex flex-col md:flex-row md:items-center md:justify-between gap-4">
            <div className="space-y-1">
              <CardTitle className="text-2xl">{loteAuditoria.codigo_unico}</CardTitle>
              <p className="text-sm text-muted-foreground">{loteAuditoria.unidade_nome}</p>
            </div>
            <div className="flex items-center gap-2">
              {getStatusIntegridadeBadge()}
              <Badge variant="outline">{loteAuditoria.status}</Badge>
            </div>
          </div>
        </CardHeader>
        <CardContent className="space-y-4">
          {/* Hash de Rastreabilidade */}
          {loteAuditoria.hash_rastreabilidade && (
            <div className="space-y-2">
              <div className="flex items-center gap-2 text-sm font-medium">
                <Shield className="h-4 w-4 text-primary" />
                Hash de Rastreabilidade
              </div>
              <div className="pl-6 font-mono text-xs break-all bg-muted/50 p-3 rounded">
                {loteAuditoria.hash_rastreabilidade}
              </div>
            </div>
          )}

          {/* Mensagens de Integridade */}
          {loteAuditoria.mensagens_integridade.length > 0 && (
            <div className="space-y-2">
              {loteAuditoria.mensagens_integridade.map((mensagem, idx) => (
                <Alert key={idx} variant={loteAuditoria.status_integridade === 'VÁLIDO' ? 'default' : 'destructive'}>
                  <AlertDescription>{mensagem}</AlertDescription>
                </Alert>
              ))}
            </div>
          )}
        </CardContent>
      </Card>

      {/* Grid: Resumo Executivo e Blockchain */}
      <div className="grid lg:grid-cols-3 gap-6">
        {/* Resumo Executivo */}
        <div className="lg:col-span-2 space-y-6">
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <TrendingDown className="h-5 w-5" />
                Resumo Executivo
              </CardTitle>
            </CardHeader>
            <CardContent>
              <div className="grid sm:grid-cols-2 md:grid-cols-3 gap-4">
                <div>
                  <p className="text-sm text-muted-foreground">Peso Inicial</p>
                  <p className="text-2xl font-bold">{loteAuditoria.peso_inicial.toFixed(2)} kg</p>
                </div>
                <div>
                  <p className="text-sm text-muted-foreground">Peso Final {loteAuditoria.peso_final ? '(Real)' : '(Estimado)'}</p>
                  <p className="text-2xl font-bold">
                    {(loteAuditoria.peso_final || loteAuditoria.eventos[7]?.peso_depois || 0).toFixed(2)} kg
                  </p>
                </div>
                <div>
                  <p className="text-sm text-muted-foreground">Redução Esperada</p>
                  <p className="text-2xl font-bold">{loteAuditoria.taxa_reducao_esperada}%</p>
                </div>
                <div>
                  <p className="text-sm text-muted-foreground">Duração do Processo</p>
                  <p className="text-2xl font-bold">{loteAuditoria.duracao_processo_dias} dias</p>
                </div>
                <div>
                  <p className="text-sm text-muted-foreground">Voluntários</p>
                  <p className="text-2xl font-bold">{loteAuditoria.total_voluntarios}</p>
                </div>
                <div>
                  <p className="text-sm text-muted-foreground">Total de Fotos</p>
                  <p className="text-2xl font-bold">{loteAuditoria.total_fotos}</p>
                </div>
              </div>

              <Separator className="my-4" />

              {/* Impacto Ambiental */}
              <div className="space-y-2">
                <h4 className="font-semibold flex items-center gap-2">
                  <Leaf className="h-4 w-4 text-green-600" />
                  Impacto Ambiental
                </h4>
                <div className="grid sm:grid-cols-2 gap-4">
                  <div>
                    <p className="text-sm text-muted-foreground">CO2eq Evitado</p>
                    <p className="text-xl font-bold text-green-600">
                      {loteAuditoria.co2eq_evitado?.toFixed(2) || '0.00'} kg
                    </p>
                  </div>
                  <div>
                    <p className="text-sm text-muted-foreground">Créditos CAU</p>
                    <p className="text-xl font-bold text-green-600">
                      {loteAuditoria.creditos_cau?.toFixed(3) || '0.000'}
                    </p>
                  </div>
                </div>
              </div>
            </CardContent>
          </Card>

          {/* Voluntários Participantes */}
          {loteAuditoria.voluntarios_detalhes.length > 0 && (
            <Card>
              <CardHeader>
                <CardTitle>Voluntários Participantes</CardTitle>
              </CardHeader>
              <CardContent>
                <div className="space-y-2">
                  {loteAuditoria.voluntarios_detalhes.map((vol) => (
                    <div key={vol.id} className="flex items-center justify-between p-3 bg-muted/50 rounded">
                      <div>
                        <p className="font-medium">{vol.nome}</p>
                        <p className="text-sm text-muted-foreground">Balde #{vol.numero_balde}</p>
                      </div>
                      <div className="text-right">
                        <p className="font-medium">{vol.peso_total.toFixed(2)} kg</p>
                        <p className="text-sm text-muted-foreground">{vol.total_entregas} entrega(s)</p>
                      </div>
                    </div>
                  ))}
                </div>
              </CardContent>
            </Card>
          )}
        </div>

        {/* Sidebar: Blockchain e QR Code */}
        <div className="space-y-6">
          {/* QR Code */}
          {loteAuditoria.qr_code_url && (
            <Card>
              <CardHeader>
                <CardTitle className="text-lg">QR Code de Verificação</CardTitle>
              </CardHeader>
              <CardContent className="flex justify-center">
                <img
                  src={loteAuditoria.qr_code_url}
                  alt="QR Code"
                  className="w-48 h-48 border rounded"
                />
              </CardContent>
            </Card>
          )}

          {/* Integridade Blockchain */}
          <Card>
            <CardHeader>
              <CardTitle className="text-lg">Integridade Blockchain</CardTitle>
            </CardHeader>
            <CardContent className="space-y-3">
              <div>
                <p className="text-sm text-muted-foreground">Posição na Cadeia</p>
                <p className="font-mono text-lg font-bold">#{loteAuditoria.indice_cadeia}</p>
              </div>
              {loteAuditoria.hash_integridade && (
                <div>
                  <p className="text-sm text-muted-foreground">Hash Integridade</p>
                  <p className="font-mono text-xs break-all">{formatHashDisplay(loteAuditoria.hash_integridade)}</p>
                </div>
              )}
              {loteAuditoria.hash_anterior && (
                <div>
                  <p className="text-sm text-muted-foreground">Hash Anterior</p>
                  <p className="font-mono text-xs break-all">{formatHashDisplay(loteAuditoria.hash_anterior)}</p>
                </div>
              )}
            </CardContent>
          </Card>

          {/* Progresso da Trilha */}
          <Card>
            <CardHeader>
              <CardTitle className="text-lg">Progresso da Trilha</CardTitle>
            </CardHeader>
            <CardContent className="space-y-2">
              <div className="flex justify-between text-sm">
                <span>Eventos Registrados</span>
                <span className="font-bold">{loteAuditoria.eventos_reais_count}/8</span>
              </div>
              <div className="w-full bg-muted rounded-full h-2">
                <div
                  className="bg-primary h-2 rounded-full transition-all"
                  style={{ width: `${(loteAuditoria.eventos_reais_count / 8) * 100}%` }}
                />
              </div>
              {loteAuditoria.eventos_estimados_count > 0 && (
                <p className="text-xs text-muted-foreground">
                  {loteAuditoria.eventos_estimados_count} evento(s) estimado(s)
                </p>
              )}
            </CardContent>
          </Card>
        </div>
      </div>

      {/* Timeline Completa de Eventos (8 eventos sempre) */}
      <Card>
        <CardHeader>
          <CardTitle className="text-2xl">Cronologia Completa - Trilha de Rastreabilidade</CardTitle>
          <p className="text-sm text-muted-foreground">
            Sequência padronizada de 8 eventos do processo de compostagem
          </p>
        </CardHeader>
        <CardContent>
          <div className="space-y-6">
            {loteAuditoria.eventos.map((evento, index) => (
              <TimelineEventoRastreabilidade
                key={evento.id}
                evento={evento}
                isEstimado={evento.id.startsWith('estimado-')}
                index={index}
                totalEventos={loteAuditoria.eventos.length}
              />
            ))}
          </div>
        </CardContent>
      </Card>

      {/* Footer */}
      <div className="flex justify-center py-6">
        <img
          src="/lovable-uploads/powered-by-bion.png"
          alt="Powered by Bion"
          className="h-12 opacity-70 hover:opacity-100 transition-opacity"
        />
      </div>
    </div>
  );
}
