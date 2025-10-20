-- ============================================================
-- Migration: Agendar coleta diária de dados dos sensores IoT
-- Descrição: Configura pg_cron para executar a Edge Function
--            'coleta-diaria-sensores' diariamente às 23:00 UTC
-- ============================================================

-- Habilitar extensões necessárias (se não estiverem habilitadas)
CREATE EXTENSION IF NOT EXISTS pg_cron;
CREATE EXTENSION IF NOT EXISTS pg_net;

-- Remover job anterior se existir (para evitar duplicatas)
SELECT cron.unschedule('coleta-diaria-sensores-job')
WHERE EXISTS (
  SELECT 1 FROM cron.job WHERE jobname = 'coleta-diaria-sensores-job'
);

-- Agendar job diário de coleta de sensores
SELECT cron.schedule(
  'coleta-diaria-sensores-job',          -- Nome único do job
  '0 23 * * *',                          -- Cron: Diariamente às 23:00 UTC
  $$
  SELECT net.http_post(
      url := 'https://yfcxdbhrtjdmwyifgptf.supabase.co/functions/v1/coleta-diaria-sensores',
      headers := jsonb_build_object(
        'Content-Type', 'application/json',
        'Authorization', 'Bearer eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6InlmY3hkYmhydGpkbXd5aWZncHRmIiwicm9sZSI6ImFub24iLCJpYXQiOjE3NTMyOTc0NzMsImV4cCI6MjA2ODg3MzQ3M30.Gn_xSbORlNC8nMepQSmvLrXsKXYpGQGcPHOfIO3zhvs'
      ),
      body := '{}'::jsonb
  ) AS request_id;
  $$
);

-- Verificar se o job foi criado com sucesso
DO $$
BEGIN
  IF EXISTS (
    SELECT 1 FROM cron.job WHERE jobname = 'coleta-diaria-sensores-job'
  ) THEN
    RAISE NOTICE '✅ Job "coleta-diaria-sensores-job" agendado com sucesso para executar diariamente às 23:00 UTC';
  ELSE
    RAISE WARNING '⚠️ Falha ao criar job "coleta-diaria-sensores-job"';
  END IF;
END $$;