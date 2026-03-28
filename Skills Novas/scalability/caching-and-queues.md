# Caching and Queues

## Estratégias de cache

### Cache-aside (Lazy Loading)
1. App busca no cache
2. Se não tem (miss), busca no banco
3. Salva no cache e retorna
Vantagem: cache só tem o que foi acessado
Desvantagem: primeiro acesso é lento (cold start)

### Write-through
1. App escreve no cache e no banco simultaneamente
Vantagem: cache sempre atualizado
Desvantagem: escreve em tudo mesmo para dados raramente lidos

### TTL (Time to Live)
- Dados de sessão: 30 min a 24h
- Respostas de API externa: conforme frequência de mudança
- Contadores e rankings: 1 a 5 minutos
- Configurações do sistema: 5 a 60 minutos

## Redis: padrões de uso

### Cache de resposta HTTP
- Chave: hash da URL + query params + usuário
- TTL: definido por tipo de dado

### Rate limiting
- Chave: user_id ou IP
- Estrutura: INCR + EXPIRE

### Session store
- Mais rápido que banco para sessões ativas

## Filas assíncronas

### Quando usar fila
- Processamento de imagem/vídeo
- Envio de emails e notificações
- Integração com sistemas externos lentos
- Qualquer operação > 500ms que não precisa de resposta imediata

### Ferramentas
- BullMQ (Node.js + Redis): simples, confiável, boa UI com Bull Board
- SQS (AWS): managed, sem infraestrutura para manter
- RabbitMQ: roteamento complexo de mensagens
- Kafka: streaming de alto volume, retenção de mensagens

### Boas práticas de fila
- Defina max retries e dead letter queue
- Jobs devem ser idempotentes (reprocessamento seguro)
- Monitore tamanho da fila (backlog crescendo = problema)
