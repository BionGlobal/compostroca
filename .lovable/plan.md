

# Módulo "Esqueci Minha Senha" -- Fluxo Completo

## Visão Geral

Implementar o fluxo profissional de recuperação de senha com 3 componentes:

1. **Link "Esqueci minha senha"** na tela de login (Auth.tsx)
2. **Modal de solicitação** para digitar o email e enviar o link de recuperação
3. **Página `/reset-password`** que recebe o token de recovery do Supabase, exibe formulário de nova senha, atualiza no banco e redireciona para `/auth` com a senha preenchida

## Alterações

### 1. `src/hooks/useAuth.ts`
- Adicionar função `resetPassword(email)` que chama `supabase.auth.resetPasswordForEmail()` com `redirectTo: window.location.origin + '/reset-password'`

### 2. `src/pages/Auth.tsx`
- Adicionar estado `showForgotPassword` e `forgotEmail`
- Abaixo do botão "Entrar", adicionar link "Esqueci minha senha"
- Ao clicar, exibir um modal/dialog com campo de email e botão para enviar
- Ler query param `?newPassword=1` para exibir toast de sucesso informando que a senha foi atualizada
- Ler query param `?prefillPassword=...` (valor base64) para pré-preencher o campo de senha no login

### 3. `src/pages/ResetPassword.tsx` (novo)
- Página pública que detecta `type=recovery` no URL hash (Supabase padrão)
- Formulário com: nova senha + confirmação de senha + toggle de visibilidade
- Validação: mínimo 6 caracteres, senhas coincidem
- Chama `supabase.auth.updateUser({ password })` para atualizar
- Após sucesso, faz sign out e redireciona para `/auth` com a nova senha codificada em base64 no query param para pré-preencher o campo

### 4. `src/App.tsx`
- Adicionar rota pública: `<Route path="/reset-password" element={<ResetPassword />} />`

## Fluxo do Usuário

```text
Login → "Esqueci minha senha" → Modal (digita email) → Email enviado
   ↓
Usuário clica link no email → /reset-password#access_token=...&type=recovery
   ↓
Formulário nova senha → Atualiza no Supabase → Sign out → Redirect /auth?prefillPassword=base64
   ↓
Tela de login com campo senha pré-preenchido + toast de sucesso
```

## Segurança
- A senha é passada via query param codificada em base64 apenas localmente (redirect instantâneo, sem persistência)
- O param é lido e removido da URL imediatamente após leitura
- Validação client-side de tamanho mínimo e confirmação

