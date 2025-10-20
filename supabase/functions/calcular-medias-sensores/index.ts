import { createClient } from 'https://esm.sh/@supabase/supabase-js@2.39.3';

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
};

/**
 * Calcula a média de um array de números, ignorando valores null/undefined
 */
function calcularMedia(valores: (number | null | undefined)[]): number | null {
  const valoresValidos = valores.filter(v => v !== null && v !== undefined && !isNaN(v as number)) as number[];
  
  if (valoresValidos.length === 0) {
    return null;
  }
  
  const soma = valoresValidos.reduce((acc, val) => acc + val, 0);
  return soma / valoresValidos.length;
}

Deno.serve(async (req) => {
  // Handle CORS preflight requests
  if (req.method === 'OPTIONS') {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    // Extrair e validar parâmetros do body
    const { lote_id, caixa_origem } = await req.json();

    console.log('📊 Calculando médias para:', { lote_id, caixa_origem });

    // Validar presença dos parâmetros
    if (!lote_id || !caixa_origem) {
      return new Response(
        JSON.stringify({ 
          error: 'Parâmetros obrigatórios ausentes',
          details: 'É necessário fornecer lote_id (UUID) e caixa_origem (número)'
        }),
        { status: 400, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    // Validar que caixa_origem é 2 ou 6
    if (![2, 6].includes(caixa_origem)) {
      return new Response(
        JSON.stringify({ 
          error: 'caixa_origem inválida',
          details: 'caixa_origem deve ser 2 ou 6 (caixas monitoradas)'
        }),
        { status: 400, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    // Criar cliente Supabase com service_role para permissões completas
    const supabaseUrl = Deno.env.get('SUPABASE_URL')!;
    const supabaseServiceKey = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!;
    const supabase = createClient(supabaseUrl, supabaseServiceKey);

    // Passo A: Buscar todas as leituras diárias do lote na caixa específica
    console.log(`🔍 Buscando leituras para lote ${lote_id} na Caixa ${caixa_origem}...`);
    
    const { data: leituras, error: errorLeituras } = await supabase
      .from('leituras_diarias_sensores')
      .select('*')
      .eq('lote_id', lote_id)
      .eq('numero_caixa', caixa_origem);

    if (errorLeituras) {
      console.error('❌ Erro ao buscar leituras:', errorLeituras);
      throw errorLeituras;
    }

    // Verificar se há leituras disponíveis
    if (!leituras || leituras.length === 0) {
      console.warn(`⚠️ Nenhuma leitura encontrada para lote ${lote_id} na Caixa ${caixa_origem}`);
      return new Response(
        JSON.stringify({ 
          message: `Nenhuma leitura encontrada para o lote na Caixa ${caixa_origem}`,
          aviso: 'Não foi possível calcular médias pois não há dados disponíveis',
          lote_id,
          caixa_origem
        }),
        { status: 200, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    console.log(`✅ ${leituras.length} leituras encontradas`);

    // Passo B: Calcular médias dependendo da caixa
    let mediasCalculadas: any = {};
    let dadosParaSalvar: any = { lote_id };

    if (caixa_origem === 2) {
      // Caixa 2: Temperatura, Umidade, Condutividade
      mediasCalculadas = {
        media_temperatura: calcularMedia(leituras.map(l => l.temperatura_solo)),
        media_umidade: calcularMedia(leituras.map(l => l.umidade_solo)),
        media_condutividade: calcularMedia(leituras.map(l => l.condutividade_agua_poros))
      };

      // Passo C: Preparar objeto para salvar (Semana 2)
      dadosParaSalvar = {
        ...dadosParaSalvar,
        media_temperatura_semana2: mediasCalculadas.media_temperatura,
        media_umidade_semana2: mediasCalculadas.media_umidade,
        media_condutividade_semana2: mediasCalculadas.media_condutividade
      };

      console.log('📈 Médias Semana 2 calculadas:', mediasCalculadas);
    } else if (caixa_origem === 6) {
      // Caixa 6: Nitrogênio, Fósforo, Potássio, pH
      mediasCalculadas = {
        media_nitrogenio: calcularMedia(leituras.map(l => l.nitrogenio)),
        media_fosforo: calcularMedia(leituras.map(l => l.fosforo)),
        media_potassio: calcularMedia(leituras.map(l => l.potassio)),
        media_ph: calcularMedia(leituras.map(l => l.ph))
      };

      // Passo C: Preparar objeto para salvar (Semana 6)
      dadosParaSalvar = {
        ...dadosParaSalvar,
        media_nitrogenio_semana6: mediasCalculadas.media_nitrogenio,
        media_fosforo_semana6: mediasCalculadas.media_fosforo,
        media_potassio_semana6: mediasCalculadas.media_potassio,
        media_ph_semana6: mediasCalculadas.media_ph
      };

      console.log('📈 Médias Semana 6 calculadas:', mediasCalculadas);
    }

    // Passo D: Salvar médias usando UPSERT
    // CRÍTICO: Upsert cria registro novo na Caixa 2 e atualiza o mesmo registro na Caixa 6
    console.log('💾 Salvando médias no banco de dados...');
    
    const { data: resultado, error: errorUpsert } = await supabase
      .from('medias_sensores_lote')
      .upsert(dadosParaSalvar, {
        onConflict: 'lote_id'  // Usar lote_id como chave de conflito
      })
      .select();

    if (errorUpsert) {
      console.error('❌ Erro ao salvar médias:', errorUpsert);
      throw errorUpsert;
    }

    console.log('✅ Médias salvas com sucesso!', resultado);

    // Retornar resposta de sucesso
    return new Response(
      JSON.stringify({ 
        message: `Médias da Caixa ${caixa_origem} para o lote calculadas e salvas com sucesso.`,
        lote_id,
        caixa_origem,
        total_leituras_processadas: leituras.length,
        medias_calculadas: mediasCalculadas,
        operacao: resultado && resultado.length > 0 ? 'atualizado' : 'criado'
      }),
      { 
        status: 200, 
        headers: { ...corsHeaders, 'Content-Type': 'application/json' } 
      }
    );

  } catch (error) {
    console.error('❌ Erro geral na função:', error);
    return new Response(
      JSON.stringify({ 
        error: 'Erro ao calcular médias dos sensores',
        details: error.message 
      }),
      { 
        status: 500, 
        headers: { ...corsHeaders, 'Content-Type': 'application/json' } 
      }
    );
  }
});
