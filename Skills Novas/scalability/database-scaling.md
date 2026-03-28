# Database Scaling

## Identificando o gargalo de banco
- Queries lentas: ative slow query log (> 100ms é sinal de alerta)
- Connections esgotadas: use connection pooling (PgBouncer, RDS Proxy)
- CPU alta no banco: índices faltando ou queries ineficientes
- I/O alto: volume de dados crescendo mais rápido que o hardware

## Índices

### Quando criar
- Colunas usadas em WHERE, ORDER BY, JOIN
- Colunas de foreign key que não têm índice automático
- Combinações de colunas usadas juntas em filtros

### Quando não criar
- Tabelas pequenas (< 10k linhas) raramente se beneficiam
- Colunas com poucos valores distintos (ex: status com 3 opções)
- Índices demais degradam escrita (todo INSERT/UPDATE precisa atualizar índices)

## Read Replicas
- Separe queries de leitura (relatórios, listagens) para réplica
- Escreva sempre no primário
- Atenção ao replication lag em dados críticos

## Sharding
- Última opção, após esgotar otimizações de query e hardware
- Shard por ID do usuário ou tenant é o padrão mais comum
- Aumenta muito a complexidade de queries que cruzam shards

## Particionamento (PostgreSQL)
- Particione tabelas grandes por data (logs, eventos, transações)
- Facilita DELETE de dados antigos (drop partition em vez de DELETE em massa)
- Melhora performance de queries com filtro de data

## Conexões e pool
- Limite de conexões do Postgres: default 100, aumente com cuidado
- PgBouncer em transaction mode: centenas de clientes, dezenas de conexões reais
- Nunca abra conexão sem fechar (connection leak mata o banco)
