import React, { useState, useEffect } from 'react';
import { useParams, useSearchParams } from 'react-router-dom';
import { supabase } from '@/integrations/supabase/client';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { StarRating } from '@/components/StarRating';
import { Calendar, Users, Leaf, Weight, TrendingDown, MapPin, Hash, Download } from 'lucide-react';
import { format } from 'date-fns';
import { ptBR } from 'date-fns/locale';
import { formatWeight, getOrganizationName } from '@/lib/organizationUtils';
import { FotosGalleryModal } from '@/components/FotosGalleryModal';
import { useAdvancedPDFGenerator } from '@/hooks/useAdvancedPDFGenerator';

interface LotePublico {
  id: string;
  codigo: string;
  status: string;
  peso_inicial: number;
  peso_atual: number;
  data_inicio: string;
  data_encerramento?: string;
  unidade: string;
  criado_por_nome: string;
  hash_integridade?: string;
  // Dados calculados
  num_voluntarios: number;
  qualidade_media: number;
  co2e_evitado: number;
  taxa_reducao: number;
  latitude?: number;
  longitude?: number;
}

export default function LotePublico() {
  const { hash } = useParams();
  const [searchParams] = useSearchParams();
  const loteCodigo = searchParams.get('lote');
  
  const [lote, setLote] = useState<LotePublico | null>(null);
  const [loading, setLoading] = useState(true);
  const [showPhotos, setShowPhotos] = useState(false);
  
  const { generateLoteFinalizadoPDF, loading: pdfLoading } = useAdvancedPDFGenerator();

  useEffect(() => {
    const fetchLotePublico = async () => {
      try {
        let query = supabase.from('lotes').select('*');
        
        if (hash) {
          query = query.eq('hash_integridade', hash);
        } else if (loteCodigo) {
          query = query.eq('codigo', loteCodigo);
        } else {
          setLoading(false);
          return;
        }
        
        const { data: loteData, error } = await query.single();
        
        if (error || !loteData) {
          console.error('Lote não encontrado:', error);
          setLoading(false);
          return;
        }

        // Buscar dados de entregas para calcular métricas
        const { data: entregas } = await supabase
          .from('entregas')
          .select(`
            peso, qualidade_residuo, voluntario_id,
            voluntarios(nome)
          `)
          .eq('lote_codigo', loteData.codigo);

        const voluntarios = new Set(entregas?.map(e => e.voluntario_id) || []);
        const qualidades = entregas?.filter(e => e.qualidade_residuo).map(e => e.qualidade_residuo) || [];
        const qualidadeMedia = qualidades.length > 0 ? qualidades.reduce((a, b) => a + b, 0) / qualidades.length : 0;
        
        const pesoInicial = Number(loteData.peso_inicial) || 0;
        const pesoFinal = Number(loteData.peso_atual) || 0;
        const taxaReducao = pesoInicial > 0 ? ((pesoInicial - pesoFinal) / pesoInicial) * 100 : 0;

        setLote({
          ...loteData,
          num_voluntarios: voluntarios.size,
          qualidade_media: Number(qualidadeMedia.toFixed(1)),
          co2e_evitado: pesoInicial * 0.766,
          taxa_reducao: taxaReducao
        });
        
      } catch (error) {
        console.error('Erro ao buscar lote público:', error);
      } finally {
        setLoading(false);
      }
    };

    fetchLotePublico();
  }, [hash, loteCodigo]);

  const handleDownloadPDF = async () => {
    if (!lote) return;
    
    const loteHistorico = {
      id: lote.id,
      codigo: lote.codigo,
      status: lote.status,
      caixa_atual: 7,
      peso_inicial: lote.peso_inicial,
      peso_atual: lote.peso_atual,
      peso_final: lote.peso_atual,
      data_inicio: lote.data_inicio,
      data_encerramento: lote.data_encerramento,
      created_at: lote.data_inicio,
      unidade: lote.unidade,
      criado_por_nome: lote.criado_por_nome,
      num_voluntarios: lote.num_voluntarios,
      qualidade_media: lote.qualidade_media,
      co2e_evitado: lote.co2e_evitado,
      taxa_reducao: lote.taxa_reducao,
      latitude: lote.latitude,
      longitude: lote.longitude
    };
    
    await generateLoteFinalizadoPDF(loteHistorico);
  };

  if (loading) {
    return (
      <div className="min-h-screen bg-background flex items-center justify-center">
        <div className="text-center">
          <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-primary mx-auto mb-4"></div>
          <p className="text-muted-foreground">Carregando dados do lote...</p>
        </div>
      </div>
    );
  }

  if (!lote) {
    return (
      <div className="min-h-screen bg-background flex items-center justify-center">
        <div className="text-center">
          <h1 className="text-2xl font-bold text-foreground mb-4">Lote não encontrado</h1>
          <p className="text-muted-foreground">O lote solicitado não foi encontrado ou não está disponível publicamente.</p>
        </div>
      </div>
    );
  }

  const isLoteProng = lote.status === 'encerrado';

  return (
    <div className="min-h-screen bg-background">
      <div className="container mx-auto px-4 py-8 max-w-4xl">
        {/* Header */}
        <div className="text-center mb-8">
          <h1 className="text-3xl font-bold text-foreground mb-2">
            Registro Público de Compostagem
          </h1>
          <p className="text-muted-foreground">
            Dados transparentes e rastreáveis do processo de compostagem
          </p>
        </div>

        {/* Card Principal */}
        <Card className="mb-8">
          <CardHeader>
            <div className="flex items-start justify-between">
              <div>
                <CardTitle className="text-2xl">{lote.codigo}</CardTitle>
                <Badge variant={isLoteProng ? "default" : "secondary"} className="mt-2">
                  {isLoteProng ? 'Lote Finalizado' : 'Em Processamento'}
                </Badge>
              </div>
              <div className="text-right text-sm text-muted-foreground">
                <div className="flex items-center gap-1">
                  <Calendar className="h-3 w-3" />
                  {format(new Date(lote.data_inicio), 'dd/MM/yyyy', { locale: ptBR })}
                </div>
              </div>
            </div>
          </CardHeader>

          <CardContent className="space-y-6">
            {/* Métricas Principais */}
            <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
              <div className="text-center p-4 bg-muted/50 rounded-lg">
                <Weight className="h-8 w-8 mx-auto mb-2 text-primary" />
                <p className="text-sm text-muted-foreground">Peso Inicial</p>
                <p className="text-2xl font-bold">{formatWeight(lote.peso_inicial)}</p>
              </div>
              
              {isLoteProng && (
                <>
                  <div className="text-center p-4 bg-muted/50 rounded-lg">
                    <Weight className="h-8 w-8 mx-auto mb-2 text-primary" />
                    <p className="text-sm text-muted-foreground">Peso Final</p>
                    <p className="text-2xl font-bold">{formatWeight(lote.peso_atual)}</p>
                  </div>
                  
                  <div className="text-center p-4 bg-emerald-50 dark:bg-emerald-950/20 rounded-lg">
                    <Leaf className="h-8 w-8 mx-auto mb-2 text-emerald-600" />
                    <p className="text-sm text-muted-foreground">CO2e Evitado</p>
                    <p className="text-2xl font-bold text-emerald-600">{lote.co2e_evitado.toFixed(1)} kg</p>
                  </div>
                </>
              )}
            </div>

            {/* Informações Detalhadas */}
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <div className="space-y-3">
                <h3 className="font-semibold text-lg">Dados do Processo</h3>
                <div className="space-y-2">
                  <div className="flex items-center gap-2">
                    <Users className="h-4 w-4" />
                    <span>{lote.num_voluntarios} voluntário{lote.num_voluntarios !== 1 ? 's' : ''} envolvido{lote.num_voluntarios !== 1 ? 's' : ''}</span>
                  </div>
                  <div className="flex items-center gap-2">
                    <span>Qualidade média: {lote.qualidade_media.toFixed(1)}/3</span>
                    <div className="flex gap-1">
                      {[1, 2, 3].map((star) => (
                        <div key={star} className="text-yellow-400">
                          {star <= lote.qualidade_media ? '★' : '☆'}
                        </div>
                      ))}
                    </div>
                  </div>
                  {isLoteProng && (
                    <div className="flex items-center gap-2">
                      <TrendingDown className="h-4 w-4" />
                      <span>Redução: {lote.taxa_reducao.toFixed(1)}%</span>
                    </div>
                  )}
                </div>
              </div>

              <div className="space-y-3">
                <h3 className="font-semibold text-lg">Dados Administrativos</h3>
                <div className="space-y-2">
                  <p><strong>Unidade:</strong> {getOrganizationName(lote.unidade)}</p>
                  <p><strong>Validador:</strong> {lote.criado_por_nome}</p>
                  {lote.data_encerramento && (
                    <p><strong>Finalizado em:</strong> {format(new Date(lote.data_encerramento), 'dd/MM/yyyy', { locale: ptBR })}</p>
                  )}
                </div>
              </div>
            </div>

            {/* Geolocalização */}
            {(lote.latitude && lote.longitude) && (
              <div className="border-t pt-4">
                <div className="flex items-center gap-2 text-sm text-muted-foreground">
                  <MapPin className="h-4 w-4" />
                  <span>Localização de validação: {lote.latitude.toFixed(6)}, {lote.longitude.toFixed(6)}</span>
                </div>
              </div>
            )}

            {/* Hash de Integridade */}
            {lote.hash_integridade && (
              <div className="border-t pt-4">
                <div className="flex items-start gap-2">
                  <Hash className="h-4 w-4 mt-1" />
                  <div>
                    <p className="text-sm font-medium">Hash de Integridade SHA256:</p>
                    <p className="text-xs font-mono bg-muted p-2 rounded mt-1 break-all">
                      {lote.hash_integridade}
                    </p>
                    <p className="text-xs text-muted-foreground mt-1">
                      Este hash garante a integridade e imutabilidade dos dados do lote.
                    </p>
                  </div>
                </div>
              </div>
            )}

            {/* Ações */}
            <div className="flex flex-col sm:flex-row gap-3 pt-4 border-t">
              <Button
                variant="outline"
                onClick={() => setShowPhotos(true)}
                className="flex-1"
              >
                Ver Fotos do Processo
              </Button>
              
              <Button
                onClick={handleDownloadPDF}
                disabled={pdfLoading}
                className="flex-1"
              >
                <Download className="h-4 w-4 mr-2" />
                {pdfLoading ? 'Gerando...' : 'Baixar Relatório PDF'}
              </Button>
            </div>
          </CardContent>
        </Card>

        {/* Rodapé */}
        <div className="text-center text-sm text-muted-foreground">
          <p>Sistema CompostRoca - Transparência e Rastreabilidade na Compostagem</p>
          <p className="mt-1">Dados verificados e auditáveis</p>
        </div>
      </div>

      {/* Modal de Fotos */}
      <FotosGalleryModal
        isOpen={showPhotos}
        onClose={() => setShowPhotos(false)}
        loteId={lote.id}
        title={`Fotos do Lote ${lote.codigo}`}
      />
    </div>
  );
}