import { useParams } from 'react-router-dom';
import { useLoteAuditoria } from '@/hooks/useLoteAuditoria';
import { usePDFGenerator } from '@/hooks/usePDFGenerator';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Separator } from '@/components/ui/separator';
import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar';
import { MapPin, Calendar, Weight, Leaf, FileText, Download, QrCode, Shield, Hash } from 'lucide-react';
import { useState } from 'react';
import { PublicFotosGalleryModal } from '@/components/PublicFotosGalleryModal';
import { formatWeight, getOrganizationName } from '@/lib/organizationUtils';
import { formatHashDisplay } from '@/lib/hashUtils';

export default function LoteAuditoria() {
  const { codigoUnico } = useParams<{ codigoUnico: string }>();
  const { loteAuditoria, loading } = useLoteAuditoria(codigoUnico);
  const { generatePDF, loading: pdfLoading } = usePDFGenerator();
  const [showPhotos, setShowPhotos] = useState(false);

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
      manejo_fotos: loteAuditoria.manutencoes.flatMap(m => 
        m.fotos.map(f => ({
          id: f.id,
          foto_url: f.foto_url,
          created_at: m.created_at,
          caixa_origem: m.semana_numero,
          caixa_destino: m.semana_numero + 1
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
          <div className="flex items-center justify-between">
            <div>
              <h1 className="text-3xl font-bold text-primary">Auditoria Pública</h1>
              <p className="text-muted-foreground mt-1">
                Lote de Compostagem #{loteAuditoria.codigo}
              </p>
            </div>
            <div className="flex gap-3">
              <Button 
                onClick={() => setShowPhotos(true)}
                variant="outline"
                className="flex items-center gap-2"
              >
                <FileText className="h-4 w-4" />
                Ver Fotos ({loteAuditoria.todasFotos.length})
              </Button>
              <Button 
                onClick={handleDownloadPDF}
                disabled={pdfLoading}
                className="flex items-center gap-2"
              >
                <Download className="h-4 w-4" />
                {pdfLoading ? 'Gerando...' : 'Baixar Relatório PDF'}
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
                          <p className="text-sm text-muted-foreground">Balde #{voluntario.numero_balde}</p>
                        </div>
                      </div>
                      <div className="text-right">
                        <p className="font-medium">{formatWeight(voluntario.peso_total)}</p>
                        <p className="text-sm text-muted-foreground">
                          {voluntario.entregas_count} entregas • ★{voluntario.qualidade_media.toFixed(1)}
                        </p>
                      </div>
                    </div>
                  ))}
                </div>
              </CardContent>
            </Card>

            {/* Timeline de Manutenções */}
            <Card>
              <CardHeader>
                <CardTitle>Linha do Tempo - 7 Etapas de Manutenção</CardTitle>
              </CardHeader>
              <CardContent>
                <div className="space-y-4">
                  {loteAuditoria.manutencoes.map((manutencao, index) => (
                    <div key={manutencao.id} className="relative">
                      {index < loteAuditoria.manutencoes.length - 1 && (
                        <div className="absolute left-4 top-8 bottom-0 w-0.5 bg-border"></div>
                      )}
                      <div className="flex gap-4">
                        <div className="flex-shrink-0 w-8 h-8 bg-primary rounded-full flex items-center justify-center text-white text-sm font-bold">
                          {manutencao.semana_numero}
                        </div>
                        <div className="flex-1 bg-muted p-4 rounded-lg">
                          <div className="flex justify-between items-start mb-2">
                            <h4 className="font-medium">Semana {manutencao.semana_numero}</h4>
                            <span className="text-sm text-muted-foreground">
                              {new Date(manutencao.created_at).toLocaleDateString('pt-BR')}
                            </span>
                          </div>
                          <div className="grid grid-cols-2 gap-4 mb-2">
                            <div>
                              <span className="text-sm text-muted-foreground">Peso antes:</span>
                              <p className="font-medium">{formatWeight(manutencao.peso_antes)}</p>
                            </div>
                            <div>
                              <span className="text-sm text-muted-foreground">Peso depois:</span>
                              <p className="font-medium">{formatWeight(manutencao.peso_depois)}</p>
                            </div>
                          </div>
                          {manutencao.observacoes && (
                            <p className="text-sm text-muted-foreground mb-2">{manutencao.observacoes}</p>
                          )}
                          <p className="text-sm text-muted-foreground">
                            Responsável: {manutencao.usuario_nome}
                          </p>
                          {manutencao.fotos.length > 0 && (
                            <p className="text-sm text-primary mt-2">
                              📸 {manutencao.fotos.length} foto(s) registrada(s)
                            </p>
                          )}
                        </div>
                      </div>
                    </div>
                  ))}
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
                      {loteAuditoria.todasFotos.filter(f => f.origem === 'entrega').length}
                    </span>
                  </div>
                  <div className="flex justify-between">
                    <span className="text-sm">Fotos de Manutenção:</span>
                    <span className="font-medium">
                      {loteAuditoria.todasFotos.filter(f => f.origem === 'manutencao').length}
                    </span>
                  </div>
                  <Separator />
                  <div className="flex justify-between font-medium">
                    <span>Total:</span>
                    <span>{loteAuditoria.todasFotos.length}</span>
                  </div>
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
        fotos={loteAuditoria.todasFotos.map(foto => ({
          id: foto.id,
          foto_url: foto.foto_url,
          tipo_foto: foto.tipo_foto,
          created_at: foto.created_at
        }))}
        title="Documentação Fotográfica do Lote"
      />
      {/* Footer com "Powered by Bion" */}
      <footer className="border-t bg-card/50 py-6">
        <div className="container mx-auto px-4 text-center">
          <div className="flex items-center justify-center space-x-4">
            <img 
              src="/lovable-uploads/powered-by-bion.png" 
              alt="Powered by Bion" 
              className="h-16 opacity-80 hover:opacity-100 transition-opacity"
            />
          </div>
          <p className="text-xs text-muted-foreground mt-2">
            Auditoria individual de lote - Sistema Compostroca
          </p>
        </div>
      </footer>
    </div>
  );
}