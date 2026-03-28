# Auth and Secrets

## Autenticação

### Senhas
- Hash com bcrypt (custo >= 12), Argon2id ou scrypt. Nunca MD5/SHA1 para senhas
- Minimum 8 caracteres, sem restrição de caracteres especiais
- Implemente bloqueio após N tentativas (lockout ou CAPTCHA)
- Oferece 2FA: TOTP (Google Authenticator) é o padrão mínimo

### JWT
- Assine sempre com RS256 (assimétrico) em produção, nunca HS256 com secret fraco
- exp curto para access token (15 min a 1h)
- Refresh token com rotação: ao usar, invalide o anterior e emita novo
- Nunca coloque dados sensíveis no payload (é base64, não criptografia)
- Blacklist de tokens invalidados: Redis com TTL igual ao exp do token

### OAuth / SSO
- Use biblioteca estabelecida, não implemente o flow manualmente
- Valide state parameter para prevenir CSRF
- PKCE obrigatório para flows em SPAs e apps mobile

## Secrets e credenciais

### O que nunca fazer
- Commitar .env no git (use .gitignore + git-secrets)
- Hardcodar API keys no código-fonte
- Logar credenciais mesmo em debug
- Usar mesmas credenciais em dev e produção

### Onde guardar secrets
- Produção: HashiCorp Vault, AWS Secrets Manager, Doppler
- CI/CD: variáveis de ambiente criptografadas da plataforma (GitHub Actions Secrets, etc.)
- Dev local: arquivo .env nunca commitado

### Rotação de credenciais
- Rotacione secrets de terceiros a cada 90 dias ou após qualquer saída de membro do time
- API keys de produção: uma por serviço/ambiente, nunca compartilhadas
- Database passwords: use IAM auth quando disponível no cloud provider
