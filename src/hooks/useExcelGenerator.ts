import { useState } from 'react';
import { useToast } from '@/hooks/use-toast';
import type { LoteHistorico } from './useHistoricoLotes';
import { formatWeight, getOrganizationName } from '@/lib/organizationUtils';

export const useExcelGenerator = () => {
  const [loading, setLoading] = useState(false);
  const { toast } = useToast();

  const generateConsolidatedExcel = async (lotes: LoteHistorico[]) => {
    try {
      setLoading(true);

      // Criar dados para CSV
      const headers = [
        'Tipo',
        'Código do Lote',
        'Data de Criação/Finalização',
        'Validador',
        'Unidade',
        'Peso Inicial (kg)',
        'Peso Final (kg)',
        'Redução (%)',
        'CO2e Evitado (kg)',
        'Voluntários',
        'Qualidade Média',
        'Status'
      ];

      const rows = lotes.map(lote => {
        const isNovoLote = lote.status === 'em_processamento' && lote.caixa_atual === 1;
        const tipoTexto = isNovoLote ? 'Novo Lote' : 'Lote Finalizado';
        
        const pesoInicial = Number(lote.peso_inicial) || 0;
        const pesoFinal = Number(lote.peso_final || lote.peso_atual) || 0;
        const reducao = lote.taxa_reducao?.toFixed(1) || '0';
        
        const dataReferencia = lote.data_encerramento || lote.created_at;

        return [
          tipoTexto,
          lote.codigo,
          new Date(dataReferencia).toLocaleDateString('pt-BR'),
          lote.criado_por_nome,
          getOrganizationName(lote.unidade),
          (pesoInicial / 1000).toFixed(1), // Converter para kg
          (pesoFinal / 1000).toFixed(1),   // Converter para kg
          reducao,
          lote.co2e_evitado.toFixed(2),
          lote.num_voluntarios.toString(),
          lote.qualidade_media.toFixed(1),
          lote.status
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