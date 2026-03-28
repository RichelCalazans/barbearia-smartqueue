# Agent 04: Add Date Filter to Dashboard

## Objetivo

Adicionar seletor de data na tela de Fila do barbeiro para visualizar e gerenciar agendamentos futuros.

## Contexto do Problema

O relatorio de QA identificou:
- Nao ha filtro de data ou aba de "agendamentos futuros" na interface do barbeiro
- A fila exibe apenas clientes do dia atual
- Barbeiro nao consegue ver agendamentos para dias futuros

**Codigo atual do `useQueue` (linhas 11-16):**
```tsx
const today = new Date().toISOString().split('T')[0];
const q = query(
  collection(db, 'queue'),
  where('data', '==', today), // <-- Hardcoded para hoje
  where('status', 'in', ['AGUARDANDO', 'EM_ATENDIMENTO']),
  orderBy('posicao', 'asc')
);
```

## Arquivos a Modificar

### 1. `src/hooks/useQueue.ts`

**Modificar para aceitar parametro de data:**

```tsx
export function useQueue(selectedDate?: string) {
  const [queue, setQueue] = useState<QueueItem[]>([]);

  useEffect(() => {
    const dateToQuery = selectedDate || new Date().toISOString().split('T')[0];

    const q = query(
      collection(db, 'queue'),
      where('data', '==', dateToQuery),
      where('status', 'in', ['AGUARDANDO', 'EM_ATENDIMENTO']),
      orderBy('posicao', 'asc')
    );

    const unsub = onSnapshot(q, (snapshot) => {
      const items = snapshot.docs.map(doc => ({
        id: doc.id,
        ...doc.data()
      })) as QueueItem[];
      setQueue(items);
    });

    return unsub;
  }, [selectedDate]); // <-- Re-subscribe quando data muda

  return { queue, waiting, inService };
}
```

### 2. `src/pages/BarberDashboard.tsx`

**Adicionar seletor de data na secao FILA:**

```tsx
// Adicionar estado para data selecionada
const [selectedQueueDate, setSelectedQueueDate] = useState<string>(
  new Date().toISOString().split('T')[0]
);

// Modificar uso do hook
const { queue, waiting, inService } = useQueue(selectedQueueDate);

// Adicionar UI de seletor de data (no topo da secao de Fila)
<div className="flex items-center gap-2 mb-4">
  <button
    onClick={() => setSelectedQueueDate(new Date().toISOString().split('T')[0])}
    className={selectedQueueDate === today ? 'bg-[#00D4A5]...' : 'bg-[#111]...'}
  >
    Hoje
  </button>
  <input
    type="date"
    value={selectedQueueDate}
    onChange={(e) => setSelectedQueueDate(e.target.value)}
    min={new Date().toISOString().split('T')[0]}
    className="..."
  />
</div>
```

## Tarefas

1. **Modificar `useQueue` hook**
   - Aceitar parametro opcional `selectedDate`
   - Default para data atual se nao fornecido
   - Re-subscribe quando data muda

2. **Adicionar UI de seletor de data**
   - Botao rapido "Hoje"
   - Input de data para selecionar data especifica
   - Limitar a datas futuras (min = hoje)

3. **Ajustar exibicao da fila**
   - Mostrar label indicando qual data esta sendo visualizada
   - Se data futura, desabilitar botoes "Chamar" e "Finalizar"
   - Mostrar mensagem se nao houver agendamentos

4. **Manter compatibilidade**
   - Outros componentes que usam `useQueue()` sem parametro continuam funcionando

## Criterios de Aceite

- [ ] Hook `useQueue` aceita parametro de data opcional
- [ ] Dashboard mostra seletor de data
- [ ] Ao selecionar data futura, fila mostra agendamentos daquele dia
- [ ] Botao "Hoje" volta para data atual
- [ ] Botoes de acao (Chamar, Finalizar) desabilitados para datas futuras
- [ ] Mensagem apropriada se nao houver agendamentos na data selecionada

## Testes

1. Acessar `/barber` como barbeiro
2. Verificar que fila mostra agendamentos de hoje
3. Clicar em data futura no seletor
4. Verificar que fila atualiza para a data selecionada
5. Se houver agendamentos futuros, verificar que aparecem
6. Clicar "Hoje" para voltar
7. Verificar que botoes de acao funcionam apenas para hoje

## Consideracoes

- Para datas futuras, o barbeiro pode ver agendamentos mas NAO pode chamar/finalizar
- Isso e apenas visualizacao, nao gerenciamento
- Acoes de gerenciamento so sao permitidas para o dia atual
