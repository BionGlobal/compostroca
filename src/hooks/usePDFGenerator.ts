import { useState } from 'react';
import jsPDF from 'jspdf';
import html2canvas from 'html2canvas';
import { useToast } from '@/hooks/use-toast';
import type { LoteDetalhes } from './useLoteDetalhes';
import { formatWeight, calculateWeightReduction, calculateProcessingTime, getOrganizationName } from '@/lib/organizationUtils';

export const usePDFGenerator = () => {
  const [loading, setLoading] = useState(false);
  const { toast } = useToast();

  const generatePDF = async (loteDetalhes: LoteDetalhes) => {
    try {
      setLoading(true);
      
      const pdf = new jsPDF('p', 'mm', 'a4');
      const pageWidth = pdf.internal.pageSize.getWidth();
      const pageHeight = pdf.internal.pageSize.getHeight();
      const margin = 20;
      let yPosition = margin;

      // Cabeçalho
      pdf.setFontSize(20);
      pdf.setFont('helvetica', 'bold');
      pdf.text('Relatório de Lote de Compostagem', pageWidth / 2, yPosition, { align: 'center' });
      yPosition += 20;

      // Data de geração
      pdf.setFontSize(10);
      pdf.setFont('helvetica', 'normal');
      pdf.text(`Gerado em: ${new Date().toLocaleString('pt-BR')}`, pageWidth - margin, yPosition, { align: 'right' });
      yPosition += 20;

      // Informações básicas do lote
      pdf.setFontSize(14);
      pdf.setFont('helvetica', 'bold');
      pdf.text('Dados do Lote', margin, yPosition);
      yPosition += 10;

      pdf.setFontSize(11);
      pdf.setFont('helvetica', 'normal');
      const basicInfo = [
        `Código: ${loteDetalhes.codigo}`,
        `Unidade: ${getOrganizationName(loteDetalhes.unidade)}`,
        `Status: ${loteDetalhes.status}`,
        `Período: ${new Date(loteDetalhes.data_inicio).toLocaleDateString('pt-BR')} - ${loteDetalhes.data_encerramento ? new Date(loteDetalhes.data_encerramento).toLocaleDateString('pt-BR') : 'Em processamento'}`,
        `Tempo de processamento: ${calculateProcessingTime(loteDetalhes.data_inicio, loteDetalhes.data_encerramento)}`,
        `Peso inicial: ${formatWeight(loteDetalhes.peso_inicial)}`,
        `Peso final: ${formatWeight(loteDetalhes.peso_atual)}`,
        `Redução: ${calculateWeightReduction(loteDetalhes.peso_inicial, loteDetalhes.peso_atual).toFixed(1)}%`,
        `Validador: ${loteDetalhes.criado_por_nome}`
      ];

      basicInfo.forEach(info => {
        pdf.text(info, margin, yPosition);
        yPosition += 6;
      });

      yPosition += 10;

      // Voluntários envolvidos
      pdf.setFontSize(14);
      pdf.setFont('helvetica', 'bold');
      pdf.text('Voluntários Envolvidos', margin, yPosition);
      yPosition += 10;

      pdf.setFontSize(11);
      pdf.setFont('helvetica', 'normal');
      pdf.text(`Total de voluntários: ${loteDetalhes.voluntarios.length}`, margin, yPosition);
      yPosition += 8;

      loteDetalhes.voluntarios.forEach(voluntario => {
        pdf.text(`• ${voluntario.nome} (Balde #${voluntario.numero_balde}) - ${voluntario.entregas_count} entregas - ${formatWeight(voluntario.peso_total)}`, margin + 5, yPosition);
        yPosition += 6;
      });

      yPosition += 10;

      // Dados de impacto
      pdf.setFontSize(14);
      pdf.setFont('helvetica', 'bold');
      pdf.text('Dados de Impacto Ambiental', margin, yPosition);
      yPosition += 10;

      pdf.setFontSize(11);
      pdf.setFont('helvetica', 'normal');
      const co2Avoided = (loteDetalhes.peso_inicial * 0.766).toFixed(2);
      const compostProduced = loteDetalhes.peso_atual.toFixed(2);
      
      const impactInfo = [
        `CO2e evitado: ${co2Avoided} kg`,
        `Resíduos desviados do aterro: ${formatWeight(loteDetalhes.peso_inicial)}`,
        `Composto produzido: ${formatWeight(loteDetalhes.peso_atual)}`,
        `Eficiência do processo: ${calculateWeightReduction(loteDetalhes.peso_inicial, loteDetalhes.peso_atual).toFixed(1)}%`
      ];

      impactInfo.forEach(info => {
        pdf.text(info, margin, yPosition);
        yPosition += 6;
      });

      yPosition += 10;

      // Hash de integridade
      if (loteDetalhes.hash_integridade) {
        pdf.setFontSize(14);
        pdf.setFont('helvetica', 'bold');
        pdf.text('Hash de Integridade (Blockchain-like)', margin, yPosition);
        yPosition += 10;

        pdf.setFontSize(9);
        pdf.setFont('helvetica', 'normal');
        pdf.text(`SHA256: ${loteDetalhes.hash_integridade}`, margin, yPosition);
        yPosition += 8;
        pdf.text('Este hash garante a integridade e imutabilidade dos dados do lote.', margin, yPosition);
      }

      // Rodapé
      pdf.setFontSize(8);
      pdf.setFont('helvetica', 'italic');
      pdf.text('Relatório gerado automaticamente pelo Sistema de Gestão de Compostagem', pageWidth / 2, pageHeight - 10, { align: 'center' });

      // Salvar PDF
      const fileName = `lote-${loteDetalhes.codigo}-${new Date().toISOString().split('T')[0]}.pdf`;
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

  return {
    generatePDF,
    loading
  };
};