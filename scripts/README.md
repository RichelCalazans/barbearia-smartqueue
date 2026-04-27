# Scripts administrativos

## Sincronizar custom claims

O script `sync-admin-claims.ts` sincroniza as claims administrativas do Firebase Auth para um usuario existente. Ele resolve o usuario por `--email` ou `--uid`, le `users/{uid}` quando existir e aplica estas claims:

- `role`
- `permissions`
- `isAdmin`
- `isQueueManager`
- `ativo`

`SUPER_ADMIN` sempre recebe todas as permissoes de `ROLE_PERMISSIONS.SUPER_ADMIN`.

### Credenciais

Use uma destas opcoes antes de rodar:

```sh
export FIREBASE_PROJECT_ID=smartqueue-aeb94
export GOOGLE_APPLICATION_CREDENTIALS=/caminho/service-account.json
```

Ou:

```sh
export FIREBASE_PROJECT_ID=smartqueue-aeb94
export FIREBASE_SERVICE_ACCOUNT='{"type":"service_account",...}'
```

`FIREBASE_SERVICE_ACCOUNT` tambem aceita caminho com `@`, por exemplo `@/caminho/service-account.json`.

### Exemplos

Sincronizar claims a partir do doc `users/{uid}`:

```sh
npx tsx scripts/sync-admin-claims.ts --email richelcalazans6@gmail.com
```

Criar/atualizar o doc do owner e aplicar claims de super admin:

```sh
npx tsx scripts/sync-admin-claims.ts \
  --email richelcalazans6@gmail.com \
  --role SUPER_ADMIN \
  --ativo true \
  --write-user-doc
```

Simular sem escrever:

```sh
npx tsx scripts/sync-admin-claims.ts --uid UID_DO_USUARIO --role ADMIN --dry-run
```

Depois de aplicar claims, faca logout/login no client ou force refresh do token para o usuario receber o novo token.
