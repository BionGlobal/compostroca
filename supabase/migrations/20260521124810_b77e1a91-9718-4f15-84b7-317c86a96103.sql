
-- Correção da esteira CWB001: recuo de 1 posição (3→2, 4→3, 5→4, 6→5, 7→6) + restauração de A701 em caixa 7
-- k = 1 - 0.0366 = 0.9634; peso_atual_em_semana_N = peso_inicial * k^(N-1)

UPDATE public.lotes SET
  caixa_atual  = 2,
  semana_atual = 2,
  peso_atual   = ROUND((peso_inicial * power(0.9634, 1))::numeric, 3),
  updated_at   = now()
WHERE codigo = 'CWB001-14052026A349' AND unidade = 'CWB001';

UPDATE public.lotes SET
  caixa_atual  = 3,
  semana_atual = 3,
  peso_atual   = ROUND((peso_inicial * power(0.9634, 2))::numeric, 3),
  updated_at   = now()
WHERE codigo = 'CWB001-07052026A940' AND unidade = 'CWB001';

UPDATE public.lotes SET
  caixa_atual  = 4,
  semana_atual = 4,
  peso_atual   = ROUND((peso_inicial * power(0.9634, 3))::numeric, 3),
  updated_at   = now()
WHERE codigo = 'CWB001-30042026A588' AND unidade = 'CWB001';

UPDATE public.lotes SET
  caixa_atual  = 5,
  semana_atual = 5,
  peso_atual   = ROUND((peso_inicial * power(0.9634, 4))::numeric, 3),
  updated_at   = now()
WHERE codigo = 'CWB001-23042026A118' AND unidade = 'CWB001';

UPDATE public.lotes SET
  caixa_atual  = 6,
  semana_atual = 6,
  peso_atual   = ROUND((peso_inicial * power(0.9634, 5))::numeric, 3),
  updated_at   = now()
WHERE codigo = 'CWB001-09042026A768' AND unidade = 'CWB001';

-- Restaurar A701 (finalizado indevidamente pela duplicação) para caixa 7
UPDATE public.lotes SET
  status            = 'em_processamento',
  caixa_atual       = 7,
  semana_atual      = 7,
  peso_atual        = ROUND((peso_inicial * power(0.9634, 6))::numeric, 3),
  data_encerramento = NULL,
  data_finalizacao  = NULL,
  peso_final        = NULL,
  updated_at        = now()
WHERE codigo = 'CWB001-01042026A701' AND unidade = 'CWB001';
