## Diagnóstico

A página pública `https://compostroca.bion.global/CWB001` (rota `/:unitCode` → `ProductionBeltPublic.tsx`) é acessada por visitantes **anônimos**. Ao clicar em "Ver Fotos" em qualquer caixa, o `FotosGalleryModal` abre e dispara o hook `useLoteFotos` (ou `useLoteProntoFotos` para lotes encerrados).

Ambos os hooks têm um `useEffect` gated por `user`:

```ts
// src/hooks/useLoteFotos.ts (linha ~284)
useEffect(() => {
  if (user && loteId) {     // ← user é null no acesso público
    fetchFotos();
  }
}, [loteId, user]);

// e dentro de uploadFoto/fetch também: if (!user) return;
```

Como `useAuth()` retorna `user = null` para o visitante anônimo, `fetchFotos()` **nunca executa**. O estado `loading` inicializa como `true` e nunca muda, então o modal renderiza `null` no early-return:

```ts
if (!isOpen || loading) return null;  // FotosGalleryModal.tsx:157
```

Resultado: clique no botão "Ver Fotos" não abre nada — exatamente o sintoma reportado, tanto em mobile quanto em desktop (mas é mais visível no mobile porque é onde o usuário está consumindo o link público).

Isso é uma **regressão**: as RLS do banco já permitem leitura pública em `lotes`, `voluntarios` e `lote_fotos` (policy `"Public can view lote photos"`), então o fluxo funcionaria sem autenticação se o hook não estivesse bloqueando.

## Correção

Mudança mínima e cirúrgica em **2 hooks**, mantendo a proteção apenas nas mutações (upload/delete), que continuam exigindo `user`.

### 1. `src/hooks/useLoteFotos.ts`
- Remover `if (!user) return;` da função `fetchFotos` (não existe explicitamente — o gate está só no useEffect).
- Trocar o `useEffect` final para depender apenas de `loteId`:
  ```ts
  useEffect(() => {
    if (loteId) fetchFotos();
  }, [loteId]);
  ```
- Manter `uploadFoto` e `deleteFoto` exigindo `user` (já fazem isso).

### 2. `src/hooks/useLoteProntoFotos.ts`
- Em `fetchFotosLoteProto`, remover o `!user` do guard inicial:
  ```ts
  if (!loteId) return;   // antes: if (!loteId || !user) return;
  ```
- Trocar o `useEffect` para depender apenas de `loteId`:
  ```ts
  useEffect(() => { fetchFotosLoteProto(); }, [loteId]);
  ```

## Não será alterado

- Nenhuma policy RLS muda — `lote_fotos`, `lotes` e `voluntarios` já têm policy `"Public can view..."`.
- `entrega_fotos` continua restrito a usuários aprovados; as fotos públicas das entregas vivem em `lote_fotos` (onde o `uploadFoto` já as grava). Se alguma unidade tiver fotos só em `entrega_fotos`, a galeria mostrará as que conseguir ler, sem quebrar.
- Mutações (upload/delete) continuam protegidas por `useAuth`.
- `FotosGalleryModal`, `PublicProductionBelt` e `ProductionBeltPublic` não precisam de alteração.

## Validação

1. Abrir `https://compostroca.bion.global/CWB001` em mobile (anônimo, sem login).
2. Clicar em "Ver Fotos" em qualquer caixa com lote ativo → modal abre com grade de fotos.
3. Conferir no `/lotes` autenticado que o fluxo de fotos continua intacto (mesmo hook).
