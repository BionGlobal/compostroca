-- Criar os lotes iniciais da produção atual
-- Primeiro, garantir que temos os dados corretos dos usuários
INSERT INTO profiles (user_id, full_name, role, status, approved_at, organization_code, authorized_units)
VALUES 
  ('11111111-1111-1111-1111-111111111111', 'Maurício Neves Gikoski', 'admin', 'approved', now(), 'CWB001', ARRAY['CWB001']),
  ('22222222-2222-2222-2222-222222222222', 'Guilherme Corrêa Móres', 'admin', 'approved', now(), 'CWB001', ARRAY['CWB001'])
ON CONFLICT (user_id) DO UPDATE SET 
  full_name = EXCLUDED.full_name,
  status = EXCLUDED.status,
  approved_at = EXCLUDED.approved_at;

-- Inserir os lotes da produção atual
INSERT INTO lotes (
  id,
  codigo,
  unidade,
  linha_producao,
  caixa_atual,
  semana_atual,
  status,
  data_inicio,
  data_encerramento,
  peso_inicial,
  peso_atual,
  criado_por,
  criado_por_nome,
  created_at,
  updated_at
) VALUES 
-- Caixa 02
(
  '02020202-0202-0202-0202-020202020202',
  'CWB001-31072025A001',
  'CWB001',
  'A',
  2,
  2,
  'em_processamento',
  '2025-07-31 08:00:00+00',
  NULL,
  82.188,
  79.171,
  '11111111-1111-1111-1111-111111111111',
  'Maurício Neves Gikoski',
  '2025-07-31 08:00:00+00',
  now()
),
-- Caixa 03  
(
  '03030303-0303-0303-0303-030303030303',
  'CWB001-24072025A002',
  'CWB001',
  'A',
  3,
  3,
  'em_processamento',
  '2025-07-24 08:00:00+00',
  NULL,
  100.176,
  92.823,
  '22222222-2222-2222-2222-222222222222',
  'Guilherme Corrêa Móres',
  '2025-07-24 08:00:00+00',
  now()
),
-- Caixa 04
(
  '04040404-0404-0404-0404-040404040404',
  'CWB001-17072025A003',
  'CWB001',
  'A',
  4,
  4,
  'em_processamento',
  '2025-07-17 08:00:00+00',
  NULL,
  124.132,
  110.465,
  '11111111-1111-1111-1111-111111111111',
  'Maurício Neves Gikoski',
  '2025-07-17 08:00:00+00',
  now()
),
-- Caixa 05
(
  '05050505-0505-0505-0505-050505050505',
  'CWB001-10072025A004',
  'CWB001',
  'A',
  5,
  5,
  'em_processamento',
  '2025-07-10 08:00:00+00',
  NULL,
  134.090,
  114.405,
  '22222222-2222-2222-2222-222222222222',
  'Guilherme Corrêa Móres',
  '2025-07-10 08:00:00+00',
  now()
),
-- Caixa 06
(
  '06060606-0606-0606-0606-060606060606',
  'CWB001-03072025A005',
  'CWB001',
  'A',
  6,
  6,
  'em_processamento',
  '2025-07-03 08:00:00+00',
  NULL,
  119.940,
  97.931,
  '11111111-1111-1111-1111-111111111111',
  'Maurício Neves Gikoski',
  '2025-07-03 08:00:00+00',
  now()
),
-- Caixa 07
(
  '07070707-0707-0707-0707-070707070707',
  'CWB001-26062025A006',
  'CWB001',
  'A',
  7,
  7,
  'em_processamento',
  '2025-06-26 08:00:00+00',
  NULL,
  124.211,
  96.859,
  '22222222-2222-2222-2222-222222222222',
  'Guilherme Corrêa Móres',
  '2025-06-26 08:00:00+00',
  now()
)
ON CONFLICT (id) DO UPDATE SET
  codigo = EXCLUDED.codigo,
  peso_inicial = EXCLUDED.peso_inicial,
  peso_atual = EXCLUDED.peso_atual,
  criado_por_nome = EXCLUDED.criado_por_nome,
  updated_at = now();