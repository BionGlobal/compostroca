## Diagnóstico

A migration anterior fez o soft-delete corretamente (`deleted_at` setado em `c8306250-...`, caixa 2, peso 0). Porém o lote vazio continua aparecendo na **Esteira de Produção** porque os hooks que alimentam a UI **não filtram `deleted_at IS NULL`**.

Confirmado no banco:
- `CWB001-21052026A454` — caixa 1, 40.439 kg, `deleted_at = NULL` (lote correto, em andamento)
- `CWB001-21052026A225` — caixa 2, 0 kg, `deleted_at = 2026-05-21 12:13:38` (soft-deletado, mas a UI ignora esse campo)

Arquivos com a falha:

1. **`src/hooks/useLotesManager.ts`** (linha ~281) — `fetchLotes()` busca todos os lotes da unidade sem filtrar `deleted_at`. Esse hook alimenta a Esteira de Produção em `/lotes`.
2. **`src/hooks/usePublicProductionBelt.ts`** (linha ~79) — mesma falha, afeta a esteira pública (`/`).

Risco da ausência do filtro: qualquer soft-delete futuro (de lotes, entregas, etc.) volta a "vazar" na UI. É uma falha de consistência sistêmica, não pontual.

## Plano de correção (somente frontend, sem alterar dados)

### 1. Adicionar filtro `deleted_at IS NULL` nas duas queries de esteira

**`src/hooks/useLotesManager.ts`** — função `fetchLotes()`:
```ts
.eq('unidade', profile.organization_code)
.is('deleted_at', null)   // ← adicionar
.order('created_at', ...)
```

**`src/hooks/usePublicProductionBelt.ts`** — função de fetch público:
```ts
.eq('unidade', unitCode)
.is('deleted_at', null)   // ← adicionar
.in('status', ['ativo', 'em_processamento'])
```

### 2. Auditoria rápida dos demais hooks de lotes

Varredura nos 20+ hooks/componentes que consultam `lotes` para verificar quais já filtram `deleted_at` e quais precisam do mesmo patch defensivo (ex.: `useHistoricoLotes`, `useDashboard`, `useUnifiedKPIs`). Se algum estiver expondo lotes deletados, aplico o mesmo filtro. Sem mudar lógica de negócio.

### 3. Sem alteração no banco

Os dados estão corretos. A migration anterior cumpriu o papel:
- Lote vazio soft-deletado.
- Trigger `trg_validar_transferencia_lote_vazio` ativo bloqueando recorrência.

A correção é **100% no frontend**, baixo risco, sem efeito sobre o lote A454 em andamento nem sobre as entregas.

## Aceite

- Após o patch, `/lotes` mostra Caixa 1 com A454 (40.4 kg) e **Caixa 2 vazia/sem card** (ou com o próximo lote real, quando avançar).
- `/` (esteira pública) idem.
- Lote A454 e suas 4 entregas permanecem intactos.
- Nenhuma migration nova necessária.

## Arquivos a editar

- `src/hooks/useLotesManager.ts`
- `src/hooks/usePublicProductionBelt.ts`
- (eventualmente outros hooks de leitura de lotes, se a auditoria do passo 2 encontrar mais ocorrências)
