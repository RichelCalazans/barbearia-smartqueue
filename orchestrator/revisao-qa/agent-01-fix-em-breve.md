# Agent 01: Fix "Em breve..." Button

## Objetivo

Corrigir o botao "Em breve..." que esta disabled/nao responsivo em producao, impedindo clientes de agendar para datas futuras.

## Contexto do Problema

O relatorio de QA identificou:
- Botao "Em breve..." renderizado com atributo `disabled` no DOM
- Ao clicar, nenhuma reacao ocorre
- Nenhuma lista de datas disponiveis e exibida
- Botao mantem visual cinzento/opaco

**Hipotese:** O botao pode estar sendo desabilitado por logica condicional relacionada a data atual ou erro no calculo de "proximo dia disponivel".

## Arquivos a Analisar e Modificar

### 1. `src/pages/ClientView.tsx`

**Linhas 378-388 - Botao "Em breve...":**
```tsx
<button
  type="button"
  onClick={() => setShowDateSelector(!showDateSelector)}
  className={...}
>
  Em breve...
</button>
```

**Linhas 54-76 - Carregamento de datas:**
```tsx
if (c.WEEKLY_SCHEDULE) {
  setCheckingDates(true);
  const dates = getAvailableDates(c, 21);
  // ... verificacao de disponibilidade
}
```

**Linhas 404-448 - Renderizacao das datas:**
- Cada data pode ter `disabled={dateInfo.disabled}`
- Verificar se todas as datas estao sendo marcadas como disabled

### 2. `src/utils.ts`

**`getAvailableDates(config, maxDays)`:**
- Gera lista de proximos N dias
- Marca cada dia como `disabled: !enabled` baseado no WEEKLY_SCHEDULE

**`isDateEnabled(dateString, config)`:**
- Verifica se o dia da semana esta habilitado no WEEKLY_SCHEDULE

### 3. `src/services/QueueService.ts`

**`checkDateAvailability(dateString, config)`:**
- Verifica capacidade da fila para a data
- Retorna `available: false` em caso de erro (linha 155)

## Tarefas

1. **Verificar se o botao tem `disabled` condicional**
   - Procurar por qualquer `disabled={...}` no botao "Em breve..."
   - Se existir, analisar a condicao

2. **Verificar populacao de `availableDates`**
   - Garantir que `getAvailableDates` retorna datas
   - Verificar se `WEEKLY_SCHEDULE` existe e tem dias habilitados

3. **Verificar erros silenciosos**
   - Adicionar logging em `checkDateAvailability` para capturar erros
   - Garantir que erros nao bloqueiam a UI

4. **Corrigir logica de disabled**
   - Se todas as datas estao disabled, verificar por que
   - Garantir que pelo menos alguns dias futuros estejam disponiveis

## Criterios de Aceite

- [ ] Botao "Em breve..." clicavel (sem atributo disabled)
- [ ] Ao clicar, dropdown de datas aparece
- [ ] Datas habilitadas no WEEKLY_SCHEDULE aparecem como clicaveis
- [ ] Datas desabilitadas aparecem com visual diferente mas botao funciona
- [ ] Loading state ("Verificando disponibilidade...") aparece durante carregamento

## Testes

```bash
# Build local
npm run dev

# Testar no navegador:
# 1. Acessar http://localhost:5173/
# 2. Verificar que botao "Em breve..." esta clicavel
# 3. Clicar e verificar que lista de datas aparece
# 4. Verificar que datas de segunda a sabado estao habilitadas
# 5. Verificar que domingos estao desabilitados
```

## Codigo de Referencia

Se precisar adicionar disabled condicional ao botao, use:
```tsx
<button
  type="button"
  onClick={() => setShowDateSelector(!showDateSelector)}
  disabled={availableDates.length === 0 || checkingDates}
  className={...}
>
  {checkingDates ? 'Carregando...' : 'Em breve...'}
</button>
```

Mas NUNCA desabilite se houver datas disponiveis.
