# Plano: Admin com Custom Claims

## Objetivo

Trocar a autorizacao baseada em email hardcoded por custom claims do Firebase Auth, mantendo a collection `users` como fonte administrativa e fallback temporario para evitar lockout do owner.

## Estado Atual

- `src/config/admin.ts` define `SUPER_ADMIN_EMAILS`.
- `src/hooks/useAuth.ts` concede `SUPER_ADMIN` diretamente por email antes de consultar `users`.
- `firestore.rules` replica a lista de emails em `isSuperAdmin()`.
- `users/{uid}` ja existe como modelo de permissoes, com `role`, `permissions` e `ativo`.

## Decisao

Usar script local com `firebase-admin`, nao Cloud Function. O volume esperado e pequeno, e a operacao e administrativa, manual e rara.

## Fase 1: Preparar Claims Sem Quebrar Fallback

- Adicionar `firebase-admin` como dependencia de desenvolvimento ou dependencia do script.
- Criar script local, por exemplo `scripts/sync-admin-claims.ts`, que:
  - recebe `uid` ou `email`;
  - le o documento `users/{uid}` quando existir;
  - calcula claims a partir de `role`, `permissions` e `ativo`;
  - aplica `auth.setCustomUserClaims(uid, claims)`;
  - opcionalmente cria ou atualiza o doc `users/{uid}` para o owner.
- Claims sugeridas:
  - `role`: `SUPER_ADMIN`, `ADMIN`, `BARBEIRO` ou `RECEPCIONISTA`;
  - `permissions`: array de permissoes efetivas;
  - `isAdmin`: true para `SUPER_ADMIN` e `ADMIN`;
  - `isQueueManager`: true para quem pode gerenciar fila;
  - `ativo`: boolean.

## Fase 2: Client Usa Claims Com Fallback

- Atualizar `useAuth` para chamar `firebaseUser.getIdTokenResult(true)` no login.
- Derivar permissoes primeiro das claims.
- Manter fallback para:
  - `SUPER_ADMIN_EMAILS`;
  - busca em `UserService.findById(uid)`;
  - permissao por `users/{uid}` enquanto a migracao roda.
- Exibir erro claro se usuario autenticado nao tiver claim nem doc ativo.

## Fase 3: Rules Aceitam Claims e Collection

- Atualizar `firestore.rules` para aceitar claims como caminho principal:
  - `request.auth.token.role in [...]`;
  - `request.auth.token.isAdmin == true`;
  - `request.auth.token.isQueueManager == true`.
- Manter `exists(/users/uid)` como fallback temporario.
- Manter `isSuperAdmin()` por email ate confirmar que o owner consegue relogar com claims.
- Deployar rules com `firebase deploy --only firestore:rules`.

## Fase 4: Migrar Usuarios

- Rodar script para o owner primeiro.
- Fazer logout/login ou forcar refresh do token no client.
- Confirmar acesso a:
  - `/barber`;
  - gerenciamento de usuarios;
  - gerenciamento de servicos;
  - escrita em `config/settings`;
  - escrita em `queue`.
- Rodar script para os demais usuarios cadastrados.

## Fase 5: Cleanup Seguro

Executar somente depois de pelo menos alguns dias de uso validado.

- Remover `SUPER_ADMIN_EMAILS` como regra de autorizacao principal.
- Remover lista hardcoded de `firestore.rules`.
- Manter um procedimento documentado para recriar claims do owner via script.
- Atualizar `docs/ONBOARDING.md` e `docs/DEPLOY_CONFIG.md` com o fluxo de adicionar admin.

## Validacao

- `npm run lint`
- `npm run build`
- Deploy de rules.
- Login manual com owner.
- Login manual com usuario `BARBEIRO` ou `RECEPCIONISTA`.
- Tentativa manual de acessar acao proibida com usuario sem permissao.

## Rollback

- Reverter rules para aceitar email hardcoded.
- Manter o script idempotente para reaplicar claims.
- A branch de backup informada foi `backup/pre-refactor-2026-04-26` no commit `28102b5`.
