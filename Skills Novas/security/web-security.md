# Web Security (OWASP Top 10)

## 1. Broken Access Control
- Verifique permissões no servidor, nunca apenas no frontend
- IDOR (Insecure Direct Object Reference): valide se o usuário tem acesso ao recurso pelo ID
- Princípio do menor privilégio em todas as rotas

## 2. Cryptographic Failures
- HTTPS em tudo, sem exceção
- HSTS header com includeSubDomains
- Não exponha dados sensíveis em URLs (query strings ficam em logs)

## 3. Injection
- SQL: queries parametrizadas sempre
- XSS: sanitize outputs, use Content-Security-Policy
- Command injection: nunca execute input do usuário como comando shell

## 4. Cross-Site Scripting (XSS)
- Escape HTML em todo output de dado do usuário
- Content-Security-Policy: bloqueie inline scripts
- HttpOnly e Secure flags nos cookies de sessão

## 5. CSRF
- SameSite=Strict ou Lax nos cookies de sessão
- CSRF token em formulários state-changing
- Verifique Origin/Referer em requests sensíveis

## Headers de segurança obrigatórios
```
Content-Security-Policy: default-src 'self'
X-Frame-Options: DENY
X-Content-Type-Options: nosniff
Strict-Transport-Security: max-age=31536000; includeSubDomains
Referrer-Policy: strict-origin-when-cross-origin
Permissions-Policy: camera=(), microphone=(), geolocation=()
```

## Rate Limiting
- Login: máximo 5 tentativas por minuto por IP
- APIs públicas: limite por IP e por token
- Endpoints de reset de senha: especialmente restritivos

## Checklist de revisão rápida
- [ ] Todos os inputs do usuário são validados e sanitizados?
- [ ] Autenticação verificada em todas as rotas protegidas?
- [ ] HTTPS forçado com redirect de HTTP?
- [ ] Headers de segurança configurados?
- [ ] Logs não contêm dados sensíveis?
- [ ] Dependências auditadas?
