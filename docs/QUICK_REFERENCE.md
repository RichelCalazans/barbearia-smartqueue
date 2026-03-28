# ⚡ Quick Reference — SmartQueue

> Consulta rápida para tarefas comuns

---

## Adicionar Nova Página/Rota

1. Criar arquivo em `src/pages/MinhaPagina.tsx`
2. Adicionar lazy import em `src/App.tsx`:
   ```typescript
   const MinhaPagina = lazy(() => import('./pages/MinhaPagina').then(m => ({ default: m.MinhaPagina })));
   ```
3. Adicionar case no `renderPage()`:
   ```typescript
   case '/minha-rota':
     return <MinhaPagina />;
   ```

---

## Criar Novo Componente

Arquivo `src/components/MeuComponente.tsx`:

```tsx
interface MeuComponenteProps {
  titulo: string;
  onClick?: () => void;
}

export function MeuComponente({ titulo, onClick }: MeuComponenteProps) {
  return (
    <div className="bg-[#111111] rounded-2xl p-6 border border-[#1E1E1E]">
      <h2 className="text-[#F1F5F9] font-bold">{titulo}</h2>
    </div>
  );
}
```

---

## Criar Novo Service

Arquivo `src/services/MeuService.ts`:

```typescript
import { collection, getDocs } from 'firebase/firestore';
import { db, handleFirestoreError, OperationType } from '../firebase';

export class MeuService {
  private static COLLECTION = 'minha_collection';

  static async listar(): Promise<any[]> {
    const path = this.COLLECTION;
    try {
      const snapshot = await getDocs(collection(db, path));
      return snapshot.docs.map(doc => ({ id: doc.id, ...doc.data() }));
    } catch (error) {
      handleFirestoreError(error, OperationType.LIST, path);
      return [];
    }
  }
}
```

---

## Usar Hook para Dados em Realtime

Exemplo: `useQueue.ts`

```typescript
import { useEffect, useState } from 'react';
import { onSnapshot, collection, query, where } from 'firebase/firestore';
import { db } from '../firebase';

export function useQueue() {
  const [queue, setQueue] = useState<QueueItem[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const today = new Date().toISOString().split('T')[0];
    const q = query(
      collection(db, 'queue'),
      where('data', '==', today)
    );

    const unsubscribe = onSnapshot(q, snapshot => {
      setQueue(snapshot.docs.map(doc => ({ id: doc.id, ...doc.data() })));
      setLoading(false);
    });

    return () => unsubscribe();
  }, []);

  return { queue, loading };
}
```

---

## Chamar API do Firestore (CRUD)

### Create
```typescript
await addDoc(collection(db, 'clients'), {
  nome: 'João',
  telefone: '11999999999',
  dataCadastro: Date.now(),
});
```

### Read
```typescript
const snap = await getDoc(doc(db, 'clients', 'clientId'));
console.log(snap.data());
```

### Update
```typescript
await updateDoc(doc(db, 'clients', 'clientId'), {
  nome: 'João Silva',
});
```

### Delete
```typescript
await deleteDoc(doc(db, 'clients', 'clientId'));
```

---

## Operações Atômicas

### Transaction (múltiplas collections)
```typescript
await runTransaction(db, async (transaction) => {
  const docRef = doc(db, 'clients', 'id1');
  const docSnap = await transaction.get(docRef);
  
  transaction.update(docRef, { visitas: docSnap.data().visitas + 1 });
  transaction.set(doc(db, 'history', 'newHistoryId'), { /* ... */ });
});
```

### Batch (mesma collection)
```typescript
const batch = writeBatch(db);

docs.forEach(doc => {
  batch.update(doc(db, 'queue', doc.id), { status: 'CONCLUIDO' });
});

await batch.commit();
```

---

## Usar Cores/Theme

Tailwind customizado (ver `src/index.css`):

```tsx
// Background
className="bg-[#0A0A0A]"  // Preto principal
className="bg-[#111111]"  // Cards
className="bg-[#1A1A1A]"  // Hover

// Text
className="text-[#F1F5F9]"    // Principal
className="text-[#64748B]"    // Secundário
className="text-[#94A3B8]"    // Placeholder

// Accent
className="text-[#00D4A5]"    // Verde SmartQueue

// Border
className="border-[#1E1E1E]"
```

---

## Usar Componentes Builtin

### Button
```tsx
<Button variant="primary" size="md" onClick={() => {}}>
  Clique aqui
</Button>
```
Variantes: `primary`, `secondary`, `danger`, `ghost`, `outline`
Sizes: `sm`, `md`, `lg`, `icon`

### Card
```tsx
<Card className="p-6 space-y-4">
  Conteúdo
</Card>
```

### Modal
```tsx
const [isOpen, setIsOpen] = useState(false);

<Modal
  isOpen={isOpen}
  onClose={() => setIsOpen(false)}
  title="Título"
  footer={<Button onClick={() => console.log('ok')}>OK</Button>}
>
  Conteúdo do modal
</Modal>
```

### Input
```tsx
<Input
  label="Nome"
  type="text"
  value={nome}
  onChange={e => setNome(e.target.value)}
  error={erro ? 'Campo obrigatório' : undefined}
/>
```

---

## Manipular Estado da Agenda

```typescript
// Abrir agenda
await ConfigService.toggleAgenda(true);

// Fechar agenda
await ConfigService.toggleAgenda(false);

// Pausar por 30 minutos
await ConfigService.togglePause(true, 30);

// Retomar
await ConfigService.togglePause(false);
```

---

## Acessar Configurações

```typescript
import { ConfigService } from '../services/ConfigService';

useEffect(() => {
  const unsubConfig = ConfigService.onConfigChange(config => {
    console.log('BUFFER_MINUTES:', config.BUFFER_MINUTES);
  });
  return unsubConfig;
}, []);
```

---

## Verificar se Usuário é Admin

```typescript
import { useAuth } from '../hooks/useAuth';

function MeuComponente() {
  const { user, isAdmin } = useAuth();
  
  if (!isAdmin) {
    return <div>Acesso negado</div>;
  }
  
  return <div>Só admins veem isso</div>;
}
```

---

## Tratar Erros do Firestore

Automático via `handleFirestoreError`:

```typescript
try {
  // operação firestore
} catch (error) {
  handleFirestoreError(error, OperationType.CREATE, 'clients');
  // Loga: mensagem, uid, email, provider, operação, collection
}
```

---

## Formatar Tempo

```typescript
import { TimePredictorService } from '../services/TimePredictorService';

// String HH:MM
const hoje = '14:30';
const novaHora = TimePredictorService.addMinutes(hoje, 45); // '15:15'

// Minutos formatado
TimePredictorService.formatTime(90); // '1h30m'
```

---

## Calcular EWMA

```typescript
const novaMedia = TimePredictorService.calculateNewAverage(
  30,      // tempo real observado
  25,      // média anterior
  0.3      // alpha (peso do dado novo)
); // ≈ 27.5
```

---

## Deploy

```bash
# Build
npm run build

# Preview local
npm run preview

# Deploy automático (push na main) via GitHub Actions

# Deploy manual
firebase deploy

# Apenas rules
firebase deploy --only firestore:rules

# Rollback
firebase hosting:channel:deploy live --version=<VERSION_ID>
```

---

## Debug

```bash
# Type check
npm run lint

# Ver o que foi construído
ls -lh dist/

# Limpar
npm run clean
```

---

## Padrão de Naming

| O Quê | Padrão | Exemplo |
|---|---|---|
| Componentes | PascalCase | `BarberDashboard.tsx` |
| Hooks | camelCase + `use` | `useAuth.ts` |
| Services | PascalCase | `QueueService.ts` |
| Variáveis | camelCase | `totalClientes` |
| Constantes | SCREAMING_SNAKE | `MAX_DAILY_CLIENTS` |
| Firestore collections | camelCase | `queue`, `clients` |
| Firestore campos | camelCase pt-BR | `clienteNome`, `horaEntrada` |

---

## Mais Informações

- Padrões completos → [`docs/PADROES.md`](./PADROES.md)
- Features → [`docs/FEATURES.md`](./FEATURES.md)
- Fluxos → [`docs/FLUXOS.md`](./FLUXOS.md)
- Bugs/Roadmap → [`docs/PROBLEMAS_ROADMAP.md`](./PROBLEMAS_ROADMAP.md)

