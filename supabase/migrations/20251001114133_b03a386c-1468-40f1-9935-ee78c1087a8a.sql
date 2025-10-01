-- ============================================================================
-- FASE 1: REESTRUTURAÇÃO DO BANCO DE DADOS PARA RASTREABILIDADE APRIMORADA
-- ============================================================================

-- 1.1 Criar tabela centralizada de eventos de rastreabilidade
CREATE TABLE IF NOT EXISTS public.lote_eventos (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  lote_id UUID NOT NULL REFERENCES public.lotes(id) ON DELETE CASCADE,
  tipo_evento TEXT NOT NULL CHECK (tipo_evento IN ('inicio', 'manutencao', 'finalizacao')),
  etapa_numero INTEGER NOT NULL CHECK (etapa_numero BETWEEN 1 AND 8),
  data_evento TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  peso_antes NUMERIC,
  peso_depois NUMERIC NOT NULL,
  caixa_origem INTEGER CHECK (caixa_origem BETWEEN 1 AND 7),
  caixa_destino INTEGER CHECK (caixa_destino BETWEEN 1 AND 7),
  latitude NUMERIC,
  longitude NUMERIC,
  administrador_id UUID,
  administrador_nome TEXT NOT NULL,
  observacoes TEXT,
  fotos_compartilhadas JSONB DEFAULT '[]'::jsonb,
  dados_especificos JSONB DEFAULT '{}'::jsonb,
  hash_evento TEXT,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT now(),
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT now(),
  deleted_at TIMESTAMP WITH TIME ZONE,
  CONSTRAINT unique_lote_etapa UNIQUE(lote_id, etapa_numero)
);

-- 1.2 Adicionar índices para performance
CREATE INDEX IF NOT EXISTS idx_lote_eventos_lote_id ON public.lote_eventos(lote_id) WHERE deleted_at IS NULL;
CREATE INDEX IF NOT EXISTS idx_lote_eventos_tipo ON public.lote_eventos(tipo_evento) WHERE deleted_at IS NULL;
CREATE INDEX IF NOT EXISTS idx_lote_eventos_etapa ON public.lote_eventos(etapa_numero) WHERE deleted_at IS NULL;
CREATE INDEX IF NOT EXISTS idx_lote_eventos_data ON public.lote_eventos(data_evento DESC) WHERE deleted_at IS NULL;

-- 1.3 Modificar tabela lotes para incluir campos de rastreabilidade
ALTER TABLE public.lotes 
  ADD COLUMN IF NOT EXISTS hash_rastreabilidade TEXT UNIQUE,
  ADD COLUMN IF NOT EXISTS data_hash_criacao TIMESTAMP WITH TIME ZONE,
  ADD COLUMN IF NOT EXISTS regra_decaimento NUMERIC DEFAULT 0.0366;

-- 1.4 Criar índice para hash de rastreabilidade
CREATE INDEX IF NOT EXISTS idx_lotes_hash_rastreabilidade ON public.lotes(hash_rastreabilidade) WHERE deleted_at IS NULL AND hash_rastreabilidade IS NOT NULL;

-- 1.5 Habilitar RLS na tabela lote_eventos
ALTER TABLE public.lote_eventos ENABLE ROW LEVEL SECURITY;

-- 1.6 Políticas RLS para lote_eventos (mesma lógica dos lotes)
CREATE POLICY "Approved users can view lote eventos from authorized units"
  ON public.lote_eventos FOR SELECT
  USING (
    EXISTS (
      SELECT 1 FROM public.lotes l
      WHERE l.id = lote_eventos.lote_id 
        AND has_unit_access(l.unidade)
    )
  );

CREATE POLICY "Approved local/super admins can insert lote eventos"
  ON public.lote_eventos FOR INSERT
  WITH CHECK (
    can_modify_data() AND
    EXISTS (
      SELECT 1 FROM public.lotes l
      WHERE l.id = lote_eventos.lote_id 
        AND has_unit_access(l.unidade)
    )
  );

CREATE POLICY "Approved local/super admins can update lote eventos"
  ON public.lote_eventos FOR UPDATE
  USING (
    can_modify_data() AND
    EXISTS (
      SELECT 1 FROM public.lotes l
      WHERE l.id = lote_eventos.lote_id 
        AND has_unit_access(l.unidade)
    )
  );

CREATE POLICY "Approved local/super admins can delete lote eventos"
  ON public.lote_eventos FOR DELETE
  USING (
    can_modify_data() AND
    EXISTS (
      SELECT 1 FROM public.lotes l
      WHERE l.id = lote_eventos.lote_id 
        AND has_unit_access(l.unidade)
    )
  );

CREATE POLICY "Public can view lote eventos"
  ON public.lote_eventos FOR SELECT
  USING (true);

-- 1.7 Função auxiliar para calcular peso com decaimento
CREATE OR REPLACE FUNCTION public.calcular_peso_com_decaimento(
  peso_anterior NUMERIC,
  taxa_decaimento NUMERIC DEFAULT 0.0366
)
RETURNS NUMERIC
LANGUAGE sql
IMMUTABLE
AS $$
  SELECT ROUND(peso_anterior * (1 - taxa_decaimento), 2);
$$;

-- 1.8 Função para gerar evento de início automaticamente
CREATE OR REPLACE FUNCTION public.gerar_evento_inicio_lote()
RETURNS TRIGGER
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path TO 'public'
AS $$
DECLARE
  entregas_data JSONB;
  fotos_iniciais JSONB;
BEGIN
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

  -- Criar evento de início apenas se não existir
  INSERT INTO lote_eventos (
    lote_id,
    tipo_evento,
    etapa_numero,
    data_evento,
    peso_antes,
    peso_depois,
    caixa_origem,
    caixa_destino,
    latitude,
    longitude,
    administrador_id,
    administrador_nome,
    observacoes,
    fotos_compartilhadas,
    dados_especificos
  )
  SELECT
    NEW.id,
    'inicio',
    1,
    NEW.data_inicio,
    0,
    NEW.peso_inicial,
    1,
    1,
    NEW.latitude,
    NEW.longitude,
    NEW.criado_por,
    NEW.criado_por_nome,
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
  WHERE NOT EXISTS (
    SELECT 1 FROM lote_eventos 
    WHERE lote_id = NEW.id AND etapa_numero = 1
  );

  RETURN NEW;
END;
$$;

-- 1.9 Trigger para criar evento de início automaticamente
DROP TRIGGER IF EXISTS trigger_gerar_evento_inicio ON public.lotes;
CREATE TRIGGER trigger_gerar_evento_inicio
  AFTER INSERT ON public.lotes
  FOR EACH ROW
  WHEN (NEW.status IN ('ativo', 'em_processamento'))
  EXECUTE FUNCTION public.gerar_evento_inicio_lote();

-- 1.10 Função para atualizar timestamp
CREATE OR REPLACE FUNCTION public.update_lote_eventos_updated_at()
RETURNS TRIGGER
LANGUAGE plpgsql
AS $$
BEGIN
  NEW.updated_at = now();
  RETURN NEW;
END;
$$;

-- 1.11 Trigger para atualizar updated_at
DROP TRIGGER IF EXISTS trigger_update_lote_eventos_timestamp ON public.lote_eventos;
CREATE TRIGGER trigger_update_lote_eventos_timestamp
  BEFORE UPDATE ON public.lote_eventos
  FOR EACH ROW
  EXECUTE FUNCTION public.update_lote_eventos_updated_at();

-- 1.12 Comentários para documentação
COMMENT ON TABLE public.lote_eventos IS 'Armazena a trilha completa de rastreabilidade de cada lote (8 eventos: 1 início + 6 manutenções + 1 finalização)';
COMMENT ON COLUMN public.lote_eventos.tipo_evento IS 'Tipo do evento: inicio, manutencao ou finalizacao';
COMMENT ON COLUMN public.lote_eventos.etapa_numero IS 'Número da etapa no processo (1-8)';
COMMENT ON COLUMN public.lote_eventos.peso_depois IS 'Peso após o evento (real para início/finalização, estimado para manutenções)';
COMMENT ON COLUMN public.lote_eventos.fotos_compartilhadas IS 'Array de URLs das fotos da sessão de manutenção (compartilhadas entre lotes)';
COMMENT ON COLUMN public.lote_eventos.dados_especificos IS 'Dados específicos do lote neste evento (entregas, voluntários, cálculos)';
COMMENT ON COLUMN public.lote_eventos.hash_evento IS 'Hash SHA-256 individual do evento para integridade';

COMMENT ON COLUMN public.lotes.hash_rastreabilidade IS 'Hash SHA-256 único de rastreabilidade gerado na criação do lote';
COMMENT ON COLUMN public.lotes.data_hash_criacao IS 'Data e hora da geração do hash de rastreabilidade';
COMMENT ON COLUMN public.lotes.regra_decaimento IS 'Taxa de decaimento semanal aplicada (padrão: 3.66%)';
