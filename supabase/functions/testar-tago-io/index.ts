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
    console.log('🧪 ===== TESTE DE INTEGRAÇÃO TAGO.IO =====')
    const inicioTeste = new Date().toISOString()
    
    const tagoToken = Deno.env.get('TAGO_DEVICE_TOKEN')
    
    const resultados = {
      timestamp: inicioTeste,
      token_configurado: !!tagoToken,
      token_length: tagoToken?.length || 0,
      testes: {} as Record<string, any>
    }

    if (!tagoToken) {
      console.error('❌ TAGO_DEVICE_TOKEN não configurado')
      return new Response(
        JSON.stringify({ 
          error: 'TAGO_DEVICE_TOKEN não configurado',
          resultados 
        }),
        { 
          status: 400, 
          headers: { ...corsHeaders, 'Content-Type': 'application/json' } 
        }
      )
    }

    // TESTE 1: Health Check da API Tago.io
    console.log('📡 Teste 1: Health Check da API...')
    try {
      const healthResponse = await fetch('https://api.tago.io/info', {
        method: 'GET',
        headers: { 'Content-Type': 'application/json' }
      })
      
      resultados.testes.health_check = {
        status: healthResponse.status,
        ok: healthResponse.ok,
        statusText: healthResponse.statusText,
        body: healthResponse.ok ? await healthResponse.json() : await healthResponse.text()
      }
      console.log('✅ Health Check:', resultados.testes.health_check.status)
    } catch (error) {
      resultados.testes.health_check = {
        error: (error as Error).message,
        tipo: 'Erro de conexão'
      }
      console.error('❌ Erro no Health Check:', error)
    }

    // TESTE 2: Autenticação com Device Token
    console.log('🔑 Teste 2: Validação de Autenticação...')
    try {
      const authResponse = await fetch('https://api.tago.io/device', {
        method: 'GET',
        headers: {
          'Content-Type': 'application/json',
          'Device-Token': tagoToken
        }
      })
      
      const authBody = authResponse.ok ? await authResponse.json() : await authResponse.text()
      
      resultados.testes.autenticacao = {
        status: authResponse.status,
        ok: authResponse.ok,
        statusText: authResponse.statusText,
        autenticado: authResponse.ok,
        body: authBody
      }
      
      if (authResponse.ok) {
        console.log('✅ Token válido e autenticado')
      } else {
        console.error('❌ Falha na autenticação:', authResponse.status)
      }
    } catch (error) {
      resultados.testes.autenticacao = {
        error: (error as Error).message,
        tipo: 'Erro de conexão'
      }
      console.error('❌ Erro na autenticação:', error)
    }

    // TESTE 3: Buscar dados do device
    console.log('📊 Teste 3: Buscar dados do sensor...')
    try {
      const dataResponse = await fetch(
        'https://api.tago.io/data?variable=data&query=last_value',
        {
          method: 'GET',
          headers: {
            'Content-Type': 'application/json',
            'Device-Token': tagoToken
          }
        }
      )
      
      const dataBody = dataResponse.ok ? await dataResponse.json() : await dataResponse.text()
      
      resultados.testes.dados_sensor = {
        status: dataResponse.status,
        ok: dataResponse.ok,
        statusText: dataResponse.statusText,
        dados_recebidos: dataResponse.ok && dataBody.result?.length > 0,
        body: dataBody
      }
      
      if (dataResponse.ok) {
        const metadata = dataBody.result?.[0]?.metadata
        if (metadata) {
          console.log('✅ Dados recebidos com sucesso')
          console.log('📋 Campos disponíveis:', Object.keys(metadata))
          
          // Validar campos esperados
          const camposEsperados = [
            'temperatura_solo1', 'umidade_solo1', 'pore_water_ec1',
            'nitrogenio1', 'fosforo1', 'potassio1', 'ph1'
          ]
          
          const camposEncontrados = camposEsperados.filter(campo => campo in metadata)
          const camposFaltantes = camposEsperados.filter(campo => !(campo in metadata))
          
          resultados.testes.validacao_campos = {
            campos_esperados: camposEsperados,
            campos_encontrados: camposEncontrados,
            campos_faltantes: camposFaltantes,
            metadata_completo: metadata
          }
          
          console.log(`✅ ${camposEncontrados.length}/${camposEsperados.length} campos encontrados`)
          if (camposFaltantes.length > 0) {
            console.warn('⚠️ Campos faltantes:', camposFaltantes)
          }
        } else {
          console.warn('⚠️ Metadados não encontrados na resposta')
        }
      } else {
        console.error('❌ Erro ao buscar dados:', dataResponse.status)
      }
    } catch (error) {
      resultados.testes.dados_sensor = {
        error: (error as Error).message,
        tipo: 'Erro de conexão'
      }
      console.error('❌ Erro ao buscar dados:', error)
    }

    // TESTE 4: Verificar lotes ativos nas caixas 2 e 6
    console.log('📦 Teste 4: Verificar lotes ativos...')
    const supabase = createClient(
      Deno.env.get('SUPABASE_URL') ?? '',
      Deno.env.get('SUPABASE_SERVICE_ROLE_KEY') ?? ''
    )

    const { data: loteCaixa2 } = await supabase
      .from('lotes')
      .select('id, codigo, caixa_atual')
      .eq('caixa_atual', 2)
      .in('status', ['ativo', 'em_processamento'])
      .is('deleted_at', null)
      .maybeSingle()

    const { data: loteCaixa6 } = await supabase
      .from('lotes')
      .select('id, codigo, caixa_atual')
      .eq('caixa_atual', 6)
      .in('status', ['ativo', 'em_processamento'])
      .is('deleted_at', null)
      .maybeSingle()

    resultados.testes.lotes_ativos = {
      caixa2: loteCaixa2 ? { codigo: loteCaixa2.codigo, id: loteCaixa2.id } : null,
      caixa6: loteCaixa6 ? { codigo: loteCaixa6.codigo, id: loteCaixa6.id } : null,
      pode_coletar_dados: !!(loteCaixa2 || loteCaixa6)
    }

    console.log('📦 Caixa 2:', loteCaixa2 ? loteCaixa2.codigo : 'Vazia')
    console.log('📦 Caixa 6:', loteCaixa6 ? loteCaixa6.codigo : 'Vazia')

    // RESUMO FINAL
    const todosTestes = Object.values(resultados.testes)
    const testesComSucesso = todosTestes.filter((t: any) => t.ok || t.autenticado).length
    const statusGeral = testesComSucesso === todosTestes.length ? 'SUCESSO' : 'FALHA PARCIAL'

    console.log(`\n📊 ===== RESUMO DOS TESTES =====`)
    console.log(`Status: ${statusGeral}`)
    console.log(`Testes com sucesso: ${testesComSucesso}/${todosTestes.length}`)
    console.log(`Timestamp: ${inicioTeste}`)
    console.log(`===== FIM DOS TESTES =====\n`)

    return new Response(
      JSON.stringify({
        status_geral: statusGeral,
        testes_sucesso: testesComSucesso,
        total_testes: todosTestes.length,
        resultados
      }, null, 2),
      {
        status: 200,
        headers: { ...corsHeaders, 'Content-Type': 'application/json' }
      }
    )

  } catch (error) {
    console.error('❌ Erro crítico no teste:', error)
    return new Response(
      JSON.stringify({
        error: 'Erro ao executar testes',
        details: (error as Error).message,
        timestamp: new Date().toISOString()
      }),
      {
        status: 500,
        headers: { ...corsHeaders, 'Content-Type': 'application/json' }
      }
    )
  }
})
