# Guia de Implantação no Hostgator

Este guia contém instruções detalhadas para implantar o Bolt Chat no Hostgator usando cPanel.

## Preparação dos Arquivos

### Frontend (React)

1. A pasta `dist` contém todos os arquivos estáticos necessários para o frontend.
2. Estes arquivos devem ser enviados para a pasta `public_html` ou uma subpasta do seu domínio.

### Backend (Node.js/Socket.IO)

Para o backend, você precisará enviar:
- `server.cjs` (servidor Socket.IO)
- `package.json` (para instalação de dependências)
- `.env` (se necessário, com variáveis de ambiente)

## Passos para Implantação no cPanel

### 1. Configuração do Frontend

1. Acesse o cPanel do Hostgator
2. Vá para "Gerenciador de Arquivos"
3. Navegue até `public_html`
4. Faça upload de todos os arquivos da pasta `dist`
5. Crie um arquivo `.htaccess` na raiz com o seguinte conteúdo:
   ```
   <IfModule mod_rewrite.c>
     RewriteEngine On
     RewriteBase /
     RewriteRule ^index\.html$ - [L]
     RewriteCond %{REQUEST_FILENAME} !-f
     RewriteCond %{REQUEST_FILENAME} !-d
     RewriteRule . /index.html [L]
   </IfModule>
   ```

### 2. Configuração do Backend

1. No cPanel, procure por "Node.js Selector"
2. Clique em "Create Application" (Criar Aplicação)
3. Preencha os campos:
   - Application Name: bolt-chat
   - Node.js Version: escolha a mais recente (14.x ou superior)
   - Application Startup File: server.cjs
   - Application Root: escolha o diretório para sua aplicação (ex: node_apps/bolt-chat)
   - Application URL: defina um subdomínio (ex: socket.seudominio.com)
   - Environment Variables: defina PORT=3000 (ou outra porta permitida)
4. Clique em "Create" (Criar)

### 3. Upload de Arquivos do Backend

1. No Gerenciador de Arquivos, navegue até o diretório escolhido para a aplicação
2. Faça upload de:
   - `server.cjs`
   - `package.json`
   - `.env` (se necessário)

### 4. Instalação de Dependências

1. No cPanel, procure por "Terminal" ou acesse via SSH
2. Navegue até o diretório da sua aplicação:
   ```bash
   cd node_apps/bolt-chat
   ```
3. Instale as dependências:
   ```bash
   npm install
   ```

### 5. Configuração do Socket.IO no Frontend

Antes de fazer o upload, você precisa editar a URL do Socket.IO no arquivo SocketContext.tsx para apontar para o subdomínio criado:

```javascript
const newSocket = io('https://socket.seudominio.com', {
  transports: ['websocket', 'polling'],
  reconnection: true,
  reconnectionAttempts: 5,
  reconnectionDelay: 1000
});
```

Depois reconstrua a aplicação com `npm run build`.

### 6. Inicialização da Aplicação Node.js

1. No Node.js Selector, encontre sua aplicação
2. Clique em "Start Application"
3. Para garantir que continue executando, você pode instalar PM2:
   ```bash
   npm install pm2 -g
   pm2 start server.cjs
   pm2 save
   ```

## Solução de Problemas

- **Erro CORS**: Verifique se seu servidor está configurado para aceitar conexões do seu domínio.
- **Socket.IO não conecta**: Verifique se o Hostgator permite conexões WebSocket na porta configurada.
- **Aplicação Node.js não inicia**: Verifique os logs de erro no cPanel.

## Manutenção

Para atualizar sua aplicação:

1. Faça alterações no código localmente
2. Teste localmente
3. Faça build do frontend: `npm run build`
4. Faça upload dos novos arquivos
5. Reinicie a aplicação Node.js no cPanel

## Recursos Adicionais

- [Documentação do cPanel](https://docs.cpanel.net/)
- [Node.js no Hostgator](https://support.hostgator.com/articles/specialized-help/technical/how-to-use-node-js)
- [Socket.IO Docs](https://socket.io/docs/v4/)
