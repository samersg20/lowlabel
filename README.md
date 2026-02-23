# SafeLabel MVP

MVP web para etiquetas de segurança alimentar com impressão automática em Zebra ZD220t via QZ Tray.

## Stack
- Next.js 14 (App Router + TypeScript)
- Prisma + SQLite
- Auth.js (NextAuth) com Credentials
- QZ Tray no front-end para impressão RAW ZPL

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

## Fluxo de impressão
1. Faça login
2. Cadastre itens em `/items` com shelf life por método
3. Vá para `/print`
4. Clique em **Detectar impressora**
   - Auto seleciona impressora contendo `ZDesigner ZD220`
   - Se não encontrar, selecione manualmente no dropdown (fica salvo no localStorage)
5. Selecione item + método + quantidade e clique **IMPRIMIR**
6. Front chama `POST /api/prints`, registra rastreabilidade e recebe ZPL
7. Front envia ZPL RAW para QZ Tray automaticamente

## Assinatura QZ (dev/prod)
- MVP roda em modo dev (diálogos do QZ Tray podem aparecer).
- Estrutura preparada para assinatura: veja `public/qz-signature-placeholder.txt`.

## Observações
- Métodos suportados: RESFRIADO, CONGELADO, AMBIENTE, QUENTE, DESCONGELANDO
- Se método não tiver shelf life cadastrado, emissão falha com mensagem apropriada.
- Quantidade limitada entre 1 e 50.
