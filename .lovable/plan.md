# Auditoria: lote vazio na esteira (21/05/2026)

## Causa raiz

Hoje foram criados **2 lotes** no CWB001 com 1m17s de diferença:

| Hora | Lote | Caixa atual | Peso | Entregas |
|---|---|---|---|---|
| 11:40:55 | `CWB001-21052026A001` (id `c8306250…`) | **2** | **0 kg** | **0** |
| 11:42:12 | — manejo semanal transferiu A001 da caixa 1→2 (peso 0→0) | | | |
| 11:42:19 | `CWB001-21052026A002` (id `4281f276…`) | 1 | 40,439 kg | 4 (29,955 kg + 35% cepilho) |

**Sequência do erro:**
1. Lote A001 foi criado **sem nenhuma entrega** (peso inicial = 0).
2. ~1m17s depois rodou-se o **manejo semanal**, que avançou A001 (vazio) da caixa 1 para a caixa 2.
3. Em seguida o lote A002 foi criado corretamente na caixa 1 e recebeu as 4 entregas reais.

Resultado: a caixa 2 da esteira ficou ocupada por um lote-fantasma com peso 0 e 10 fotos de manejo replicadas (cópias das fotos da sessão de manutenção, também aplicadas a outros lotes ativos).

**Lacuna no sistema:** existe o trigger `validar_encerramento_lote` que impede *encerrar* um lote vazio na caixa 1, mas **não existe** validação equivalente que impeça **transferir** um lote vazio (0 entregas / peso 0) da caixa 1 para a caixa 2 durante o manejo semanal. Por isso o lote-fantasma passou.

## Risco

- **Esteira**: caixa 2 mostrando lote vazio quebra a métrica de "capacidade utilizada" e polui auditoria.
- **Hashes / cadeia**: A001 ainda não foi finalizado (status `em_processamento`), então não tem hash de integridade emitido — soft-delete é seguro e não quebra a cadeia.
- **Lote A002 (em andamento)**: totalmente isolado do A001. Tem id, código e entregas próprias. **Nenhuma operação sobre A001 toca A002**.
- **Fotos da sessão de manejo**: as 10 fotos vinculadas ao A001 são cópias compartilhadas da sessão; as originais continuam em `sessoes_manutencao.fotos_gerais` e replicadas nos demais lotes ativos legítimos.

## Ação corretiva proposta

### 1. Correção imediata (dados) — via migration SQL

Soft-delete do lote-fantasma e das fotos órfãs replicadas nele. **Sem mexer em A002 nem em nenhuma entrega.**

```sql
-- Soft-delete fotos replicadas no lote vazio
UPDATE lote_fotos
SET deleted_at = now()
WHERE lote_id = 'c8306250-e62e-46bd-ab22-200e8b565f23'
  AND deleted_at IS NULL;

-- Soft-delete eventos (Etapa 1 inicio + Etapa 2 transferência) do lote vazio
UPDATE lote_eventos
SET deleted_at = now()
WHERE lote_id = 'c8306250-e62e-46bd-ab22-200e8b565f23'
  AND deleted_at IS NULL;

-- Soft-delete do lote-fantasma
UPDATE lotes
SET deleted_at = now(), updated_at = now()
WHERE id = 'c8306250-e62e-46bd-ab22-200e8b565f23'
  AND peso_inicial = 0;  -- guarda de segurança
```

### 2. Prevenção (DB) — bloquear transferência de lote vazio

Estender o trigger existente para também impedir transferir da caixa 1 quando não há entregas:

```sql
CREATE OR REPLACE FUNCTION public.validar_transferencia_lote_vazio()
RETURNS trigger LANGUAGE plpgsql SECURITY DEFINER SET search_path=public AS $$
DECLARE total_entregas integer;
BEGIN
  -- Só interessa quando sai da caixa 1
  IF OLD.caixa_atual = 1 AND NEW.caixa_atual = 2 THEN
    SELECT COUNT(*) INTO total_entregas
      FROM entregas
      WHERE lote_codigo = NEW.codigo AND deleted_at IS NULL;
    IF total_entregas = 0 OR COALESCE(NEW.peso_atual,0) = 0 THEN
      RAISE EXCEPTION
        'Lote % não pode ser transferido da Caixa 1 sem entregas (peso=%, entregas=%)',
        NEW.codigo, NEW.peso_atual, total_entregas;
    END IF;
  END IF;
  RETURN NEW;
END $$;

CREATE TRIGGER trg_validar_transferencia_lote_vazio
  BEFORE UPDATE OF caixa_atual ON lotes
  FOR EACH ROW EXECUTE FUNCTION public.validar_transferencia_lote_vazio();
```

### 3. Prevenção (UX, opcional — não nesta sessão)

Na tela de "Manejo semanal" filtrar lotes da caixa 1 que tenham 0 entregas, exibindo aviso "Lote sem entregas — não pode avançar". Fica como follow-up.

## O que NÃO será alterado

- Lote `CWB001-21052026A002` (em andamento) e suas 4 entregas/fotos.
- Sessão de manutenção do dia e fotos originais em `sessoes_manutencao`.
- Lotes legítimos das demais caixas e seus eventos.

## Entregáveis desta execução

- 1 migration SQL com (a) soft-delete do lote vazio + fotos + eventos e (b) novo trigger preventivo.
- Verificação pós-execução: confirmar que a esteira mostra apenas A002 na caixa 1 e que nenhum outro lote ativo foi afetado.
