Você é um especialista em React e Vite. Sua tarefa é otimizar o bundle do SmartQueue removendo dependências não usadas e implementando code splitting.

## Contexto

O SmartQueue tem ~233KB de dependências não usadas e não usa lazy loading para rotas admin.

## Tarefa 1: Remover dependências não usadas

Execute o comando para remover dependências que não são importadas em nenhum lugar do código:

```bash
npm uninstall recharts @google/genai date-fns
```

## Tarefa 2: Implementar code splitting em App.tsx

Edite `src/App.tsx` para usar `React.lazy` e `Suspense`:

### Modificar imports

Substituir:
```typescript
import { useState, useEffect } from 'react';
```

Por:
```typescript
import { useState, useEffect, lazy, Suspense } from 'react';
```

### Modificar imports das páginas

Substituir:
```typescript
import { ClientView } from './pages/ClientView';
import { BarberDashboard } from './pages/BarberDashboard';
import { Login } from './pages/Login';
```

Por:
```typescript
const ClientView = lazy(() => import('./pages/ClientView').then(m => ({ default: m.ClientView })));
const BarberDashboard = lazy(() => import('./pages/BarberDashboard').then(m => ({ default: m.BarberDashboard })));
const Login = lazy(() => import('./pages/Login').then(m => ({ default: m.Login })));
```

### Envolver renderPage com Suspense

No return do componente, envolver o conteúdo com Suspense. O código final do return deve ficar:

```typescript
return (
  <div className="min-h-screen bg-[#0A0A0A] text-[#F1F5F9] selection:bg-[#00D4A5]/30 selection:text-[#00D4A5]">
    <Suspense fallback={
      <div className="min-h-screen bg-[#0A0A0A] flex items-center justify-center">
        <ScissorsLoading />
      </div>
    }>
      <AnimatePresence mode="wait">
        <motion.div
          key={path}
          initial={{ opacity: 0, x: 10 }}
          animate={{ opacity: 1, x: 0 }}
          exit={{ opacity: 0, x: -10 }}
          transition={{ duration: 0.3, ease: 'easeOut' }}
        >
          {renderPage()}
        </motion.div>
      </AnimatePresence>
    </Suspense>
  </div>
);
```

## Tarefa 3: Adicionar manual chunks no vite.config.ts

Edite `vite.config.ts` para separar vendors em chunks:

Adicionar dentro do objeto retornado, após `server`:

```typescript
build: {
  rollupOptions: {
    output: {
      manualChunks: {
        'vendor-react': ['react', 'react-dom'],
        'vendor-firebase': ['firebase/app', 'firebase/auth', 'firebase/firestore'],
        'vendor-motion': ['motion/react'],
      },
    },
  },
},
```

O arquivo final deve ter a estrutura:
```typescript
export default defineConfig(({mode}) => {
  const env = loadEnv(mode, '.', '');
  return {
    plugins: [react(), tailwindcss()],
    define: { ... },
    resolve: { ... },
    server: { ... },
    build: {
      rollupOptions: {
        output: {
          manualChunks: {
            'vendor-react': ['react', 'react-dom'],
            'vendor-firebase': ['firebase/app', 'firebase/auth', 'firebase/firestore'],
            'vendor-motion': ['motion/react'],
          },
        },
      },
    },
  };
});
```

## Verificação

1. Execute `npm run build` e verifique que não há erros
2. Verifique na pasta `dist/assets` que existem chunks separados (vendor-react, vendor-firebase, etc.)
3. Abra o app localmente e teste que todas as rotas funcionam (/, /login, /barber)

## Importante

- NÃO modifique a lógica de negócio do App.tsx
- Mantenha todas as animações existentes
- O fallback do Suspense deve usar o ScissorsLoading existente
