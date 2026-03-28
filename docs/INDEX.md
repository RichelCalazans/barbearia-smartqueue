# 📚 Documentação Completa — SmartQueue

> **Extração de Inteligência do Projeto** para continuidade 100%
> 
> Última atualização: 2026-03-27

---

## 🎯 Começar Por Aqui

Se você é novo no projeto, siga esta ordem:

1. **[ONBOARDING.md](./ONBOARDING.md)** ← Comece aqui (10 min)
   - Pré-requisitos, setup local, primeiros testes
   - Como rodar o projeto em dev
   - Tarefas recomendadas para ganhar contexto

2. **[ARQUITETURA.md](./ARQUITETURA.md)** (20 min)
   - Estrutura geral do projeto
   - Decisões de stack (React + Vite + Firebase)
   - Modelo de dados (ERD do Firestore)
   - Fluxo de dados end-to-end

3. **[PADROES.md](./PADROES.md)** (15 min)
   - Convenções de código
   - Como contribuir mantendo qualidade
   - Padrões de React, services, styling

4. **[FEATURES.md](./FEATURES.md)** (20 min)
   - 10 features documentadas
   - Status de cada uma (pronto, não implementado, debt)
   - O que falta: WhatsApp e Pix

5. **[FLUXOS.md](./FLUXOS.md)** (15 min)
   - 5 diagramas de sequência ASCII
   - Como os dados fluem na prática
   - Possíveis erros e latências

6. **[DEPLOY_CONFIG.md](./DEPLOY_CONFIG.md)** (10 min)
   - Setup de Firebase
   - Variáveis de ambiente
   - CI/CD, rollback, monitoramento

7. **[PROBLEMAS_ROADMAP.md](./PROBLEMAS_ROADMAP.md)** (15 min)
   - 5 bugs conhecidos
   - 8 débitos técnicos (refatoração)
   - 11 features planejadas (prioridades)

---

## 📋 Checklist de Onboarding

Depois de ler a documentação, você deve conseguir:

- [ ] Rodar `npm install` + `npm run dev` sem erros
- [ ] Acessar http://localhost:3000 e entender o fluxo cliente
- [ ] Fazer login em `/login` e acessar `/barber`
- [ ] Identificar onde estão cada feature no código
- [ ] Fazer uma pequena mudança (ex: cor de botão) e redeployar localmente
- [ ] Entender o padrão de novo service/componente
- [ ] Identificar qual é o próximo bug a corrigir

---

## 📁 Estrutura da Pasta `docs/`

```
docs/
├── INDEX.md                    ← Você está aqui
├── ONBOARDING.md              ← Setup + primeiros passos
├── ARQUITETURA.md             ← Estrutura + decisões
├── PADROES.md                 ← Convenções de código
├── FEATURES.md                ← Features implementadas
├── FLUXOS.md                  ← Diagramas de sequência
├── DEPLOY_CONFIG.md           ← Deploy + env vars
└── PROBLEMAS_ROADMAP.md       ← Bugs + roadmap
```

---

## 🔍 Procurar Por Tópico

### Stack e Arquitetura
→ **ARQUITETURA.md** — Stack real (React + Vite + Firebase), comparação com alternatives, ERD

### Como Contribuir
→ **PADROES.md** — Naming, componentes, services, styling, testes

### Entender o Que Já Existe
→ **FEATURES.md** — 10 features com status, implementação, edge cases

### Debug e Fluxo de Dados
→ **FLUXOS.md** — 5 diagramas ASCII mostrando como as operações funcionam

### Deploy e Produção
→ **DEPLOY_CONFIG.md** — Firebase, env vars, CI/CD, checklist pré-deploy

### Priorizar Tarefas
→ **PROBLEMAS_ROADMAP.md** — Bugs (severidade), débitos (impacto), features (prioridade + esforço)

### Primeiro Dia
→ **ONBOARDING.md** — Setup + testes + tarefas recomendadas

---

## 🎬 Próximos Passos Recomendados

### Se você quer consertar bugs
1. Ler **PROBLEMAS_ROADMAP.md** — BUG-001 (cliente duplicado) é o mais importante
2. Ler **PADROES.md** — entender padrão de novo serviço
3. Ler a seção relevante em **FEATURES.md**
4. Ir para o código e implementar (use FLUXOS.md se precisar visualizar o fluxo)

### Se você quer adicionar uma feature
1. Ler **PROBLEMAS_ROADMAP.md** → escolher feature por prioridade
2. Ler **FEATURES.md** → ver padrão de feature doc
3. Ler **PADROES.md** → entender convenções
4. Ler **ARQUITETURA.md** se precisar de novo modelo de dados
5. Implementar seguindo o padrão

### Se você quer refatorar/melhorar
1. Ler **PROBLEMAS_ROADMAP.md** → débitos técnicos
2. Ler **PADROES.md** → entender o padrão recomendado
3. Planejar as mudanças (possível impacto)
4. Testar manualmente (sem testes automatizados, é importante)

---

## ❓ FAQ

**P: Por que não Next.js + Prisma como o prompt original dizia?**
R: O projeto real usa React + Vite + Firebase (NoSQL). Ver decisões em ARQUITETURA.md seção "Stack de Decisões".

**P: Tem testes automatizados?**
R: Não. Ver DEBT-002 em PROBLEMAS_ROADMAP.md — é uma tarefa prioritária.

**P: Como adicionar um novo admin?**
R: Opção 1: Adicionar email em `useAuth.ts` (hardcoded). Opção 2: Cadastrar na collection `users` (mais robusto). Ver ARQUITETURA.md seção "Autenticação".

**P: O app tem WhatsApp integrado?**
R: Não. FEAT-001 em PROBLEMAS_ROADMAP.md planeja isso. Requer Z-API + Cloud Function.

**P: Onde estão os dados de clientes?**
R: Firebase Firestore, collection `clients`. Ver ERD em ARQUITETURA.md.

**P: Como fazer deploy manualmente?**
R: `npm run build && firebase deploy`. Ver passo a passo em DEPLOY_CONFIG.md.

---

## 🤝 Contribuindo

Ao fazer mudanças:
1. Siga os padrões em **PADROES.md**
2. Se criar arquivo novo, documente em **FEATURES.md** ou **PROBLEMAS_ROADMAP.md**
3. Se encontrar bug não documentado, adicione em **PROBLEMAS_ROADMAP.md**
4. Se implementar feature planejada, mova de "Roadmap" para "FEATURES.md" pronto

---

## 📞 Suporte

Se tiver dúvida:
1. Procure por palavra-chave nesta documentação (INDEX.md → Ctrl+F)
2. Veja exemplos similares no código
3. Leia comentários em `src/` (// TODO, // FIXME, // HACK)
4. Consulte o `.claude/orchestrator/` para specs detalhadas

---

**Boa sorte! 🚀**

