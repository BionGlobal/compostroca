import { useState } from 'react';
import { useToast } from '@/hooks/use-toast';
import type { HistoricoEvent } from './useHistoricoLotes';
import { formatWeight, getOrganizationName } from '@/lib/organizationUtils';

export const useExcelGenerator = () => {
  const [loading, setLoading] = useState(false);
  const { toast } = useToast();

  const generateConsolidatedExcel = async (eventos: HistoricoEvent[]) => {
    try {
      setLoading(true);

      // Criar dados para CSV
      const headers = [
        'Tipo',
        'Código do Lote',
        'Data',
        'Validador',
        'Unidade',
        'Peso Inicial (kg)',
        'Peso Final (kg)',
        'Redução (%)',
        'Observações',
        'Localização'
      ];

      const rows = eventos.map(evento => {
        let tipoTexto = '';
        switch (evento.tipo) {
          case 'novo_lote': tipoTexto = 'Novo Lote'; break;
          case 'manutencao': tipoTexto = 'Manutenção'; break;
          case 'lote_finalizado': tipoTexto = 'Lote Finalizado'; break;
        }

        const pesoInicial = evento.dados_especificos.peso_inicial || evento.dados_especificos.peso_antes || '';
        const pesoFinal = evento.dados_especificos.peso_atual || evento.dados_especificos.peso_depois || evento.dados_especificos.peso_final || '';
        const reducao = pesoInicial && pesoFinal ? 
          ((pesoInicial - pesoFinal) / pesoInicial * 100).toFixed(1) : '';
        
        const observacoes = evento.dados_especificos.observacoes || '';
        const localizacao = evento.geoloc ? 
          `${evento.geoloc.lat.toFixed(6)}, ${evento.geoloc.lng.toFixed(6)}` : '';

        return [
          tipoTexto,
          evento.lote_codigo,
          new Date(evento.data).toLocaleDateString('pt-BR'),
          evento.validador_nome,
          getOrganizationName(evento.unidade),
          pesoInicial.toString(),
          pesoFinal.toString(),
          reducao,
          observacoes,
          localizacao
        ];
      });

      // Converter para CSV
      const csvContent = [headers, ...rows]
        .map(row => row.map(field => `"${field}"`).join(','))
        .join('\n');

      // Adicionar BOM para UTF-8
      const bom = '\uFEFF';
      const csvWithBom = bom + csvContent;

      // Criar e baixar arquivo
      const blob = new Blob([csvWithBom], { type: 'text/csv;charset=utf-8;' });
      const link = document.createElement('a');
      const url = URL.createObjectURL(blob);
      
      link.setAttribute('href', url);
      const fileName = `historico-lotes-${new Date().toISOString().split('T')[0]}.csv`;
      link.setAttribute('download', fileName);
      link.style.visibility = 'hidden';
      
      document.body.appendChild(link);
      link.click();
      document.body.removeChild(link);

      toast({
        title: "Excel gerado",
        description: `Planilha ${fileName} baixada com sucesso`,
      });

    } catch (error) {
      console.error('Erro ao gerar Excel:', error);
      toast({
        title: "Erro",
        description: "Não foi possível gerar a planilha Excel",
        variant: "destructive",
      });
    } finally {
      setLoading(false);
    }
  };

  return {
    generateConsolidatedExcel,
    loading
  };
};