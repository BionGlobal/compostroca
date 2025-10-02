import { createClient } from 'https://esm.sh/@supabase/supabase-js@2.52.1';

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
};

interface Lote {
  id: string;
  codigo: string;
  codigo_unico: string;
  unidade: string;
  data_inicio: string;
  data_finalizacao: string | null;
  peso_inicial: number;
  peso_final: number | null;
  criado_por: string;
  criado_por_nome: string;
  latitude: number | null;
  longitude: number | null;
  status: string;
}

Deno.serve(async (req) => {
  if (req.method === 'OPTIONS') {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    const supabaseClient = createClient(
      Deno.env.get('SUPABASE_URL') ?? '',
      Deno.env.get('SUPABASE_SERVICE_ROLE_KEY') ?? '',
      {
        auth: {
          autoRefreshToken: false,
          persistSession: false
        }
      }
    );

    console.log('🚀 Iniciando migração de eventos retroativos');

    // Buscar lotes sem eventos
    const { data: lotesSemEventos, error: lotesSemEventosError } = await supabaseClient
      .from('lotes')
      .select('*')
      .is('deleted_at', null)
      .not('peso_inicial', 'is', null)
      .order('data_inicio', { ascending: true });

    if (lotesSemEventosError) {
      throw lotesSemEventosError;
    }

    console.log(`📊 Total de lotes encontrados: ${lotesSemEventos?.length || 0}`);

    const resultados = {
      total_lotes: lotesSemEventos?.length || 0,
      lotes_processados: 0,
      lotes_com_eventos: 0,
      lotes_migrados: 0,
      erros: [] as string[]
    };

    if (!lotesSemEventos || lotesSemEventos.length === 0) {
      return new Response(
        JSON.stringify({
          ...resultados,
          mensagem: 'Nenhum lote encontrado para migração'
        }),
        {
          headers: { ...corsHeaders, 'Content-Type': 'application/json' },
          status: 200,
        }
      );
    }

    // Processar cada lote
    for (const lote of lotesSemEventos as Lote[]) {
      try {
        console.log(`\n📦 Processando lote: ${lote.codigo} (${lote.codigo_unico})`);

        // Verificar se já tem eventos
        const { data: eventosExistentes, error: eventosError } = await supabaseClient
          .from('lote_eventos')
          .select('id')
          .eq('lote_id', lote.id)
          .limit(1);

        if (eventosError) {
          throw eventosError;
        }

        if (eventosExistentes && eventosExistentes.length > 0) {
          console.log(`⏭️  Lote ${lote.codigo} já possui eventos - pulando`);
          resultados.lotes_com_eventos++;
          continue;
        }

        // Buscar entregas associadas ao lote
        const { data: entregas, error: entregasError } = await supabaseClient
          .from('entregas')
          .select('*, voluntarios:voluntario_id(nome, numero_balde)')
          .eq('lote_codigo', lote.codigo)
          .is('deleted_at', null);

        if (entregasError) {
          console.warn(`⚠️  Erro ao buscar entregas do lote ${lote.codigo}:`, entregasError);
        }

        const totalVoluntarios = entregas ? new Set(entregas.map(e => e.voluntario_id)).size : 0;
        const pesoResiduos = entregas ? entregas.reduce((sum, e) => sum + (e.peso || 0), 0) : 0;

        console.log(`👥 Total de voluntários: ${totalVoluntarios}, Peso resíduos: ${pesoResiduos}kg`);

        // Buscar fotos das entregas
        const { data: fotosEntregas, error: fotosError } = await supabaseClient
          .from('entrega_fotos')
          .select('foto_url, entrega_id')
          .in('entrega_id', (entregas || []).map(e => e.id))
          .is('deleted_at', null);

        if (fotosError) {
          console.warn(`⚠️  Erro ao buscar fotos do lote ${lote.codigo}:`, fotosError);
        }

        const fotosUrls = fotosEntregas ? [...new Set(fotosEntregas.map(f => f.foto_url))] : [];

        // Gerar 8 eventos retroativos
        const eventos = [];
        let pesoAtual = lote.peso_inicial;
        const taxaDecaimento = 0.0354; // 3.54%

        // EVENTO 1: Início
        eventos.push({
          lote_id: lote.id,
          tipo_evento: 'inicio',
          etapa_numero: 1,
          data_evento: lote.data_inicio,
          peso_antes: 0,
          peso_depois: lote.peso_inicial,
          caixa_origem: 1,
          caixa_destino: 1,
          latitude: lote.latitude,
          longitude: lote.longitude,
          administrador_id: lote.criado_por,
          administrador_nome: lote.criado_por_nome,
          observacoes: 'Início do lote - Material orgânico depositado na Caixa 1 (evento retroativo)',
          fotos_compartilhadas: fotosUrls,
          dados_especificos: {
            retroativo: true,
            peso_residuos: pesoResiduos,
            total_voluntarios: totalVoluntarios,
            total_entregas: entregas?.length || 0
          }
        });

        // EVENTOS 2-7: Manutenções semanais
        for (let etapa = 2; etapa <= 7; etapa++) {
          const semana = etapa - 1;
          const caixaOrigem = etapa - 1;
          const caixaDestino = etapa;

          pesoAtual = Math.round(pesoAtual * (1 - taxaDecaimento) * 100) / 100;

          const dataEvento = new Date(lote.data_inicio);
          dataEvento.setDate(dataEvento.getDate() + (semana * 7));

          eventos.push({
            lote_id: lote.id,
            tipo_evento: 'manutencao',
            etapa_numero: etapa,
            data_evento: dataEvento.toISOString(),
            peso_antes: Math.round((pesoAtual / (1 - taxaDecaimento)) * 100) / 100,
            peso_depois: pesoAtual,
            caixa_origem: caixaOrigem,
            caixa_destino: caixaDestino,
            latitude: lote.latitude,
            longitude: lote.longitude,
            administrador_id: lote.criado_por,
            administrador_nome: lote.criado_por_nome,
            observacoes: `Manutenção Semana ${semana} - Transferência Caixa ${caixaOrigem} → ${caixaDestino} (evento retroativo)`,
            fotos_compartilhadas: [],
            dados_especificos: {
              retroativo: true,
              semana_numero: semana,
              taxa_decaimento: taxaDecaimento
            }
          });
        }

        // EVENTO 8: Finalização (somente se o lote estiver encerrado)
        if (lote.status === 'encerrado') {
          const pesoFinalReal = lote.peso_final || pesoAtual;

          const dataFinalizacao = lote.data_finalizacao || new Date(lote.data_inicio);
          if (typeof dataFinalizacao === 'string') {
            const dataFim = new Date(dataFinalizacao);
            if (isNaN(dataFim.getTime())) {
              // Se data_finalizacao for inválida, calcular 7 semanas após início
              const dataCalc = new Date(lote.data_inicio);
              dataCalc.setDate(dataCalc.getDate() + (7 * 7));
              dataFinalizacao = dataCalc.toISOString();
            }
          }

          eventos.push({
            lote_id: lote.id,
            tipo_evento: 'finalizacao',
            etapa_numero: 8,
            data_evento: dataFinalizacao,
            peso_antes: pesoAtual,
            peso_depois: pesoFinalReal,
            caixa_origem: 7,
            caixa_destino: null,
            latitude: lote.latitude,
            longitude: lote.longitude,
            administrador_id: lote.criado_por,
            administrador_nome: lote.criado_por_nome,
            observacoes: 'Compostagem finalizada - Lote pronto para distribuição (evento retroativo)',
            fotos_compartilhadas: [],
            dados_especificos: {
              retroativo: true,
              peso_final_real: pesoFinalReal,
              reducao_total_percentual: Math.round(((lote.peso_inicial - pesoFinalReal) / lote.peso_inicial) * 100 * 100) / 100
            }
          });
        }

        console.log(`📝 Criando ${eventos.length} eventos para lote ${lote.codigo}`);

        // Inserir todos os eventos
        const { error: insertError } = await supabaseClient
          .from('lote_eventos')
          .insert(eventos);

        if (insertError) {
          throw insertError;
        }

        console.log(`✅ Lote ${lote.codigo} migrado com sucesso - ${eventos.length} eventos criados`);
        resultados.lotes_migrados++;

      } catch (loteError: any) {
        const errorMsg = `Erro no lote ${lote.codigo}: ${loteError.message}`;
        console.error(`❌ ${errorMsg}`);
        resultados.erros.push(errorMsg);
      } finally {
        resultados.lotes_processados++;
      }
    }

    console.log('\n🎉 Migração concluída!');
    console.log(`📊 Resultados:
      - Total de lotes: ${resultados.total_lotes}
      - Processados: ${resultados.lotes_processados}
      - Com eventos existentes: ${resultados.lotes_com_eventos}
      - Migrados: ${resultados.lotes_migrados}
      - Erros: ${resultados.erros.length}`);

    return new Response(
      JSON.stringify({
        success: true,
        ...resultados,
        mensagem: `Migração concluída: ${resultados.lotes_migrados} lotes migrados de ${resultados.total_lotes} analisados`
      }),
      {
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
        status: 200,
      }
    );

  } catch (error: any) {
    console.error('❌ Erro fatal na migração:', error);
    return new Response(
      JSON.stringify({
        success: false,
        error: error.message,
        stack: error.stack
      }),
      {
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
        status: 500,
      }
    );
  }
});
