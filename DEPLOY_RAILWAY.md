# Deploy no Railway - Instruções

O servidor já está funcionando e no GitHub em: https://github.com/felipeJJD/capi-webhook

## Opção 1: Deploy pela Interface Web do Railway (MAIS FÁCIL)

1. Acesse https://railway.com e faça login com GitHub
2. Clique em **"New Project"**
3. Selecione **"Deploy from GitHub repo"**
4. Escolha o repositório `felipeJJD/capi-webhook`
5. Railway detecta automaticamente o `railway.json` e o `package.json`
6. Clique em **"Deploy Now"**
7. Aguarde o deploy (1-2 minutos)
8. Clique em **"Generate Domain"** para gerar a URL pública

## Opção 2: Deploy via CLI

```bash
# Login
railway login

# Na pasta do projeto
cd C:\Users\Omega\Documents\Projetos\capi-webhook
railway link   # escolha ou crie um novo projeto
railway up
```

## Opção 3: GitHub Actions (automático a cada push)

Já existe o arquivo `.github/workflows/deploy.yml`. Para ativar:

1. Acesse https://railway.com/account/tokens
2. Crie um novo token API
3. No GitHub: https://github.com/felipeJJD/capi-webhook/settings/secrets/actions
4. Adicione o secret `RAILWAY_TOKEN` com o valor do token
5. Faça qualquer push para branch `main` para triggerar o deploy

## URL esperada após deploy

```
POST https://<seu-projeto>.up.railway.app/purchase
GET  https://<seu-projeto>.up.railway.app/health
```

## Variáveis de ambiente já configuradas no código

As seguintes variáveis já estão hardcoded no `index.js` como defaults:
- `PIXEL_ID=1867026417263870`
- `CAPI_TOKEN=...`
- `EVENT_VALUE=37.00`
- `EVENT_CURRENCY=BRL`

Para maior segurança, configure-as como env vars no Railway Dashboard.
