# Prompts — Auth/Accounts/Membership UI (sem Billing)

Regras globais (aplicar em TODOS os prompts):
- **Antes de implementar qualquer coisa, procurar se já existe** (`rg`, `ls`, ler arquivos).
- Mudanças mínimas. Evitar refactors.
- Sem mocks. Se não executa, não vale.
- **Engine**: não tocar, salvo ausência comprovada e mudança genérica.
- Após cada etapa: rodar testes e registrar DoD.

---

## Prompt 0 — Auditoria (sem codar)
Repo(s): `/home/bazari/libervia-console-api`, `/home/bazari/libervia-console`

Objetivo: reportar exatamente o que existe e o que falta.

Rodar:
- buscas com `rg` para `auth_mode`, `login`, `register`, `session`, `cookie`, `membership`, `invite`.
- listar páginas do Next e middleware.

Entregar:
- relatório curto com evidências (arquivo + linha aproximada).

---

## Prompt 1 — Console API Auth “quase-prod” (sem Engine)
Repo: `/home/bazari/libervia-console-api`

Implementar flags:
- `dev_auto_login`
- `allow_registration_in_dev`

Ajustar `/auth/login`, `/auth/register`, adicionar `/auth/logout`.

Testes obrigatórios:
- auto-login ON
- auto-login OFF
- registro ON em dev

Rodar no final:
- `pytest -q`

---

## Prompt 2 — Console (Next) UI Auth + sessão httpOnly (rollout seguro)
Repo: `/home/bazari/libervia-console`

Objetivo: adicionar UX de login/registro real **sem quebrar o fluxo atual**.

Regras rígidas:
- Token **nunca** em `localStorage`.
- Guardar JWT apenas em **cookie httpOnly** (ex.: `libervia_console_access_token`).
- Não mexer no Engine.
- Mudanças mínimas: criar a estrutura, e só depois “apertar o parafuso” do require-auth.

A) UI (páginas)
- Criar `/login`, `/register`, `/logout`.
- Ajustar navegação do AppShell para expor “Entrar / Sair”.

B) BFF (rotas Next) — sessão canônica
Criar rotas:
- `POST /api/auth/login` → chama `POST ${CONSOLE_API_BASE_URL}/auth/login` e grava cookie httpOnly.
- `POST /api/auth/register` → chama `POST .../auth/register` e grava cookie httpOnly.
- `POST /api/auth/logout` → apaga cookie.
- `GET /api/auth/me` → proxy para `GET .../auth/me` usando o cookie.

C) Propagação automática do token (server-side)
- Criar um helper server-side (ex.: `src/lib/auth.ts`) para:
  - ler cookie do token
  - montar header `Authorization: Bearer ...`
- Atualizar `fetchFromConsoleApi()` (ou criar `fetchFromConsoleApiAuthed()`) para permitir passar headers do token **apenas no server**.

D) Middleware (rollout seguro)
- Implementar proteção de `src/app/(app)/*`, mas **não ativar por padrão**.
- Gate por env (ex.: `CONSOLE_REQUIRE_AUTH=true|false`):
  - default `false` (não quebra o que já está rodando)
  - quando as telas estiverem OK, ligar `true` e validar o fluxo prod-like.

E) DoD (verificável)
- `npm run build` passa.
- UI `/login` e `/register` existem e funcionam (quando `allow_registration_in_dev=true`).
- Logout remove cookie.
- Com `CONSOLE_REQUIRE_AUTH=true` e `dev_auto_login=false` (Console API):
  - abrir `http://localhost:3002/dashboard` redireciona para `/login`.
  - login → dashboard.

Rodar no final:
- `npm run build`

---

## Prompt 3 — Membership/Invites + provisionamento Engine
Repo: `/home/bazari/libervia-console-api`

Criar:
- model `MembershipInvite`
- endpoints de invite e accept
- provisionamento no Engine ao aceitar

Rodar no final:
- `pytest -q`

---

## Prompt 4 — Membership UI
Repo: `/home/bazari/libervia-console`

Criar UI:
- conta (me/logout)
- instituições (listar/trocar)
- convidar conta exec_admin
- aceitar convite

---

## Prompt 5 — Gate E2E anti-regressão
Repo: `/home/bazari/libervia-console`

Rodar no final:
- `./scripts/e2e_auth_membership_jobs.sh`
