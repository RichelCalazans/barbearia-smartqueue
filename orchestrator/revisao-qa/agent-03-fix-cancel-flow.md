# Agent 03: Fix Cancel Flow

## Objetivo

Corrigir o fluxo de "Cancelar minha vez" para que o usuario retorne a tela inicial de agendamento com o formulario limpo, em vez de ir para a tela de cadastro.

## Contexto do Problema

O relatorio de QA identificou:
- Ao clicar em "Cancelar minha vez" na tela de ticket ativo
- O app vai para a tela de cadastro de novo cliente
- Nome pre-preenchido mas data vazia
- Deveria voltar a tela inicial de agendamento (com "Hoje" e "Em breve...")

**Codigo atual (linhas 184-196):**
```tsx
const handleCancel = async () => {
  if (!activeTicket) return;
  setCancelling(true);
  try {
    await QueueService.updateStatus(activeTicket.id, 'CANCELADO');
    localStorage.removeItem('sq_ticket_id');
    setTicketId(null);
    // PROBLEMA: Nao reseta outros estados do formulario
  } catch (err) {
    setError('Erro ao cancelar. Tente novamente.');
  } finally {
    setCancelling(false);
  }
};
```

## Arquivos a Modificar

### `src/pages/ClientView.tsx`

**Funcao `handleCancel`** (linhas 184-196)

## Tarefas

1. **Resetar estados do formulario apos cancelamento**
   - `setSelectedServices([])`
   - `setDataAgendamento('')`
   - `setSelectedDateInfo(null)`
   - `setShowDateSelector(false)`
   - `setStep(1)`
   - `setError(null)`

2. **Adicionar feedback de sucesso**
   - Mostrar mensagem temporaria de "Agendamento cancelado com sucesso"
   - Ou usar toast notification se disponivel

3. **Manter dados do cliente**
   - NAO resetar `nome`, `telefone`, `dataNascimento` (dados do cliente)
   - Esses dados facilitam novo agendamento

## Codigo Corrigido

```tsx
const handleCancel = async () => {
  if (!activeTicket) return;
  setCancelling(true);
  try {
    await QueueService.updateStatus(activeTicket.id, 'CANCELADO');
    localStorage.removeItem('sq_ticket_id');
    setTicketId(null);

    // Resetar estados do formulario para tela inicial
    setSelectedServices([]);
    setDataAgendamento('');
    setSelectedDateInfo(null);
    setShowDateSelector(false);
    setStep(1);
    setError(null);

    // Opcional: feedback de sucesso (mensagem temporaria)
    // setSuccessMessage('Agendamento cancelado com sucesso');
    // setTimeout(() => setSuccessMessage(null), 3000);

  } catch (err) {
    setError('Erro ao cancelar. Tente novamente.');
  } finally {
    setCancelling(false);
  }
};
```

## Criterios de Aceite

- [ ] Apos cancelar, usuario ve a tela inicial (Step 1)
- [ ] Botoes "Hoje" e "Em breve..." visiveis
- [ ] Lista de servicos sem selecao
- [ ] Formulario pronto para novo agendamento
- [ ] Nenhum erro exibido apos cancelamento bem-sucedido

## Testes

1. Entrar na fila como cliente
2. Ver ticket ativo com posicao
3. Clicar "Cancelar minha vez"
4. Verificar que volta para tela inicial
5. Verificar que botao "Hoje" esta selecionado
6. Verificar que nenhum servico esta selecionado
7. Verificar que pode iniciar novo agendamento normalmente
