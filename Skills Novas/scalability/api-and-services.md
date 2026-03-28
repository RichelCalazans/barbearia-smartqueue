# API and Services Scalability

## Princípios fundamentais
- Stateless: serviços não devem guardar estado entre requisições
- Idempotência: requisições repetidas devem ter o mesmo efeito
- Contratos claros: versionamento de API desde o início (/v1, /v2)

## Rate Limiting
- Implemente rate limiting por IP e por usuário autenticado
- Use sliding window (mais preciso) em vez de fixed window
- Retorne 429 com header Retry-After quando limite atingido
- Ferramentas: Redis + lua script, nginx limit_req, Cloudflare

## Circuit Breaker
- Evita cascata de falhas quando um serviço downstream cai
- Estados: Closed (normal) > Open (bloqueando) > Half-Open (testando)
- Bibliotecas: Resilience4j (Java), opossum (Node.js), Polly (.NET)

## Load Balancing
- Round robin: simples, funciona para cargas uniformes
- Least connections: melhor para requisições de duração variável
- Consistent hashing: essencial quando há afinidade de sessão necessária
- Health checks: remova instâncias doentes automaticamente

## Decomposição de serviços
- Extraia para serviço separado apenas o que tem escala diferente do monolito
- Comunicação síncrona (REST/gRPC) para operações que precisam de resposta imediata
- Comunicação assíncrona (fila) para operações que podem esperar
