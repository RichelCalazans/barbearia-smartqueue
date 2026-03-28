# Infrastructure Scalability

## Auto-scaling

### Horizontal scaling (mais instâncias)
- Melhor para aplicações stateless
- Métricas de trigger: CPU > 70%, requisições/s, latência p99
- Cooldown period: aguarde 2-3 min antes de escalar novamente para evitar flapping

### Vertical scaling (instância maior)
- Mais simples mas tem limite físico e downtime
- Use para banco de dados antes de partir para clustering

## Kubernetes essentials para escala
- HPA (Horizontal Pod Autoscaler): escala pods por CPU/memória/métricas customizadas
- VPA (Vertical Pod Autoscaler): ajusta requests/limits automaticamente
- PodDisruptionBudget: garante disponibilidade durante atualizações
- Resource requests/limits: defina sempre, sem isso o scheduler não funciona corretamente

## CDN
- Assets estáticos (JS, CSS, imagens): sempre via CDN
- API responses cacheáveis: use CDN com cache-control correto
- Edge functions: lógica simples próxima ao usuário sem passar pelo servidor

## Monitoramento de capacidade
- Defina SLOs: ex. p99 latência < 500ms, disponibilidade > 99.9%
- Alertas proativos: avise quando tendência indica que vai estourar em 24h
- Load testing: rode k6 ou Locust antes de lançamentos importantes
- Capacity planning: projete crescimento de 3 meses e provisione com antecedência
