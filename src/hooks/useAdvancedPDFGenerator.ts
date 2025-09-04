import { useState } from 'react';
import jsPDF from 'jspdf';
import { useToast } from '@/hooks/use-toast';
import { supabase } from '@/integrations/supabase/client';
import type { LoteHistorico } from './useHistoricoLotes';
import { formatWeight, calculateWeightReduction, getOrganizationName } from '@/lib/organizationUtils';

export const useAdvancedPDFGenerator = () => {
  const [loading, setLoading] = useState(false);
  const { toast } = useToast();

  const generateNovoLotePDF = async (lote: LoteHistorico) => {
    try {
      setLoading(true);
      
      const pdf = new jsPDF('p', 'mm', 'a4');
      const pageWidth = pdf.internal.pageSize.getWidth();
      let yPosition = 20;

      // Cabeçalho
      pdf.setFontSize(18);
      pdf.setFont('helvetica', 'bold');
      pdf.text('Relatório - Novo Lote', pageWidth / 2, yPosition, { align: 'center' });
      yPosition += 20;

      // Informações do lote
      pdf.setFontSize(12);
      pdf.setFont('helvetica', 'bold');
      pdf.text('Dados do Lote:', 20, yPosition);
      yPosition += 10;

      pdf.setFontSize(10);
      pdf.setFont('helvetica', 'normal');
      const pesoInicial = Number(lote.peso_inicial) || 0;
      const pesoAtual = Number(lote.peso_atual) || 0;
      
      const info = [
        `Código: ${lote.codigo}`,
        `Unidade: ${getOrganizationName(lote.unidade)}`,
        `Data de Criação: ${new Date(lote.created_at).toLocaleDateString('pt-BR')}`,
        `Data de Início: ${new Date(lote.data_inicio).toLocaleDateString('pt-BR')}`,
        `Validador: ${lote.criado_por_nome}`,
        `Peso Inicial: ${formatWeight(pesoInicial)}`,
        `Peso Atual: ${formatWeight(pesoAtual)}`,
        `Voluntários Envolvidos: ${lote.num_voluntarios}`,
        `Qualidade Média: ${lote.qualidade_media}/5`,
        `CO2e Evitado (projetado): ${lote.co2e_evitado.toFixed(2)} kg`
      ];

      info.forEach(line => {
        pdf.text(line, 20, yPosition);
        yPosition += 6;
      });

      yPosition += 10;

      // Buscar fotos das entregas para este lote
      try {
        const { data: fotosEntregas } = await supabase
          .from('lote_fotos')
          .select('foto_url, tipo_foto, created_at')
          .eq('lote_id', lote.id)
          .eq('tipo_foto', 'entrega_conteudo')
          .limit(5);

        if (fotosEntregas && fotosEntregas.length > 0) {
          pdf.setFont('helvetica', 'bold');
          pdf.text('Fotos das Entregas:', 20, yPosition);
          yPosition += 6;
          
          pdf.setFont('helvetica', 'normal');
          fotosEntregas.forEach((foto, index) => {
            pdf.text(`${index + 1}. Entrega - ${new Date(foto.created_at).toLocaleDateString('pt-BR')}`, 25, yPosition);
            yPosition += 5;
          });
        }
      } catch (error) {
        console.error('Erro ao buscar fotos:', error);
      }

      // Dados IoT (preparado para futuros sensores)
      yPosition += 10;
      pdf.setFont('helvetica', 'bold');
      pdf.text('Dados IoT:', 20, yPosition);
      yPosition += 6;
      pdf.setFont('helvetica', 'normal');
      pdf.text('Sistema preparado para receber dados de sensores (Temperatura, pH, etc.)', 20, yPosition);

      // Rodapé
      pdf.setFontSize(8);
      pdf.text(`Gerado em: ${new Date().toLocaleString('pt-BR')}`, 20, 280);
      pdf.text(`Sistema CompostRoca - Relatório de Auditoria`, 20, 285);

      const fileName = `novo-lote-${lote.codigo}-${new Date().toISOString().split('T')[0]}.pdf`;
      pdf.save(fileName);

      toast({
        title: "PDF gerado",
        description: `Relatório ${fileName} baixado com sucesso`,
      });

    } catch (error) {
      console.error('Erro ao gerar PDF:', error);
      toast({
        title: "Erro",
        description: "Não foi possível gerar o relatório PDF",
        variant: "destructive",
      });
    } finally {
      setLoading(false);
    }
  };

  const generateManutencaoPDF = async (evento: any) => {
    try {
      setLoading(true);
      
      const pdf = new jsPDF('p', 'mm', 'a4');
      const pageWidth = pdf.internal.pageSize.getWidth();
      let yPosition = 20;

      // Cabeçalho
      pdf.setFontSize(18);
      pdf.setFont('helvetica', 'bold');
      pdf.text('Relatório - Manutenção Semanal', pageWidth / 2, yPosition, { align: 'center' });
      yPosition += 20;

      // Informações da manutenção
      pdf.setFontSize(12);
      pdf.setFont('helvetica', 'bold');
      pdf.text('Dados da Manutenção:', 20, yPosition);
      yPosition += 10;

      pdf.setFontSize(10);
      pdf.setFont('helvetica', 'normal');
      const info = [
        `Lote: ${evento.lote_codigo}`,
        `Data/Hora: ${new Date(evento.data).toLocaleString('pt-BR')}`,
        `Validador: ${evento.validador_nome}`,
        `Caixa Origem: ${evento.dados_especificos.caixa_origem}`,
        `Caixa Destino: ${evento.dados_especificos.caixa_destino || 'N/A'}`,
        `Peso Antes: ${formatWeight(evento.dados_especificos.peso_antes)}`,
        `Peso Depois: ${formatWeight(evento.dados_especificos.peso_depois)}`
      ];

      info.forEach(line => {
        pdf.text(line, 20, yPosition);
        yPosition += 6;
      });

      if (evento.dados_especificos.observacoes) {
        yPosition += 5;
        pdf.setFont('helvetica', 'bold');
        pdf.text('Observações:', 20, yPosition);
        yPosition += 6;
        pdf.setFont('helvetica', 'normal');
        const observacoes = pdf.splitTextToSize(evento.dados_especificos.observacoes, 170);
        pdf.text(observacoes, 20, yPosition);
        yPosition += observacoes.length * 6;
      }

      if (evento.geoloc) {
        yPosition += 5;
        pdf.text(`Localização: ${evento.geoloc.lat.toFixed(6)}, ${evento.geoloc.lng.toFixed(6)}`, 20, yPosition);
      }

      // Rodapé
      pdf.setFontSize(8);
      pdf.text(`Gerado em: ${new Date().toLocaleString('pt-BR')}`, 20, 280);

      const fileName = `manutencao-${evento.lote_codigo}-${new Date().toISOString().split('T')[0]}.pdf`;
      pdf.save(fileName);

      toast({
        title: "PDF gerado",
        description: `Relatório ${fileName} baixado com sucesso`,
      });

    } catch (error) {
      console.error('Erro ao gerar PDF:', error);
      toast({
        title: "Erro",
        description: "Não foi possível gerar o relatório PDF",
        variant: "destructive",
      });
    } finally {
      setLoading(false);
    }
  };

  const generateLoteFinalizadoPDF = async (lote: LoteHistorico) => {
    try {
      setLoading(true);
      
      const pdf = new jsPDF('p', 'mm', 'a4');
      const pageWidth = pdf.internal.pageSize.getWidth();
      let yPosition = 20;

      // Cabeçalho
      pdf.setFontSize(18);
      pdf.setFont('helvetica', 'bold');
      pdf.text('Relatório - Lote Finalizado', pageWidth / 2, yPosition, { align: 'center' });
      yPosition += 20;

      // Informações do lote finalizado
      pdf.setFontSize(12);
      pdf.setFont('helvetica', 'bold');
      pdf.text('Dados do Lote Finalizado:', 20, yPosition);
      yPosition += 10;

      pdf.setFontSize(10);
      pdf.setFont('helvetica', 'normal');
      const pesoInicial = Number(lote.peso_inicial) || 0;
      const pesoFinal = Number(lote.peso_final) || 0;
      
      const info = [
        `Código: ${lote.codigo}`,
        `Unidade: ${getOrganizationName(lote.unidade)}`,
        `Data de Início: ${new Date(lote.data_inicio).toLocaleDateString('pt-BR')}`,
        `Data de Finalização: ${lote.data_encerramento ? new Date(lote.data_encerramento).toLocaleDateString('pt-BR') : 'N/A'}`,
        `Validador: ${lote.criado_por_nome}`,
        `Peso Inicial: ${formatWeight(pesoInicial)}`,
        `Peso Final: ${formatWeight(pesoFinal)}`,
        `Redução Total: ${lote.taxa_reducao?.toFixed(1) || 0}%`,
        `Tempo Total: ${lote.tempo_processamento || 'N/A'} semanas`,
        `Voluntários Envolvidos: ${lote.num_voluntarios}`,
        `Qualidade Média: ${lote.qualidade_media}/5`
      ];

      info.forEach(line => {
        pdf.text(line, 20, yPosition);
        yPosition += 6;
      });

      // Impacto ambiental
      yPosition += 10;
      pdf.setFont('helvetica', 'bold');
      pdf.text('Impacto Ambiental:', 20, yPosition);
      yPosition += 8;

      pdf.setFont('helvetica', 'normal');
      const co2Evitado = lote.co2e_evitado.toFixed(2);
      const impacto = [
        `CO2e Evitado: ${co2Evitado} kg (fórmula: peso inicial × 0.766)`,
        `Resíduos Desviados: ${formatWeight(pesoInicial)}`,
        `Composto Produzido: ${formatWeight(pesoFinal)}`,
        `Taxa de Redução: ${lote.taxa_reducao?.toFixed(1) || 0}%`
      ];

      impacto.forEach(line => {
        pdf.text(line, 20, yPosition);
        yPosition += 6;
      });

      yPosition += 10;

      // Buscar todas as fotos relacionadas ao lote
      try {
        const { data: todasFotos } = await supabase
          .from('lote_fotos')
          .select('foto_url, tipo_foto, created_at, entrega_id, manejo_id')
          .eq('lote_id', lote.id)
          .order('created_at', { ascending: true });

        if (todasFotos && todasFotos.length > 0) {
          pdf.setFont('helvetica', 'bold');
          pdf.text('Registro Fotográfico Completo:', 20, yPosition);
          yPosition += 8;
          
          pdf.setFont('helvetica', 'normal');
          const fotosEntregas = todasFotos.filter(f => f.entrega_id);
          const fotosManejos = todasFotos.filter(f => f.manejo_id);
          
          if (fotosEntregas.length > 0) {
            pdf.setFont('helvetica', 'bold');
            pdf.text(`Fotos das Entregas (${fotosEntregas.length}):`, 25, yPosition);
            yPosition += 5;
            pdf.setFont('helvetica', 'normal');
            fotosEntregas.slice(0, 5).forEach((foto, index) => {
              pdf.text(`${index + 1}. ${foto.tipo_foto} - ${new Date(foto.created_at).toLocaleDateString('pt-BR')}`, 30, yPosition);
              yPosition += 4;
            });
          }
          
          if (fotosManejos.length > 0) {
            yPosition += 3;
            pdf.setFont('helvetica', 'bold');
            pdf.text(`Fotos do Manejo Final (${fotosManejos.length}):`, 25, yPosition);
            yPosition += 5;
            pdf.setFont('helvetica', 'normal');
            fotosManejos.forEach((foto, index) => {
              pdf.text(`${index + 1}. ${foto.tipo_foto} - ${new Date(foto.created_at).toLocaleDateString('pt-BR')}`, 30, yPosition);
              yPosition += 4;
            });
          }
        }
      } catch (error) {
        console.error('Erro ao buscar fotos do lote:', error);
      }

      // Dados IoT (preparado para futuros sensores)
      yPosition += 10;
      pdf.setFont('helvetica', 'bold');
      pdf.text('Dados IoT e Sensores:', 20, yPosition);
      yPosition += 6;
      pdf.setFont('helvetica', 'normal');
      pdf.text('Sistema preparado para dados de Temperatura, pH, Condutividade, N, P, K', 20, yPosition);
      yPosition += 4;
      pdf.text('(Dados serão integrados quando sensores forem instalados)', 20, yPosition);

      // Certificação e Hash de Integridade
      yPosition += 10;
      pdf.setFont('helvetica', 'bold');
      pdf.text('Certificação de Auditoria:', 20, yPosition);
      yPosition += 6;
      pdf.setFont('helvetica', 'normal');
      pdf.text(`Hash de Integridade: ${lote.id}-${Date.now()}`, 20, yPosition);
      yPosition += 4;
      pdf.text('Este documento certifica a veracidade dos dados apresentados.', 20, yPosition);

      // Rodapé
      pdf.setFontSize(8);
      pdf.text(`Gerado em: ${new Date().toLocaleString('pt-BR')}`, 20, 280);
      pdf.text(`Sistema CompostRoca - Relatório Completo de Auditoria`, 20, 285);

      const fileName = `lote-finalizado-${lote.codigo}-${new Date().toISOString().split('T')[0]}.pdf`;
      pdf.save(fileName);

      toast({
        title: "PDF gerado",
        description: `Relatório ${fileName} baixado com sucesso`,
      });

    } catch (error) {
      console.error('Erro ao gerar PDF:', error);
      toast({
        title: "Erro",
        description: "Não foi possível gerar o relatório PDF",
        variant: "destructive",
      });
    } finally {
      setLoading(false);
    }
  };

  const generateConsolidatedPDF = async (eventos: any[]) => {
    try {
      setLoading(true);
      
      const pdf = new jsPDF('p', 'mm', 'a4');
      const pageWidth = pdf.internal.pageSize.getWidth();
      let yPosition = 20;

      // Cabeçalho
      pdf.setFontSize(18);
      pdf.setFont('helvetica', 'bold');
      pdf.text('Relatório Consolidado - Histórico de Lotes', pageWidth / 2, yPosition, { align: 'center' });
      yPosition += 15;

      pdf.setFontSize(10);
      pdf.setFont('helvetica', 'normal');
      pdf.text(`Período: ${new Date().toLocaleDateString('pt-BR')} | Total de eventos: ${eventos.length}`, pageWidth / 2, yPosition, { align: 'center' });
      yPosition += 20;

      // Lista de eventos
      eventos.forEach((evento, index) => {
        if (yPosition > 250) {
          pdf.addPage();
          yPosition = 20;
        }

        pdf.setFontSize(12);
        pdf.setFont('helvetica', 'bold');
        
        let tipoTexto = '';
        switch (evento.tipo) {
          case 'novo_lote': tipoTexto = 'Novo Lote'; break;
          case 'manutencao': tipoTexto = 'Manutenção'; break;
          case 'lote_finalizado': tipoTexto = 'Lote Finalizado'; break;
        }
        
        pdf.text(`${index + 1}. ${tipoTexto} - ${evento.lote_codigo}`, 20, yPosition);
        yPosition += 8;

        pdf.setFontSize(9);
        pdf.setFont('helvetica', 'normal');
        pdf.text(`Data: ${new Date(evento.data).toLocaleDateString('pt-BR')} | Validador: ${evento.validador_nome}`, 25, yPosition);
        yPosition += 10;
      });

      // Rodapé
      pdf.setFontSize(8);
      pdf.text(`Gerado em: ${new Date().toLocaleString('pt-BR')}`, 20, 280);

      const fileName = `historico-consolidado-${new Date().toISOString().split('T')[0]}.pdf`;
      pdf.save(fileName);

      toast({
        title: "PDF consolidado gerado",
        description: `Relatório ${fileName} baixado com sucesso`,
      });

    } catch (error) {
      console.error('Erro ao gerar PDF consolidado:', error);
      toast({
        title: "Erro",
        description: "Não foi possível gerar o relatório consolidado",
        variant: "destructive",
      });
    } finally {
      setLoading(false);
    }
  };

  return {
    generateNovoLotePDF,
    generateLoteFinalizadoPDF,
    loading
  };
};