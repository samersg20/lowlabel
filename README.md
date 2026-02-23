# SafeLabel MVP

MVP web para etiquetas de segurança alimentar com impressão automática em Zebra ZD220t via QZ Tray.

## Stack
- Next.js 14 (App Router + TypeScript)
- Prisma + PostgreSQL (Prisma Postgres no Vercel)
- Auth.js (NextAuth) com Credentials
- QZ Tray no front-end para impressão RAW ZPL (lib `qz-tray`)

## Requisitos
1. Node.js 20+
2. QZ Tray instalado e em execução (https://qz.io/download)
3. Driver da Zebra ZD220 instalado no Windows/macOS/Linux
4. Impressora aparecendo no sistema como `ZDesigner ZD220...` (auto seleção) ou nome compatível

## Setup
```bash
npm install
cp .env.example .env
npx prisma migrate dev --name init
npm run dev
```

> No deploy com PostgreSQL, o build aplica `prisma migrate deploy` e depois executa seed automaticamente.
> Para build local sem executar seed, use: `SKIP_DB_SEED=1 npm run build`.

Acesse: `http://localhost:3000`


## Troubleshooting `npm install` (HTTP 403)
Se `npm install` falhar com **403 Forbidden**, geralmente é política de registro/autenticação do ambiente (não erro do código da aplicação).

Checklist rápido:
1. Verifique registro ativo:
   - `npm config get registry` (esperado: `https://registry.npmjs.org/` para pacotes públicos)
2. Verifique se existe `.npmrc` local ou `~/.npmrc` com override de registry/token.
3. Se seu projeto usa registry privado, configure token:
   - `NPM_TOKEN=...`
   - entrada correspondente em `.npmrc` (veja `.npmrc.example`).
4. Em rede corporativa, confirme proxy/certificados (`HTTP_PROXY`, `HTTPS_PROXY`, CA interna).

> Neste ambiente de execução, o 403 ocorreu mesmo com registry público e sem `.npmrc`, indicando bloqueio/política externa do ambiente.

## Usuários seed
- Admin: `admin@safelabel.local` / `admin123`
- Operador: `operador@safelabel.local` / `operador123`

## Módulos
- `/items`: cadastro e filtro de itens por grupo
- `/groups`: cadastro/edição de grupos
- `/users`: cadastro/edição de usuários com unidade BROOKLIN/PINHEIROS

## Fluxo de impressão
1. Faça login
2. Cadastre itens em `/items` e marque os métodos válidos para cada produto
3. Vá para `/print`
4. Clique em **Detectar impressora**
   - Auto seleciona impressora contendo `ZDesigner ZD220`
   - Se não encontrar, selecione manualmente no dropdown (fica salvo no localStorage)
5. Selecione item + método + quantidade e clique **IMPRIMIR**
6. Front chama `POST /api/prints`, registra rastreabilidade e recebe ZPL
7. Front conecta com `qz.websocket.connect()` e envia ZPL RAW para QZ Tray automaticamente
   - Script do QZ é carregado via `https://unpkg.com/qz-tray@2.2.5/qz-tray.js`

## Assinatura QZ (dev/prod)
- O projeto já inclui um par de chaves para assinatura digital do QZ Tray:
  - Certificado público: `public/qz/certificate.pem`
  - Chave privada: `qz-signing/private-key.pem`
- A assinatura é feita no endpoint `POST /api/qz/sign` (usado pelo front antes de `qz.websocket.connect()`).
- Em produção, prefira armazenar a chave privada em variável de ambiente `QZ_PRIVATE_KEY_PEM`.

## Observações
- Métodos suportados: QUENTE (3h), PISTA FRIA (3h), DESCONGELANDO (3 dias), RESFRIADO (3 dias), CONGELADO (30 dias), AMBIENTE SECOS (30 dias).
- Se um método não estiver marcado no item, ele não aparece na tela de emissão.
- Quantidade limitada entre 1 e 50.


## Teste offline da API de prints (sem npm registry)
Com `node_modules` e Prisma já presentes localmente, você pode validar a API sem instalar nada novo.

1. Suba a aplicação:
   ```bash
   cp .env.example .env
   npx prisma migrate dev --name init
   npm run dev
   ```
2. Faça login no navegador (`/login`).
3. Capture o cookie de sessão do NextAuth:
   - Abra DevTools > **Application** (ou **Storage**) > **Cookies** > `http://localhost:3000`.
   - Copie o cookie `next-auth.session-token` (em HTTP local) ou `__Secure-next-auth.session-token` (HTTPS).
   - Monte no formato `nome=valor`.
4. Rode o script:
   ```bash
   NEXTAUTH_COOKIE='next-auth.session-token=SEU_VALOR' ./test-api.sh
   ```

O script valida automaticamente:
- `quantity` inválida (`"abc"`, `0`, `""`) => espera **HTTP 400**.
- `quantity` válida (`1`) => espera **HTTP 200**.


## Regra de validade da etiqueta
- Validade baseada na tabela fixa de métodos (horas/dias) e apenas para métodos marcados no item.
- Exibição de data/hora formatada em fuso `America/Sao_Paulo` (Brasil).
- Texto da etiqueta sem acentos para melhor compatibilidade de impressão térmica.
