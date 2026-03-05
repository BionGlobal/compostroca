

# Fix: Unique Constraint `unica_caixa1` Blocking New Lot Creation

## Problem
The unique index `unica_caixa1` is defined as:
```sql
CREATE UNIQUE INDEX unica_caixa1 ON public.lotes USING btree (caixa_atual) WHERE (caixa_atual = 1)
```

This allows **only ONE row** in the entire `lotes` table with `caixa_atual = 1`, regardless of status or deletion. The closed lot `CWB001-27112025A450` (status `encerrado`) still has `caixa_atual = 1`, so any new lot insert fails with `duplicate key value violates unique constraint "unica_caixa1"`.

## Fix
Replace the constraint to only enforce uniqueness for **active, non-deleted** lots:

```sql
DROP INDEX unica_caixa1;
CREATE UNIQUE INDEX unica_caixa1 ON public.lotes USING btree (unidade, caixa_atual) 
  WHERE (caixa_atual = 1 AND status IN ('ativo', 'em_processamento') AND deleted_at IS NULL);
```

This scopes the constraint to: only one active lot per unit in caixa 1 at a time. Closed/deleted lots no longer block new ones.

### Additional cleanup (optional but recommended)
Remove the `AdminEncerramento` import and usage from `Dashboard.tsx` since the recess closure is done.

## No frontend code changes needed
The `useLotes.ts` creation logic is correct. The issue is purely the overly strict DB constraint.

