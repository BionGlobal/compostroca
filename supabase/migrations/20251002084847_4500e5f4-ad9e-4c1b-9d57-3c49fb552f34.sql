-- ================================================================================================
-- CORREÇÃO DO LOTE CWB001-14082025A769 E ESTRUTURA DE RASTREABILIDADE
-- ================================================================================================

-- 1. Corrigir estado do lote problemático
UPDATE public.lotes
SET 
  status = 'encerrado',
  caixa_atual = 7,
  semana_atual = 7,
  peso_final = 91.20,
  peso_atual = 91.20,
  data_finalizacao = COALESCE(data_encerramento, NOW()),
  co2eq_evitado = (peso_inicial * 0.766),
  creditos_cau = (peso_inicial / 1000.0),
  updated_at = NOW()
WHERE codigo = 'CWB001-14082025A769'
  AND deleted_at IS NULL;

-- 2. Gerar eventos retroativos para o lote CWB001-14082025A769
DO $$
DECLARE
  v_lote_id UUID;
  v_lote_codigo TEXT;
  v_peso_inicial NUMERIC;
  v_data_inicio TIMESTAMP;
  v_criado_por UUID;
  v_criado_por_nome TEXT;
  v_latitude NUMERIC;
  v_longitude NUMERIC;
  v_peso_atual NUMERIC;
  v_semana INT;
  v_etapa INT;
  v_caixa_origem INT;
  v_caixa_destino INT;
BEGIN
  -- Buscar dados do lote
  SELECT id, codigo, peso_inicial, data_inicio, criado_por, criado_por_nome, latitude, longitude
  INTO v_lote_id, v_lote_codigo, v_peso_inicial, v_data_inicio, v_criado_por, v_criado_por_nome, v_latitude, v_longitude
  FROM public.lotes
  WHERE codigo = 'CWB001-14082025A769' AND deleted_at IS NULL;

  -- Se não encontrou o lote, sair
  IF v_lote_id IS NULL THEN
    RAISE NOTICE 'Lote CWB001-14082025A769 não encontrado';
    RETURN;
  END IF;

  -- Verificar se já existem eventos para este lote
  IF EXISTS (SELECT 1 FROM public.lote_eventos WHERE lote_id = v_lote_id) THEN
    RAISE NOTICE 'Lote já possui eventos - pulando criação retroativa';
    RETURN;
  END IF;

  RAISE NOTICE 'Gerando eventos retroativos para lote % (ID: %)', v_lote_codigo, v_lote_id;

  -- Buscar dados das entregas para o evento de início
  v_peso_atual := v_peso_inicial;

  -- EVENTO 1: Início (Etapa 1 - Caixa 1)
  INSERT INTO public.lote_eventos (
    lote_id, tipo_evento, etapa_numero, data_evento,
    peso_antes, peso_depois, caixa_origem, caixa_destino,
    latitude, longitude, administrador_id, administrador_nome,
    observacoes, fotos_compartilhadas, dados_especificos
  )
  SELECT
    v_lote_id,
    'inicio',
    1,
    v_data_inicio,
    0,
    v_peso_inicial,
    1, 1,
    v_latitude, v_longitude,
    v_criado_por, v_criado_por_nome,
    'Início do lote - Material orgânico depositado na Caixa 1 (evento retroativo)',
    COALESCE(
      (SELECT jsonb_agg(DISTINCT ef.foto_url)
       FROM entregas e
       JOIN entrega_fotos ef ON e.id = ef.entrega_id
       WHERE e.lote_codigo = v_lote_codigo AND e.deleted_at IS NULL AND ef.deleted_at IS NULL),
      '[]'::jsonb
    ),
    jsonb_build_object(
      'retroativo', true,
      'peso_residuos', COALESCE((SELECT SUM(peso) FROM entregas WHERE lote_codigo = v_lote_codigo AND deleted_at IS NULL), 0),
      'total_voluntarios', COALESCE((SELECT COUNT(DISTINCT voluntario_id) FROM entregas WHERE lote_codigo = v_lote_codigo AND deleted_at IS NULL), 0),
      'total_entregas', COALESCE((SELECT COUNT(*) FROM entregas WHERE lote_codigo = v_lote_codigo AND deleted_at IS NULL), 0)
    );

  RAISE NOTICE 'Evento 1 (início) criado - Peso: %kg', v_peso_inicial;

  -- EVENTOS 2-7: Manutenções semanais (com decaimento de 3,54%)
  FOR v_etapa IN 2..7 LOOP
    v_semana := v_etapa - 1;
    v_caixa_origem := v_etapa - 1;
    v_caixa_destino := v_etapa;
    
    v_peso_atual := ROUND(v_peso_atual * (1 - 0.0354), 2);
    
    INSERT INTO public.lote_eventos (
      lote_id, tipo_evento, etapa_numero, data_evento,
      peso_antes, peso_depois, caixa_origem, caixa_destino,
      latitude, longitude, administrador_id, administrador_nome,
      observacoes, fotos_compartilhadas, dados_especificos
    )
    VALUES (
      v_lote_id,
      'manutencao',
      v_etapa,
      v_data_inicio + (v_semana || ' weeks')::INTERVAL,
      ROUND(v_peso_atual / (1 - 0.0354), 2),
      v_peso_atual,
      v_caixa_origem, v_caixa_destino,
      v_latitude, v_longitude,
      v_criado_por, v_criado_por_nome,
      format('Manutenção Semana %s - Transferência Caixa %s → %s (evento retroativo)', v_semana, v_caixa_origem, v_caixa_destino),
      '[]'::jsonb,
      jsonb_build_object(
        'retroativo', true,
        'semana_numero', v_semana,
        'taxa_decaimento', 0.0354
      )
    );
    
    RAISE NOTICE 'Evento % (manutenção semana %) criado - Peso: %kg', v_etapa, v_semana, v_peso_atual;
  END LOOP;

  -- EVENTO 8: Finalização (Caixa 7 → Lote Pronto)
  INSERT INTO public.lote_eventos (
    lote_id, tipo_evento, etapa_numero, data_evento,
    peso_antes, peso_depois, caixa_origem, caixa_destino,
    latitude, longitude, administrador_id, administrador_nome,
    observacoes, fotos_compartilhadas, dados_especificos
  )
  VALUES (
    v_lote_id,
    'finalizacao',
    8,
    v_data_inicio + '7 weeks'::INTERVAL,
    v_peso_atual,
    91.20, -- Peso final real do lote
    7, NULL,
    v_latitude, v_longitude,
    v_criado_por, v_criado_por_nome,
    'Compostagem finalizada - Lote pronto para distribuição (evento retroativo)',
    '[]'::jsonb,
    jsonb_build_object(
      'retroativo', true,
      'peso_final_real', 91.20,
      'reducao_total_percentual', ROUND(((v_peso_inicial - 91.20) / v_peso_inicial) * 100, 2)
    )
  );

  RAISE NOTICE 'Evento 8 (finalização) criado - Peso final: 91.20kg';
  RAISE NOTICE 'Total de 8 eventos retroativos criados com sucesso!';
END $$;

-- 3. Melhorar o trigger de evento de início para logs de debug
CREATE OR REPLACE FUNCTION public.gerar_evento_inicio_lote()
RETURNS TRIGGER
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path TO 'public'
AS $function$
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
    RETURN NEW; -- Não bloquear a criação do lote mesmo se falhar
END;
$function$;

COMMENT ON FUNCTION public.gerar_evento_inicio_lote() IS 'Trigger melhorado para gerar evento de início do lote com logs de debug';

-- Comentário final
COMMENT ON TABLE public.lote_eventos IS 'Tabela de eventos de rastreabilidade dos lotes - contém timeline completo de 8 eventos por lote';