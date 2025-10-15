-- ============================================================================
-- CORREÇÃO COMPLETA: Etapas de Lotes = Caixa Atual
-- ============================================================================

-- PASSO 1: Deletar eventos extras (etapa_numero > caixa_atual) para lotes em produção
DELETE FROM lote_eventos
WHERE lote_id IN (
  SELECT id FROM lotes 
  WHERE status = 'em_processamento' 
  AND deleted_at IS NULL
)
AND etapa_numero > (
  SELECT caixa_atual FROM lotes WHERE lotes.id = lote_eventos.lote_id
);

-- PASSO 2: Criar eventos faltantes com dados reais

-- CWB001-09102025A379 (Caixa 2) - Criar Etapa 2 se necessário
DO $$
DECLARE
  v_lote_id uuid;
  v_peso_inicial numeric;
  v_data_etapa1 timestamp with time zone;
  v_fotos_manejo jsonb;
BEGIN
  SELECT id, peso_inicial INTO v_lote_id, v_peso_inicial
  FROM lotes WHERE codigo = 'CWB001-09102025A379';
  
  IF v_lote_id IS NULL THEN
    RAISE NOTICE '⚠️ Lote CWB001-09102025A379 não encontrado';
    RETURN;
  END IF;
  
  SELECT data_evento INTO v_data_etapa1
  FROM lote_eventos 
  WHERE lote_id = v_lote_id AND etapa_numero = 1;
  
  SELECT jsonb_agg(DISTINCT foto_url) INTO v_fotos_manejo
  FROM lote_fotos
  WHERE lote_id = v_lote_id AND tipo_foto = 'manejo_semanal'
  AND created_at BETWEEN v_data_etapa1 + INTERVAL '5 days' AND v_data_etapa1 + INTERVAL '9 days'
  AND deleted_at IS NULL;
  
  IF NOT EXISTS (SELECT 1 FROM lote_eventos WHERE lote_id = v_lote_id AND etapa_numero = 2) THEN
    INSERT INTO lote_eventos (
      lote_id, tipo_evento, etapa_numero, data_evento,
      peso_antes, peso_depois, caixa_origem, caixa_destino,
      administrador_nome, observacoes, fotos_compartilhadas, dados_especificos
    ) VALUES (
      v_lote_id, 'manutencao', 2, v_data_etapa1 + INTERVAL '7 days',
      v_peso_inicial, ROUND(v_peso_inicial * 0.9635, 2), 1, 2,
      'Sistema (Estimado)', 'Manutenção semanal - Caixa 1 → 2',
      COALESCE(v_fotos_manejo, '[]'::jsonb),
      jsonb_build_object('estimado', true, 'taxa_decaimento', 0.0365)
    );
    RAISE NOTICE '✅ Etapa 2 criada para CWB001-09102025A379';
  END IF;
END $$;

-- CWB001-02102025A719 (Caixa 3) - Criar Etapas 2 e 3 se necessário
DO $$
DECLARE
  v_lote_id uuid;
  v_peso_inicial numeric;
  v_data_base timestamp with time zone;
  v_fotos jsonb;
BEGIN
  SELECT id, peso_inicial INTO v_lote_id, v_peso_inicial
  FROM lotes WHERE codigo = 'CWB001-02102025A719';
  
  IF v_lote_id IS NULL THEN RETURN; END IF;
  
  -- Etapa 2
  IF NOT EXISTS (SELECT 1 FROM lote_eventos WHERE lote_id = v_lote_id AND etapa_numero = 2) THEN
    SELECT data_evento INTO v_data_base FROM lote_eventos WHERE lote_id = v_lote_id AND etapa_numero = 1;
    SELECT jsonb_agg(DISTINCT foto_url) INTO v_fotos FROM lote_fotos
    WHERE lote_id = v_lote_id AND tipo_foto = 'manejo_semanal'
    AND created_at BETWEEN v_data_base + INTERVAL '5 days' AND v_data_base + INTERVAL '9 days' AND deleted_at IS NULL;
    
    INSERT INTO lote_eventos (lote_id, tipo_evento, etapa_numero, data_evento, peso_antes, peso_depois, caixa_origem, caixa_destino, administrador_nome, observacoes, fotos_compartilhadas, dados_especificos)
    VALUES (v_lote_id, 'manutencao', 2, v_data_base + INTERVAL '7 days', v_peso_inicial, ROUND(v_peso_inicial * 0.9635, 2), 1, 2, 'Sistema (Estimado)', 'Manutenção semanal - Caixa 1 → 2', COALESCE(v_fotos, '[]'::jsonb), jsonb_build_object('estimado', true, 'taxa_decaimento', 0.0365));
    RAISE NOTICE '✅ Etapa 2 criada para CWB001-02102025A719';
  END IF;
  
  -- Etapa 3
  IF NOT EXISTS (SELECT 1 FROM lote_eventos WHERE lote_id = v_lote_id AND etapa_numero = 3) THEN
    SELECT data_evento INTO v_data_base FROM lote_eventos WHERE lote_id = v_lote_id AND etapa_numero = 2;
    SELECT jsonb_agg(DISTINCT foto_url) INTO v_fotos FROM lote_fotos
    WHERE lote_id = v_lote_id AND tipo_foto = 'manejo_semanal'
    AND created_at BETWEEN v_data_base + INTERVAL '5 days' AND v_data_base + INTERVAL '9 days' AND deleted_at IS NULL;
    
    INSERT INTO lote_eventos (lote_id, tipo_evento, etapa_numero, data_evento, peso_antes, peso_depois, caixa_origem, caixa_destino, administrador_nome, observacoes, fotos_compartilhadas, dados_especificos)
    VALUES (v_lote_id, 'manutencao', 3, v_data_base + INTERVAL '7 days', ROUND(v_peso_inicial * 0.9635, 2), ROUND(v_peso_inicial * POWER(0.9635, 2), 2), 2, 3, 'Sistema (Estimado)', 'Manutenção semanal - Caixa 2 → 3', COALESCE(v_fotos, '[]'::jsonb), jsonb_build_object('estimado', true, 'taxa_decaimento', 0.0365));
    RAISE NOTICE '✅ Etapa 3 criada para CWB001-02102025A719';
  END IF;
END $$;

-- CWB001-04092025A730 (Caixa 7) - Criar Etapas faltantes
DO $$
DECLARE
  v_lote_id uuid;
  v_peso_inicial numeric;
  v_data_base timestamp with time zone;
  v_fotos jsonb;
  v_etapa int;
BEGIN
  SELECT id, peso_inicial INTO v_lote_id, v_peso_inicial FROM lotes WHERE codigo = 'CWB001-04092025A730';
  IF v_lote_id IS NULL THEN RETURN; END IF;
  
  FOR v_etapa IN 2..7 LOOP
    IF NOT EXISTS (SELECT 1 FROM lote_eventos WHERE lote_id = v_lote_id AND etapa_numero = v_etapa) THEN
      SELECT data_evento INTO v_data_base FROM lote_eventos WHERE lote_id = v_lote_id AND etapa_numero = v_etapa - 1 ORDER BY data_evento DESC LIMIT 1;
      SELECT jsonb_agg(DISTINCT foto_url) INTO v_fotos FROM lote_fotos
      WHERE lote_id = v_lote_id AND tipo_foto = 'manejo_semanal'
      AND created_at BETWEEN v_data_base + INTERVAL '5 days' AND v_data_base + INTERVAL '9 days' AND deleted_at IS NULL;
      
      INSERT INTO lote_eventos (lote_id, tipo_evento, etapa_numero, data_evento, peso_antes, peso_depois, caixa_origem, caixa_destino, administrador_nome, observacoes, fotos_compartilhadas, dados_especificos)
      VALUES (v_lote_id, 'manutencao', v_etapa, v_data_base + INTERVAL '7 days',
        ROUND(v_peso_inicial * POWER(0.9635, v_etapa - 2), 2), ROUND(v_peso_inicial * POWER(0.9635, v_etapa - 1), 2),
        v_etapa - 1, v_etapa, 'Sistema (Estimado)', 
        format('Manutenção semanal - Caixa %s → %s', v_etapa - 1, v_etapa),
        COALESCE(v_fotos, '[]'::jsonb), jsonb_build_object('estimado', true, 'taxa_decaimento', 0.0365));
      RAISE NOTICE '✅ Etapa % criada para CWB001-04092025A730', v_etapa;
    END IF;
  END LOOP;
END $$;

-- PASSO 3: Associar fotos reais aos eventos existentes
UPDATE lote_eventos e SET fotos_compartilhadas = (
  SELECT jsonb_agg(DISTINCT lf.foto_url) FROM lote_fotos lf
  WHERE lf.lote_id = e.lote_id AND lf.tipo_foto = 'manejo_semanal' AND lf.deleted_at IS NULL
  AND lf.created_at BETWEEN e.data_evento - INTERVAL '2 days' AND e.data_evento + INTERVAL '2 days'
)
WHERE e.tipo_evento IN ('manutencao', 'finalizacao') AND e.deleted_at IS NULL
AND EXISTS (SELECT 1 FROM lote_fotos lf WHERE lf.lote_id = e.lote_id AND lf.tipo_foto = 'manejo_semanal' AND lf.deleted_at IS NULL
  AND lf.created_at BETWEEN e.data_evento - INTERVAL '2 days' AND e.data_evento + INTERVAL '2 days');