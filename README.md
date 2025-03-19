# Bolt Chat

Um aplicativo de chat em tempo real construído com React, Socket.IO e Vite.

## Características

- Navegação entre salas de chat
- Mensagens em tempo real com Socket.IO
- Indicação de usuários online
- Mensagens rápidas com botões de atalho
- Banner promocional VIP
- Interface responsiva e amigável

## Estrutura

O projeto está organizado da seguinte forma:

- `src/`: Código fonte do frontend React
  - `components/`: Componentes React (ChatInterface, Navbar, etc.)
  - `contexts/`: Context API para gerenciamento de estado
  - `pages/`: Páginas da aplicação
  - `types/`: Definições de tipos TypeScript
- `server.cjs`: Servidor Node.js para Socket.IO
- `public/`: Recursos estáticos

## Branches

- `master`: Branch principal de desenvolvimento
- `mvp`: Versão Mínima Viável para implantação
- `mpc`: Branch para recursos adicionais/experimentais

## Requisitos

- Node.js 16+ 
- npm ou yarn

## Configuração

1. Instale as dependências:
```bash
npm install
```

2. Execute o servidor:
```bash
node server.cjs
```

3. Execute o cliente:
```bash
npm run dev
```

## Implantação

Para implantar a aplicação em produção:

1. Crie uma build de produção:
```bash
npm run build
```

2. Faça upload dos arquivos da pasta `dist` para o servidor web
3. Configure o servidor Node.js para o backend Socket.IO
