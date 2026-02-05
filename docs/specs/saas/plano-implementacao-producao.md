# Plano Linear de Implementação (Local → Produção VPS)

Baseado em: `docs/specs/saas/documento-visao.md`.

## Objetivo

Entregar o **Libervia Personal Ops** como um SaaS com governança determinística, onde:

- **Engine é autoridade** (regras e enforcement vivem no Engine).
- **IA não decide** (no máximo sugere/estrutura intents; decisão é humana/institucional).
- **Nada executa sem contrato (IDL)**.
- **Nada destrutivo sem approval explícito**.
- **Auditoria é arquitetura** (tudo vira evento no ledger).
- **Nada fake / nada mock** (fluxos são reais de ponta a ponta).

## Premissas (confirmadas)

- **Produção**: 1 VPS com **Docker Compose**.
- **Desenvolvimento**: tudo rodando **local** (HTTP), sem TLS.
- **TLS**: somente na VPS (reverse proxy).
- **Agent Runtime**: **Python empacotado** (PyInstaller).
- **Console** nunca chama o Engine diretamente; tudo via **Console API**.

## Componentes e limites de responsabilidade

### 1) `libervia-engine` (já existe) — Autoridade

Responsável por:

- Instituições, IDL, RBAC, Workflows, Approvals, Ledger.
- Enforcement: nada roda fora do contrato.
- Multi-tenant por `institution_id`.

Nunca:

- Implementar billing, onboarding SaaS, sessão web, download do runtime.

### 2) `libervia-console-api` (novo) — Backend SaaS

Responsável por:

- Autenticação e contas de usuários.
- Billing/planos (pode iniciar stub).
- Mapeamento `user_id -> institution_id`.
- Orquestrar chamadas administrativas ao Engine (sem governar).
- Sessão do portal.
- Downloads/versões do runtime.

Nunca:

- Aprovar ações.
- Bypass do Engine.
- Implementar regras.

### 3) `libervia-console` (novo) — Frontend

Responsável por:

- Onboarding, dashboard, aprovações, auditoria, chat executivo (UI).

Nunca:

- Ter segredos.
- Chamar Engine com `X-Admin-Token` / `X-Admin-Key`.
- Tomar decisões.

### 4) `libervia-agent-runtime` (novo) — Executor local governado

Responsável por:

- Executar ações locais (filesystem) **somente após autorização do Engine**.
- Reportar resultados ao Engine (para ledger/auditoria).

Nunca:

- Ampliar permissão.
- Executar fora do contrato.

## Definição do MVP (Produção)

Dept padrão: `personal_ops`

Operações base (IDL `personal_ops@v1.0.0`):

- `listar arquivos` (permitido)
- `detectar duplicados` (permitido)
- `sugerir limpeza` (permitido)
- `renomear arquivos` (approval — iniciar como obrigatório)
- `mover arquivos` (approval obrigatório)
- `deletar arquivos` (approval obrigatório)

## Plano linear (do início ao fim)

### Fase 0 — Repositórios e bases

1. Criar repositórios:
   - `libervia-console-api`
   - `libervia-console`
   - `libervia-agent-runtime`
2. Padronizar:
   - versionamento (SemVer), changelog, tags de release
   - lint + testes mínimos
   - Dockerfiles e `.env.example`
3. Definir “IDs e nomes”:
   - `bundle_name` para produção (ex.: `personal-ops`)
   - versão inicial `personal_ops@v1.0.0`

### Fase 1 — Ambiente Dev Local (orquestração)

4. Criar `docker-compose.dev.yml` (local) com serviços:
   - `engine`
   - `console-api`
   - `console`
   - `postgres` (Console API)
5. Definir volumes persistentes (dev):
   - dados do Engine (instituições, bundles, ledger)
   - dados do Postgres
6. Criar bootstrap de dev:
   - seed de variáveis necessárias
   - comandos `make`/`just` (opcional) para subir/descer e resetar volumes

### Fase 2 — Engine pronto para o SaaS (interfaces mínimas)

7. Confirmar e estabilizar o fluxo de onboarding via Engine (admin):
   - criar instituição
   - criar dept padrão `personal_ops` (ativação)
   - criar atores/tokens separados (owner, executive_admin, organizational_agent com `is_agent=true`)
   - registrar IDL base `personal_ops@v1.0.0`
   - `compile + release`
8. Fechar o “ciclo runtime” (execução real + auditável):
   - definir modelo de **job autorizado** (idempotente) e persistência por instituição/dept
   - endpoint para runtime: “pull de jobs autorizados”
   - endpoint para runtime: “post de resultados”
   - eventos de ledger para: proposta, bloqueio, approval, execução, resultado
9. Garantir enforcement:
   - `rename/move/delete` não geram job sem approval efetivo
   - ações fora do dept ou fora do contrato são negadas com motivo (evento no ledger)

### Fase 3 — IDL Base `personal_ops@v1.0.0`

10. Especificar a IDL de `personal_ops` com:
   - recursos e ações
   - RBAC mínimo (owner/admin vs agent)
   - approvals obrigatórios para move/delete (e rename inicialmente)
11. Validar o bundle gerado:
   - determinismo (hashes/manifest)
   - endpoints ativos para governança/approvals necessários ao portal

### Fase 4 — Console API (backend SaaS)

12. Implementar persistência (Postgres):
   - `users`
   - `institutions`
   - `memberships`
   - `plans/subscriptions` (stub aceitável no MVP)
   - referências a segredos do Engine por instituição (admin key/secret)
13. Autenticação e sessão:
   - login (email + magic link / senha / OAuth — decidir no início da implementação)
   - sessão segura (cookies httpOnly)
14. Onboarding idempotente (endpoint único no Console API):
   - chama Engine para criar `institution`
   - bootstrap do primeiro `admin-key` (armazenar segredo com segurança)
   - cria actor tokens para os 3 atores iniciais
   - dispara `compile/release` do bundle `personal_ops@v1.0.0`
   - retorna “pacote” de runtime: `institution_id`, `actor_token` (agente), `engine_base_url`
15. APIs do portal (todas via Console API):
   - dashboard: status do agente + últimas ações + pendências
   - approvals: listar + aprovar/rejeitar
   - auditoria: timeline + filtros + export
   - chat: mensagem → intent → proposal no Engine → retorno de status/explicação

### Fase 5 — Console (frontend)

16. Onboarding:
   - criar instituição
   - ativar agente
   - ver regras ativas
   - baixar runtime/config
17. Dashboard:
   - status do agente
   - últimas ações
   - pendências
18. Chat executivo (regra de ouro):
   - UI envia texto para Console API
   - Console API gera intent (determinístico quando possível; LLM só para parsing, nunca para decidir)
   - Console API chama Engine para criar proposta/ação governada
   - UI exibe: allowed / precisa approval / denied + explicação do Engine
19. Aprovações:
   - lista de pendentes
   - aprovar/rejeitar com impacto resumido
20. Auditoria:
   - timeline humana
   - filtros por tipo (RBAC/approval/execution)
   - export (CSV/JSONL)

### Fase 6 — Agent Runtime (Python empacotado)

21. CLI do runtime:
   - `libervia-agent configure --institution-id ... --actor-token ... --engine-base-url ...`
   - `libervia-agent run`
   - `libervia-agent status`
22. Execução governada:
   - poll de jobs autorizados
   - execução em diretório permitido (`root_dir`) com validação de path traversal
   - report de resultado (sucesso/erro + hashes) ao Engine
23. Empacotamento e distribuição:
   - PyInstaller por OS/arch
   - versionamento + checksums
   - download via Console API (link autenticado)

### Fase 7 — Staging local (prod-like, sem TLS)

24. Rodar E2E real (sem mock):
   - criar instituição
   - solicitar `delete` → entra como pending
   - aprovar no portal
   - runtime executa em pasta de teste
   - Engine registra no ledger: approval → execução → resultado
25. Hardening mínimo:
   - rate limit no Engine/Console API
   - logs estruturados + `request_id`/`case_id`
   - backups locais de volumes (script)

### Fase 8 — Produção na VPS (migração final)

26. Criar `docker-compose.prod.yml` com:
   - `engine`, `console-api`, `console`, `postgres`, `reverse-proxy` (Caddy/Nginx)
27. Configurar domínio + TLS no reverse proxy.
28. Migrar configs:
   - `engine_base_url=https://<dominio>`
   - secrets via `.env.prod` (ou secret manager do provedor)
29. Subir com volumes fixos em `/var/lib/...` e backup agendado do Postgres + dados do Engine.
30. Executar o mesmo E2E em produção com “instituição sandbox”.

## Checklist de Produção (critério final)

Só vai a mercado se:

- O agente executa algo real (filesystem) via runtime.
- Approval bloqueia de verdade (sem bypass).
- Ledger prova tudo (eventos, hashes, rastreio).
- Nada é simulado/mocado.
- Engine permanece autoridade absoluta.

## Variáveis e segredos (mínimo)

- **Engine**
  - `ENGINE_ISE_ADMIN_TOKEN` (somente Console API usa; nunca no frontend)
  - caminhos/volumes para bundles, institutions, ledger
- **Console API**
  - credenciais do Postgres
  - chave de criptografia “at-rest” para segredos de instituições (se não houver KMS)
  - URL pública do Engine (prod) e URL local (dev)
- **Console**
  - URL da Console API
- **Runtime**
  - `institution_id`
  - `actor_token` (agente)
  - `engine_base_url`
  - `root_dir` permitido para operações

## Riscos principais (e mitigação)

- **Runtime Python**: mais frágil para distribuição → mitigar com PyInstaller + checksums + auto-update opcional depois.
- **Secrets do Engine**: não vazar admin key/token → mitigar guardando somente no Console API (encrypted-at-rest) e nunca no browser.
- **Rede instável** (laptops): jobs/resultados precisam ser idempotentes → mitigar com `job_id`, hashes, retries e estado local.

