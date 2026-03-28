# Agent 05: Fix Saturday Configuration

## Objetivo

Corrigir a configuracao do horario de abertura do Sabado que esta como 00:00, o que pode estar causando comportamentos inesperados na logica de disponibilidade.

## Contexto do Problema

O relatorio de QA identificou:
- O campo "Abertura" do sabado esta definido como `00:00`
- Isso pode ser um dado inserido por engano ou um default incorreto
- Provavelmente afeta a logica de disponibilidade

**Configuracao padrao esperada (ConfigService.ts):**
```tsx
{ day: 6, enabled: true, openTime: '09:00', closeTime: '14:00' } // Sabado
```

## Tipo de Problema

Este e um **problema de dados**, nao de codigo. A configuracao esta armazenada no Firestore e precisa ser corrigida manualmente ou via script.

## Localizacao dos Dados

**Firestore Path:** `config/settings`

**Campo:** `WEEKLY_SCHEDULE` (array de DaySchedule)

**Estrutura esperada:**
```json
{
  "WEEKLY_SCHEDULE": [
    { "day": 0, "enabled": false, "openTime": "09:00", "closeTime": "18:00" },
    { "day": 1, "enabled": true, "openTime": "09:00", "closeTime": "19:00" },
    { "day": 2, "enabled": true, "openTime": "09:00", "closeTime": "19:00" },
    { "day": 3, "enabled": true, "openTime": "09:00", "closeTime": "19:00" },
    { "day": 4, "enabled": true, "openTime": "09:00", "closeTime": "19:00" },
    { "day": 5, "enabled": true, "openTime": "09:00", "closeTime": "19:00" },
    { "day": 6, "enabled": true, "openTime": "09:00", "closeTime": "14:00" }
  ]
}
```

## Tarefas

### Opcao 1: Correcao via Firebase Console

1. Acessar https://console.firebase.google.com/
2. Selecionar projeto SmartQueue
3. Ir para Firestore Database
4. Navegar para `config/settings`
5. Editar campo `WEEKLY_SCHEDULE`
6. Encontrar o item com `day: 6` (Sabado)
7. Alterar `openTime` de `"00:00"` para `"09:00"` (ou horario desejado)
8. Salvar

### Opcao 2: Correcao via Dashboard do Barbeiro

1. Acessar `/barber` como admin
2. Clicar no icone de engrenagem (Configuracoes)
3. Ir para "Configuracoes Automaticas" ou "Horarios"
4. Encontrar Sabado
5. Alterar horario de abertura de 00:00 para 09:00
6. Salvar

### Opcao 3: Script de Correcao

Criar arquivo temporario para correcao:

```typescript
// scripts/fix-saturday-config.ts
import { doc, updateDoc, getDoc } from 'firebase/firestore';
import { db } from '../src/firebase';

async function fixSaturdayConfig() {
  const settingsRef = doc(db, 'config', 'settings');
  const settingsDoc = await getDoc(settingsRef);

  if (!settingsDoc.exists()) {
    console.error('Settings document not found');
    return;
  }

  const data = settingsDoc.data();
  const schedule = data.WEEKLY_SCHEDULE;

  // Encontrar e corrigir Sabado (day: 6)
  const saturdayIndex = schedule.findIndex(s => s.day === 6);
  if (saturdayIndex !== -1) {
    schedule[saturdayIndex].openTime = '09:00';

    await updateDoc(settingsRef, {
      WEEKLY_SCHEDULE: schedule
    });

    console.log('Saturday openTime updated to 09:00');
  }
}

fixSaturdayConfig();
```

## Validacao de Codigo

Alem de corrigir os dados, verificar se ha validacao para evitar `00:00` como horario de abertura:

**Em `src/services/ConfigService.ts` ou no modal de configuracoes:**

```typescript
// Validar horario de abertura
function validateOpenTime(time: string): boolean {
  if (!time || time === '00:00') {
    return false; // Horario invalido
  }
  // Validar formato HH:MM
  return /^([01]?[0-9]|2[0-3]):[0-5][0-9]$/.test(time);
}
```

## Criterios de Aceite

- [ ] Sabado tem `openTime` diferente de `00:00` (ex: `09:00`)
- [ ] Horario exibido corretamente no dashboard do barbeiro
- [ ] Disponibilidade de sabado calculada corretamente para clientes
- [ ] Modal de configuracoes nao permite salvar `00:00` como abertura

## Testes

1. Verificar no Firebase Console que Sabado tem horario correto
2. Acessar dashboard do barbeiro e verificar configuracoes
3. Acessar como cliente e verificar que Sabado aparece com horario correto
4. Tentar agendar para Sabado - deve funcionar normalmente

## Notas

- Este e um problema de dados que pode ter sido causado por:
  - Bug no modal de configuracoes
  - Edicao manual incorreta no Firebase
  - Default incorreto na inicializacao

- Apos corrigir os dados, considerar adicionar validacao no codigo para prevenir recorrencia
