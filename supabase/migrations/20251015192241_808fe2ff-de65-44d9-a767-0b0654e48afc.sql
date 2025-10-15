-- ==============================================================================
-- CORREÇÃO COMPLETA DO SISTEMA DE MANEJO SEMANAL
-- ==============================================================================
-- Este script corrige:
-- 1. Datas incorretas das Etapas 6 e 7 do lote CWB001-28082025A953
-- 2. Função recuperar_eventos_lote() para validar intervalos semanais
-- 3. Limpeza de sessões duplicadas de 08/10/2025
-- ==============================================================================

-- ==============================================================================
-- PARTE 1: CORREÇÃO IMEDIATA DO LOTE CWB001-28082025A953
-- ==============================================================================

DO $$
DECLARE
  v_lote_id UUID;
  v_evento_etapa5 RECORD;
  v_evento_etapa6 RECORD;
  v_evento_etapa7 RECORD;
  v_data_etapa6 TIMESTAMP WITH TIME ZONE;
  v_data_etapa7 TIMESTAMP WITH TIME ZONE;
BEGIN
  RAISE NOTICE '🔧 Iniciando correção do lote CWB001-28082025A953...';

  -- Buscar ID do lote
  SELECT id INTO v_lote_id
  FROM lotes
  WHERE codigo = 'CWB001-28082025A953'
  LIMIT 1;

  IF v_lote_id IS NULL THEN
    RAISE EXCEPTION 'Lote CWB001-28082025A953 não encontrado';
  END IF;

  -- Buscar dados das etapas
  SELECT * INTO v_evento_etapa5
  FROM lote_eventos
  WHERE lote_id = v_lote_id AND etapa_numero = 5
  LIMIT 1;

  SELECT * INTO v_evento_etapa6
  FROM lote_eventos
  WHERE lote_id = v_lote_id AND etapa_numero = 6
  LIMIT 1;

  SELECT * INTO v_evento_etapa7
  FROM lote_eventos
  WHERE lote_id = v_lote_id AND etapa_numero = 7
  LIMIT 1;

  -- Calcular datas corretas (7 dias após a etapa anterior)
  v_data_etapa6 := v_evento_etapa5.data_evento + INTERVAL '7 days';
  v_data_etapa7 := v_data_etapa6 + INTERVAL '7 days';

  RAISE NOTICE 'Data Etapa 5: %', v_evento_etapa5.data_evento;
  RAISE NOTICE 'Data Etapa 6 (atual): % → (corrigida): %', v_evento_etapa6.data_evento, v_data_etapa6;
  RAISE NOTICE 'Data Etapa 7 (atual): % → (corrigida): %', v_evento_etapa7.data_evento, v_data_etapa7;

  -- Atualizar Etapa 6 mantendo todos os dados reais
  UPDATE lote_eventos
  SET data_evento = v_data_etapa6,
      updated_at = NOW()
  WHERE id = v_evento_etapa6.id;

  -- Atualizar Etapa 7 mantendo todos os dados reais
  UPDATE lote_eventos
  SET data_evento = v_data_etapa7,
      updated_at = NOW()
  WHERE id = v_evento_etapa7.id;

  RAISE NOTICE '✅ Etapas 6 e 7 corrigidas com sucesso!';
END $$;

-- ==============================================================================
-- PARTE 2: ATUALIZAÇÃO DA FUNÇÃO recuperar_eventos_lote()
-- ==============================================================================

CREATE OR REPLACE FUNCTION public.recuperar_eventos_lote(p_lote_id uuid)
RETURNS TABLE(eventos_criados integer, fotos_replicadas integer, etapas_geradas text[])
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path TO 'public'
AS $function$
DECLARE
  v_lote RECORD;
  v_eventos_criados integer := 0;
  v_fotos_replicadas integer := 0;
  v_etapas_geradas text[] := ARRAY[]::text[];
  v_evento_final RECORD;
  v_etapa integer;
  v_data_estimada timestamp with time zone;
  v_peso_estimado numeric;
  v_caixa_estimada integer;
  v_fotos_entrega jsonb;
  v_manejo_real RECORD;
  v_sessao_real RECORD;
  v_data_etapa_anterior timestamp with time zone;
  v_intervalo_dias integer;
BEGIN
  SELECT * INTO v_lote
  FROM lotes
  WHERE id = p_lote_id AND deleted_at IS NULL;

  IF NOT FOUND THEN
    RAISE EXCEPTION 'Lote % não encontrado', p_lote_id;
  END IF;

  RAISE NOTICE '🔄 Recuperando eventos do lote %', v_lote.codigo;

  -- ETAPA 1: INÍCIO
  IF NOT EXISTS (SELECT 1 FROM lote_eventos WHERE lote_id = p_lote_id AND etapa_numero = 1) THEN
    RAISE NOTICE '📝 Criando evento de início (Etapa 1)...';
    
    SELECT jsonb_agg(DISTINCT ef.foto_url)
    INTO v_fotos_entrega
    FROM entregas e
    JOIN entrega_fotos ef ON e.id = ef.entrega_id
    WHERE e.lote_codigo = v_lote.codigo
      AND e.deleted_at IS NULL
      AND ef.deleted_at IS NULL;

    INSERT INTO lote_eventos (
      lote_id, tipo_evento, etapa_numero, data_evento,
      peso_antes, peso_depois, caixa_origem, caixa_destino,
      latitude, longitude,
      administrador_id, administrador_nome,
      observacoes, fotos_compartilhadas,
      dados_especificos
    ) VALUES (
      p_lote_id, 'inicio', 1, v_lote.data_inicio,
      0, v_lote.peso_inicial, 1, 1,
      v_lote.latitude, v_lote.longitude,
      v_lote.criado_por, v_lote.criado_por_nome,
      'Início do lote - Material orgânico depositado na Caixa 1',
      COALESCE(v_fotos_entrega, '[]'::jsonb),
      jsonb_build_object(
        'peso_residuos', v_lote.peso_inicial / 1.35,
        'peso_cepilho', v_lote.peso_inicial * 0.35 / 1.35,
        'total_voluntarios', (SELECT COUNT(DISTINCT voluntario_id) FROM entregas WHERE lote_codigo = v_lote.codigo AND deleted_at IS NULL),
        'fonte', 'entregas'
      )
    );

    v_eventos_criados := v_eventos_criados + 1;
    v_etapas_geradas := array_append(v_etapas_geradas, 'Etapa 1 - INÍCIO');
  END IF;

  -- ETAPAS 2-7: MANUTENÇÕES
  FOR v_etapa IN 2..7 LOOP
    IF NOT EXISTS (SELECT 1 FROM lote_eventos WHERE lote_id = p_lote_id AND etapa_numero = v_etapa) THEN
      
      -- Buscar data da etapa anterior para calcular intervalo válido
      SELECT data_evento INTO v_data_etapa_anterior
      FROM lote_eventos
      WHERE lote_id = p_lote_id AND etapa_numero = (v_etapa - 1)
      ORDER BY data_evento DESC
      LIMIT 1;

      -- PRIORIDADE 1: Dados reais de manejo_semanal
      SELECT ms.created_at, ms.peso_antes, ms.peso_depois, ms.caixa_origem, ms.caixa_destino,
             ms.foto_url, ms.observacoes, ms.latitude, ms.longitude, ms.user_id, p.full_name
      INTO v_manejo_real
      FROM manejo_semanal ms
      LEFT JOIN profiles p ON p.user_id = ms.user_id
      WHERE ms.lote_id = p_lote_id
        AND ms.caixa_origem = v_etapa - 1
        AND ms.caixa_destino = v_etapa
        AND ms.deleted_at IS NULL
        -- VALIDAÇÃO: deve estar entre 5 e 9 dias após a etapa anterior
        AND ms.created_at >= v_data_etapa_anterior + INTERVAL '5 days'
        AND ms.created_at <= v_data_etapa_anterior + INTERVAL '9 days'
      ORDER BY ms.created_at LIMIT 1;
      
      IF FOUND THEN
        INSERT INTO lote_eventos (
          lote_id, tipo_evento, etapa_numero, data_evento,
          peso_antes, peso_depois, caixa_origem, caixa_destino,
          latitude, longitude, administrador_id, administrador_nome,
          observacoes, fotos_compartilhadas, dados_especificos
        ) VALUES (
          p_lote_id, 'manutencao', v_etapa, v_manejo_real.created_at,
          v_manejo_real.peso_antes, v_manejo_real.peso_depois,
          v_manejo_real.caixa_origem, v_manejo_real.caixa_destino,
          v_manejo_real.latitude, v_manejo_real.longitude,
          v_manejo_real.user_id, COALESCE(v_manejo_real.full_name, 'Sistema'),
          v_manejo_real.observacoes,
          CASE WHEN v_manejo_real.foto_url IS NOT NULL THEN jsonb_build_array(v_manejo_real.foto_url) ELSE '[]'::jsonb END,
          jsonb_build_object(
            'taxa_decaimento', ROUND((v_manejo_real.peso_antes - v_manejo_real.peso_depois) / v_manejo_real.peso_antes, 4),
            'reducao_peso', ROUND(v_manejo_real.peso_antes - v_manejo_real.peso_depois, 2),
            'fonte', 'manejo_semanal'
          )
        );
        v_etapas_geradas := array_append(v_etapas_geradas, format('Etapa %s - REAL (manejo_semanal)', v_etapa));
        v_eventos_criados := v_eventos_criados + 1;
        CONTINUE;
      END IF;

      -- PRIORIDADE 2: Sessão de manutenção no intervalo correto
      SELECT sm.data_sessao, sm.fotos_gerais, sm.observacoes_gerais, sm.latitude, sm.longitude,
             sm.administrador_id, sm.administrador_nome, sm.id
      INTO v_sessao_real
      FROM sessoes_manutencao sm
      WHERE sm.unidade_codigo = v_lote.unidade
        AND sm.deleted_at IS NULL
        -- VALIDAÇÃO: deve estar entre 5 e 9 dias após a etapa anterior
        AND sm.data_sessao >= v_data_etapa_anterior + INTERVAL '5 days'
        AND sm.data_sessao <= v_data_etapa_anterior + INTERVAL '9 days'
      ORDER BY sm.data_sessao LIMIT 1;

      IF FOUND THEN
        v_peso_estimado := ROUND(v_lote.peso_inicial * POWER(0.9635, v_etapa - 1), 2);
        INSERT INTO lote_eventos (
          lote_id, tipo_evento, etapa_numero, data_evento,
          peso_antes, peso_depois, caixa_origem, caixa_destino,
          latitude, longitude, administrador_id, administrador_nome,
          observacoes, fotos_compartilhadas, sessao_manutencao_id, dados_especificos
        ) VALUES (
          p_lote_id, 'manutencao', v_etapa, v_sessao_real.data_sessao,
          ROUND(v_lote.peso_inicial * POWER(0.9635, v_etapa - 2), 2), v_peso_estimado,
          v_etapa - 1, v_etapa,
          v_sessao_real.latitude, v_sessao_real.longitude,
          v_sessao_real.administrador_id, v_sessao_real.administrador_nome,
          COALESCE(v_sessao_real.observacoes_gerais, format('Manutenção semanal - Caixa %s → %s', v_etapa - 1, v_etapa)),
          COALESCE(v_sessao_real.fotos_gerais, '[]'::jsonb),
          v_sessao_real.id,
          jsonb_build_object(
            'taxa_decaimento', 0.0365,
            'reducao_peso', ROUND(v_lote.peso_inicial * POWER(0.9635, v_etapa - 2) * 0.0365, 2),
            'fonte', 'sessoes_manutencao',
            'peso_calculado', true
          )
        );
        v_etapas_geradas := array_append(v_etapas_geradas, format('Etapa %s - REAL (sessoes_manutencao)', v_etapa));
        v_eventos_criados := v_eventos_criados + 1;
        CONTINUE;
      END IF;

      -- PRIORIDADE 3: Estimativa (apenas se não houver dados reais)
      v_data_estimada := v_data_etapa_anterior + INTERVAL '7 days';
      v_peso_estimado := ROUND(v_lote.peso_inicial * POWER(0.9635, v_etapa - 1), 2);
      
      INSERT INTO lote_eventos (
        lote_id, tipo_evento, etapa_numero, data_evento,
        peso_antes, peso_depois, caixa_origem, caixa_destino,
        latitude, longitude, administrador_nome,
        observacoes, fotos_compartilhadas, dados_especificos
      ) VALUES (
        p_lote_id, 'manutencao', v_etapa, v_data_estimada,
        ROUND(v_lote.peso_inicial * POWER(0.9635, v_etapa - 2), 2), v_peso_estimado,
        v_etapa - 1, v_etapa,
        v_lote.latitude, v_lote.longitude, 'Sistema (Estimado)',
        format('Manutenção semanal estimada - Caixa %s → %s', v_etapa - 1, v_etapa),
        '[]'::jsonb,
        jsonb_build_object(
          'estimado', true,
          'taxa_decaimento', 0.0365,
          'observacao', 'Evento criado automaticamente por falta de registro no intervalo de 5-9 dias'
        )
      );
      v_eventos_criados := v_eventos_criados + 1;
      v_etapas_geradas := array_append(v_etapas_geradas, format('Etapa %s - ESTIMADO', v_etapa));
    END IF;
  END LOOP;

  RETURN QUERY SELECT v_eventos_criados, v_fotos_replicadas, v_etapas_geradas;
END;
$function$;

-- ==============================================================================
-- PARTE 3: LIMPEZA DE SESSÕES DUPLICADAS
-- ==============================================================================

DO $$
DECLARE
  v_sessoes_duplicadas UUID[];
  v_sessao_manter UUID;
  v_total_fotos INTEGER;
  v_sessao RECORD;
BEGIN
  RAISE NOTICE '🧹 Iniciando limpeza de sessões duplicadas de 08/10/2025...';

  -- Buscar todas as sessões do dia 08/10/2025
  SELECT ARRAY_AGG(id ORDER BY 
    COALESCE(jsonb_array_length(fotos_gerais), 0) DESC,
    created_at ASC
  )
  INTO v_sessoes_duplicadas
  FROM sessoes_manutencao
  WHERE unidade_codigo = 'CWB001'
    AND DATE(data_sessao) = '2025-10-08'
    AND deleted_at IS NULL;

  IF array_length(v_sessoes_duplicadas, 1) <= 1 THEN
    RAISE NOTICE '✅ Nenhuma duplicação encontrada';
    RETURN;
  END IF;

  -- Primeira sessão = a que tem mais fotos
  v_sessao_manter := v_sessoes_duplicadas[1];

  RAISE NOTICE 'Sessões encontradas: %', array_length(v_sessoes_duplicadas, 1);
  RAISE NOTICE 'Sessão mantida: %', v_sessao_manter;

  -- Atualizar todos os eventos que referenciam as outras sessões
  FOR i IN 2..array_length(v_sessoes_duplicadas, 1) LOOP
    UPDATE lote_eventos
    SET sessao_manutencao_id = v_sessao_manter,
        updated_at = NOW()
    WHERE sessao_manutencao_id = v_sessoes_duplicadas[i];
    
    RAISE NOTICE 'Eventos da sessão % redirecionados para %', v_sessoes_duplicadas[i], v_sessao_manter;
  END LOOP;

  -- Soft delete das sessões duplicadas
  FOR i IN 2..array_length(v_sessoes_duplicadas, 1) LOOP
    UPDATE sessoes_manutencao
    SET deleted_at = NOW()
    WHERE id = v_sessoes_duplicadas[i];
    
    RAISE NOTICE 'Sessão % marcada como deletada', v_sessoes_duplicadas[i];
  END LOOP;

  RAISE NOTICE '✅ Limpeza concluída! % sessões duplicadas removidas', array_length(v_sessoes_duplicadas, 1) - 1;
END $$;

-- ==============================================================================
-- VERIFICAÇÃO FINAL
-- ==============================================================================

DO $$
DECLARE
  v_lote_id UUID;
  v_etapas RECORD;
BEGIN
  RAISE NOTICE '';
  RAISE NOTICE '📊 VERIFICAÇÃO FINAL - Lote CWB001-28082025A953';
  RAISE NOTICE '═══════════════════════════════════════════════════';

  SELECT id INTO v_lote_id FROM lotes WHERE codigo = 'CWB001-28082025A953' LIMIT 1;

  FOR v_etapas IN
    SELECT etapa_numero, data_evento, administrador_nome,
           COALESCE(jsonb_array_length(fotos_compartilhadas), 0) as fotos,
           dados_especificos->>'fonte' as fonte
    FROM lote_eventos
    WHERE lote_id = v_lote_id
    ORDER BY etapa_numero
  LOOP
    RAISE NOTICE 'Etapa %: % | % | % fotos | Fonte: %',
      v_etapas.etapa_numero,
      v_etapas.data_evento,
      v_etapas.administrador_nome,
      v_etapas.fotos,
      COALESCE(v_etapas.fonte, 'N/A');
  END LOOP;

  RAISE NOTICE '═══════════════════════════════════════════════════';
END $$;