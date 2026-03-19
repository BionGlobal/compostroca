

# Liberar funções de delete e role update para local_admin

## Situação atual
Na página `PendingUsers.tsx` (linha 187-188), as funções `deleteUser` e `updateUserRole` são passadas ao componente `ApprovedUsersList` **apenas se o usuário for `super_admin`**:

```typescript
onDeleteUser={isSuperAdmin ? deleteUser : undefined}
onRoleUpdate={isSuperAdmin ? updateUserRole : undefined}
```

Isso faz com que os botões de excluir e alterar papel só apareçam para super admins.

## Alteração necessária

**Arquivo: `src/pages/PendingUsers.tsx` (linhas 187-188)**

Trocar a condição `isSuperAdmin` por `isAdmin` (super_admin **ou** local_admin):

```typescript
const isAdmin = profile?.user_role === 'super_admin' || profile?.user_role === 'local_admin';
```

E usar `isAdmin` nas props:
```typescript
onDeleteUser={isAdmin ? deleteUser : undefined}
onRoleUpdate={isAdmin ? updateUserRole : undefined}
```

**Restrição de segurança**: local_admin não deve poder alterar papel de um super_admin. Essa proteção já existe no componente `ApprovedUsersList.tsx` (linha 155): o botão de deletar só aparece se `user.user_role !== 'super_admin'`. Porém, para `onRoleUpdate`, precisamos garantir que local_admin não possa promover alguém a super_admin — isso será tratado no `UserRoleEditor` ou `UserDetailsModal` filtrando as opções.

**Nenhuma alteração de banco necessária** — a RLS policy de UPDATE em `profiles` já permite `is_super_admin()` OU `auth.uid() = user_id`, e a função `useUserManagement.deleteUser` faz um UPDATE (soft delete), que passa pela policy existente. Porém, o `updateUserRole` também usa UPDATE e a policy `Super admins can update user status and roles` exige `is_super_admin()`. Precisamos adicionar uma policy para que `local_admin` aprovados também possam fazer UPDATE em profiles (exceto promover a super_admin).

### Resumo das alterações:
1. **`src/pages/PendingUsers.tsx`**: Criar variável `isAdmin` e usá-la para liberar delete/role update
2. **RLS (migration)**: Adicionar policy permitindo `local_admin` aprovados fazerem UPDATE em profiles (apenas em usuários não-super_admin)
3. **Componente de edição de papel**: Garantir que local_admin não veja opção "super_admin" no seletor de papéis

