-- Corrigir retroativamente os 2 lotes afetados
-- Lote CWB001-16102025A001 (peso_inicial: 119.151)
UPDATE lote_eventos
SET 
  peso_depois = 119.151,
  observacoes = 'Lote iniciado com 15 voluntários • 88.260 kg resíduos + 30.891 kg cepilho',
  dados_especificos = jsonb_build_object(
    'peso_residuos', 88.260,
    'peso_cepilho', 30.891,
    'total_voluntarios', 15,
    'fonte', 'correcao_retroativa'
  )
WHERE id = 'a1b619c9-0d5c-4ea4-8184-c6bb671c1821';

-- Lote CWB001-23102025A326 (peso_inicial: 56.390)
UPDATE lote_eventos
SET 
  peso_depois = 56.390,
  observacoes = 'Lote iniciado com 8 voluntários • 41.770 kg resíduos + 14.620 kg cepilho',
  dados_especificos = jsonb_build_object(
    'peso_residuos', 41.770,
    'peso_cepilho', 14.620,
    'total_voluntarios', 8,
    'fonte', 'correcao_retroativa'
  )
WHERE id = 'a653fb4d-0155-4773-a865-60481c1a5917';