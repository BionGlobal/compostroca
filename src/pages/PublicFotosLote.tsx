import { useState, useEffect } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { Button } from '@/components/ui/button';
import { ArrowLeft, Loader2 } from 'lucide-react';
import { FotosGalleryModal } from '@/components/FotosGalleryModal';
import { supabase } from '@/integrations/supabase/client';
import { useToast } from '@/hooks/use-toast';

export const PublicFotosLote = () => {
  const { loteId } = useParams<{ loteId: string }>();
  const navigate = useNavigate();
  const { toast } = useToast();
  
  const [lote, setLote] = useState<any>(null);
  const [fotos, setFotos] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [modalOpen, setModalOpen] = useState(false);

  useEffect(() => {
    const fetchLoteData = async () => {
      if (!loteId) return;

      try {
        // Fetch lote data
        const { data: loteData, error: loteError } = await supabase
          .from('lotes')
          .select('id, codigo, unidade')
          .eq('id', loteId)
          .single();

        if (loteError || !loteData) {
          toast({
            title: 'Lote não encontrado',
            description: 'O lote solicitado não foi encontrado ou não está disponível.',
            variant: 'destructive',
          });
          navigate('/');
          return;
        }

        // Fetch lote photos
        const { data: fotosData, error: fotosError } = await supabase
          .from('lote_fotos')
          .select('id, foto_url, tipo_foto, created_at')
          .eq('lote_id', loteId)
          .is('deleted_at', null)
          .order('created_at', { ascending: true });

        if (fotosError) {
          console.error('Erro ao buscar fotos:', fotosError);
        }

        setLote(loteData);
        setFotos(fotosData || []);
        setModalOpen(true);
      } catch (error) {
        console.error('Erro ao buscar lote:', error);
        toast({
          title: 'Erro',
          description: 'Erro ao carregar dados do lote.',
          variant: 'destructive',
        });
        navigate('/');
      } finally {
        setLoading(false);
      }
    };

    fetchLoteData();
  }, [loteId, navigate, toast]);

  const handleModalClose = () => {
    setModalOpen(false);
    navigate(`/${lote?.unidade || 'CWB001'}`);
  };

  if (loading) {
    return (
      <div className="min-h-screen bg-gradient-to-br from-background to-muted/30 flex items-center justify-center">
        <div className="flex items-center gap-2">
          <Loader2 className="h-6 w-6 animate-spin" />
          <p>Carregando fotos do lote...</p>
        </div>
      </div>
    );
  }

  if (!lote) {
    return (
      <div className="min-h-screen bg-gradient-to-br from-background to-muted/30 flex items-center justify-center">
        <div className="text-center">
          <h1 className="text-2xl font-bold mb-4">Lote não encontrado</h1>
          <Button onClick={() => navigate('/')}>
            <ArrowLeft className="mr-2 h-4 w-4" />
            Voltar ao início
          </Button>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gradient-to-br from-background to-muted/30">
      <FotosGalleryModal
        isOpen={modalOpen}
        onClose={handleModalClose}
        loteId={loteId!}
        title={`Fotos do Lote ${lote.codigo}`}
        isLoteProng={true}
      />
      
      {/* Fallback se modal não abrir */}
      {!modalOpen && (
        <div className="container mx-auto px-4 py-8">
          <div className="flex items-center gap-4 mb-6">
            <Button 
              variant="outline" 
              onClick={() => navigate(`/${lote.unidade}`)}
            >
              <ArrowLeft className="mr-2 h-4 w-4" />
              Voltar à Esteira
            </Button>
            <h1 className="text-2xl font-bold">Fotos do Lote {lote.codigo}</h1>
          </div>
          
          <div className="text-center py-12">
            <p className="text-muted-foreground">
              Carregando galeria de fotos...
            </p>
            <Button 
              className="mt-4"
              onClick={() => setModalOpen(true)}
            >
              Abrir Galeria
            </Button>
          </div>
        </div>
      )}
    </div>
  );
};