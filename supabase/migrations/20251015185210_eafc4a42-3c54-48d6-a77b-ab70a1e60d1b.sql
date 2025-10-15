-- ========================================
-- CORREÇÃO IMEDIATA: Lote CWB001-28082025A953
-- ========================================

-- Atualizar evento de Etapa 8 com dados corretos da manutenção de hoje (15/10/2025)
UPDATE lote_eventos
SET 
  data_evento = '2025-10-15 17:38:24.066+00',
  administrador_id = (SELECT user_id FROM profiles WHERE full_name = 'Guilherme Corrêa Móres' LIMIT 1),
  administrador_nome = 'Guilherme Corrêa Móres',
  sessao_manutencao_id = 'e831defe-f29d-417e-911d-50e8a4aefe60',
  fotos_compartilhadas = jsonb_build_array(
    'https://yfcxdbhrtjdmwyifgptf.supabase.co/storage/v1/object/public/manejo-fotos/f6df3ab1-6e4a-474e-a89a-0625103e6ce8/manejo-1760549901008-0.jpg',
    'https://yfcxdbhrtjdmwyifgptf.supabase.co/storage/v1/object/public/manejo-fotos/f6df3ab1-6e4a-474e-a89a-0625103e6ce8/manejo-1760549902255-1.jpg',
    'https://yfcxdbhrtjdmwyifgptf.supabase.co/storage/v1/object/public/manejo-fotos/f6df3ab1-6e4a-474e-a89a-0625103e6ce8/manejo-1760549902864-2.jpg',
    'https://yfcxdbhrtjdmwyifgptf.supabase.co/storage/v1/object/public/manejo-fotos/f6df3ab1-6e4a-474e-a89a-0625103e6ce8/manejo-1760549903464-3.jpg'
  ),
  observacoes = 'Finalização - Caixa 06 foi destinada para a fazenda cic, e amanhã dia 15/10 iniciamos a caixa 01',
  latitude = -25.4404227,
  longitude = -49.2232511,
  updated_at = NOW()
WHERE id = '861fc1d5-6c7b-4a10-9c4a-ad876ae2f01b';

-- ========================================
-- PROTEÇÃO ESTRUTURAL: Trigger de Validação
-- ========================================

-- Função para validar eventos duplicados
CREATE OR REPLACE FUNCTION validar_evento_duplicado()
RETURNS TRIGGER 
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
  -- Avisar se já existe evento para mesma etapa
  IF EXISTS (
    SELECT 1 FROM lote_eventos
    WHERE lote_id = NEW.lote_id
      AND etapa_numero = NEW.etapa_numero
      AND id != NEW.id
      AND deleted_at IS NULL
  ) THEN
    RAISE WARNING '⚠️ Evento de Etapa % já existe para lote %. Considere atualizar ao invés de criar novo.', 
      NEW.etapa_numero, NEW.lote_id;
  END IF;
  
  RETURN NEW;
END;
$$;

-- Criar trigger (apenas aviso, não bloqueia)
DROP TRIGGER IF EXISTS trigger_validar_evento_duplicado ON lote_eventos;
CREATE TRIGGER trigger_validar_evento_duplicado
  BEFORE INSERT ON lote_eventos
  FOR EACH ROW
  EXECUTE FUNCTION validar_evento_duplicado();