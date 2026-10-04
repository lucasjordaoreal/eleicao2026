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

O workflow em `.github/workflows/deploy.yml` compila e publica o site no GitHub Pages quando há push para `main` ou execução manual. Com o Supabase configurado, o site não precisa de deploy para receber novos resultados: um job do Supabase atualiza o snapshot a cada minuto, e a página o consulta a cada cinco segundos enquanto estiver aberta ou ao voltar para a aba.

### Atualização sem redeploy do site (Supabase)

Quando configurado, um Supabase Edge Function busca e valida a resposta assinada do TSE uma vez por minuto, salva o snapshot no banco e a página consulta esse snapshot sem precisar republicar o site. A atualização ainda depende do intervalo em que o TSE publica novos dados.

1. Crie um projeto Supabase e aplique `supabase/migrations/20261004000000_election_results.sql` pelo SQL Editor ou pela CLI.
2. Crie um valor secreto forte para `CRON_SECRET` e configure-o na Edge Function:

   ```sh
   supabase secrets set CRON_SECRET=seu-segredo-aleatorio
   supabase functions deploy refresh-election-results
   ```

3. No SQL Editor do Supabase, habilite `pg_cron`, `pg_net` e o Vault e guarde a URL do projeto, a chave publicável e o mesmo segredo:

   ```sql
   create extension if not exists pg_cron;
   create extension if not exists pg_net;
   create extension if not exists supabase_vault with schema vault;

   select vault.create_secret('https://SEU-PROJETO.supabase.co', 'election_project_url');
   select vault.create_secret('SUA-CHAVE-PUBLICAVEL', 'election_publishable_key');
   select vault.create_secret('SEU-CRON_SECRET', 'election_cron_secret');
   ```

   Em seguida, agende a atualização:

   ```sql
   select cron.schedule(
     'refresh-election-results',
     '* * * * *',
     $$
     select net.http_post(
       url := (select decrypted_secret from vault.decrypted_secrets where name = 'election_project_url')
              || '/functions/v1/refresh-election-results',
       headers := jsonb_build_object(
         'Content-Type', 'application/json',
         'apikey',
         (select decrypted_secret from vault.decrypted_secrets where name = 'election_publishable_key'),
         'x-cron-secret',
         (select decrypted_secret from vault.decrypted_secrets where name = 'election_cron_secret')
       ),
       body := '{}'::jsonb
     );
     $$
   );
   ```

4. Em **Settings → Secrets and variables → Actions → Variables** do GitHub, crie `VITE_SUPABASE_URL` com a URL do projeto e `VITE_SUPABASE_PUBLISHABLE_KEY` com a chave publicável do projeto. São valores públicos usados pelo navegador; nunca coloque `service_role`, uma secret key ou `CRON_SECRET` nessas variáveis.
5. Faça um deploy do site uma vez para ativar a integração. Depois disso, o job agendado atualiza os dados no Supabase sem novos deploys do GitHub Pages.

Sem essas variáveis, a aplicação continua usando o arquivo estático `public/election-results.json`. O endpoint oficial do TSE não pode ser consultado diretamente pelo navegador por causa de CORS.

No repositório, configure **Settings → Pages → Build and deployment → Source → GitHub Actions**. Para este projeto, o caminho do Pages está configurado como `/eleicao2026/`.
