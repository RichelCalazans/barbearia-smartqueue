# Agent 02: Fix "Agenda Fechada" View

## Objetivo

Modificar a tela "Agenda Fechada" para oferecer a opcao de agendar para dias futuros via botao "Em breve...", mesmo quando a agenda do dia atual esta fechada.

## Contexto do Problema

O relatorio de QA identificou:
- Quando a agenda esta fechada, a tela mostra apenas mensagem "Agenda Fechada"
- Nao ha opcao de agendar para dias futuros
- O botao "Em breve..." deveria estar acessivel nesta tela

**Comportamento atual (linhas 309-327):**
```tsx
if (!state?.agendaAberta) {
  return (
    <div>
      <AlertCircle />
      <h1>Agenda Fechada</h1>
      <p>O barbeiro ainda nao liberou a agenda para hoje...</p>
      <Button onClick={reload}>Atualizar Pagina</Button>
    </div>
  );
}
```

## Arquivos a Modificar

### `src/pages/ClientView.tsx` (linhas 309-327)

**Secao:** `// === AGENDA CLOSED ===`

## Tarefas

1. **Modificar a tela "Agenda Fechada"**
   - Manter a mensagem sobre agenda de hoje
   - Adicionar secao para agendar em dias futuros
   - Incluir o seletor de datas (reutilizar componente existente)

2. **Separar conceitos**
   - "Agenda fechada para HOJE" vs "Agenda fechada PERMANENTEMENTE"
   - Se ha dias futuros disponiveis, mostrar opcao

3. **Fluxo de agendamento futuro**
   - Permitir que o usuario selecione data futura
   - Continuar o fluxo normal de agendamento (servicos, cadastro, etc)

## Novo Layout Proposto

```tsx
// === AGENDA CLOSED ===
if (!state?.agendaAberta) {
  // Verificar se ha datas futuras disponiveis
  const hasFutureDates = availableDates.some(d => !d.disabled && d.date !== today);

  return (
    <div className="min-h-screen bg-[#0A0A0A] p-6">
      <header className="mb-10 space-y-1">
        <h1 className="text-sm font-bold uppercase tracking-[0.2em] text-[#00D4A5]">
          {config?.SHOP_NAME || 'SmartQueue'}
        </h1>
      </header>

      <main className="max-w-md mx-auto space-y-6">
        {/* Mensagem de agenda fechada hoje */}
        <Card className="text-center space-y-4">
          <div className="h-16 w-16 mx-auto rounded-full bg-[#111111] border border-[#1E1E1E] flex items-center justify-center">
            <AlertCircle className="h-8 w-8 text-[#64748B]" />
          </div>
          <div className="space-y-2">
            <h2 className="text-xl font-bold text-[#F1F5F9]">Agenda Fechada Hoje</h2>
            <p className="text-[#64748B] text-sm">
              O barbeiro ainda nao liberou a agenda para hoje.
            </p>
          </div>
          <Button variant="secondary" onClick={() => window.location.reload()}>
            Atualizar
          </Button>
        </Card>

        {/* Opcao de agendar para outros dias */}
        {hasFutureDates && (
          <Card className="space-y-4">
            <div className="space-y-2">
              <h3 className="text-lg font-bold text-[#F1F5F9]">Agendar para outro dia</h3>
              <p className="text-[#64748B] text-sm">
                Voce pode reservar seu lugar para os proximos dias.
              </p>
            </div>

            {/* Reutilizar o seletor de datas */}
            <div className="space-y-3">
              {availableDates
                .filter(d => !d.disabled && d.date !== today)
                .slice(0, 5)
                .map((dateInfo) => (
                  <button
                    key={dateInfo.date}
                    onClick={() => {
                      setDataAgendamento(dateInfo.date);
                      // Continuar para o formulario de agendamento
                    }}
                    className="w-full p-3 rounded-xl border bg-[#111111] border-[#1E1E1E] text-[#F1F5F9] hover:border-[#00D4A5]/30 hover:text-[#00D4A5] text-left"
                  >
                    <p className="font-medium capitalize">{dateInfo.label}</p>
                    {dateInfo.remainingSlots !== undefined && (
                      <p className="text-xs text-[#64748B]">
                        {dateInfo.remainingSlots} vagas
                      </p>
                    )}
                  </button>
                ))}
            </div>
          </Card>
        )}
      </main>
    </div>
  );
}
```

## Criterios de Aceite

- [ ] Tela "Agenda Fechada" mostra mensagem sobre hoje
- [ ] Se ha datas futuras disponiveis, mostrar lista
- [ ] Ao clicar em data futura, usuario vai para o formulario de agendamento
- [ ] Se NAO ha datas futuras, mostrar apenas botao "Atualizar"
- [ ] Layout consistente com o resto do app

## Dependencias

- Agent 01 deve ter corrigido a logica de `availableDates` primeiro
- Este agente assume que `availableDates` esta sendo populado corretamente

## Testes

1. Fechar agenda no dashboard do barbeiro
2. Acessar `/` como cliente
3. Verificar que tela mostra "Agenda Fechada Hoje"
4. Verificar que ha opcao de agendar para outros dias
5. Clicar em uma data futura
6. Verificar que formulario de agendamento aparece
