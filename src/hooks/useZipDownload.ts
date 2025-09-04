import { useState } from 'react';
import JSZip from 'jszip';
import { saveAs } from 'file-saver';
import { useToast } from '@/hooks/use-toast';

export const useZipDownload = () => {
  const [loading, setLoading] = useState(false);
  const { toast } = useToast();

  const downloadPhotosAsZip = async (fotos: Array<{ foto_url: string; tipo_foto: string; created_at: string }>, loteCode: string) => {
    try {
      setLoading(true);
      const zip = new JSZip();

      // Download todas as fotos e adicionar ao ZIP
      const downloadPromises = fotos.map(async (foto, index) => {
        try {
          const response = await fetch(foto.foto_url);
          if (!response.ok) throw new Error(`Failed to fetch ${foto.foto_url}`);
          const blob = await response.blob();
          
          // Criar nome do arquivo único
          const extension = foto.foto_url.split('.').pop() || 'jpg';
          const timestamp = new Date(foto.created_at).toISOString().replace(/[:.]/g, '-');
          const fileName = `${index + 1}_${foto.tipo_foto}_${timestamp}.${extension}`;
          
          zip.file(fileName, blob);
        } catch (error) {
          console.warn(`Erro ao baixar foto ${foto.foto_url}:`, error);
        }
      });

      await Promise.all(downloadPromises);

      // Gerar o ZIP
      const zipBlob = await zip.generateAsync({ type: 'blob' });
      
      // Fazer download
      const fileName = `fotos-${loteCode}.zip`;
      saveAs(zipBlob, fileName);

      toast({
        title: "ZIP baixado",
        description: `Arquivo ${fileName} baixado com sucesso`,
      });

    } catch (error) {
      console.error('Erro ao gerar ZIP:', error);
      toast({
        title: "Erro",
        description: "Não foi possível gerar o arquivo ZIP",
        variant: "destructive",
      });
    } finally {
      setLoading(false);
    }
  };

  return {
    downloadPhotosAsZip,
    loading
  };
};