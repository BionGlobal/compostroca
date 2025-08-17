import { useState } from 'react';
import jsPDF from 'jspdf';
import { useToast } from '@/hooks/use-toast';
import type { HistoricoEvent } from './useHistoricoLotes';
import { formatWeight, calculateWeightReduction, getOrganizationName } from '@/lib/organizationUtils';

export const useAdvancedPDFGenerator = () => {
  const [loading, setLoading] = useState(false);
  const { toast } = useToast();

  const generateNovoLotePDF = async (evento: HistoricoEvent) => {
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
      const info = [
        `Código: ${evento.lote_codigo}`,
        `Unidade: ${getOrganizationName(evento.unidade)}`,
        `Data de Encerramento: ${new Date(evento.data).toLocaleDateString('pt-BR')}`,
        `Validador: ${evento.validador_nome}`,
        `Peso Inicial: ${formatWeight(evento.dados_especificos.peso_inicial)}`,
        `Peso Atual: ${formatWeight(evento.dados_especificos.peso_atual)}`,
        `Redução: ${calculateWeightReduction(evento.dados_especificos.peso_inicial, evento.dados_especificos.peso_atual).toFixed(1)}%`
      ];

      info.forEach(line => {
        pdf.text(line, 20, yPosition);
        yPosition += 6;
      });

      if (evento.geoloc) {
        yPosition += 5;
        pdf.text(`Localização: ${evento.geoloc.lat.toFixed(6)}, ${evento.geoloc.lng.toFixed(6)}`, 20, yPosition);
        yPosition += 10;
      }

      // Rodapé
      pdf.setFontSize(8);
      pdf.text(`Gerado em: ${new Date().toLocaleString('pt-BR')}`, 20, 280);

      const fileName = `novo-lote-${evento.lote_codigo}-${new Date().toISOString().split('T')[0]}.pdf`;
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

  const generateManutencaoPDF = async (evento: HistoricoEvent) => {
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

  const generateLoteFinalizadoPDF = async (evento: HistoricoEvent) => {
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
      const info = [
        `Código: ${evento.lote_codigo}`,
        `Unidade: ${getOrganizationName(evento.unidade)}`,
        `Data de Finalização: ${new Date(evento.data).toLocaleDateString('pt-BR')}`,
        `Validador: ${evento.validador_nome}`,
        `Peso Inicial: ${formatWeight(evento.dados_especificos.peso_inicial)}`,
        `Peso Final: ${formatWeight(evento.dados_especificos.peso_final)}`,
        `Redução Total: ${evento.dados_especificos.reducao_peso.toFixed(1)}%`,
        `Tempo Total: ${evento.dados_especificos.tempo_total || 'N/A'} semanas`
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
      const co2Evitado = (evento.dados_especificos.peso_inicial * 0.766).toFixed(2);
      const impacto = [
        `CO2e Evitado: ${co2Evitado} kg`,
        `Resíduos Desviados: ${formatWeight(evento.dados_especificos.peso_inicial)}`,
        `Composto Produzido: ${formatWeight(evento.dados_especificos.peso_final)}`
      ];

      impacto.forEach(line => {
        pdf.text(line, 20, yPosition);
        yPosition += 6;
      });

      if (evento.geoloc) {
        yPosition += 5;
        pdf.text(`Localização: ${evento.geoloc.lat.toFixed(6)}, ${evento.geoloc.lng.toFixed(6)}`, 20, yPosition);
      }

      // Rodapé
      pdf.setFontSize(8);
      pdf.text(`Gerado em: ${new Date().toLocaleString('pt-BR')}`, 20, 280);

      const fileName = `lote-finalizado-${evento.lote_codigo}-${new Date().toISOString().split('T')[0]}.pdf`;
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

  const generateConsolidatedPDF = async (eventos: HistoricoEvent[]) => {
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
    generateManutencaoPDF,
    generateLoteFinalizadoPDF,
    generateConsolidatedPDF,
    loading
  };
};