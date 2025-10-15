-- ============================================================================
-- PARTE 1: CORREÇÃO IMEDIATA - Restaurar dados reais das Etapas 2-7
-- Lote: CWB001-28082025A953
-- ============================================================================

-- 1.1 - Restaurar Etapa 2 (03/09/2025 - Maurício)
UPDATE lote_eventos
SET 
  data_evento = '2025-09-03 16:43:41.327671+00',
  administrador_nome = 'Maurício Neves Gikoski',
  administrador_id = '04c8f530-e3c1-4f52-abf9-d12448c9759b',
  sessao_manutencao_id = NULL,
  peso_antes = 123.69,
  peso_depois = 119.79,
  caixa_origem = 1,
  caixa_destino = 2,
  observacoes = 'TRANSFERÊNCIA 1→2 - O composto orgânico produzido na caixa 7 nesta semana, será destinado para produção de morango da Fazenda Urbana do CIC.',
  fotos_compartilhadas = jsonb_build_array(
    'https://yfcxdbhrtjdmwyifgptf.supabase.co/storage/v1/object/public/manejo-fotos/04c8f530-e3c1-4f52-abf9-d12448c9759b/manejo-1756917812412-0.jpg'
  ),
  latitude = -25.4404681,
  longitude = -49.2231962,
  dados_especificos = jsonb_build_object(
    'fonte', 'manejo_semanal',
    'manejo_id', '62162121-558a-42a1-866b-a62ef37b7690',
    'taxa_decaimento', 0.0314,
    'reducao_peso', 3.90
  ),
  updated_at = NOW()
WHERE lote_eventos.id = (
  SELECT le.id FROM lote_eventos le
  JOIN lotes l ON l.id = le.lote_id
  WHERE l.codigo = 'CWB001-28082025A953'
    AND le.etapa_numero = 2
  LIMIT 1
);

-- 1.2 - Restaurar Etapa 3 (10/09/2025 - Maurício)
UPDATE lote_eventos
SET 
  data_evento = '2025-09-10 14:19:38.143237+00',
  administrador_nome = 'Maurício Neves Gikoski',
  administrador_id = '04c8f530-e3c1-4f52-abf9-d12448c9759b',
  sessao_manutencao_id = NULL,
  peso_antes = 119.79,
  peso_depois = 116.02,
  caixa_origem = 2,
  caixa_destino = 3,
  observacoes = 'TRANSFERÊNCIA 2→3 - Foi feito o manejo das caixas e ainda não foi distribuído o composto orgânico da caixa 7.',
  fotos_compartilhadas = jsonb_build_array(
    'https://yfcxdbhrtjdmwyifgptf.supabase.co/storage/v1/object/public/manejo-fotos/04c8f530-e3c1-4f52-abf9-d12448c9759b/manejo-1757513974043-1.jpg'
  ),
  latitude = -25.4404581,
  longitude = -49.2231773,
  dados_especificos = jsonb_build_object(
    'fonte', 'manejo_semanal',
    'manejo_id', '4978e4e9-9a36-445c-b436-6b9ff46ce67d',
    'taxa_decaimento', 0.0315,
    'reducao_peso', 3.77
  ),
  updated_at = NOW()
WHERE lote_eventos.id = (
  SELECT le.id FROM lote_eventos le
  JOIN lotes l ON l.id = le.lote_id
  WHERE l.codigo = 'CWB001-28082025A953'
    AND le.etapa_numero = 3
  LIMIT 1
);

-- 1.3 - Restaurar Etapa 4 (17/09/2025 - Guilherme)
UPDATE lote_eventos
SET 
  data_evento = '2025-09-17 19:59:12.416025+00',
  administrador_nome = 'Guilherme Corrêa Móres',
  administrador_id = '6c8b9239-eb82-4d86-a4db-11bbbf751f62',
  sessao_manutencao_id = NULL,
  peso_antes = 116.02,
  peso_depois = 112.36,
  caixa_origem = 3,
  caixa_destino = 4,
  observacoes = 'TRANSFERÊNCIA 3→4 - O Validador Guilherme enviou as fotos para a Bion, pois não consegue acessar o sistema via iOS (iPhone). A ação foi registrada no app Connecteam.',
  fotos_compartilhadas = jsonb_build_array(
    'https://yfcxdbhrtjdmwyifgptf.supabase.co/storage/v1/object/public/manejo-fotos/6c8b9239-eb82-4d86-a4db-11bbbf751f62/manejo-1758139146542-2.jpg'
  ),
  latitude = 38.965032,
  longitude = -9.415209,
  dados_especificos = jsonb_build_object(
    'fonte', 'manejo_semanal',
    'manejo_id', '5b1d9881-8fb8-4ea6-9b73-652c9ba08a26',
    'taxa_decaimento', 0.0316,
    'reducao_peso', 3.66,
    'nota', 'Registrado via iOS (foto enviada por WhatsApp)'
  ),
  updated_at = NOW()
WHERE lote_eventos.id = (
  SELECT le.id FROM lote_eventos le
  JOIN lotes l ON l.id = le.lote_id
  WHERE l.codigo = 'CWB001-28082025A953'
    AND le.etapa_numero = 4
  LIMIT 1
);

-- 1.4 - Restaurar Etapa 5 (26/09/2025 - Maurício)
UPDATE lote_eventos
SET 
  data_evento = '2025-09-26 11:19:14.638993+00',
  administrador_nome = 'Maurício Neves Gikoski',
  administrador_id = '04c8f530-e3c1-4f52-abf9-d12448c9759b',
  sessao_manutencao_id = NULL,
  peso_antes = 112.36,
  peso_depois = 108.82,
  caixa_origem = 4,
  caixa_destino = 5,
  observacoes = 'TRANSFERÊNCIA 4→5 - Manejo das caixas',
  fotos_compartilhadas = jsonb_build_array(
    'https://yfcxdbhrtjdmwyifgptf.supabase.co/storage/v1/object/public/manejo-fotos/04c8f530-e3c1-4f52-abf9-d12448c9759b/manejo-1758885552566-2.jpg'
  ),
  latitude = -25.4404572,
  longitude = -49.2232027,
  dados_especificos = jsonb_build_object(
    'fonte', 'manejo_semanal',
    'manejo_id', '060ffd3c-d3f8-4c3b-b6dd-3ca5c070d051',
    'taxa_decaimento', 0.0315,
    'reducao_peso', 3.54
  ),
  updated_at = NOW()
WHERE lote_eventos.id = (
  SELECT le.id FROM lote_eventos le
  JOIN lotes l ON l.id = le.lote_id
  WHERE l.codigo = 'CWB001-28082025A953'
    AND le.etapa_numero = 5
  LIMIT 1
);

-- 1.5 - Criar Etapa 6 (08/10/2025 - Maurício - 3 fotos)
UPDATE lote_eventos
SET 
  data_evento = '2025-10-08 18:03:03.375+00',
  administrador_nome = 'Maurício Neves Gikoski',
  administrador_id = '04c8f530-e3c1-4f52-abf9-d12448c9759b',
  sessao_manutencao_id = '97c03521-a3bf-462b-84c5-1b70ee0fd2a6',
  peso_antes = 108.82,
  peso_depois = 104.85,
  caixa_origem = 5,
  caixa_destino = 6,
  observacoes = 'TRANSFERÊNCIA 5→6 - Foi feito o manejo das composteiras.',
  fotos_compartilhadas = jsonb_build_array(
    'https://yfcxdbhrtjdmwyifgptf.supabase.co/storage/v1/object/public/manejo-fotos/04c8f530-e3c1-4f52-abf9-d12448c9759b/manejo-1759946580651-0.jpg',
    'https://yfcxdbhrtjdmwyifgptf.supabase.co/storage/v1/object/public/manejo-fotos/04c8f530-e3c1-4f52-abf9-d12448c9759b/manejo-1759946582085-1.jpg',
    'https://yfcxdbhrtjdmwyifgptf.supabase.co/storage/v1/object/public/manejo-fotos/04c8f530-e3c1-4f52-abf9-d12448c9759b/manejo-1759946582753-2.jpg'
  ),
  latitude = -25.4404387,
  longitude = -49.2231985,
  dados_especificos = jsonb_build_object(
    'fonte', 'sessoes_manutencao',
    'sessao_id', '97c03521-a3bf-462b-84c5-1b70ee0fd2a6',
    'taxa_decaimento', 0.0365,
    'reducao_peso', 3.97
  ),
  updated_at = NOW()
WHERE lote_eventos.id = (
  SELECT le.id FROM lote_eventos le
  JOIN lotes l ON l.id = le.lote_id
  WHERE l.codigo = 'CWB001-28082025A953'
    AND le.etapa_numero = 6
  LIMIT 1
);

-- 1.6 - Criar Etapa 7 (08/10/2025 - Maurício - 2 fotos)
UPDATE lote_eventos
SET 
  data_evento = '2025-10-08 18:32:12.187+00',
  administrador_nome = 'Maurício Neves Gikoski',
  administrador_id = '04c8f530-e3c1-4f52-abf9-d12448c9759b',
  sessao_manutencao_id = 'd2d8c686-5e87-4fbf-bbdc-c2c8aa07d940',
  peso_antes = 104.85,
  peso_depois = 101.02,
  caixa_origem = 6,
  caixa_destino = 7,
  observacoes = 'TRANSFERÊNCIA 6→7 - Manejo das composteiras',
  fotos_compartilhadas = jsonb_build_array(
    'https://yfcxdbhrtjdmwyifgptf.supabase.co/storage/v1/object/public/manejo-fotos/04c8f530-e3c1-4f52-abf9-d12448c9759b/manejo-1759948330934-0.jpg',
    'https://yfcxdbhrtjdmwyifgptf.supabase.co/storage/v1/object/public/manejo-fotos/04c8f530-e3c1-4f52-abf9-d12448c9759b/manejo-1759948331658-1.jpg'
  ),
  latitude = -25.4404632,
  longitude = -49.223221,
  dados_especificos = jsonb_build_object(
    'fonte', 'sessoes_manutencao',
    'sessao_id', 'd2d8c686-5e87-4fbf-bbdc-c2c8aa07d940',
    'taxa_decaimento', 0.0365,
    'reducao_peso', 3.83
  ),
  updated_at = NOW()
WHERE lote_eventos.id = (
  SELECT le.id FROM lote_eventos le
  JOIN lotes l ON l.id = le.lote_id
  WHERE l.codigo = 'CWB001-28082025A953'
    AND le.etapa_numero = 7
  LIMIT 1
);

-- ============================================================================
-- PARTE 2: CORREÇÃO ESTRUTURAL - Melhorar recuperar_eventos_lote()
-- ============================================================================

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
BEGIN
  SELECT * INTO v_lote
  FROM lotes
  WHERE id = p_lote_id AND deleted_at IS NULL;

  IF NOT FOUND THEN
    RAISE EXCEPTION 'Lote % não encontrado', p_lote_id;
  END IF;

  RAISE NOTICE '🔄 Recuperando eventos do lote %', v_lote.codigo;

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

  FOR v_etapa IN 2..7 LOOP
    IF NOT EXISTS (SELECT 1 FROM lote_eventos WHERE lote_id = p_lote_id AND etapa_numero = v_etapa) THEN
      SELECT ms.created_at, ms.peso_antes, ms.peso_depois, ms.caixa_origem, ms.caixa_destino,
             ms.foto_url, ms.observacoes, ms.latitude, ms.longitude, ms.user_id, p.full_name
      INTO v_manejo_real
      FROM manejo_semanal ms
      LEFT JOIN profiles p ON p.user_id = ms.user_id
      WHERE ms.lote_id = p_lote_id
        AND ms.caixa_origem = v_etapa - 1
        AND ms.caixa_destino = v_etapa
        AND ms.deleted_at IS NULL
      ORDER BY ms.created_at LIMIT 1;
      
      IF FOUND THEN
        INSERT INTO lote_eventos (lote_id, tipo_evento, etapa_numero, data_evento, peso_antes, peso_depois, caixa_origem, caixa_destino, latitude, longitude, administrador_id, administrador_nome, observacoes, fotos_compartilhadas, dados_especificos)
        VALUES (p_lote_id, 'manutencao', v_etapa, v_manejo_real.created_at, v_manejo_real.peso_antes, v_manejo_real.peso_depois, v_manejo_real.caixa_origem, v_manejo_real.caixa_destino, v_manejo_real.latitude, v_manejo_real.longitude, v_manejo_real.user_id, COALESCE(v_manejo_real.full_name, 'Sistema'), v_manejo_real.observacoes, CASE WHEN v_manejo_real.foto_url IS NOT NULL THEN jsonb_build_array(v_manejo_real.foto_url) ELSE '[]'::jsonb END, jsonb_build_object('taxa_decaimento', ROUND((v_manejo_real.peso_antes - v_manejo_real.peso_depois) / v_manejo_real.peso_antes, 4), 'reducao_peso', ROUND(v_manejo_real.peso_antes - v_manejo_real.peso_depois, 2), 'fonte', 'manejo_semanal'));
        v_etapas_geradas := array_append(v_etapas_geradas, format('Etapa %s - REAL (manejo_semanal)', v_etapa));
        v_eventos_criados := v_eventos_criados + 1;
        CONTINUE;
      END IF;

      SELECT sm.data_sessao, sm.fotos_gerais, sm.observacoes_gerais, sm.latitude, sm.longitude, sm.administrador_id, sm.administrador_nome, sm.id
      INTO v_sessao_real
      FROM sessoes_manutencao sm
      WHERE sm.unidade_codigo = v_lote.unidade
        AND sm.data_sessao >= v_lote.data_inicio + ((v_etapa - 2) * INTERVAL '7 days')
        AND sm.data_sessao < v_lote.data_inicio + ((v_etapa - 1) * INTERVAL '7 days')
        AND sm.deleted_at IS NULL
      ORDER BY sm.data_sessao LIMIT 1;

      IF FOUND THEN
        v_peso_estimado := ROUND(v_lote.peso_inicial * POWER(0.9635, v_etapa - 1), 2);
        INSERT INTO lote_eventos (lote_id, tipo_evento, etapa_numero, data_evento, peso_antes, peso_depois, caixa_origem, caixa_destino, latitude, longitude, administrador_id, administrador_nome, observacoes, fotos_compartilhadas, sessao_manutencao_id, dados_especificos)
        VALUES (p_lote_id, 'manutencao', v_etapa, v_sessao_real.data_sessao, ROUND(v_lote.peso_inicial * POWER(0.9635, v_etapa - 2), 2), v_peso_estimado, v_etapa - 1, v_etapa, v_sessao_real.latitude, v_sessao_real.longitude, v_sessao_real.administrador_id, v_sessao_real.administrador_nome, COALESCE(v_sessao_real.observacoes_gerais, format('Manutenção semanal - Caixa %s → %s', v_etapa - 1, v_etapa)), COALESCE(v_sessao_real.fotos_gerais, '[]'::jsonb), v_sessao_real.id, jsonb_build_object('taxa_decaimento', 0.0365, 'reducao_peso', ROUND(v_lote.peso_inicial * POWER(0.9635, v_etapa - 2) * 0.0365, 2), 'fonte', 'sessoes_manutencao', 'peso_calculado', true));
        v_etapas_geradas := array_append(v_etapas_geradas, format('Etapa %s - REAL (sessoes_manutencao)', v_etapa));
        v_eventos_criados := v_eventos_criados + 1;
        CONTINUE;
      END IF;

      v_data_estimada := v_lote.data_inicio + ((v_etapa - 1) * INTERVAL '7 days');
      v_peso_estimado := ROUND(v_lote.peso_inicial * POWER(0.9635, v_etapa - 1), 2);
      INSERT INTO lote_eventos (lote_id, tipo_evento, etapa_numero, data_evento, peso_antes, peso_depois, caixa_origem, caixa_destino, latitude, longitude, administrador_nome, observacoes, fotos_compartilhadas, dados_especificos)
      VALUES (p_lote_id, 'manutencao', v_etapa, v_data_estimada, ROUND(v_lote.peso_inicial * POWER(0.9635, v_etapa - 2), 2), v_peso_estimado, v_etapa - 1, v_etapa, v_lote.latitude, v_lote.longitude, 'Sistema (Estimado)', format('Manutenção semanal estimada - Caixa %s → %s', v_etapa - 1, v_etapa), '[]'::jsonb, jsonb_build_object('estimado', true, 'taxa_decaimento', 0.0365, 'observacao', 'Evento criado automaticamente por falta de registro'));
      v_eventos_criados := v_eventos_criados + 1;
      v_etapas_geradas := array_append(v_etapas_geradas, format('Etapa %s - ESTIMADO', v_etapa));
    END IF;
  END LOOP;

  RETURN QUERY SELECT v_eventos_criados, v_fotos_replicadas, v_etapas_geradas;
END;
$function$;