# Bug: "Esteira completa" bloqueia criação de lote na Caixa 1

## Causa raiz (confirmada no banco)

Existe um lote soft-deleted que está sendo contado como ativo apenas em um dos hooks:

- `CWB001-21052026A225` — caixa_atual=2, status='em_processamento', **deleted_at=2026-05-21 12:13** (soft-deleted)
- Mais 6 lotes reais em_processamento (caixas 2-7)

Consultas:

- `useLotesManager.fetchLotes` filtra `.is('deleted_at', null)` → retorna 6 lotes ativos → página **/lotes** mostra corretamente "6/7 caixas ocupadas".
- `useOrganizationData.fetchLotes` **NÃO filtra `deleted_at`** → retorna 7 lotes (6 reais + 1 fantasma) → `LoteControlCard` calcula `lotesAtivos.length >= 7` → `isProductionBeltFull = true` → botão "Iniciar Lote" desabilitado com mensagem "Esteira completa - finalize um lote antes de criar outro".

Resultado: Mauricio não consegue criar lote novo na Caixa 1, e a página /entregas mostra "É necessário ter um lote ativo para registrar entregas" porque `loteAtivoCaixa01` é null (não há lote em caixa 1).

## Correção

### 1. `src/hooks/useOrganizationData.ts` — `fetchLotes`

Adicionar `.is('deleted_at', null)` ao select de lotes (mesma proteção que `useLotesManager` já tem). Esta é a correção definitiva e elimina inconsistência entre os hooks.

```ts
const { data: lotesData, error } = await supabase
  .from('lotes')
  .select('*')
  .eq('unidade', organizationCode)
  .is('deleted_at', null)            // <-- adicionar
  .order('created_at', { ascending: false });
```

### 2. `src/components/LoteControlCard.tsx` — defesa em profundidade

No filtro local de `lotesAtivos`, também excluir registros com `deleted_at`:

```ts
const lotesAtivos = orgData.lotes?.filter(l => 
  !l.deleted_at &&
  (l.status === 'ativo' || l.status === 'em_processamento') && 
  l.caixa_atual >= 1 && l.caixa_atual <= 7
) || [];
```

## Validação

Após o fix, com os 6 lotes reais ativos:
- `isProductionBeltFull` = false → botão "Iniciar Lote" habilitado.
- Mauricio cria lote → aparece em Caixa 1 status='ativo' → `loteAtivoCaixa01` resolve → página /entregas libera o formulário de Nova Entrega.

Não é necessário tocar no lote soft-deleted (`CWB001-21052026A225`) — ele permanece arquivado e simplesmente deixa de poluir contadores. Sem migrações de banco.
