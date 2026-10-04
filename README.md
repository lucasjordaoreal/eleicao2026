# Apura | Eleições 2026

Painel estático de resultados oficiais da eleição presidencial de 2026.

## Desenvolvimento

```sh
npm ci
npm run update:election-data
npm run dev
```

`npm run update:election-data` busca o arquivo oficial do TSE, verifica a assinatura Ed25519 e atualiza `public/election-results.json`. O build falha se a resposta não for válida ou a assinatura não corresponder.

## Publicação

O workflow em `.github/workflows/deploy.yml` compila e publica o site no GitHub Pages quando há push para `main`. Ele também busca e publica um novo snapshot oficial a cada cinco minutos. A página recarrega o snapshot publicado a cada 15 segundos enquanto estiver aberta e busca novamente assim que a aba volta a ficar visível.

O navegador não consulta o TSE diretamente porque o endpoint oficial não permite requisições CORS de outros sites. Por isso, a atualização depende do workflow agendado do GitHub Actions e pode atrasar se o Actions estiver indisponível ou atrasar a execução.

No repositório, configure **Settings → Pages → Build and deployment → Source → GitHub Actions**. Para este projeto, o caminho do Pages está configurado como `/eleicao2026/`.
