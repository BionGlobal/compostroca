-- Criar função para buscar um usuário admin existente
DO $$
DECLARE
    admin_user_id uuid;
    mauricio_name text := 'Maurício Neves Gikoski';
    guilherme_name text := 'Guilherme Corrêa Móres';
BEGIN
    -- Buscar qualquer usuário admin existente ou usar um UUID genérico
    SELECT user_id INTO admin_user_id 
    FROM profiles 
    WHERE status = 'approved' 
    LIMIT 1;
    
    -- Se não há usuário admin, usar UUID nulo temporário
    IF admin_user_id IS NULL THEN
        admin_user_id := '00000000-0000-0000-0000-000000000000';
    END IF;

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
        admin_user_id,
        mauricio_name,
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
        admin_user_id,
        guilherme_name,
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
        admin_user_id,
        mauricio_name,
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
        admin_user_id,
        guilherme_name,
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
        admin_user_id,
        mauricio_name,
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
        admin_user_id,
        guilherme_name,
        '2025-06-26 08:00:00+00',
        now()
    )
    ON CONFLICT (id) DO UPDATE SET
        codigo = EXCLUDED.codigo,
        peso_inicial = EXCLUDED.peso_inicial,
        peso_atual = EXCLUDED.peso_atual,
        criado_por_nome = EXCLUDED.criado_por_nome,
        updated_at = now();
END $$;