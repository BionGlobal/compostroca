import { createClient } from 'https://esm.sh/@supabase/supabase-js@2.39.3'

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
}

Deno.serve(async (req) => {
  // Handle CORS preflight requests
  if (req.method === 'OPTIONS') {
    return new Response(null, { headers: corsHeaders })
  }

  try {
    console.log('🤖 Iniciando coleta diária de sensores...')

    // Criar cliente Supabase com service_role para permissões de escrita
    const supabase = createClient(
      Deno.env.get('SUPABASE_URL') ?? '',
      Deno.env.get('SUPABASE_SERVICE_ROLE_KEY') ?? ''
    )

    // Buscar token da Tago.io das variáveis de ambiente
    const tagoToken = Deno.env.get('TAGO_DEVICE_TOKEN')
    if (!tagoToken) {
      throw new Error('TAGO_DEVICE_TOKEN não configurado nas variáveis de ambiente')
    }

    console.log('📡 Buscando dados da API Tago.io...')

    // Fazer requisição GET para API Tago.io
    const tagoResponse = await fetch(
      'https://api.tago.io/data?variable=data&query=last_value',
      {
        method: 'GET',
        headers: {
          'Content-Type': 'application/json',
          'Device-Token': tagoToken
        }
      }
    )

    if (!tagoResponse.ok) {
      const errorText = await tagoResponse.text()
      const status = tagoResponse.status
      
      console.error('❌ Erro na API Tago.io:', {
        status,
        statusText: tagoResponse.statusText,
        body: errorText
      })
      
      // Mensagens específicas para erros de autenticação
      if (status === 401 || status === 403) {
        const errorMessage = `
Erro de autenticação com Tago.io (${status}):

AÇÃO NECESSÁRIA:
1. Verifique se a variável TAGO_DEVICE_TOKEN está configurada corretamente no Supabase
2. Acesse: Supabase Dashboard > Edge Functions > Secrets
3. Confirme que o token da Tago.io está válido e ativo
4. O token deve ter o formato correto da Tago.io

Detalhes do erro: ${errorText}
        `.trim()
        
        console.error(errorMessage)
        throw new Error(errorMessage)
      }
      
      throw new Error(`Erro na API Tago.io: ${status} - ${errorText}`)
    }

    const tagoData = await tagoResponse.json()
    const metadata = tagoData.result?.[0]?.metadata

    if (!metadata) {
      throw new Error('Metadados não encontrados na resposta da Tago.io')
    }

    console.log('✅ Dados recebidos da Tago.io:', JSON.stringify(metadata, null, 2))

    // Validar campos esperados
    const camposEsperados = {
      caixa2: ['temperatura_solo1', 'umidade_solo1', 'pore_water_ec1'],
      caixa6: ['nitrogenio1', 'fosforo1', 'potassio1', 'ph1']
    }

    const camposFaltantes: string[] = []
    Object.entries(camposEsperados).forEach(([caixa, campos]) => {
      campos.forEach(campo => {
        if (!(campo in metadata)) {
          camposFaltantes.push(`${campo} (${caixa})`)
        }
      })
    })

    if (camposFaltantes.length > 0) {
      console.warn(`⚠️ Campos ausentes nos metadados da Tago.io: ${camposFaltantes.join(', ')}`)
    }

    // Buscar lote ativo na Caixa 2
    const { data: loteCaixa2, error: errorCaixa2 } = await supabase
      .from('lotes')
      .select('id, codigo')
      .eq('caixa_atual', 2)
      .in('status', ['ativo', 'em_processamento'])
      .is('deleted_at', null)
      .maybeSingle()

    if (errorCaixa2) {
      console.error('Erro ao buscar lote da Caixa 2:', errorCaixa2)
    }

    // Buscar lote ativo na Caixa 6
    const { data: loteCaixa6, error: errorCaixa6 } = await supabase
      .from('lotes')
      .select('id, codigo')
      .eq('caixa_atual', 6)
      .in('status', ['ativo', 'em_processamento'])
      .is('deleted_at', null)
      .maybeSingle()

    if (errorCaixa6) {
      console.error('Erro ao buscar lote da Caixa 6:', errorCaixa6)
    }

    // Preparar registros para inserção
    const registros = []

    if (loteCaixa2) {
      console.log(`📦 Lote encontrado na Caixa 2: ${loteCaixa2.codigo} (ID: ${loteCaixa2.id})`)
      registros.push({
        lote_id: loteCaixa2.id,
        numero_caixa: 2,
        temperatura_solo: metadata.temperatura_solo1 ?? null,
        umidade_solo: metadata.umidade_solo1 ?? null,
        condutividade_agua_poros: metadata.pore_water_ec1 ?? null,
        nitrogenio: null,
        fosforo: null,
        potassio: null,
        ph: null
      })
    } else {
      console.warn('⚠️ Nenhum lote ativo encontrado na Caixa 2')
    }

    if (loteCaixa6) {
      console.log(`📦 Lote encontrado na Caixa 6: ${loteCaixa6.codigo} (ID: ${loteCaixa6.id})`)
      registros.push({
        lote_id: loteCaixa6.id,
        numero_caixa: 6,
        temperatura_solo: null,
        umidade_solo: null,
        condutividade_agua_poros: null,
        nitrogenio: metadata.nitrogenio1 ?? null,
        fosforo: metadata.fosforo1 ?? null,
        potassio: metadata.potassio1 ?? null,
        ph: metadata.ph1 ?? null
      })
    } else {
      console.warn('⚠️ Nenhum lote ativo encontrado na Caixa 6')
    }

    // Verificar se há dados para inserir
    if (registros.length === 0) {
      console.log('⚠️ Nenhum lote ativo encontrado nas caixas 2 ou 6. Nenhum dado foi salvo.')
      return new Response(
        JSON.stringify({ 
          message: 'Nenhum lote ativo encontrado nas caixas 2 ou 6. Nenhum dado foi salvo.',
          detalhes: {
            caixa2_presente: false,
            caixa6_presente: false
          }
        }),
        { 
          status: 200, 
          headers: { ...corsHeaders, 'Content-Type': 'application/json' } 
        }
      )
    }

    console.log(`💾 Salvando ${registros.length} leitura(s) no banco de dados...`)

    // Inserir dados na tabela leituras_diarias_sensores
    const { data, error } = await supabase
      .from('leituras_diarias_sensores')
      .insert(registros)
      .select()

    if (error) {
      console.error('❌ Erro ao inserir leituras:', error)
      throw error
    }

    console.log(`✅ ${registros.length} leitura(s) salva(s) com sucesso!`)
    console.log('Dados salvos:', JSON.stringify(data, null, 2))

    return new Response(
      JSON.stringify({ 
        message: 'Coleta diária de sensores concluída com sucesso.',
        leituras_salvas: registros.length,
        detalhes: {
          caixa2_presente: !!loteCaixa2,
          caixa6_presente: !!loteCaixa6,
          lotes_processados: data
        }
      }),
      { 
        status: 200, 
        headers: { ...corsHeaders, 'Content-Type': 'application/json' } 
      }
    )

  } catch (error) {
    console.error('❌ Erro na coleta de sensores:', error)
    return new Response(
      JSON.stringify({ 
        error: 'Erro ao coletar dados dos sensores',
        details: (error as Error).message 
      }),
      { 
        status: 500, 
        headers: { ...corsHeaders, 'Content-Type': 'application/json' } 
      }
    )
  }
})
