## Diagnóstico do bug real

O botão **Ver Fotos** abre o modal no mobile, mas ele mostra **“Nenhuma foto encontrada”** para o lote `CWB001-21052026A454`.

O problema não é visual/CSS do modal: a requisição mobile/desktop está retornando lista vazia porque `useLoteFotos` consulta a tabela `entrega_fotos`, que no acesso público/anônimo não expõe essas fotos. No banco, existem 4 entregas para esse lote e cada uma tem 3 fotos, mas a chamada pública para `entrega_fotos` retorna `[]`. Já existe tabela pública `lote_fotos`, criada para consolidar fotos e com policy pública, mas esse lote atual ainda não tem registros nela.

## Plano de correção rápida

1. **Corrigir o hook da galeria pública/ativa (`src/hooks/useLoteFotos.ts`)**
   - Trocar a fonte principal das fotos de entrega para `lote_fotos`, filtrando por `lote_id`, `entrega_id not null` e `deleted_at is null`.
   - Manter fallback para `entrega_fotos` apenas se `lote_fotos` vier vazia, para não quebrar telas antigas autenticadas.
   - Garantir que URLs relativas sejam resolvidas no bucket correto (`entrega-fotos` para fotos de entrega, `lote-fotos` para manejo).

2. **Sincronizar dados existentes que ficaram órfãos**
   - Criar migration idempotente para inserir em `lote_fotos` as fotos existentes em `entrega_fotos` para entregas que ainda não têm registro consolidado.
   - Isso deve restaurar imediatamente a visualização pública/mobile dos lotes atuais, sem mexer na esteira nem em lotes/caixas.

3. **Preservar segurança e fluxo atual**
   - Não alterar permissões amplas de `entrega_fotos`.
   - Não liberar escrita pública.
   - Manter upload/delete protegidos por autenticação.

4. **Validar no alvo real**
   - Testar `/CWB001` em viewport mobile.
   - Clicar em **Ver Fotos** no card do lote `CWB001-21052026A454`.
   - Confirmar que a galeria carrega imagens em grade, em vez do estado vazio.

## Arquivos previstos

- `src/hooks/useLoteFotos.ts`
- nova migration em `supabase/migrations/...sql` para backfill de `lote_fotos`

## Observação

A esteira e a posição das caixas não serão alteradas neste plano.