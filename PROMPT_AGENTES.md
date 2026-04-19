# PROMPT PARA AGENTES - CORREÇÕES DO SMARTQUEUE

## CONTEXTO DO PROJETO
SmartQueue é um sistema de fila virtual para barbearias construído com React 19 + TypeScript + Vite + Firebase (Firestore + Auth). O sistema permite que clientes entrem na fila pelo celular sem login, e que barbeiros gerenciem a fila via dashboard administrativo.

---

## INSTRUÇÕES GERAIS PARA OS AGENTES

Você é um desenvolvedor sênior especializado em React, TypeScript e Firebase. Sua tarefa é implementar correções críticas no projeto SmartQueue para que ele possa ser testado com um barbeiro real em produção.

**Regras importantes:**
1. Sempre leia o arquivo completo antes de modificar
2. Mantenha o estilo de código existente (formatação, naming conventions)
3. Adicione comentários apenas quando necessário para lógica complexa
4. Teste mentalmente cada mudança para garantir que não quebra funcionalidade existente
5. Priorize funcionalidade sobre perfeição - queremos um MVP estável rápido

---

## TAREFA 1: BUG-001 - Evitar entrada duplicada na fila
**PRIORIDADE: CRÍTICA | COMPLEXIDADE: Simples**

### Arquivos para modificar:
- `src/services/QueueService.ts` (função `addToQueue`)
- `src/pages/ClientView.tsx` (função `handleJoinQueue`)

### O que fazer:
Na função `addToQueue` do QueueService, ANTES de adicionar novo documento à fila:
1. Verificar se já existe um ticket ativo (status `AGUARDANDO` ou `CHAMADO`) para o mesmo `clienteId` na mesma data
2. Se existir, lançar erro: `"Voce ja possui um ticket ativo para hoje"`
3. No ClientView, capturar este erro e mostrar mensagem amigável ao usuário

### Código esperado (QueueService.ts):
```typescript
// Dentro de addToQueue, antes de addDoc:
const currentQueue = await getQueueItems();
const existingTicket = currentQueue.find(
  item => item.clienteId === client.id && 
  (item.status === 'AGUARDANDO' || item.status === 'CHAMADO')
);

if (existingTicket) {
  throw new Error('Voce ja possui um ticket ativo para hoje');
}
```

### Critério de aceitação:
- ✅ Cliente tentando entrar na fila duas vezes recebe mensagem de erro clara
- ✅ Não existem dois tickets ativos para o mesmo cliente no mesmo dia
- ✅ Mensagem de erro aparece no UI do cliente

---

## TAREFA 2: BUG-002 - Recalcular tempos quando cliente cancela
**PRIORIDADE: ALTA | COMPLEXIDADE: Média**

### Arquivos para modificar:
- `src/pages/ClientView.tsx` (função `handleCancel`)
- `src/services/QueueService.ts` (função `recalculateQueue`)

### O que fazer:
Quando um cliente cancela seu ticket, os tempos previstos dos demais clientes devem ser recalculados.

**Opção A (Simples - recomendada para MVP):**
1. No `handleCancel` do ClientView, após `QueueService.updateStatus(id, 'CANCELADO')`, emitir um evento customizado
2. No BarberDashboard, adicionar listener para este evento que chama `recalculateQueue`

**Opção B (Cloud Function - ideal para produção):**
1. Criar Cloud Function que dispara quando status muda para `CANCELADO`
2. Função chama `recalculateQueue` automaticamente

### Implementação Opção A:

No ClientView.tsx:
```typescript
const handleCancel = async () => {
  if (!activeTicket) return;
  try {
    await QueueService.updateStatus(activeTicket.id, 'CANCELADO');
    setActiveTicket(null);
    setStep('form');
    // Emitir evento para recalcular
    window.dispatchEvent(new CustomEvent('queue-recalculate'));
  } catch (error) {
    // ...
  }
};
```

No BarberDashboard.tsx (dentro do useEffect ou como novo useEffect):
```typescript
useEffect(() => {
  const handleRecalculate = async () => {
    const items = await QueueService.getQueueItems();
    const activeItems = items.filter(item => 
      item.status === 'AGUARDANDO' || item.status === 'CHAMADO'
    );
    if (activeItems.length > 0) {
      await QueueService.recalculateQueue(activeItems);
    }
  };

  window.addEventListener('queue-recalculate', handleRecalculate);
  return () => window.removeEventListener('queue-recalculate', handleRecalculate);
}, []);
```

### Critério de aceitação:
- ✅ Quando cliente cancela, tempos dos demais são atualizados
- ✅ Não há condições de race ou erros silenciosos
- ✅ Funciona mesmo se dashboard estiver aberto em outra aba

---

## TAREFA 3: BUG-005 - Validar formato de horaPrevista
**PRIORIDADE: BAIXA | COMPLEXIDADE: Simples**

### Arquivo para modificar:
- `src/services/TimePredictorService.ts` (função `addMinutes`)

### O que fazer:
Adicionar validação de formato na função `addMinutes`:

```typescript
static addMinutes(timeStr: string, minutesToAdd: number): string {
  const match = timeStr.match(/^(\d{2}):(\d{2})$/);
  if (!match) {
    console.error('Formato de tempo inválido:', timeStr);
    return '00:00';
  }
  
  const [, hoursStr, minsStr] = match;
  const hours = parseInt(hoursStr, 10);
  const mins = parseInt(minsStr, 10);
  
  // restante da lógica...
}
```

### Critério de aceitação:
- ✅ Função nunca retorna `NaN:NaN`
- ✅ Logs de erro claros quando formato é inválido
- ✅ Valor fallback seguro (`00:00`)

---

## TAREFA 4: ISSUE-006 - Centralizar emails de admin
**PRIORIDADE: ALTA | COMPLEXIDADE: Média**

### Arquivos para modificar:
- `src/hooks/useAuth.ts` (linha 7)
- `src/services/ConfigService.ts` (linha 22)
- Criar novo arquivo: `src/config/admin.ts`

### O que fazer:
1. Criar arquivo `src/config/admin.ts`:
```typescript
export const ADMIN_CONFIG = {
  SUPER_ADMIN_EMAILS: ['richelcalazans6@gmail.com', 'teste@teste.com'],
  BARBER_EMAIL: 'richelcalazans6@gmail.com',
} as const;
```

2. Em `useAuth.ts`, substituir:
```typescript
// ANTES:
const SUPER_ADMIN_EMAILS = ['richelcalazans6@gmail.com', 'teste@teste.com'];

// DEPOIS:
import { ADMIN_CONFIG } from '../config/admin';
// usar ADMIN_CONFIG.SUPER_ADMIN_EMAILS
```

3. Em `ConfigService.ts`, substituir:
```typescript
// ANTES:
BARBER_EMAIL: 'richelcalazans6@gmail.com',

// DEPOIS:
import { ADMIN_CONFIG } from '../config/admin';
// usar ADMIN_CONFIG.BARBER_EMAIL
```

4. Adicionar comentário em `firestore.rules` apontando para o arquivo de config

### Critério de aceitação:
- ✅ Emails definidos em APENAS um lugar
- ✅ Todos os imports funcionam corretamente
- ✅ Documentar no README como alterar admins

---

## TAREFA 5: ISSUE-007 - Validação de inputs do cliente
**PRIORIDADE: MÉDIA | COMPLEXIDADE: Média**

### Arquivos para modificar:
- Criar: `src/utils/validation.ts`
- `src/pages/ClientView.tsx`

### O que fazer:
1. Criar `src/utils/validation.ts`:
```typescript
export const validatePhone = (phone: string): string | null => {
  const cleaned = phone.replace(/\D/g, '');
  if (cleaned.length < 10 || cleaned.length > 11) {
    return 'Telefone deve ter 10 ou 11 dígitos';
  }
  return null;
};

export const validateName = (name: string): string | null => {
  if (name.trim().length < 3) {
    return 'Nome deve ter pelo menos 3 caracteres';
  }
  if (name.trim().length > 100) {
    return 'Nome muito longo (máximo 100 caracteres)';
  }
  return null;
};

export const validateBirthDate = (date: string): string | null => {
  if (!date.match(/^\d{2}\/\d{2}\/\d{4}$/)) {
    return 'Formato de data: DD/MM/AAAA';
  }
  
  const [day, month, year] = date.split('/').map(Number);
  const birthDate = new Date(year, month - 1, day);
  const today = new Date();
  const age = today.getFullYear() - birthDate.getFullYear();
  
  if (age < 10 || age > 120) {
    return 'Idade inválida';
  }
  
  return null;
};
```

2. No `ClientView.tsx`, usar validações antes de `handleJoinQueue`:
```typescript
const phoneError = validatePhone(telefone);
if (phoneError) {
  setFormError(phoneError);
  return;
}
```

### Critério de aceitação:
- ✅ Validações rodam antes de enviar ao Firebase
- ✅ Mensagens de erro claras para o usuário
- ✅ Dados inválidos nunca chegam ao Firestore

---

## TAREFA 6: BUG-004 - Fix login Google com timeout
**PRIORIDADE: MÉDIA | COMPLEXIDADE: Média**

### Arquivo para modificar:
- `src/pages/Login.tsx`

### O que fazer:
Adicionar timeout de 10 segundos e botão de retry:

```typescript
// Adicionar estado de timeout
const [loginTimeout, setLoginTimeout] = useState(false);

// useEffect para timeout
useEffect(() => {
  if (loading && !user) {
    const timer = setTimeout(() => {
      setLoginTimeout(true);
    }, 10000);
    return () => clearTimeout(timer);
  }
}, [loading, user]);

// No JSX, mostrar botão de retry
{loginTimeout && (
  <div className="text-center mt-4">
    <p className="text-yellow-400 mb-2">Login demorando muito?</p>
    <Button onClick={() => window.location.reload()}>
      Tentar novamente
    </Button>
  </div>
)}
```

### Critério de aceitação:
- ✅ Após 10s de loading, aparece mensagem amigável
- ✅ Botão "Tentar novamente" funciona
- ✅ Não há loops infinitos de redirect

---

## TAREFA 7: ISSUE-009 - Remover dependências não usadas
**PRIORIDADE: BAIXA | COMPLEXIDADE: Simples**

### Arquivo para modificar:
- `package.json`

### O que fazer:
Remover as seguintes dependências:
- `express`
- `@types/express`
- `dotenv`

Depois rodar: `npm install`

### Critério de aceitação:
- ✅ `npm install` roda sem erros
- ✅ `npm run dev` funciona normalmente
- ✅ Build funciona: `npm run build`

---

## TAREFA 8: ISSUE-010 - Migrar para React Router
**PRIORIDADE: MÉDIA | COMPLEXIDADE: Média**

### Arquivos para modificar:
- `src/App.tsx`
- `src/pages/Login.tsx`
- `src/pages/BarberDashboard.tsx`

### O que fazer:
Substituir roteamento manual por `react-router-dom`:

**App.tsx:**
```typescript
import { BrowserRouter, Routes, Route, Navigate } from 'react-router-dom';
import { useAuth } from './hooks/useAuth';

function ProtectedRoute({ children }: { children: React.ReactNode }) {
  const { user, isAdmin, loading } = useAuth();
  if (loading) return <div>Carregando...</div>;
  if (!user || !isAdmin) return <Navigate to="/login" />;
  return <>{children}</>;
}

function App() {
  return (
    <BrowserRouter>
      <Routes>
        <Route path="/" element={<ClientView />} />
        <Route path="/login" element={<Login />} />
        <Route 
          path="/barber" 
          element={
            <ProtectedRoute>
              <BarberDashboard />
            </ProtectedRoute>
          } 
        />
      </Routes>
    </BrowserRouter>
  );
}
```

**Login.tsx:**
```typescript
import { useNavigate } from 'react-router-dom';

// substituir window.location.href por:
const navigate = useNavigate();
navigate('/barber');
```

### Critério de aceitação:
- ✅ Navegação funciona sem reload de página
- ✅ Route guard protege `/barber`
- ✅ Botão back/forward do browser funcionam
- ✅ URL reflete a página atual

---

## ORDEM DE EXECUÇÃO

Execute as tarefas na seguinte ordem:

1. **TAREFA 1** - BUG-001 (fila duplicada) - CRÍTICO
2. **TAREFA 2** - BUG-002 (recalcular tempos) - ALTA
3. **TAREFA 3** - BUG-005 (validar hora) - BAIXA
4. **TAREFA 5** - ISSUE-007 (validação inputs) - MÉDIA
5. **TAREFA 6** - BUG-004 (login Google) - MÉDIA
6. **TAREFA 4** - ISSUE-006 (centralizar admin) - ALTA
7. **TAREFA 7** - ISSUE-009 (dependências) - BAIXA
8. **TAREFA 8** - ISSUE-010 (React Router) - MÉDIA

---

## CRITÉRIOS GERAIS DE ACEITAÇÃO

Após todas as correções:

✅ `npm run dev` inicia sem erros
✅ `npm run build` gera build sem erros de TypeScript
✅ Cliente consegue entrar na fila sem duplicatas
✅ Cliente consegue cancelar e tempos são recalculados
✅ Validações de formulário funcionam
✅ Login Google tem timeout e retry
✅ Dashboard do barbeiro protegido por auth
✅ URLs funcionam corretamente com React Router

---

## NOTAS FINAIS

- **NÃO** remova funcionalidades existentes
- **NÃO** mude a estrutura de pastas
- **NÃO** altere TypeScript config ou Vite config
- **SEMPRE** teste mentalmente edge cases (cliente sem internet, múltiplas abas, etc.)
- **DOCUMENTE** mudanças importantes em comentários se necessário

Boa sorte! 🚀
