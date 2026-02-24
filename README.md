# SafeLabel MVP

MVP web para etiquetas de segurança alimentar com impressão automática via PrintNode.

## Stack
- Next.js 14 (App Router + TypeScript)
- Prisma + PostgreSQL (Prisma Postgres no Vercel)
- Auth.js (NextAuth) com Credentials
- PrintNode API para impressão silenciosa RAW ZPL

## Requisitos
1. Node.js 20+
2. Conta no PrintNode com impressora conectada
3. `PRINTNODE_API_KEY` e `PRINTNODE_PRINTER_ID` configurados no ambiente

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
- Admin: `admin` (ou `admin@safelabel.local`) / `admin123`
- Operador: `operador` (ou `operador@safelabel.local`) / `operador123`


## Recuperação de senha
- Link **Esqueci minha senha** em `/login`
- Endpoint público: `POST /api/password/forgot` (envia link por e-mail)
- Endpoint público: `POST /api/password/reset` (troca senha por token)
- Para envio real de e-mail configure:
  - `RESEND_API_KEY`
  - `RESEND_FROM_EMAIL`
- **Segurança:** não versionar chave no repositório; configure no ambiente (`.env` local e variáveis no deploy).

## Módulos
- `/items`: cadastro e filtro de itens por grupo, com importação/exportação em XLSX
- `/groups`: cadastro/edição de grupos
- `/users`: cadastro/edição de usuários com unidade BROOKLIN/PINHEIROS
- `/printers`: cadastro de impressoras por unidade (API key + printer id PrintNode)


## Importação e exportação de itens (XLSX)
- Em `/items`, o card **Importar / Exportar Itens** permite baixar e enviar planilha `.xlsx`.
- A importação **atualiza itens existentes** (quando encontra `itemCode`/nome+grupo) e **adiciona itens novos**.
- Itens antigos **não são removidos automaticamente**; exclusão continua manual.
- Cada item possui `itemCode` de 6 dígitos gerado automaticamente pelo sistema (uso interno); não é necessário preencher na planilha.


## DIGITAR e FALAR (IA com Gemini)
- Acesse `/print-easy` (**DIGITAR**) para informar pedidos em texto corrido (ex.: `10 brisket 5 cupim 2 pork ribs`).
- Acesse `/print-voice` (**FALAR**) para captar voz no navegador, converter para texto e enviar para interpretação.
- Os dois módulos processam o conteúdo com Gemini e disparam impressão automaticamente.
- Limite dos módulos DIGITAR/FALAR: **1 a 10 etiquetas por item**.
- Configure no ambiente:
  - `GEMINI_API_KEY`
  - `GEMINI_MODEL` (opcional para DIGITAR; padrão `gemini-1.5-flash`)
  - FALAR usa modelo fixo `gemini-3-flash-preview`.

## Fluxo de impressão
1. Faça login
2. Cadastre itens em `/items` e marque os métodos válidos para cada produto
3. Vá para `/print`
4. Selecione item + método + quantidade e clique **IMPRIMIR**
5. Front chama `POST /api/prints`.
6. Back busca configuração da impressora pela unidade do usuário (cadastro em `/printers`); se não encontrar ativa, usa variáveis de ambiente.
7. Back registra rastreabilidade, gera ZPL e envia para PrintNode (`POST /printjobs`) de forma silenciosa.

## Configuração PrintNode
- Você pode cadastrar as credenciais por unidade em `/printers` (recomendado).
- Fallback por ambiente (quando não houver cadastro ativo da unidade):
  - `PRINTNODE_API_KEY`
  - `PRINTNODE_PRINTER_ID` (ou `PRINTNODE_PRINT_ID`)
- O backend usa autenticação Basic (`apiKey:`) e envia conteúdo `raw_base64` para o endpoint oficial do PrintNode.

## Observações
- Métodos suportados: QUENTE (3h), PISTA FRIA (3h), DESCONGELANDO (3 dias), RESFRIADO (3 dias), CONGELADO (30 dias), AMBIENTE SECOS (30 dias).
- Se um método não estiver marcado no item, ele não aparece na tela de emissão.
- Módulo Emitir (`/print`) limitado entre 1 e 20.
- Módulos DIGITAR e FALAR limitados entre 1 e 10 por item interpretado.


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
