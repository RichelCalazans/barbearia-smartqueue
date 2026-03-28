# DEPLOY_CONFIG.md — Deploy e Configuração

> Última atualização: 2026-03-27

---

## 1. Plataforma de Deploy

| Item | Valor |
|---|---|
| **Hosting** | Firebase Hosting |
| **CI/CD** | GitHub Actions (`.github/workflows/deploy.yml`) |
| **Branch de deploy** | `main` |
| **Build command** | `npm run build` (Vite) |
| **Output directory** | `dist/` |
| **SPA rewrite** | `"source": "**" → "/index.html"` (firebase.json) |

### Firebase Project
- **Project ID**: `smartqueue-aeb94`
- **Auth Domain**: `smartqueue-aeb94.firebaseapp.com`
- **App ID**: `1:421239139863:web:872f8bd522fb2e7e523652`
- **Measurement ID**: `G-1YW7Z2H1CT`

---

## 2. Variáveis de Ambiente

### `.env.local` (desenvolvimento)

| Variável | Obrigatória | Descrição | Onde Obter |
|---|---|---|---|
| `VITE_FIREBASE_API_KEY` | ✅ | API key do Firebase | Firebase Console → Project Settings → Web app |
| `GEMINI_API_KEY` | ❌ | API do Gemini (não usado no código atual) | Google AI Studio |

### GitHub Secrets (CI/CD)

| Secret | Obrigatório | Descrição | Onde Obter |
|---|---|---|---|
| `VITE_FIREBASE_API_KEY` | ✅ | Mesmo do .env.local | Firebase Console |
| `FIREBASE_SERVICE_ACCOUNT` | ✅ | Service account JSON para deploy | Firebase Console → Settings → Service accounts → Generate new private key |
| `FIREBASE_PROJECT_ID` | ✅ | `smartqueue-aeb94` | Firebase Console |
| `GITHUB_TOKEN` | ✅ (automático) | Provido automaticamente pelo GitHub Actions | N/A |

### Como Rotacionar Secrets
1. **Firebase API Key**: Firebase Console → Project Settings → Regenerate key → Atualizar `.env.local` e GitHub Secret
2. **Service Account**: Firebase Console → Service accounts → Generate new → Substituir no GitHub Secret
3. Após rotacionar, **forçar um novo deploy** com push na main

---

## 3. Banco de Dados (Firestore)

### Acesso
- **Console**: https://console.firebase.google.com/project/smartqueue-aeb94/firestore
- **Regras**: Arquivo `firestore.rules` (deployado junto com hosting)

### Collections em Produção
| Collection | Docs Estimados | Crescimento |
|---|---|---|
| `clients` | Centenas | Lento (novos clientes) |
| `queue` | Dezenas/dia | Cresce e limpa diariamente |
| `history` | Milhares | Cresce continuamente (cada atendimento) |
| `services` | ~10 | Quase estático |
| `config` | 2 docs fixos | Estático (settings + state) |
| `users` | ~5 | Quase estático |

### Backup Strategy
- **Não há backup automatizado** — debt técnico
- Firebase Firestore oferece export/import via `gcloud`:
  ```bash
  # Export (backup)
  gcloud firestore export gs://smartqueue-aeb94-backups/$(date +%Y%m%d)
  
  # Import (restore)
  gcloud firestore import gs://smartqueue-aeb94-backups/20260327
  ```
- **Recomendação**: Configurar Cloud Scheduler para backup diário

### Índices
- Firestore cria índices automaticamente para queries simples
- Índices compostos podem ser necessários para queries com `where` + `orderBy` em campos diferentes
- Se aparecer erro "requires an index", o Firebase loga um link direto para criar

### Connection Pool / Limits
- Firestore SDK no browser usa WebSocket persistente
- Sem configuração de pool (é gerenciado pelo SDK)
- Quota free tier: 50k reads, 20k writes, 20k deletes por dia
- Para a escala de uma barbearia, o free tier é mais que suficiente

---

## 4. Firestore Security Rules (RLS)

### Resumo de Permissões

| Collection | Read | Create | Update | Delete |
|---|---|---|---|---|
| `clients` | Público | Validado (campos obrigatórios + valores iniciais) | Autenticado + valid | Admin |
| `queue` | Público | Validado (campos + status AGUARDANDO) | Admin OU auto-cancel restrito | Admin |
| `history` | Admin | Admin | Admin | Admin |
| `services` | Público | Admin | Admin | Admin |
| `config/settings` | Autenticado | Autenticado | Autenticado | - |
| `config/state` | Autenticado | Autenticado | Autenticado | - |
| `users` | Owner/Admin | Admin | Admin | - |

### Admin Hardcoded nas Rules
```javascript
function isAdmin() {
  return isAuthenticated() &&
    (request.auth.token.email == "richelcalazans6@gmail.com" ||
     request.auth.token.email == "teste@teste.com" ||
     request.auth.uid == "x4dNFkgfUaM9cAr9n61JsU4oQ0v2");
}
```

### Deploy das Rules
As rules são deployadas automaticamente pelo CI/CD. Para deploy manual:
```bash
firebase deploy --only firestore:rules
```

---

## 5. CI/CD Pipeline

### GitHub Actions Workflow (`.github/workflows/`)

```
Push na main
    │
    ▼
[Checkout] → [Setup Node 22] → [npm install] → [npm run build] → [Firebase Deploy]
                                                     │                    │
                                           VITE_FIREBASE_API_KEY    FIREBASE_SERVICE_ACCOUNT
                                           (de GitHub Secrets)      FIREBASE_PROJECT_ID
```

### Notas
- Usa `Node 22.x`
- `FORCE_JAVASCRIPT_ACTIONS_TO_NODE24: true` — preparação para migração de junho 2026
- Deploy usa `FirebaseExtended/action-hosting-deploy@v0` com `channelId: live`
- PRs na main também disparam o workflow (preview channel)

---

## 6. Checklist Pré-Deploy

### Antes de Mergear na Main
- [ ] `npm run lint` passa sem erros (type check)
- [ ] `npm run build` compila com sucesso
- [ ] Testar manualmente as 3 rotas: `/`, `/login`, `/barber`
- [ ] Verificar que `firestore.rules` não foi alterado incorretamente
- [ ] Verificar que não há credenciais/secrets hardcoded no código
- [ ] Se mudou variáveis de ambiente: atualizar GitHub Secrets

### Após Deploy
- [ ] Acessar a URL de produção e verificar que o app carrega
- [ ] Testar login (email/senha)
- [ ] Testar entrada na fila como cliente
- [ ] Verificar no Firebase Console que as rules estão corretas

---

## 7. Rollback Procedure

### Se Deploy Quebrar
1. **Via Firebase Console**: Hosting → selecionar release anterior → "Rollback"
2. **Via CLI**:
   ```bash
   firebase hosting:channel:deploy live --version=PREVIOUS_VERSION_ID
   ```
3. **Via Git**: reverter o commit na main e deixar o CI/CD redeployar

### Se Rules Quebrarem
```bash
# Deploy rules de um commit anterior
git checkout COMMIT_HASH -- firestore.rules
firebase deploy --only firestore:rules
```

---

## 8. Monitoramento

### Logs
- **Firebase Console**: Firestore → Usage tab (reads, writes, deletes)
- **Browser Console**: Todos os erros Firestore logam via `handleFirestoreError` com auth info
- **GitHub Actions**: Logs de build/deploy por run

### Erros
- **Não há Sentry, LogRocket, ou error tracking formal**
- Erros são logados no `console.error` do browser
- Firebase Analytics está configurado (`measurementId: G-1YW7Z2H1CT`) mas sem eventos custom

### Performance
- **Não há monitoramento de performance formal**
- Vite build mostra tamanhos de chunks
- Firebase Hosting tem métricas básicas no console

### Uptime
- **Dependente do Firebase** — SLA de 99.95% para Firestore e Hosting
- Sem health check ou monitoring externo configurado

---

## 9. Domínio Custom

- **Não configurado** — app usa URL padrão do Firebase Hosting
- Para configurar: Firebase Console → Hosting → Add custom domain
