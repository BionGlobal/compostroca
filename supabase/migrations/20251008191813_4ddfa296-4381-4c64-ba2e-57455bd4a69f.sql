-- =============================================
-- FASE 1: Melhorar Trigger de Evento de Início
-- =============================================

CREATE OR REPLACE FUNCTION public.gerar_evento_inicio_lote()
RETURNS TRIGGER
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  entregas_data JSONB;
  fotos_iniciais JSONB;
  v_evento_id UUID;
BEGIN
  RAISE NOTICE '[TRIGGER] gerar_evento_inicio_lote disparado para lote: %', NEW.codigo;
  
  -- Verificar se já existe evento de início
  IF EXISTS (SELECT 1 FROM lote_eventos WHERE lote_id = NEW.id AND etapa_numero = 1) THEN
    RAISE NOTICE '[TRIGGER] Evento de início já existe para lote %', NEW.codigo;
    RETURN NEW;
  END IF;

  RAISE NOTICE '[TRIGGER] Criando evento de início para lote %', NEW.codigo;

  -- Buscar dados das entregas
  SELECT jsonb_agg(
    jsonb_build_object(
      'voluntario_id', e.voluntario_id,
      'voluntario_nome', v.nome,
      'numero_balde', v.numero_balde,
      'peso', e.peso,
      'qualidade', e.qualidade_residuo,
      'data', e.created_at
    )
  ) INTO entregas_data
  FROM entregas e
  LEFT JOIN voluntarios v ON e.voluntario_id = v.id
  WHERE e.lote_codigo = NEW.codigo
    AND e.deleted_at IS NULL;

  -- Buscar fotos iniciais (das entregas)
  SELECT jsonb_agg(DISTINCT ef.foto_url)
  INTO fotos_iniciais
  FROM entregas e
  JOIN entrega_fotos ef ON e.id = ef.entrega_id
  WHERE e.lote_codigo = NEW.codigo
    AND e.deleted_at IS NULL
    AND ef.deleted_at IS NULL;

  RAISE NOTICE '[TRIGGER] Entregas encontradas: %, Fotos: %', 
    COALESCE(jsonb_array_length(entregas_data), 0),
    COALESCE(jsonb_array_length(fotos_iniciais), 0);

  -- Criar evento de início
  INSERT INTO lote_eventos (
    lote_id, tipo_evento, etapa_numero, data_evento,
    peso_antes, peso_depois, caixa_origem, caixa_destino,
    latitude, longitude, administrador_id, administrador_nome,
    observacoes, fotos_compartilhadas, dados_especificos
  )
  VALUES (
    NEW.id,
    'inicio',
    1,
    NEW.data_inicio,
    0,
    NEW.peso_inicial,
    1, 1,
    NEW.latitude, NEW.longitude,
    NEW.criado_por, NEW.criado_por_nome,
    'Início do lote - Material orgânico depositado na Caixa 1',
    COALESCE(fotos_iniciais, '[]'::jsonb),
    jsonb_build_object(
      'entregas', COALESCE(entregas_data, '[]'::jsonb),
      'peso_residuos', COALESCE((
        SELECT SUM(peso) FROM entregas 
        WHERE lote_codigo = NEW.codigo AND deleted_at IS NULL
      ), 0),
      'peso_cepilho', NEW.peso_inicial * 0.35 / 1.35,
      'total_voluntarios', COALESCE((
        SELECT COUNT(DISTINCT voluntario_id) FROM entregas 
        WHERE lote_codigo = NEW.codigo AND deleted_at IS NULL
      ), 0)
    )
  )
  RETURNING id INTO v_evento_id;

  RAISE NOTICE '[TRIGGER] Evento de início criado com sucesso! ID: %', v_evento_id;
  
  RETURN NEW;
EXCEPTION
  WHEN OTHERS THEN
    RAISE WARNING '[TRIGGER] Erro ao criar evento de início para lote %: % - %', NEW.codigo, SQLERRM, SQLSTATE;
    RETURN NEW;
END;
$$;

-- =============================================
-- FASE 2: Função para Recuperar Eventos Faltantes
-- =============================================

CREATE OR REPLACE FUNCTION public.recuperar_eventos_lote(p_lote_id uuid)
RETURNS TABLE(
  eventos_criados integer,
  fotos_replicadas integer,
  etapas_geradas text[]
)
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
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
BEGIN
  -- Buscar dados do lote
  SELECT * INTO v_lote
  FROM lotes
  WHERE id = p_lote_id AND deleted_at IS NULL;

  IF NOT FOUND THEN
    RAISE EXCEPTION 'Lote % não encontrado', p_lote_id;
  END IF;

  RAISE NOTICE '🔄 Recuperando eventos do lote %', v_lote.codigo;

  -- ===== ETAPA 1: CRIAR EVENTO DE INÍCIO SE NÃO EXISTIR =====
  IF NOT EXISTS (SELECT 1 FROM lote_eventos WHERE lote_id = p_lote_id AND etapa_numero = 1) THEN
    RAISE NOTICE '📝 Criando evento de início (Etapa 1)...';
    
    -- Buscar fotos das entregas
    SELECT jsonb_agg(DISTINCT ef.foto_url)
    INTO v_fotos_entrega
    FROM entregas e
    JOIN entrega_fotos ef ON e.id = ef.entrega_id
    WHERE e.lote_codigo = v_lote.codigo
      AND e.deleted_at IS NULL
      AND ef.deleted_at IS NULL;

    -- Criar evento de início
    INSERT INTO lote_eventos (
      lote_id, tipo_evento, etapa_numero, data_evento,
      peso_antes, peso_depois, caixa_origem, caixa_destino,
      latitude, longitude,
      administrador_id, administrador_nome,
      observacoes, fotos_compartilhadas,
      dados_especificos
    ) VALUES (
      p_lote_id,
      'inicio',
      1,
      v_lote.data_inicio,
      0,
      v_lote.peso_inicial,
      1, 1,
      v_lote.latitude, v_lote.longitude,
      v_lote.criado_por, v_lote.criado_por_nome,
      'Início do lote - Material orgânico depositado na Caixa 1',
      COALESCE(v_fotos_entrega, '[]'::jsonb),
      jsonb_build_object(
        'peso_residuos', v_lote.peso_inicial / 1.35,
        'peso_cepilho', v_lote.peso_inicial * 0.35 / 1.35,
        'total_voluntarios', (
          SELECT COUNT(DISTINCT voluntario_id) 
          FROM entregas 
          WHERE lote_codigo = v_lote.codigo AND deleted_at IS NULL
        )
      )
    );

    v_eventos_criados := v_eventos_criados + 1;
    v_etapas_geradas := array_append(v_etapas_geradas, 'Etapa 1 - INÍCIO');
    RAISE NOTICE '✅ Evento de início criado com % fotos', COALESCE(jsonb_array_length(v_fotos_entrega), 0);
  END IF;

  -- ===== ETAPAS 2-7: CRIAR EVENTOS INTERMEDIÁRIOS FALTANTES =====
  FOR v_etapa IN 2..7 LOOP
    IF NOT EXISTS (SELECT 1 FROM lote_eventos WHERE lote_id = p_lote_id AND etapa_numero = v_etapa) THEN
      RAISE NOTICE '📝 Criando evento estimado (Etapa %)...', v_etapa;
      
      v_data_estimada := v_lote.data_inicio + ((v_etapa - 1) * INTERVAL '7 days');
      v_peso_estimado := ROUND(v_lote.peso_inicial * POWER(0.9635, v_etapa - 1), 2);
      v_caixa_estimada := v_etapa;
      
      INSERT INTO lote_eventos (
        lote_id, tipo_evento, etapa_numero, data_evento,
        peso_antes, peso_depois,
        caixa_origem, caixa_destino,
        latitude, longitude,
        administrador_nome,
        observacoes,
        fotos_compartilhadas,
        dados_especificos
      ) VALUES (
        p_lote_id,
        'manutencao',
        v_etapa,
        v_data_estimada,
        ROUND(v_lote.peso_inicial * POWER(0.9635, v_etapa - 2), 2),
        v_peso_estimado,
        v_caixa_estimada - 1,
        v_caixa_estimada,
        v_lote.latitude, v_lote.longitude,
        'Sistema (Estimado)',
        format('Manutenção semanal estimada - Caixa %s → %s', v_caixa_estimada - 1, v_caixa_estimada),
        '[]'::jsonb,
        jsonb_build_object(
          'estimado', true,
          'taxa_decaimento', 0.0365,
          'observacao', 'Evento criado automaticamente por falta de registro'
        )
      );

      v_eventos_criados := v_eventos_criados + 1;
      v_etapas_geradas := array_append(v_etapas_geradas, format('Etapa %s - MANUTENÇÃO (estimado)', v_etapa));
    END IF;
  END LOOP;

  -- ===== ETAPA 8: VERIFICAR/CORRIGIR EVENTO DE FINALIZAÇÃO =====
  SELECT * INTO v_evento_final
  FROM lote_eventos
  WHERE lote_id = p_lote_id AND etapa_numero = 8
  LIMIT 1;

  IF FOUND THEN
    IF v_evento_final.fotos_compartilhadas IS NULL 
       OR jsonb_array_length(v_evento_final.fotos_compartilhadas) = 0 THEN
      
      IF v_evento_final.sessao_manutencao_id IS NOT NULL THEN
        DECLARE
          v_sessao_fotos jsonb;
        BEGIN
          SELECT fotos_gerais INTO v_sessao_fotos
          FROM sessoes_manutencao
          WHERE id = v_evento_final.sessao_manutencao_id;

          IF v_sessao_fotos IS NOT NULL AND jsonb_array_length(v_sessao_fotos) > 0 THEN
            UPDATE lote_eventos
            SET fotos_compartilhadas = v_sessao_fotos
            WHERE id = v_evento_final.id;
            
            RAISE NOTICE '📸 Fotos da sessão associadas ao evento de finalização';
          END IF;
        END;
      END IF;
    END IF;
  END IF;

  RAISE NOTICE '✅ Recuperação concluída: % eventos criados', v_eventos_criados;

  RETURN QUERY SELECT v_eventos_criados, v_fotos_replicadas, v_etapas_geradas;
END;
$$;

-- =============================================
-- FASE 3: Recuperar Lote CWB001-21082025A344
-- =============================================

DO $$
DECLARE
  v_lote_id uuid;
  v_resultado RECORD;
BEGIN
  SELECT id INTO v_lote_id
  FROM lotes
  WHERE codigo_unico = 'CWB001-21082025A344'
    AND deleted_at IS NULL;

  IF FOUND THEN
    RAISE NOTICE '🔧 Recuperando dados do lote CWB001-21082025A344...';
    
    SELECT * INTO v_resultado
    FROM recuperar_eventos_lote(v_lote_id);
    
    RAISE NOTICE '✅ Lote recuperado: % eventos criados', v_resultado.eventos_criados;
    RAISE NOTICE '📋 Etapas geradas: %', array_to_string(v_resultado.etapas_geradas, ', ');
  ELSE
    RAISE WARNING '⚠️ Lote CWB001-21082025A344 não encontrado';
  END IF;
END;
$$;