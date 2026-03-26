Você é um especialista em Firestore Security Rules. Sua tarefa é corrigir vulnerabilidades no arquivo `firestore.rules` do projeto SmartQueue.

## Contexto

O SmartQueue é um app de fila virtual para barbearia. O arquivo `firestore.rules` atual tem vulnerabilidades críticas que permitem:
- Criação de clientes sem validação de campos
- Injeção de campos arbitrários ao cancelar fila
- Leitura de histórico por qualquer usuário autenticado
- Exposição de config sensível

## Tarefa

Edite o arquivo `firestore.rules` aplicando TODAS as correções abaixo:

### 1. Corrigir match /clients/{clientId}

Substituir:
```javascript
match /clients/{clientId} {
  allow get, list: if true;
  allow create: if true;
  allow update: if isAuthenticated() && isValidClient(request.resource.data);
}
```

Por:
```javascript
match /clients/{clientId} {
  allow get, list: if true;
  allow create: if isValidClient(request.resource.data) &&
    hasRequiredFields(['nome', 'telefone', 'totalVisitas', 'tempoMedio', 'dataCadastro', 'ativo']) &&
    hasOnlyAllowedFields(['nome', 'telefone', 'dataNascimento', 'totalVisitas', 'tempoMedio', 'dataCadastro', 'ativo']) &&
    request.resource.data.totalVisitas == 0 &&
    request.resource.data.tempoMedio == 0 &&
    request.resource.data.ativo == true;
  allow update: if isAuthenticated() && isValidClient(request.resource.data);
}
```

### 2. Corrigir match /queue/{queueId}

Substituir:
```javascript
match /queue/{queueId} {
  allow get, list: if true;
  allow create: if true;
  allow update: if isAuthenticated() || (request.resource.data.status == 'CANCELADO');
  allow delete: if isAdmin();
}
```

Por:
```javascript
match /queue/{queueId} {
  allow get, list: if true;
  allow create: if isValidQueueItem(request.resource.data) &&
    hasRequiredFields(['posicao', 'clienteId', 'clienteNome', 'servicos', 'servicosIds',
                       'tempoEstimado', 'horaPrevista', 'status', 'horaEntrada', 'data', 'telefone', 'manual']) &&
    request.resource.data.status == 'AGUARDANDO';
  allow update: if isAdmin() ||
    (resource.data.status == 'AGUARDANDO' &&
     request.resource.data.status == 'CANCELADO' &&
     request.resource.data.diff(resource.data).affectedKeys().hasOnly(['status', 'horaFim']));
  allow delete: if isAdmin();
}
```

### 3. Corrigir match /history/{attendanceId}

Substituir:
```javascript
match /history/{attendanceId} {
  allow read: if isAuthenticated();
  allow create: if isAdmin();
  allow update, delete: if isAdmin();
}
```

Por:
```javascript
match /history/{attendanceId} {
  allow read: if isAdmin();
  allow create, update, delete: if isAdmin();
}
```

### 4. Corrigir match /config/{docId}

Substituir:
```javascript
match /config/{docId} {
  allow get, list: if true;
  allow write: if isAdmin();
}
```

Por:
```javascript
match /config/{docId} {
  allow get: if docId == 'state' || isAdmin();
  allow list: if isAdmin();
  allow write: if isAdmin();
}
```

## Verificação

Após editar, leia o arquivo completo e confirme que todas as 4 correções foram aplicadas corretamente.

## Importante

- NÃO modifique as funções auxiliares (isAuthenticated, isOwner, isAdmin, etc.)
- NÃO modifique a regra de /services ou /users
- Mantenha a estrutura e formatação do arquivo
