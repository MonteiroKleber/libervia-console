# Specs por Fase (implementação do plano)

Este documento quebra `plano-implementacao-producao.md` em fases com **escopo**, **interfaces**, **critérios de aceite** e **Definition of Done** para implementação.

Premissas:
- Dev local (HTTP) e produção em VPS (Docker Compose + TLS no reverse proxy).
- `libervia-engine` é autoridade; `libervia-console-api` orquestra e guarda segredos; `libervia-console` é UI; `libervia-agent-runtime` executa local.

---

## Convenções (para todo o projeto)

### Identidades
- **institution_id**: UUID gerado pelo Engine.
- **user_id**: ID interno do SaaS (Console API).
- **actor_id**: UUID (no Engine). “owner/executive_admin/organizational_agent” viram **roles/labels** no SaaS.

### Headers (Engine)
Os nomes exatos devem ser confirmados nos endpoints do Engine antes de codar, mas o padrão é:
- `X-Admin-Token`: bootstrap/admin global (ex.: release).
- `X-Admin-Key`: admin por instituição (preferencial após bootstrap).
- `X-Institution-Id`: roteamento multi-tenant.
- `X-Actor-Token`: autenticação de ator (owner/admin/agent).

### Segurança
- Frontend nunca recebe segredos do Engine.
- Console API autentica o usuário e “atua” como broker institucional (ex.: chamar Engine com admin key) — isso não é “decidir”; é executar um ato humano autenticado.
- Tudo que altera estado relevante deve produzir evidência (ledger no Engine; audit log no SaaS apenas como espelho/UX, nunca como fonte de verdade).

---

## Fase 0 — Repositórios e bases

### Objetivo
Criar os repositórios e padronizações mínimas para desenvolvimento e releases.

### Entregáveis
- Repos novos: `libervia-console-api`, `libervia-console`, `libervia-agent-runtime`.
- CI mínima: lint + testes + build.
- Dockerfile(s) e `.env.example`.
- Convenção de versão (SemVer) e tags.

### DoD
- Cada repo sobe localmente com um comando e possui `README` com quickstart.
- Pipeline CI roda em PR e em tag.

---

## Fase 1 — Ambiente Dev Local (orquestração)

### Objetivo
Subir localmente os 4 componentes (engine, console-api, console, postgres) com configuração consistente.

### Entregáveis
- `docker-compose.dev.yml` (ou `compose.yaml`) com:
  - `engine` (porta 8000)
  - `console-api` (porta 3001 por ex.)
  - `console` (porta 3000)
  - `postgres` (Console API)
- Volumes persistentes (Engine + Postgres).

### Critérios de aceite
- `engine` responde `GET /health`.
- `console-api` responde `GET /health`.
- `console` carrega e consegue logar (mesmo que stub).

### DoD
- Um “happy path” documentado no README: subir stack, criar conta (stub) e ver UI.

---

## Fase 2 — Engine pronto para o SaaS (somente o necessário)

### Objetivo
Garantir que o Engine já oferece (ou ajustar apenas se faltar) o mínimo para:
- onboarding institucional automatizado via Console API
- approvals efetivos
- auditabilidade
- integração com runtime local (jobs/resultados) **sem mock**

### Regra de ouro (importante)
**Não tocar no Engine sem antes provar que não existe** o que se quer implementar.

### Interfaces a confirmar no Engine (antes de codar qualquer ajuste)
Verificar no repo `engine` se já existem endpoints para:
1) **Onboarding admin**
   - criar instituição
   - bootstrap admin key por instituição
   - criar tokens de atores (incluindo `is_agent=true`)
   - ativar dept `personal_ops` (se aplicável)
2) **Release do bundle**
   - `compile/release` para produção (com verificação e deploy scripts)
3) **Approvals**
   - listar pendências (se existir) e decidir approve/reject
4) **Auditoria/read-model**
   - timeline consultável por instituição (para o portal)
5) **Integração Runtime**
   - criação de “trabalho autorizado” (job) após allow/approval
   - polling de jobs pelo runtime
   - post de resultados do runtime

### Resultado esperado (DoD)
- Onboarding do SaaS consegue criar uma instituição e deixar:
  - dept ativo
  - atores/tokens criados
  - bundle release aplicado
  - ledger funcionando
- Existe um caminho real (sem mock) para o runtime executar uma ação e reportar resultado que vira evento no ledger.

---

## Fase 3 — IDL Base `personal_ops@v1.0.0`

### Objetivo
Definir o contrato mínimo do produto (IDL) para filesystem personal ops.

### Local canônico (no repo `libervia-console`)
- Fonte da IDL deve ser versionada em: `idl/personal_ops/v1.0.0/source.idl`
- Qualquer artefato gerado (ex.: bundle exportado, notas de release) deve ficar em `idl/personal_ops/v1.0.0/artifacts/` (não commitar binários grandes; guardar só o essencial e checksums).

### Entregáveis
- Arquivo(s) da IDL base versionados (fonte declarativa).
- Bundle gerado e release aplicado no Engine para uma instituição.

### Regras
- `delete` sempre exige approval.
- `move` exige approval.
- `rename` começa com approval obrigatório (simplifica MVP e reduz risco).

### DoD
- Uma instituição “sandbox” executa:
  - listar (allow direto)
  - delete (bloqueia → approval → executa)
- Evidência no ledger: request/deny/approval/execute/result.

---

## Fase 4 — `libervia-console-api` (backend SaaS)

### Objetivo
Implementar o backend do SaaS, incluindo onboarding idempotente e proxy seguro para Engine.

### Modelo de dados mínimo (Postgres)
- `users`: id, email, password_hash ou magic_link (decidir).
- `institutions`: id (saas), engine_institution_id, slug, display_name, created_at.
- `memberships`: user_id, institution_id, role (owner/admin/viewer).
- `engine_secrets` (ou equivalente):
  - engine_institution_id
  - admin_key_id
  - admin_key_secret_encrypted
  - created_at / rotated_at
- `actor_tokens` (ou equivalente):
  - engine_institution_id
  - actor_label (owner/executive_admin/organizational_agent)
  - engine_actor_id (UUID)
  - actor_token_encrypted (apenas para server-side proxy)

### Endpoints Console API (mínimo)
- `POST /auth/...` (login)
- `POST /onboarding` (idempotente)
- `GET /me`
- `GET /dashboard`
- `GET /approvals` e `POST /approvals/{id}/decide`
- `GET /audit` (+ export)
- `POST /chat/intent` (texto → intent → proposta no Engine → resposta)
- `GET /runtime/download` (binário) e/ou `GET /runtime/config`

### DoD
- Usuário cria conta, roda onboarding, vê dashboard.
- Ações do portal refletem estado real do Engine.
- Nenhum segredo do Engine exposto ao browser.

---

## Fase 5 — `libervia-console` (frontend)

### Objetivo
Construir UI humana com telas obrigatórias do documento de visão.

### Telas mínimas
- Onboarding
- Dashboard
- Chat executivo
- Aprovações
- Auditoria

### DoD
- UI funciona ponta a ponta via Console API (sem chamadas diretas ao Engine).
- Chat nunca “responde livre”; sempre mostra status governado (allowed / needs approval / denied) e eventos/resultados.

---

## Fase 5.1 — UI/UX Implementation (Design System + Wireflows)

### Objetivo
Implementar a UI/UX conforme `spec-ui-ux.md`, criando um design system mínimo e wireflows reais antes de avançar para E2E/produção.

### Escopo
- Implementar o “Checklist de componentes” (design system mínimo).
- Implementar as telas obrigatórias com:
  - loading/empty/error states padronizados
  - estados governados: `allowed`, `needs_approval`, `denied`, `executing`, `executed`, `failed`
  - confirmações reforçadas para ações irreversíveis (ex.: delete)
- Garantir acessibilidade mínima (foco, labels, dialogs).

### DoD
- O design system mínimo está em uso por todas as telas.
- Navegação completa entre as 5 telas.
- Nenhum segredo exposto no browser.
- Estados governados são sempre explícitos e nunca simulados.

---

## Fase 6 — `libervia-agent-runtime` (Python empacotado)

### Objetivo
Criar executor local governado com CLI e loop de execução real.

### CLI
- `libervia-agent configure ...` (salva config local com permissões restritas)
- `libervia-agent run` (loop)
- `libervia-agent status` (diagnóstico)

### Segurança mínima
- Execução limitada a `root_dir` (anti path traversal).
- Idempotência por `job_id` (não repetir delete/rename etc).
- Logs locais sem segredos.

### DoD
- Em dev local, runtime executa um job autorizado e reporta resultado ao Engine.

---

## Fase 7 — Staging local (prod-like sem TLS)

### Objetivo
Rodar E2E real e endurecer o mínimo operacional.

### DoD (E2E)
- Fluxo de delete: solicita → pendente → aprova → runtime executa → ledger prova.
- Rate limit e logs estruturados ativos.
- Script de backup de volumes (dev/staging).

---

## Fase 8 — Produção VPS (Docker Compose + TLS)

### Objetivo
Migrar para VPS mantendo a mesma arquitetura (somente mudando URLs/infra).

### Entregáveis
- `docker-compose.prod.yml`
- reverse proxy com TLS (Caddy ou Nginx)
- volumes em `/var/lib/...`
- backup agendado (Postgres + dados do Engine)

### DoD
- Stack sobe no VPS com domínio e HTTPS.
- Onboarding e E2E de sandbox rodam em produção.
