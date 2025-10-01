import { createClient } from 'https://esm.sh/@supabase/supabase-js@2';

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
};

interface Lote {
  id: string;
  codigo: string;
  codigo_unico: string;
  data_inicio: string;
  peso_inicial: number;
  latitude: number | null;
  longitude: number | null;
  criado_por: string;
  criado_por_nome: string;
  status: string;
}

Deno.serve(async (req) => {
  if (req.method === 'OPTIONS') {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    const supabaseUrl = Deno.env.get('SUPABASE_URL')!;
    const supabaseKey = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!;
    const supabase = createClient(supabaseUrl, supabaseKey);

    console.log('Iniciando migração de eventos históricos...');

    // Buscar lotes que não têm evento de início
    const { data: lotesSemEventos, error: lotesError } = await supabase
      .from('lotes')
      .select('id, codigo, codigo_unico, data_inicio, peso_inicial, latitude, longitude, criado_por, criado_por_nome, status')
      .is('deleted_at', null)
      .order('data_inicio', { ascending: true });

    if (lotesError) {
      throw new Error(`Erro ao buscar lotes: ${lotesError.message}`);
    }

    console.log(`Encontrados ${lotesSemEventos.length} lotes para processar`);

    let eventosAdicionados = 0;
    let eventosJaExistentes = 0;
    let erros = 0;

    for (const lote of lotesSemEventos) {
      try {
        // Verificar se já existe evento de início
        const { data: eventoExistente, error: checkError } = await supabase
          .from('lote_eventos')
          .select('id')
          .eq('lote_id', lote.id)
          .eq('etapa_numero', 1)
          .is('deleted_at', null)
          .maybeSingle();

        if (checkError) {
          console.error(`Erro ao verificar evento do lote ${lote.codigo}:`, checkError);
          erros++;
          continue;
        }

        if (eventoExistente) {
          console.log(`Lote ${lote.codigo} já tem evento de início`);
          eventosJaExistentes++;
          continue;
        }

        // Buscar entregas do lote
        const { data: entregas, error: entregasError } = await supabase
          .from('entregas')
          .select(`
            *,
            voluntarios:voluntario_id (
              id,
              nome,
              numero_balde
            )
          `)
          .eq('lote_codigo', lote.codigo)
          .is('deleted_at', null);

        if (entregasError) {
          console.error(`Erro ao buscar entregas do lote ${lote.codigo}:`, entregasError);
          erros++;
          continue;
        }

        // Buscar fotos das entregas
        const entregaIds = (entregas || []).map(e => e.id);
        let fotosUrls: string[] = [];

        if (entregaIds.length > 0) {
          const { data: fotos, error: fotosError } = await supabase
            .from('entrega_fotos')
            .select('foto_url')
            .in('entrega_id', entregaIds)
            .is('deleted_at', null);

          if (!fotosError && fotos) {
            fotosUrls = fotos.map(f => f.foto_url);
          }
        }

        // Calcular dados das entregas
        const pesoTotalResiduos = (entregas || []).reduce((sum, e) => sum + (e.peso || 0), 0);
        const pesoCepilho = pesoTotalResiduos * 0.35;
        const totalVoluntarios = new Set((entregas || []).map(e => e.voluntario_id)).size;

        // Criar dados específicos
        const dadosEspecificos = {
          entregas: (entregas || []).map(e => ({
            voluntario_id: e.voluntario_id,
            voluntario_nome: e.voluntarios?.nome || 'Desconhecido',
            numero_balde: e.voluntarios?.numero_balde || 0,
            peso: e.peso || 0,
            qualidade: e.qualidade_residuo,
            data: e.created_at
          })),
          peso_residuos: pesoTotalResiduos,
          peso_cepilho: pesoCepilho,
          total_voluntarios: totalVoluntarios
        };

        // Criar evento de início
        const { error: insertError } = await supabase
          .from('lote_eventos')
          .insert({
            lote_id: lote.id,
            tipo_evento: 'inicio',
            etapa_numero: 1,
            data_evento: lote.data_inicio,
            peso_antes: 0,
            peso_depois: lote.peso_inicial || 0,
            caixa_origem: 1,
            caixa_destino: 1,
            latitude: lote.latitude,
            longitude: lote.longitude,
            administrador_id: lote.criado_por,
            administrador_nome: lote.criado_por_nome,
            observacoes: 'Início do lote - Material orgânico depositado na Caixa 1',
            fotos_compartilhadas: fotosUrls,
            dados_especificos: dadosEspecificos
          });

        if (insertError) {
          console.error(`Erro ao criar evento para lote ${lote.codigo}:`, insertError);
          erros++;
          continue;
        }

        console.log(`✓ Evento de início criado para lote ${lote.codigo}`);
        eventosAdicionados++;

      } catch (error) {
        console.error(`Erro ao processar lote ${lote.codigo}:`, error);
        erros++;
      }
    }

    const resultado = {
      success: true,
      total_lotes_processados: lotesSemEventos.length,
      eventos_adicionados: eventosAdicionados,
      eventos_ja_existentes: eventosJaExistentes,
      erros: erros
    };

    console.log('Migração concluída:', resultado);

    return new Response(
      JSON.stringify(resultado),
      { headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    );

  } catch (error) {
    console.error('Erro na migração:', error);
    return new Response(
      JSON.stringify({ 
        success: false, 
        error: error.message 
      }),
      { 
        status: 500,
        headers: { ...corsHeaders, 'Content-Type': 'application/json' } 
      }
    );
  }
});
