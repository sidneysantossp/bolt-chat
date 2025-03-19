# Como enviar o código para GitHub e Hostgator

## 1. Preparação do repositório para o GitHub

Como o repositório atual contém informações sensíveis no histórico, vamos criar um repositório limpo:

1. Crie uma nova pasta para o repositório limpo
```bash
mkdir -p c:\xampp\htdocs\bolt\clean-project
```

2. Copie todos os arquivos atuais (exceto .git e arquivos sensíveis)
```bash
robocopy "c:\xampp\htdocs\bolt\project" "c:\xampp\htdocs\bolt\clean-project" /E /XD ".git" /XF ".env"
```

3. Inicialize um novo repositório Git na pasta limpa
```bash
cd c:\xampp\htdocs\bolt\clean-project
git init
git add .
git commit -m "Versão inicial do Bolt Chat"
```

4. Conecte ao GitHub e envie
```bash
git remote add origin https://github.com/sidneysantossp/bolt-chat.git
git push -u origin main
```

5. Crie as branches de desenvolvimento
```bash
git branch mvp
git branch mpc
git push origin mvp
git push origin mpc
```

## 2. Configuração no Hostgator

Siga as instruções detalhadas no arquivo hostgator-deploy.md para implantar no servidor.

## 3. Manter arquivos sensíveis protegidos

Para o arquivo .env:

1. Crie um arquivo .env.example com a estrutura, mas sem os valores reais:
```
VITE_SUPABASE_URL=your_supabase_url_here
VITE_SUPABASE_ANON_KEY=your_supabase_anon_key_here
VITE_OPENAI_API_KEY=your_openai_api_key_here
```

2. No servidor de produção, crie o arquivo .env com os valores reais
3. Certifique-se de que .env está no .gitignore (já está configurado)

## 4. Atualizações futuras

Para enviar atualizações:
```bash
git add .
git commit -m "Descrição da atualização"
git push origin main
```
