import { useParams } from 'react-router-dom';
import { useLoteAuditoriaEnhanced } from '@/hooks/useLoteAuditoriaEnhanced';
import { usePDFGenerator } from '@/hooks/usePDFGenerator';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Separator } from '@/components/ui/separator';
import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar';
import { MapPin, Calendar, Weight, Leaf, FileText, Download, QrCode, Shield, Hash, MessageSquare, Scale, User, Camera, Package, ArrowRight, CheckCircle, RefreshCw, Clock, Play } from 'lucide-react';
import { useState } from 'react';
import { PublicFotosGalleryModal } from '@/components/PublicFotosGalleryModal';
import { formatWeight, getOrganizationName } from '@/lib/organizationUtils';
import { formatHashDisplay } from '@/lib/hashUtils';

export default function LoteAuditoria() {
  const { codigoUnico } = useParams<{ codigoUnico: string }>();
  const { loteAuditoria, loading } = useLoteAuditoriaEnhanced(codigoUnico);
  const { generatePDF, loading: pdfLoading } = usePDFGenerator();
  const [showPhotos, setShowPhotos] = useState(false);
  const [fotosParaGaleria, setFotosParaGaleria] = useState<any[]>([]);

  const handleDownloadPDF = async () => {
    if (!loteAuditoria) return;

    const loteDetalhes = {
      id: loteAuditoria.id,
      codigo: loteAuditoria.codigo,
      unidade: loteAuditoria.unidade,
      status: loteAuditoria.status,
      peso_inicial: loteAuditoria.peso_inicial,
      peso_atual: loteAuditoria.peso_final,
      data_inicio: loteAuditoria.data_inicio,
      data_encerramento: loteAuditoria.data_finalizacao,
      latitude: loteAuditoria.latitude,
      longitude: loteAuditoria.longitude,
      criado_por: loteAuditoria.id, // Using ID as fallback
      criado_por_nome: loteAuditoria.criado_por_nome,
      hash_integridade: loteAuditoria.hash_integridade,
      voluntarios: loteAuditoria.voluntarios.map(v => ({
        id: v.id,
        nome: v.nome,
        numero_balde: v.numero_balde,
        entregas_count: v.entregas_count,
        peso_total: v.peso_total
      })),
      entregas: loteAuditoria.entregas.map(e => ({
        id: e.id,
        peso: e.peso,
        created_at: e.created_at,
        voluntario_nome: e.voluntario_nome,
        fotos: e.fotos
      })),
      manejo_fotos: loteAuditoria.timeline.flatMap(stage => 
        stage.fotos.map(f => ({
          id: f.id,
          foto_url: f.foto_url,
          created_at: stage.created_at,
          caixa_origem: stage.caixa_origem || 0,
          caixa_destino: stage.caixa_destino || 0
        }))
      )
    };

    await generatePDF(loteDetalhes);
  };

  if (loading) {
    return (
      <div className="min-h-screen bg-background flex items-center justify-center">
        <div className="text-center">
          <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-primary mx-auto mb-4"></div>
          <p className="text-muted-foreground">Carregando dados de auditoria...</p>
        </div>
      </div>
    );
  }

  if (!loteAuditoria) {
    return (
      <div className="min-h-screen bg-background flex items-center justify-center">
        <Card className="w-full max-w-md">
          <CardContent className="pt-6 text-center">
            <h2 className="text-2xl font-bold text-destructive mb-2">Lote não encontrado</h2>
            <p className="text-muted-foreground">
              O lote solicitado não foi encontrado ou ainda não foi finalizado.
            </p>
          </CardContent>
        </Card>
      </div>
    );
  }

  const taxaReducao = ((loteAuditoria.peso_inicial - loteAuditoria.peso_final) / loteAuditoria.peso_inicial * 100);

  return (
    <div className="min-h-screen bg-background">
      {/* Header */}
      <header className="bg-card border-b border-border">
        <div className="container mx-auto px-4 py-6">
          <div className="flex flex-col space-y-4 lg:flex-row lg:items-center lg:justify-between lg:space-y-0">
            <div className="text-center lg:text-left">
              <h1 className="text-2xl lg:text-3xl font-bold text-primary">
                Lote {loteAuditoria.codigo_unico || loteAuditoria.codigo}
              </h1>
              <p className="text-muted-foreground mt-1">
                Auditoria e transparência
              </p>
            </div>
            <div className="flex flex-col sm:flex-row gap-3 w-full sm:w-auto">
              <Button 
                onClick={() => setShowPhotos(true)}
                variant="outline"
                className="flex items-center justify-center gap-2 w-full sm:w-auto"
              >
                <FileText className="h-4 w-4" />
                Ver Fotos ({loteAuditoria.todasFotosUnificadas.length})
              </Button>
              <Button 
                onClick={handleDownloadPDF}
                disabled={pdfLoading}
                className="flex items-center justify-center gap-2 w-full sm:w-auto"
              >
                <Download className="h-4 w-4" />
                {pdfLoading ? 'Gerando...' : 'Baixar PDF'}
              </Button>
            </div>
          </div>
        </div>
      </header>

      <main className="container mx-auto px-4 py-8">
        <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
          {/* Informações Básicas */}
          <div className="lg:col-span-2 space-y-6">
            <Card>
              <CardHeader>
                <CardTitle className="flex items-center gap-2">
                  <FileText className="h-5 w-5" />
                  Dados do Lote
                </CardTitle>
              </CardHeader>
              <CardContent className="space-y-4">
                <div className="flex items-center justify-between">
                  <span className="font-medium">Status:</span>
                  <Badge variant="default" className="bg-green-100 text-green-800">
                    Finalizado
                  </Badge>
                </div>
                
                <div className="grid grid-cols-2 gap-4">
                  <div>
                    <span className="text-sm text-muted-foreground">Unidade</span>
                    <p className="font-medium">{getOrganizationName(loteAuditoria.unidade)}</p>
                  </div>
                  <div>
                    <span className="text-sm text-muted-foreground">Validador</span>
                    <p className="font-medium">{loteAuditoria.criado_por_nome}</p>
                  </div>
                </div>

                <div className="grid grid-cols-2 gap-4">
                  <div className="flex items-center gap-2">
                    <Calendar className="h-4 w-4 text-muted-foreground" />
                    <div>
                      <span className="text-sm text-muted-foreground">Início</span>
                      <p className="font-medium">
                        {new Date(loteAuditoria.data_inicio).toLocaleDateString('pt-BR')}
                      </p>
                    </div>
                  </div>
                  <div className="flex items-center gap-2">
                    <Calendar className="h-4 w-4 text-muted-foreground" />
                    <div>
                      <span className="text-sm text-muted-foreground">Finalização</span>
                      <p className="font-medium">
                        {new Date(loteAuditoria.data_finalizacao).toLocaleDateString('pt-BR')}
                      </p>
                    </div>
                  </div>
                </div>

                {loteAuditoria.latitude && loteAuditoria.longitude && (
                  <div className="flex items-center gap-2">
                    <MapPin className="h-4 w-4 text-muted-foreground" />
                    <div>
                      <span className="text-sm text-muted-foreground">Localização</span>
                      <p className="font-medium">
                        {loteAuditoria.latitude.toFixed(6)}, {loteAuditoria.longitude.toFixed(6)}
                      </p>
                    </div>
                  </div>
                )}
              </CardContent>
            </Card>

            {/* Métricas de Impacto */}
            <Card>
              <CardHeader>
                <CardTitle className="flex items-center gap-2">
                  <Leaf className="h-5 w-5" />
                  Impacto Ambiental
                </CardTitle>
              </CardHeader>
              <CardContent>
                <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
                  <div className="text-center p-4 bg-muted rounded-lg">
                    <Weight className="h-6 w-6 mx-auto mb-2 text-primary" />
                    <p className="text-2xl font-bold text-primary">{formatWeight(loteAuditoria.peso_inicial)}</p>
                    <p className="text-sm text-muted-foreground">Peso Inicial</p>
                  </div>
                  <div className="text-center p-4 bg-muted rounded-lg">
                    <Weight className="h-6 w-6 mx-auto mb-2 text-green-600" />
                    <p className="text-2xl font-bold text-green-600">{formatWeight(loteAuditoria.peso_final)}</p>
                    <p className="text-sm text-muted-foreground">Composto Final</p>
                  </div>
                  <div className="text-center p-4 bg-green-50 rounded-lg">
                    <Leaf className="h-6 w-6 mx-auto mb-2 text-green-600" />
                    <p className="text-2xl font-bold text-green-600">{loteAuditoria.co2eq_evitado.toFixed(1)} kg</p>
                    <p className="text-sm text-muted-foreground">CO2e Evitado</p>
                  </div>
                  <div className="text-center p-4 bg-blue-50 rounded-lg">
                    <Shield className="h-6 w-6 mx-auto mb-2 text-blue-600" />
                    <p className="text-2xl font-bold text-blue-600">{loteAuditoria.creditos_cau.toFixed(3)}</p>
                    <p className="text-sm text-muted-foreground">Créditos CAU</p>
                  </div>
                </div>
                
                <Separator className="my-4" />
                
                <div className="text-center">
                  <p className="text-lg">
                    <span className="font-semibold">Taxa de Redução: </span>
                    <span className="text-primary font-bold">{taxaReducao.toFixed(1)}%</span>
                  </p>
                </div>
              </CardContent>
            </Card>

            {/* Voluntários */}
            <Card>
              <CardHeader>
                <CardTitle>Voluntários Participantes ({loteAuditoria.voluntarios.length})</CardTitle>
              </CardHeader>
              <CardContent>
                <div className="space-y-3">
                  {loteAuditoria.voluntarios.map((voluntario) => (
                    <div key={voluntario.id} className="flex items-center justify-between p-3 bg-muted rounded-lg">
                      <div className="flex items-center gap-3">
                        <Avatar>
                          <AvatarFallback>{voluntario.nome.charAt(0)}</AvatarFallback>
                        </Avatar>
                        <div>
                          <p className="font-medium">{voluntario.nome}</p>
                          <p className="text-sm text-muted-foreground">
                            Balde #{voluntario.numero_balde || '-'}
                          </p>
                        </div>
                      </div>
                      <div className="text-right">
                        <p className="font-medium">{formatWeight(voluntario.peso_total)}</p>
                        <p className="text-sm text-muted-foreground">
                          {voluntario.entregas_count > 0 ? voluntario.entregas_count : '-'} entregas • ★{voluntario.qualidade_media > 0 ? voluntario.qualidade_media.toFixed(1) : '-'}
                        </p>
                      </div>
                    </div>
                  ))}
                </div>
              </CardContent>
            </Card>

            {/* Timeline Real */}
            <Card>
              <CardHeader>
                <CardTitle>Cronologia do Lote</CardTitle>
              </CardHeader>
              <CardContent>
                <div className="space-y-6">
                  {loteAuditoria.timeline.map((stage, index) => {
                    const isLast = index === loteAuditoria.timeline.length - 1;
                    
                    // Icon selection based on stage type
                    const getStageIcon = () => {
                      if (stage.tipo === 'entrega') return Play;
                      if (stage.tipo === 'finalizacao') return CheckCircle;
                      return RefreshCw;
                    };
                    
                    const StageIcon = getStageIcon();
                    
                    return (
                      <div key={stage.id} className="relative">
                        {!isLast && (
                          <div className="absolute left-5 top-12 bottom-0 w-0.5 bg-border"></div>
                        )}
                        
                        <div className="flex gap-3">
                          <div className="flex-shrink-0">
                            <div className={`w-10 h-10 rounded-full flex items-center justify-center text-white ${
                              stage.tipo === 'finalizacao' ? 'bg-success' :
                              stage.tipo === 'entrega' ? 'bg-primary' :
                              'bg-secondary'
                            }`}>
                              <StageIcon className="h-4 w-4" />
                            </div>
                          </div>
                          
                          <div className="flex-1 bg-card border rounded-lg p-4">
                            <div className="flex flex-col sm:flex-row sm:justify-between sm:items-start gap-2 mb-3">
                              <div className="flex-1">
                                <h4 className="font-medium text-base">{stage.titulo}</h4>
                                {stage.caixa_origem !== null && stage.caixa_destino !== null && (
                                  <p className="text-sm text-muted-foreground">
                                    Caixa {stage.caixa_origem} → Caixa {stage.caixa_destino}
                                  </p>
                                )}
                              </div>
                              
                              <span className="text-sm text-muted-foreground whitespace-nowrap">
                                {new Date(stage.created_at).toLocaleDateString('pt-BR', {
                                  day: '2-digit',
                                  month: '2-digit',
                                  year: 'numeric'
                                })}
                              </span>
                            </div>
                            
                            <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 mb-3">
                              {stage.peso_antes !== null && stage.peso_depois !== null && (
                                <div className="flex items-center gap-2">
                                  <Scale className="h-4 w-4 text-muted-foreground" />
                                  <span className="text-sm">
                                    {formatWeight(stage.peso_antes)} → {formatWeight(stage.peso_depois)}
                                    {stage.data_estimada && (
                                      <span className="text-xs text-muted-foreground ml-1">(estimado)</span>
                                    )}
                                  </span>
                                </div>
                              )}
                              
                              {stage.peso_depois !== null && stage.peso_antes === null && (
                                <div className="flex items-center gap-2">
                                  <Scale className="h-4 w-4 text-muted-foreground" />
                                  <span className="text-sm">
                                    Peso: {formatWeight(stage.peso_depois)}
                                    {stage.data_estimada && (
                                      <span className="text-xs text-muted-foreground ml-1">(estimado)</span>
                                    )}
                                  </span>
                                </div>
                              )}
                              
                              <div className="flex items-center gap-2">
                                <User className="h-4 w-4 text-muted-foreground" />
                                <span className="text-sm">{stage.usuario_nome}</span>
                              </div>
                            </div>
                            
                            {stage.observacoes !== '-' && (
                              <div className="mb-3 p-2 bg-muted/50 rounded text-sm">
                                <div className="flex items-center gap-2 mb-1">
                                  <MessageSquare className="h-3 w-3 text-muted-foreground" />
                                  <span className="text-xs text-muted-foreground">Observações</span>
                                </div>
                                <p>{stage.observacoes}</p>
                              </div>
                            )}
                            
                            <div className="flex justify-between items-center">
                              <div className="flex items-center gap-2">
                                {stage.fotos.length > 0 ? (
                                  <button
                                    onClick={() => {
                                      setFotosParaGaleria(stage.fotos.map(f => ({
                                        id: f.id,
                                        foto_url: f.foto_url,
                                        tipo_foto: f.tipo_foto,
                                        created_at: stage.created_at
                                      })));
                                      setShowPhotos(true);
                                    }}
                                    className="text-sm text-primary hover:text-primary/80 flex items-center gap-2 bg-primary/10 px-2 py-1 rounded transition-colors"
                                  >
                                    <Camera className="h-3 w-3" />
                                    Foto(s)
                                  </button>
                                ) : (
                                  <span className="text-sm text-muted-foreground flex items-center gap-2">
                                    <Camera className="h-3 w-3" />
                                    -
                                  </span>
                                )}
                              </div>
                              
                              {stage.integridade_validada && (
                                <div className="flex items-center gap-1 text-xs text-success">
                                  <CheckCircle className="h-3 w-3" />
                                  Verificado
                                </div>
                              )}
                            </div>
                          </div>
                        </div>
                      </div>
                    );
                  })}
                </div>
              </CardContent>
            </Card>
          </div>

          {/* Sidebar */}
          <div className="space-y-6">
            {/* QR Code */}
            {loteAuditoria.qr_code_url && (
              <Card>
                <CardHeader>
                  <CardTitle className="flex items-center gap-2">
                    <QrCode className="h-5 w-5" />
                    QR Code de Verificação
                  </CardTitle>
                </CardHeader>
                <CardContent className="text-center">
                  <img 
                    src={loteAuditoria.qr_code_url} 
                    alt="QR Code de Auditoria" 
                    className="w-32 h-32 mx-auto mb-3"
                  />
                  <p className="text-sm text-muted-foreground">
                    Escaneie para verificar este lote
                  </p>
                </CardContent>
              </Card>
            )}

            {/* Hash de Integridade */}
            <Card>
              <CardHeader>
                <CardTitle className="flex items-center gap-2">
                  <Hash className="h-5 w-5" />
                  Integridade Blockchain
                </CardTitle>
              </CardHeader>
              <CardContent className="space-y-3">
                <div>
                  <span className="text-sm text-muted-foreground">Posição na Cadeia:</span>
                  <p className="font-mono text-sm">#{loteAuditoria.indice_cadeia}</p>
                </div>
                <div>
                  <span className="text-sm text-muted-foreground">Hash de Integridade:</span>
                  <p className="font-mono text-xs break-all bg-muted p-2 rounded">
                    {formatHashDisplay(loteAuditoria.hash_integridade)}
                  </p>
                </div>
                {loteAuditoria.hash_anterior && (
                  <div>
                    <span className="text-sm text-muted-foreground">Hash Anterior:</span>
                    <p className="font-mono text-xs break-all bg-muted p-2 rounded">
                      {formatHashDisplay(loteAuditoria.hash_anterior)}
                    </p>
                  </div>
                )}
                <p className="text-xs text-muted-foreground">
                  Este hash garante a imutabilidade e rastreabilidade dos dados do lote.
                </p>
              </CardContent>
            </Card>

            {/* Resumo de Fotos */}
            <Card>
              <CardHeader>
                <CardTitle>Documentação Fotográfica</CardTitle>
              </CardHeader>
              <CardContent>
                <div className="space-y-2">
                  <div className="flex justify-between">
                    <span className="text-sm">Fotos de Entregas:</span>
                    <span className="font-medium">
                      {loteAuditoria.todasFotosUnificadas.filter(f => f.origem === 'entrega').length}
                    </span>
                  </div>
                  <div className="flex justify-between">
                    <span className="text-sm">Fotos de Manutenção:</span>
                    <span className="font-medium">
                      {loteAuditoria.todasFotosUnificadas.filter(f => f.origem === 'manutencao').length}
                    </span>
                  </div>
                  <Separator />
                  <div className="flex justify-between font-medium">
                    <span>Total Unificado:</span>
                    <span>{loteAuditoria.todasFotosUnificadas.length}</span>
                  </div>
                  {loteAuditoria.estatisticasIntegridade.inconsistencias.length > 0 && (
                    <div className="mt-2 p-2 bg-amber-50 rounded text-xs text-amber-700">
                      <div className="font-medium">Avisos de Integridade:</div>
                      {loteAuditoria.estatisticasIntegridade.inconsistencias.map((inc, idx) => (
                        <div key={idx}>• {inc}</div>
                      ))}
                    </div>
                  )}
                </div>
              </CardContent>
            </Card>
          </div>
        </div>
      </main>

      {/* Modal de Fotos */}
      <PublicFotosGalleryModal
        isOpen={showPhotos}
        onClose={() => setShowPhotos(false)}
        fotos={loteAuditoria.todasFotosUnificadas.map(foto => ({
          id: foto.id,
          foto_url: foto.foto_url,
          tipo_foto: foto.tipo_foto,
          created_at: foto.created_at
        }))}
        title="Documentação Fotográfica do Lote"
      />
      {/* Footer */}
      <footer className="border-t bg-card/50 py-6">
        <div className="container mx-auto px-4 text-center">
          <a 
            href="https://www.bion.global" 
            target="_blank" 
            rel="noopener noreferrer"
            className="inline-block hover:opacity-80 transition-opacity"
          >
            <img 
              src="/lovable-uploads/powered-by-bion.png" 
              alt="Powered by Bion" 
              className="h-9"
            />
          </a>
        </div>
      </footer>
    </div>
  );
}