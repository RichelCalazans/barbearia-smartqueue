# Desktop Security

## Electron / Apps Desktop

### Contexto de segurança
- nodeIntegration: false (padrão desde Electron 5, mantenha assim)
- contextIsolation: true (obrigatório)
- sandbox: true quando possível
- webSecurity: false nunca em produção

### IPC (comunicação renderer <> main)
- Valide e sanitize todos os dados vindos do renderer
- Exponha apenas as funções necessárias via contextBridge
- Nunca exponha ipcRenderer diretamente ao renderer

### Atualizações automáticas
- Assine o pacote de atualização com certificado de código (code signing)
- Valide assinatura antes de instalar atualização
- Distribua via HTTPS com certificate pinning se possível

## Armazenamento local

### O que armazenar localmente
- Tokens de sessão: keychain do OS (electron-keytar), nunca localStorage
- Dados do usuário: criptografados com chave derivada da senha do OS

### O que nunca armazenar localmente
- Senhas em texto plano
- Chaves privadas sem criptografia
- Dados sensíveis em localStorage/sessionStorage sem criptografia

## Distribuição
- Code signing obrigatório (Windows: Authenticode, macOS: Apple Developer ID)
- Notarização no macOS para distribuição fora da App Store
- Auto-update com verificação de integridade antes de executar
