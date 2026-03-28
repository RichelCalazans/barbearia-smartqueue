# Database and Dependencies Security

## Banco de dados

### SQL Injection
- Use sempre queries parametrizadas ou ORM com binding correto
- Nunca concatene input do usuário em SQL
- Mesmo com ORM: raw queries precisam de atenção
- Teste com payloads: ' OR '1'='1, '; DROP TABLE users;--

### Princípio do menor privilégio
- Usuário da aplicação: apenas SELECT/INSERT/UPDATE/DELETE nas tabelas necessárias
- Nunca use usuário root/admin da aplicação
- Crie usuário separado para migrations (com ALTER TABLE, CREATE, DROP)
- Read replicas: usuário somente leitura

### Dados sensíveis em banco
- Criptografe PII (CPF, dados de cartão) em repouso com AES-256
- Não armazene dados de cartão (use tokenização via gateway de pagamento)
- Logs e audit trail: guarde quem acessou/modificou dados sensíveis
- Backups criptografados: a cópia do banco não pode ser mais fraca que o banco

## Dependências

### Vulnerabilidades em pacotes
- npm audit / pip audit / bundle audit: rode em CI em cada PR
- Dependabot ou Renovate: automatize atualizações de segurança
- Lock files (package-lock.json, Gemfile.lock): sempre commite, garante reprodutibilidade

### Supply chain attacks
- Prefira pacotes com muitos downloads e manutenção ativa
- Verifique integridade: npm install com --ignore-scripts para pacotes suspeitos
- SBOM (Software Bill of Materials): documente todas as dependências em produção

### Atualizações
- Dependências de segurança: atualize imediatamente
- Dependências menores: sprint a sprint
- Major versions: planeje com antecedência, não deixe acumular
