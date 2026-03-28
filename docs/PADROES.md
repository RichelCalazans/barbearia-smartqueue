# PADROES.md — Convenções e Padrões do SmartQueue

> Última atualização: 2026-03-27

---

## 1. Componentes React

### Estrutura de Arquivo
- **Arquivo único** por componente (não usa folder structure com index.ts)
- Componentes em `src/components/` — reutilizáveis, sem lógica de negócio
- Páginas em `src/pages/` — contêm lógica de negócio, chamam services

### Padrão de Props
- **Inline types** com interfaces nomeadas no mesmo arquivo
- Sem arquivos `.types.ts` separados (tipos globais ficam em `src/types/index.ts`)

```tsx
// ✅ Padrão atual
interface ButtonProps extends React.ButtonHTMLAttributes<HTMLButtonElement> {
  variant?: 'primary' | 'secondary' | 'danger' | 'ghost' | 'outline';
  size?: 'sm' | 'md' | 'lg' | 'icon';
  children: ReactNode;
  loading?: boolean;
}

export function Button({ variant = 'primary', size = 'md', ...props }: ButtonProps) { ... }
```

### State Management
- **useState** para estado local (predominante em todo o projeto)
- **useEffect** para side effects e subscriptions do Firestore
- **NÃO usa** Context API, Zustand, Redux, ou qualquer state manager global
- Estado global (config, auth) é carregado via hooks em cada página que precisa

### Styling
- **Tailwind CSS v4** com plugin Vite (`@tailwindcss/vite`)
- Utilitário `cn()` via `clsx` + `tailwind-merge` em `src/utils.ts`
- Theme customizado em `src/index.css` via `@theme` (fontes Inter e JetBrains Mono)
- Design system dark-first com cores fixas:
  - Background: `#0A0A0A` (preto principal), `#111111` (cards), `#1A1A1A` (hover)
  - Texto: `#F1F5F9` (principal), `#64748B` (secundário), `#94A3B8` (placeholder)
  - Accent: `#00D4A5` (verde SmartQueue)
  - Danger: `#EF4444`
  - Warning: `#EAB308`
  - Border: `#1E1E1E`

### Naming
- **PascalCase** para componentes: `BarberDashboard`, `ServiceChip`
- **camelCase** para hooks: `useAuth`, `useQueue`
- **PascalCase** para services (classes estáticas): `QueueService`, `ClientService`
- **SCREAMING_SNAKE** para constantes de config: `BUFFER_MINUTES`, `EWMA_ALPHA`
- **camelCase** para variáveis e funções: `handleCallNext`, `totalWaiting`

### Exports
- Componentes: **named exports** (`export function Button`)
- App.tsx: **default export** (`export default function App`)
- Pages: **named exports** (com dynamic import usando `.then(m => ({ default: m.X }))`)

---

## 2. Services (Camada de Dados)

### Padrão de Classe Estática
Todos os services seguem o mesmo padrão:

```typescript
export class NomeService {
  private static COLLECTION = 'nome_collection';

  static async metodo(params): Promise<ReturnType> {
    const path = this.COLLECTION; // ou path específico
    try {
      // Operação Firestore
      // ...
      return resultado;
    } catch (error) {
      handleFirestoreError(error, OperationType.TIPO, path);
      return fallback; // [] para listas, null para objetos
    }
  }
}
```

### Regras dos Services
1. **Sempre** usar `handleFirestoreError` no catch — loga auth info para debug
2. **Sempre** declarar `const path` antes do try — usado no error handler
3. Métodos são **estáticos** — sem instanciação
4. **Não** fazer validação de input nos services — Firestore rules fazem isso
5. Retornar **fallback** seguro no catch (nunca crash silencioso)

### Operações Atômicas
- `runTransaction` quando múltiplas collections precisam ser consistentes (ex: `finalizeAttendance`)
- `writeBatch` quando múltiplos docs da mesma collection precisam ser atualizados juntos (ex: `recalculateQueue`)

---

## 3. API / Firestore Operations

### Auth Pattern
Não há middleware — a verificação é feita de duas formas:
1. **Firestore Security Rules** — validação server-side no próprio Firestore
2. **useAuth hook** — verificação client-side de admin (hardcoded emails + Firestore `users` collection)

```typescript
const ADMIN_EMAILS = ['richelcalazans6@gmail.com', 'teste@teste.com'];
```

### Error Handling
Todas as operações Firestore passam pelo handler centralizado:

```typescript
handleFirestoreError(error, OperationType, path)
// → Loga: mensagem, auth info (uid, email, provider), operação, path
// → Throws: Error com JSON stringificado do contexto
```

Enum de operações: `CREATE`, `UPDATE`, `DELETE`, `LIST`, `GET`, `WRITE`

### Validação
- **Sem Zod, sem Yup, sem validação manual no client** (exceto checks básicos de form)
- Validação principal está nas **Firestore Security Rules**:
  - `hasRequiredFields(['campo1', 'campo2'])` — garante presença
  - `hasOnlyAllowedFields(['campo1', 'campo2'])` — impede campos extras
  - Validadores de domínio: `isValidClient`, `isValidQueueItem`

### Rate Limiting
- **Não existe** rate limiting implementado
- Dependente das quotas padrão do Firebase/Firestore

---

## 4. Firestore Security Rules

### Padrão de Helper Functions
```javascript
function isAuthenticated() { return request.auth != null; }
function isOwner(userId) { return isAuthenticated() && request.auth.uid == userId; }
function isAdmin() {
  return isAuthenticated() &&
    (request.auth.token.email == "richelcalazans6@gmail.com" ||
     request.auth.token.email == "teste@teste.com" ||
     request.auth.uid == "x4dNFkgfUaM9cAr9n61JsU4oQ0v2");
}
```

### Regra de Ouro para Novas Collections
```
1. Leitura pública? → allow get, list: if true;
2. Precisa de auth? → allow read: if isAuthenticated();
3. Só admin? → allow read: if isAdmin();
4. Escrita? → SEMPRE validar com hasRequiredFields + hasOnlyAllowedFields
5. Delete? → Quase sempre isAdmin()
```

---

## 5. Database

### Nomeação
- Collections: **camelCase** em português (`clients`, `queue`, `history`, `services`, `config`, `users`)
- Campos: **camelCase** em português (`clienteNome`, `horaEntrada`, `tempoEstimado`)
- IDs: auto-gerados pelo Firestore (exceto services que usam `SRV` + timestamp)
- Datas como string: `YYYY-MM-DD` (campo `data`)
- Timestamps como `number` (milliseconds, `Date.now()`)

### Campos Padrão
Não há `createdAt`/`updatedAt` universal. Cada collection tem seus próprios:
- `clients.dataCadastro` — timestamp de criação
- `queue.horaEntrada` — timestamp de entrada na fila
- `users.createdAt` — timestamp de criação

### Soft Delete
- **Não implementado** na maioria das collections
- `clients.ativo` — funciona como soft delete (filtros por `ativo: true`)
- `services.ativo` — idem

### Migrations
- **Não existem** migrations formais — Firestore é schema-less
- `ConfigService.initialize()` faz migration inline: se campos novos não existem, adiciona valores default
- `ServiceService.initialize()` — seed de serviços padrão se collection vazia

---

## 6. Testes

### Framework
- **Nenhum framework de testes configurado**
- `package.json` tem script `lint: "tsc --noEmit"` — apenas type checking
- Sem Jest, Vitest, Playwright, ou Cypress

### Como Rodar
```bash
npm run lint    # TypeScript type check (única verificação existente)
npm run build   # Build — falha se houver erros de compilação
```

---

## 7. UI Patterns

### Design Tokens (Cores)
```css
/* Backgrounds */
--bg-primary: #0A0A0A
--bg-card: #111111
--bg-hover: #1A1A1A

/* Text */
--text-primary: #F1F5F9
--text-secondary: #64748B
--text-placeholder: #94A3B8

/* Accent */
--accent: #00D4A5
--danger: #EF4444
--warning: #EAB308

/* Border */
--border: #1E1E1E
```

### Componente Modal Pattern
Todas as ações destrutivas/importantes passam por Modal de confirmação:
1. Usuário clica botão → `setModalType('TIPO')` + `setIsModalOpen(true)`
2. Modal mostra descrição da ação
3. Footer: Cancelar + Confirmar
4. `handleAction()` faz switch por modalType

### Loading States
- Telas inteiras: `<ScissorsLoading />` — tesoura animada com texto
- Componentes parciais: `<Skeleton />` — placeholders pulsantes
- Botões: `loading` prop → spinner inline
