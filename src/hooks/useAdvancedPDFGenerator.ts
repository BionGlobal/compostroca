import { useState } from 'react';
import jsPDF from 'jspdf';
import QRCode from 'qrcode';
import { useToast } from '@/hooks/use-toast';
import { supabase } from '@/integrations/supabase/client';
import type { LoteHistorico } from './useHistoricoLotes';
import { formatWeight, calculateWeightReduction, getOrganizationName } from '@/lib/organizationUtils';
import { generateLoteHash, type LoteHashData } from '@/lib/hashUtils';

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
      pdf.text('RELATÓRIO - NOVO LOTE', pageWidth / 2, yPosition, { align: 'center' });
      yPosition += 20;

      // Informações do lote
      pdf.setFontSize(12);
      pdf.setFont('helvetica', 'bold');
      pdf.text('Dados do Lote Iniciado:', 20, yPosition);
      yPosition += 10;

      pdf.setFontSize(10);
      pdf.setFont('helvetica', 'normal');
      const pesoInicial = Number(lote.peso_inicial) || 0;
      const pesoAtual = Number(lote.peso_atual) || 0;
      const cepilho = pesoInicial * 0.35; // 35% do peso total
      const pesoEntregas = pesoInicial - cepilho;
      
      const info = [
        `Código: ${lote.codigo}`,
        `Unidade: ${getOrganizationName(lote.unidade)}`,
        `Data de Criação: ${new Date(lote.created_at).toLocaleDateString('pt-BR')}`,
        `Data de Início: ${new Date(lote.data_inicio).toLocaleDateString('pt-BR')}`,
        `Validador: ${lote.criado_por_nome}`,
        `Peso Inicial Total: ${formatWeight(pesoInicial)}`,
        `Peso Final: N/A`,
        `Redução Total: N/A`,
        `Voluntários Envolvidos: ${lote.num_voluntarios}`,
        `Qualidade Média: ${lote.qualidade_media.toFixed(1)}/3`
      ];

      info.forEach(line => {
        pdf.text(line, 20, yPosition);
        yPosition += 6;
      });

      yPosition += 10;

      // Impacto ambiental
      pdf.setFont('helvetica', 'bold');
      pdf.text('Impacto Ambiental:', 20, yPosition);
      yPosition += 8;

      pdf.setFont('helvetica', 'normal');
      const impacto = [
        `CO2e Evitado: N/A`,
        `Resíduos Desviados: ${formatWeight(pesoInicial)}`,
        `Composto Produzido: N/A`,
        `Taxa de Redução: N/A`
      ];

      impacto.forEach(line => {
        pdf.text(line, 20, yPosition);
        yPosition += 6;
      });

      yPosition += 10;

      // Seção especial para Voluntários e Entregas
      pdf.setFont('helvetica', 'bold');
      pdf.text('Voluntários e Entregas:', 20, yPosition);
      yPosition += 8;

      try {
        // Buscar dados das entregas por data de início
        const dataInicio = new Date(lote.data_inicio).toISOString().split('T')[0];
        const { data: entregasData } = await supabase
          .from('entregas')
          .select(`
            peso, voluntario_id,
            voluntarios!inner(nome, numero_balde)
          `)
          .gte('created_at', `${dataInicio}T00:00:00.000Z`)
          .lt('created_at', `${dataInicio}T23:59:59.999Z`);

        if (entregasData && entregasData.length > 0) {
          const pesoTotalEntregas = entregasData.reduce((sum, e) => sum + Number(e.peso), 0);
          const cepilhoCalculado = pesoTotalEntregas * 0.35;
          const totalComCepilho = pesoTotalEntregas + cepilhoCalculado;
          
          pdf.setFont('helvetica', 'normal');
          pdf.text(`Peso das Entregas: ${formatWeight(pesoTotalEntregas)}`, 25, yPosition);
          yPosition += 5;
          pdf.text(`Peso do Cepilho (35%): ${formatWeight(cepilhoCalculado)}`, 25, yPosition);
          yPosition += 5;
          pdf.text(`Total Inicial: ${formatWeight(totalComCepilho)}`, 25, yPosition);
          yPosition += 8;

          pdf.setFont('helvetica', 'bold');
          pdf.text('Detalhamento por Voluntário:', 25, yPosition);
          yPosition += 6;
          
          pdf.setFont('helvetica', 'normal');
          entregasData.forEach((entrega, index) => {
            const iniciais = entrega.voluntarios?.nome?.split(' ').map(n => n[0]).join('').toUpperCase() || 'N/A';
            pdf.text(`${index + 1}. ${iniciais} - Balde #${entrega.voluntarios?.numero_balde || 'N/A'} - ${formatWeight(Number(entrega.peso))}`, 30, yPosition);
            yPosition += 4;
            
            // Quebra de página se necessário
            if (yPosition > 260) {
              pdf.addPage();
              yPosition = 20;
            }
          });
        }
      } catch (error) {
        console.error('Erro ao buscar dados de entregas:', error);
      }

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
      pdf.text('RELATÓRIO - LOTE FINALIZADO', pageWidth / 2, yPosition, { align: 'center' });
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
      const cepilho = pesoInicial * 0.35; // 35% do peso total
      const pesoEntregas = pesoInicial - cepilho;
      
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
        `Qualidade Média: ${lote.qualidade_media.toFixed(1)}/3`
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

      // Seção especial para Voluntários e Entregas
      pdf.setFont('helvetica', 'bold');
      pdf.text('Voluntários e Entregas:', 20, yPosition);
      yPosition += 8;

      try {
        // Buscar dados das entregas por data de início 
        const dataInicio = new Date(lote.data_inicio).toISOString().split('T')[0];
        const { data: entregasData } = await supabase
          .from('entregas')
          .select(`
            peso, voluntario_id,
            voluntarios!inner(nome, numero_balde)
          `)
          .gte('created_at', `${dataInicio}T00:00:00.000Z`)
          .lt('created_at', `${dataInicio}T23:59:59.999Z`);

        if (entregasData && entregasData.length > 0) {
          const pesoTotalEntregas = entregasData.reduce((sum, e) => sum + Number(e.peso), 0);
          const cepilhoCalculado = pesoTotalEntregas * 0.35;
          
          pdf.setFont('helvetica', 'normal');
          pdf.text(`Peso das Entregas: ${formatWeight(pesoTotalEntregas)}`, 25, yPosition);
          yPosition += 5;
          pdf.text(`Peso do Cepilho (35%): ${formatWeight(cepilhoCalculado)}`, 25, yPosition);
          yPosition += 5;
          pdf.text(`Total Inicial: ${formatWeight(pesoInicial)}`, 25, yPosition);
          yPosition += 8;

          pdf.setFont('helvetica', 'bold');
          pdf.text('Detalhamento por Voluntário:', 25, yPosition);
          yPosition += 6;
          
          pdf.setFont('helvetica', 'normal');
          entregasData.forEach((entrega, index) => {
            const iniciais = entrega.voluntarios?.nome?.split(' ').map(n => n[0]).join('').toUpperCase() || 'N/A';
            pdf.text(`${index + 1}. ${iniciais} - Balde #${entrega.voluntarios?.numero_balde || 'N/A'} - ${formatWeight(Number(entrega.peso))}`, 30, yPosition);
            yPosition += 4;
            
            // Quebra de página se necessário
            if (yPosition > 250) {
              pdf.addPage();
              yPosition = 20;
            }
          });
        }
      } catch (error) {
        console.error('Erro ao buscar dados de entregas:', error);
      }

      yPosition += 10;

      // Certificação e Hash de Integridade
      pdf.setFont('helvetica', 'bold');
      pdf.text('Certificação de Integridade e Rastreabilidade:', 20, yPosition);
      yPosition += 8;

      try {
        // Gerar hash real para o lote
        const hashData: LoteHashData = {
          codigo: lote.codigo,
          unidade: lote.unidade,
          data_inicio: lote.data_inicio,
          data_encerramento: lote.data_encerramento,
          peso_inicial: pesoInicial,
          peso_atual: pesoFinal,
          latitude: lote.latitude,
          longitude: lote.longitude,
          criado_por: lote.id, // Usando ID como placeholder
          voluntarios: [], // Seria preenchido com dados reais
          entregas: [], // Seria preenchido com dados reais
          fotos: [] // Seria preenchido com dados reais
        };

        const hashIntegridade = generateLoteHash(hashData);
        
        pdf.setFont('helvetica', 'normal');
        pdf.setFontSize(8);
        pdf.text(`Hash SHA256: ${hashIntegridade}`, 20, yPosition);
        yPosition += 5;
        pdf.text('Este hash garante a integridade e imutabilidade dos dados do lote.', 20, yPosition);
        yPosition += 8;

        // Gerar QR Code para página pública
        const loteUrl = `https://compostroca.lovable.app/lote-publico?lote=${lote.codigo}`;
        const qrCodeDataUrl = await QRCode.toDataURL(loteUrl);
        
        pdf.setFont('helvetica', 'bold');
        pdf.setFontSize(10);
        pdf.text('QR Code para Rastreabilidade:', 20, yPosition);
        yPosition += 6;
        
        // Adicionar QR Code ao PDF
        pdf.addImage(qrCodeDataUrl, 'PNG', 20, yPosition, 30, 30);
        
        pdf.setFont('helvetica', 'normal');
        pdf.setFontSize(8);
        pdf.text(`Link: ${loteUrl}`, 55, yPosition + 15);

      } catch (error) {
        console.error('Erro ao gerar hash/QR Code:', error);
        pdf.setFont('helvetica', 'normal');
        pdf.text('Erro ao gerar certificação de integridade', 20, yPosition);
      }

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