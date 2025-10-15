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

-- CWB001-02102025A719 (Caixa 3) - Criar Etapa 2 se necessário
DO $$
DECLARE
  v_lote_id uuid;
  v_peso_inicial numeric;
  v_data_etapa1 timestamp with time zone;
  v_fotos_manejo jsonb;
BEGIN
  SELECT id, peso_inicial INTO v_lote_id, v_peso_inicial
  FROM lotes WHERE codigo = 'CWB001-02102025A719';
  
  IF v_lote_id IS NOT NULL THEN
    SELECT data_evento INTO v_data_etapa1
    FROM lote_eventos 
    WHERE lote_id = v_lote_id AND etapa_numero = 1;
    
    IF v_data_etapa1 IS NOT NULL THEN
      SELECT jsonb_agg(DISTINCT foto_url) INTO v_fotos_manejo
      FROM lote_fotos
      WHERE lote_id = v_lote_id
      AND tipo_foto = 'manejo_semanal'
      AND created_at BETWEEN v_data_etapa1 + INTERVAL '5 days' 
                         AND v_data_etapa1 + INTERVAL '9 days'
      AND deleted_at IS NULL;
      
      IF NOT EXISTS (SELECT 1 FROM lote_eventos WHERE lote_id = v_lote_id AND etapa_numero = 2) THEN
        INSERT INTO lote_eventos (
          lote_id, tipo_evento, etapa_numero, data_evento,
          peso_antes, peso_depois, caixa_origem, caixa_destino,
          administrador_nome, observacoes, fotos_compartilhadas,
          dados_especificos
        ) VALUES (
          v_lote_id, 'manutencao', 2, v_data_etapa1 + INTERVAL '7 days',
          v_peso_inicial, ROUND(v_peso_inicial * 0.9635, 2), 1, 2,
          'Sistema (Estimado)', 
          'Manutenção semanal - Caixa 1 → 2',
          COALESCE(v_fotos_manejo, '[]'::jsonb),
          jsonb_build_object('estimado', true, 'taxa_decaimento', 0.0365)
        );
        RAISE NOTICE '✅ Etapa 2 criada para CWB001-02102025A719';
      END IF;
    END IF;
  END IF;
END $$;

-- CWB001-04092025A730 (Caixa 7) - Criar Etapas 5 e 6 se necessário
DO $$
DECLARE
  v_lote_id uuid;
  v_peso_inicial numeric;
  v_data_etapa4 timestamp with time zone;
  v_fotos_etapa5 jsonb;
  v_fotos_etapa6 jsonb;
BEGIN
  SELECT id, peso_inicial INTO v_lote_id, v_peso_inicial
  FROM lotes WHERE codigo = 'CWB001-04092025A730';
  
  IF v_lote_id IS NOT NULL THEN
    SELECT data_evento INTO v_data_etapa4
    FROM lote_eventos 
    WHERE lote_id = v_lote_id AND etapa_numero = 4
    ORDER BY data_evento DESC LIMIT 1;
    
    IF v_data_etapa4 IS NOT NULL THEN
      -- Buscar fotos para Etapa 5
      SELECT jsonb_agg(DISTINCT foto_url) INTO v_fotos_etapa5
      FROM lote_fotos
      WHERE lote_id = v_lote_id
      AND tipo_foto = 'manejo_semanal'
      AND created_at BETWEEN v_data_etapa4 + INTERVAL '5 days' 
                         AND v_data_etapa4 + INTERVAL '9 days'
      AND deleted_at IS NULL;
      
      -- Criar Etapa 5 se não existir
      IF NOT EXISTS (SELECT 1 FROM lote_eventos WHERE lote_id = v_lote_id AND etapa_numero = 5) THEN
        INSERT INTO lote_eventos (
          lote_id, tipo_evento, etapa_numero, data_evento,
          peso_antes, peso_depois, caixa_origem, caixa_destino,
          administrador_nome, observacoes, fotos_compartilhadas,
          dados_especificos
        ) VALUES (
          v_lote_id, 'manutencao', 5, v_data_etapa4 + INTERVAL '7 days',
          ROUND(v_peso_inicial * POWER(0.9635, 3), 2),
          ROUND(v_peso_inicial * POWER(0.9635, 4), 2),
          4, 5,
          'Sistema (Estimado)', 
          'Manutenção semanal - Caixa 4 → 5',
          COALESCE(v_fotos_etapa5, '[]'::jsonb),
          jsonb_build_object('estimado', true, 'taxa_decaimento', 0.0365)
        );
        RAISE NOTICE '✅ Etapa 5 criada para CWB001-04092025A730';
      END IF;
      
      -- Buscar fotos para Etapa 6
      SELECT jsonb_agg(DISTINCT foto_url) INTO v_fotos_etapa6
      FROM lote_fotos
      WHERE lote_id = v_lote_id
      AND tipo_foto = 'manejo_semanal'
      AND created_at BETWEEN v_data_etapa4 + INTERVAL '12 days' 
                         AND v_data_etapa4 + INTERVAL '16 days'
      AND deleted_at IS NULL;
      
      -- Criar Etapa 6 se não existir
      IF NOT EXISTS (SELECT 1 FROM lote_eventos WHERE lote_id = v_lote_id AND etapa_numero = 6) THEN
        INSERT INTO lote_eventos (
          lote_id, tipo_evento, etapa_numero, data_evento,
          peso_antes, peso_depois, caixa_origem, caixa_destino,
          administrador_nome, observacoes, fotos_compartilhadas,
          dados_especificos
        ) VALUES (
          v_lote_id, 'manutencao', 6, v_data_etapa4 + INTERVAL '14 days',
          ROUND(v_peso_inicial * POWER(0.9635, 4), 2),
          ROUND(v_peso_inicial * POWER(0.9635, 5), 2),
          5, 6,
          'Sistema (Estimado)', 
          'Manutenção semanal - Caixa 5 → 6',
          COALESCE(v_fotos_etapa6, '[]'::jsonb),
          jsonb_build_object('estimado', true, 'taxa_decaimento', 0.0365)
        );
        RAISE NOTICE '✅ Etapa 6 criada para CWB001-04092025A730';
      END IF;
    END IF;
  END IF;
END $$;

-- PASSO 3: Associar fotos reais aos eventos existentes
UPDATE lote_eventos e
SET fotos_compartilhadas = (
  SELECT jsonb_agg(DISTINCT lf.foto_url)
  FROM lote_fotos lf
  WHERE lf.lote_id = e.lote_id
  AND lf.tipo_foto = 'manejo_semanal'
  AND lf.deleted_at IS NULL
  AND lf.created_at BETWEEN e.data_evento - INTERVAL '2 days' 
                        AND e.data_evento + INTERVAL '2 days'
)
WHERE e.tipo_evento IN ('manutencao', 'finalizacao')
AND e.deleted_at IS NULL
AND EXISTS (
  SELECT 1 FROM lote_fotos lf
  WHERE lf.lote_id = e.lote_id
  AND lf.tipo_foto = 'manejo_semanal'
  AND lf.deleted_at IS NULL
  AND lf.created_at BETWEEN e.data_evento - INTERVAL '2 days' 
                        AND e.data_evento + INTERVAL '2 days'
);

-- PASSO 4: Relatório final de validação
DO $$
DECLARE
  rec RECORD;
BEGIN
  RAISE NOTICE '============================================';
  RAISE NOTICE '📊 RELATÓRIO DE VALIDAÇÃO FINAL';
  RAISE NOTICE '============================================';
  
  FOR rec IN 
    SELECT 
      l.codigo,
      l.caixa_atual,
      l.status,
      COUNT(le.id) as total_etapas
    FROM lotes l
    LEFT JOIN lote_eventos le ON l.id = le.lote_id AND le.deleted_at IS NULL
    WHERE l.status = 'em_processamento'
    AND l.deleted_at IS NULL
    GROUP BY l.id, l.codigo, l.caixa_atual, l.status
    ORDER BY l.caixa_atual
  LOOP
    IF rec.caixa_atual = rec.total_etapas THEN
      RAISE NOTICE '✅ % - Caixa % - Etapas: % (CORRETO)', rec.codigo, rec.caixa_atual, rec.total_etapas;
    ELSE
      RAISE NOTICE '⚠️ % - Caixa % - Etapas: % (INCORRETO)', rec.codigo, rec.caixa_atual, rec.total_etapas;
    END IF;
  END LOOP;
  
  RAISE NOTICE '============================================';
END $$;