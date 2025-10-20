-- =====================================================================
-- MIGRATION: Estrutura de dados para sensores IoT
-- Projeto: Compostroca (Bion)
-- Descrição: Cria tabelas para leituras diárias e médias consolidadas
--            de sensores IoT com acesso público para auditoria
-- =====================================================================

-- =====================================================================
-- TABELA 1: leituras_diarias_sensores
-- Propósito: Armazenar leituras brutas diárias dos sensores IoT
-- =====================================================================

CREATE TABLE IF NOT EXISTS public.leituras_diarias_sensores (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  lote_id UUID NOT NULL REFERENCES public.lotes(id) ON DELETE CASCADE,
  numero_caixa INTEGER NOT NULL,
  
  -- Métricas dos sensores (podem ser NULL se sensor não reportar)
  temperatura_solo REAL,
  umidade_solo REAL,
  condutividade_agua_poros REAL,
  nitrogenio REAL,
  fosforo REAL,
  potassio REAL,
  ph REAL,
  
  -- Índice para otimizar queries por lote e data
  CONSTRAINT leituras_diarias_sensores_lote_id_numero_caixa_idx 
    UNIQUE (lote_id, numero_caixa, created_at)
);

-- Índices para performance
CREATE INDEX IF NOT EXISTS idx_leituras_diarias_lote_id 
  ON public.leituras_diarias_sensores(lote_id);

CREATE INDEX IF NOT EXISTS idx_leituras_diarias_created_at 
  ON public.leituras_diarias_sensores(created_at DESC);

CREATE INDEX IF NOT EXISTS idx_leituras_diarias_caixa 
  ON public.leituras_diarias_sensores(numero_caixa);

-- Comentários para documentação
COMMENT ON TABLE public.leituras_diarias_sensores IS 
  'Armazena leituras brutas diárias dos sensores IoT nas caixas 2 e 6 de compostagem';

COMMENT ON COLUMN public.leituras_diarias_sensores.numero_caixa IS 
  'Número da caixa de compostagem (esperado: 2 ou 6)';

COMMENT ON COLUMN public.leituras_diarias_sensores.temperatura_solo IS 
  'Temperatura do solo em graus Celsius';

COMMENT ON COLUMN public.leituras_diarias_sensores.umidade_solo IS 
  'Umidade do solo em percentual (0-100)';

COMMENT ON COLUMN public.leituras_diarias_sensores.condutividade_agua_poros IS 
  'Condutividade elétrica da água dos poros (μS/cm)';

COMMENT ON COLUMN public.leituras_diarias_sensores.nitrogenio IS 
  'Concentração de nitrogênio (N) em mg/kg ou ppm';

COMMENT ON COLUMN public.leituras_diarias_sensores.fosforo IS 
  'Concentração de fósforo (P) em mg/kg ou ppm';

COMMENT ON COLUMN public.leituras_diarias_sensores.potassio IS 
  'Concentração de potássio (K) em mg/kg ou ppm';

COMMENT ON COLUMN public.leituras_diarias_sensores.ph IS 
  'Potencial hidrogeniônico (pH) do solo (0-14)';

-- =====================================================================
-- RLS POLICIES: leituras_diarias_sensores
-- =====================================================================

ALTER TABLE public.leituras_diarias_sensores ENABLE ROW LEVEL SECURITY;

-- Política 1: Permitir leitura pública (essencial para auditoria)
CREATE POLICY "Permitir leitura pública"
  ON public.leituras_diarias_sensores
  FOR SELECT
  TO anon, authenticated
  USING (true);

-- Política 2: Permitir inserção apenas via service key (API backend)
CREATE POLICY "Permitir inserção via service key"
  ON public.leituras_diarias_sensores
  FOR INSERT
  TO service_role
  WITH CHECK (true);

-- Política 3: Permitir atualização via service key (correções)
CREATE POLICY "Permitir atualização via service key"
  ON public.leituras_diarias_sensores
  FOR UPDATE
  TO service_role
  USING (true);

-- Política 4: Permitir deleção via service key (limpeza de dados inválidos)
CREATE POLICY "Permitir deleção via service key"
  ON public.leituras_diarias_sensores
  FOR DELETE
  TO service_role
  USING (true);

-- =====================================================================
-- TABELA 2: medias_sensores_lote
-- Propósito: Armazenar médias consolidadas (fonte definitiva para UI)
-- =====================================================================

CREATE TABLE IF NOT EXISTS public.medias_sensores_lote (
  lote_id UUID PRIMARY KEY REFERENCES public.lotes(id) ON DELETE CASCADE,
  
  -- Médias da Semana 2 (Caixa 2)
  media_temperatura_semana2 REAL,
  media_umidade_semana2 REAL,
  media_condutividade_semana2 REAL,
  
  -- Médias da Semana 6 (Caixa 6)
  media_nitrogenio_semana6 REAL,
  media_fosforo_semana6 REAL,
  media_potassio_semana6 REAL,
  media_ph_semana6 REAL,
  
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- Índice para performance de joins
CREATE INDEX IF NOT EXISTS idx_medias_sensores_lote_id 
  ON public.medias_sensores_lote(lote_id);

-- Comentários para documentação
COMMENT ON TABLE public.medias_sensores_lote IS 
  'Armazena médias consolidadas dos sensores IoT por lote. Fonte de dados para páginas de auditoria pública.';

COMMENT ON COLUMN public.medias_sensores_lote.media_temperatura_semana2 IS 
  'Média de temperatura na Caixa 2 durante a Semana 2 (°C)';

COMMENT ON COLUMN public.medias_sensores_lote.media_umidade_semana2 IS 
  'Média de umidade na Caixa 2 durante a Semana 2 (%)';

COMMENT ON COLUMN public.medias_sensores_lote.media_condutividade_semana2 IS 
  'Média de condutividade na Caixa 2 durante a Semana 2 (μS/cm)';

COMMENT ON COLUMN public.medias_sensores_lote.media_nitrogenio_semana6 IS 
  'Média de nitrogênio na Caixa 6 durante a Semana 6 (mg/kg)';

COMMENT ON COLUMN public.medias_sensores_lote.media_fosforo_semana6 IS 
  'Média de fósforo na Caixa 6 durante a Semana 6 (mg/kg)';

COMMENT ON COLUMN public.medias_sensores_lote.media_potassio_semana6 IS 
  'Média de potássio na Caixa 6 durante a Semana 6 (mg/kg)';

COMMENT ON COLUMN public.medias_sensores_lote.media_ph_semana6 IS 
  'Média de pH na Caixa 6 durante a Semana 6';

COMMENT ON COLUMN public.medias_sensores_lote.updated_at IS 
  'Timestamp da última atualização das médias';

-- =====================================================================
-- RLS POLICIES: medias_sensores_lote
-- =====================================================================

ALTER TABLE public.medias_sensores_lote ENABLE ROW LEVEL SECURITY;

-- Política 1: Permitir leitura pública (essencial para auditoria)
CREATE POLICY "Permitir leitura pública"
  ON public.medias_sensores_lote
  FOR SELECT
  TO anon, authenticated
  USING (true);

-- Política 2: Permitir todas operações via service key
CREATE POLICY "Permitir escrita via service key"
  ON public.medias_sensores_lote
  FOR ALL
  TO service_role
  USING (true)
  WITH CHECK (true);

-- =====================================================================
-- AUTOMAÇÃO: Atualizar updated_at automaticamente
-- =====================================================================

-- Função para atualizar o timestamp
CREATE OR REPLACE FUNCTION public.handle_medias_sensores_lote_update()
RETURNS TRIGGER
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
  NEW.updated_at = NOW();
  RETURN NEW;
END;
$$;

COMMENT ON FUNCTION public.handle_medias_sensores_lote_update() IS 
  'Atualiza automaticamente o campo updated_at antes de cada UPDATE na tabela medias_sensores_lote';

-- Trigger para executar a função
DROP TRIGGER IF EXISTS trigger_update_medias_sensores_lote_timestamp 
  ON public.medias_sensores_lote;

CREATE TRIGGER trigger_update_medias_sensores_lote_timestamp
  BEFORE UPDATE ON public.medias_sensores_lote
  FOR EACH ROW
  EXECUTE FUNCTION public.handle_medias_sensores_lote_update();

-- =====================================================================
-- VALIDAÇÕES E TESTES
-- =====================================================================

-- Verificar se as tabelas foram criadas
DO $$
BEGIN
  IF NOT EXISTS (SELECT 1 FROM pg_tables WHERE schemaname = 'public' AND tablename = 'leituras_diarias_sensores') THEN
    RAISE EXCEPTION 'Erro: Tabela leituras_diarias_sensores não foi criada';
  END IF;
  
  IF NOT EXISTS (SELECT 1 FROM pg_tables WHERE schemaname = 'public' AND tablename = 'medias_sensores_lote') THEN
    RAISE EXCEPTION 'Erro: Tabela medias_sensores_lote não foi criada';
  END IF;
  
  RAISE NOTICE '✅ Migration concluída com sucesso!';
  RAISE NOTICE '✅ Tabelas criadas: leituras_diarias_sensores, medias_sensores_lote';
  RAISE NOTICE '✅ Políticas RLS aplicadas para acesso público de leitura';
  RAISE NOTICE '✅ Trigger de atualização automática configurado';
END $$;