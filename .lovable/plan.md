## Diagnóstico

A esteira foi avançada **duas vezes** na transição de hoje (21/05). Evidências no banco:

**Lotes encerrados hoje (deveria ser apenas 1):**
- `CWB001-26032026A126` — encerrado 21/05 11:40:48 (correto — era o mais antigo, estava em caixa 7)
- `CWB001-01042026A701` — encerrado 21/05 11:42:12 (**incorreto** — foi finalizado pela duplicação)

**Estado atual da esteira (ativos):**
| Caixa | Lote | Data início | Peso |
|---|---|---|---|
| 1 | A454 | 21/05 | 40.4 kg ← novo, correto |
| 2 | — (A225 soft-deletado) | — | vazio ← órfã |
| 3 | A349 | 14/05 | 60.5 kg |
| 4 | A940 | 07/05 | 85.8 kg |
| 5 | A588 | 30/04 | 58.7 kg |
| 6 | A118 | 23/04 | 41.2 kg |
| 7 | A768 | 09/04 | 73.6 kg |

Pela cadência semanal correta (1 lote/semana), A701 (01/04) deveria estar em caixa 7, e A768 (09/04) em caixa 6. Toda a esteira de caixa 2 em diante está adiantada em 1 posição por causa da execução dupla.

## Plano de correção

Operação 100% via migration SQL, sem tocar em entregas, fotos, eventos ou no lote A454. **Caixa 1 não muda.**

### 1. Recuar caixas 3→2, 4→3, 5→4, 6→5, 7→6

Para cada lote ativo (`em_processamento`) atualmente em caixa N (N ∈ {3..7}):
- `caixa_atual = N - 1`
- `semana_atual = N - 1`
- `peso_atual = peso_inicial × (1 - regra_decaimento)^(N-2)` (recálculo coerente com a regra do projeto)
- `updated_at = now()`

Resultado esperado:
- Caixa 2 ← A349 (semana 2)
- Caixa 3 ← A940 (semana 3)
- Caixa 4 ← A588 (semana 4)
- Caixa 5 ← A118 (semana 5)
- Caixa 6 ← A768 (semana 6)

### 2. Restaurar A701 para caixa 7

Lote `CWB001-01042026A701` foi finalizado indevidamente. Reverter:
- `status = 'em_processamento'`
- `caixa_atual = 7`, `semana_atual = 7`
- `data_encerramento = NULL`, `data_finalizacao = NULL`
- `peso_atual = peso_inicial × (1 - regra_decaimento)^6`

A126 (encerrado às 11:40, o **primeiro** finalizado) permanece encerrado — esse era o ciclo correto da semana.

### 3. Registrar evento de auditoria

Inserir em `lote_eventos` para cada lote alterado, com `tipo_evento = 'correcao_manual_esteira'` e payload explicando: "Reversão de transição duplicada em 21/05/2026 — esteira recuada 1 posição; A701 restaurado de encerrado para em_processamento em caixa 7."

### 4. NÃO mexer

- Lote A454 (caixa 1, novo lote de hoje) — intocado
- A225 (já soft-deletado) — fica como está
- A126 (encerrado corretamente) — fica encerrado
- Entregas, fotos, manejos semanais — nenhum DELETE/UPDATE
- Trigger `trg_validar_transferencia_lote_vazio` (já protege contra recorrência) — permanece

### 5. Investigação da causa raiz (item separado, sem ação destrutiva agora)

A migration de hoje fixou o sintoma do lote vazio (bloqueio de transferência sem entregas). O **gatilho da execução dupla** ainda não foi identificado — pode ser:
- Botão de "avançar esteira" clicado 2x rapidamente sem debounce
- Re-execução de edge function (`reativar-lote-entregas` ou similar) por retry
- Cron duplicado

Após aplicar a correção acima e validar a UI, abrir investigação dos logs de Edge Functions e do componente que dispara a transição semanal (provavelmente `AdminEncerramento.tsx`) para adicionar **idempotência** (lock por data + unidade). Sem isso, o problema pode repetir na próxima semana.

## Aceite

- `/lotes` mostra: caixa 1 = A454, caixa 2 = A349, caixa 3 = A940, caixa 4 = A588, caixa 5 = A118, caixa 6 = A768, caixa 7 = A701
- Pesos recalculados coerentes com a curva de decaimento (0.0366/semana)
- A126 segue encerrado (correto)
- Esteira pública (`/`) idem
- Histórico não perde nada — A701 sai de "encerrados hoje" e volta para "em processamento"

## Arquivos

- 1 migration nova em `supabase/migrations/` com os 6 UPDATEs + INSERTs em `lote_eventos`
- Nenhuma mudança de frontend necessária (filtros `deleted_at IS NULL` já aplicados na rodada anterior)
