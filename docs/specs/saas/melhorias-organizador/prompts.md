# Prompts — Melhorias do Organizador

Regras globais (para todos os prompts):
- **Sempre procurar se já existe** (não reimplementar): `rg`, `ls`, ler specs.
- **IDL é fonte da verdade**: nunca editar artefatos manualmente.
- **Engine**: não tocar salvo ausência comprovada e mudança genérica.
- Mudanças mínimas + testes + gate.

---

## Prompt F0 — Auditoria do estado atual (sem codar)
Repos: `/home/bazari/libervia-console`, `/home/bazari/libervia-console-api`, `/home/bazari/libervia-agent-runtime`, `/home/bazari/engine` (read-only)

Objetivo: mapear capacidades atuais e lacunas.

Entregar:
- tabela de job_types suportados no bundle atual
- tabela de action_types suportados no runtime
- quais intents existem no chat
- quais gates E2E existem e status

---

## Prompt F1 — Filesystem Core (IDL + Runtime + Console API + UI)

### Repo A: `/home/bazari/libervia-console` (IDL)
- adicionar job.* endpoints e permissões para `files.read`, `files.search`, `files.copy`, `files.hash`, `files.stat`.
- decidir quais requerem approval_rules (provavelmente apenas as destrutivas: copy com overwrite, e qualquer write).
- compilar via scripts canônicos.

### Repo B: `/home/bazari/libervia-agent-runtime`
- implementar ações novas com root_dir confinement e limites.
- testes unitários.

### Repo C: `/home/bazari/libervia-console-api`
- chat intents PT/EN para novos comandos.
- engine_client adiciona chamadas `job_files_read`/etc.

### Repo D: `/home/bazari/libervia-console`
- UI exibe resultados com bom UX (preview/copy).

DoD:
- E2E novo `scripts/e2e_personal_ops_filesystem_core.sh` PASS.

---

## Prompt F2 — Planos/Preview/Lote
- adicionar job_types `files.plan.create/apply/get`
- UI para preview e approval
- gate e2e `scripts/e2e_personal_ops_plan_apply.sh`

---

## Prompt F3 — Rotinas SAFE
- implementar schedules no Console API (DB + worker)
- UI para configurar rotinas
- gate e2e `scripts/e2e_personal_ops_schedules_safe.sh`

---

## Prompt F4 — Integrações locais
- implementar `archive.create` end-to-end
- gate e2e adicional


---

## Prompt F1 (DURO) — Filesystem Core v1: novos job_types + UX de resultado + gate E2E

Regras globais (colar no topo do prompt para Claude):
- **Sempre procurar se já existe** (não reimplementar): `rg`, `ls`, ler specs.
- **IDL é fonte da verdade**: nunca editar artefatos manualmente.
- **Engine**: não tocar salvo ausência comprovada e mudança genérica.
- Mudanças mínimas + testes + gate.

### Objetivo
Entregar **Filesystem Core v1** com:
1) novos job_types canônicos via IDL: `files.read`, `files.stat`, `files.hash`, `files.search` (safe)
2) UX: chat/UI conseguem mostrar **resultado real** (`result_json`) para jobs safe (list/scan/suggest + novos)
3) gate: novo script `scripts/e2e_personal_ops_filesystem_core.sh` com `FAIL=0`

### Repositórios (ordem e escopo)
- Repo A (IDL): `/home/bazari/libervia-console`
- Repo B (Runtime): `/home/bazari/libervia-agent-runtime`
- Repo C (Console API): `/home/bazari/libervia-console-api`
- Repo D (Console UI/Next): `/home/bazari/libervia-console`
- Repo Engine: `/home/bazari/engine` (**somente leitura**, não alterar)

---

### A) IDL — adicionar job endpoints + permissões (fonte da verdade)
Repo: `/home/bazari/libervia-console`

1) Antes de mudar:
- provar que `files.read/stat/hash/search` não existem na IDL/bundle:
  - `rg -n "files\.(read|stat|hash|search)" idl/personal_ops/v1.0.0/source.idl -S`
  - `rg -n '"files\.(read|stat|hash|search)"' idl/personal_ops/operations.json -S`

2) Alterar somente `idl/personal_ops/v1.0.0/source.idl`:
- adicionar permissões novas (no actor `inst_owner` e `runtime_agent`):
  - `files.read`, `files.stat`, `files.hash`, `files.search`
- adicionar endpoints job.* (safe) na seção `operations`:
  - `POST /personal/jobs/files/read`  → `job_type: "files.read"`
  - `POST /personal/jobs/files/stat`  → `job_type: "files.stat"`
  - `POST /personal/jobs/files/hash`  → `job_type: "files.hash"`
  - `POST /personal/jobs/files/search`→ `job_type: "files.search"`

3) Compilar canonicamente (sem editar artefatos na mão):
- `./scripts/idl_build_personal_ops.sh`
- `./scripts/idl_check_personal_ops.sh`

DoD A:
- build/check retornam 0
- artefatos atualizados somente via build

---

### B) Runtime — implementar actions (com limites e segurança)
Repo: `/home/bazari/libervia-agent-runtime`

1) Antes de codar:
- localizar onde o executor faz dispatch de action_type (map/registry)
- provar que não existe handler para:
  - `files.read`, `files.stat`, `files.hash`, `files.search`

2) Implementar handlers com **root_dir confinement** e limites:
- `files.read`:
  - só leitura de arquivo texto
  - `max_bytes` (default ex.: 64KB) + truncation
- `files.stat`:
  - exists/type/size/mtime
- `files.hash`:
  - sha256 (streaming para arquivos grandes, limite opcional)
- `files.search`:
  - busca por nome/padrão (MVP: glob simples) OU busca por substring no nome
  - `max_results` (default ex.: 200)
  - não varrer `/` inteiro sem limite

3) Aliases:
- manter compat com naming (`file.*` vs `files.*`) se necessário, mas escolher 1 canônico.

4) Testes unitários:
- traversal protection
- limites (max_bytes, max_results)
- paths relativos ao root

DoD B:
- `pytest` do runtime passa

---

### C) Console API — chat + engine_client para novos jobs
Repo: `/home/bazari/libervia-console-api`

1) Engine client:
- adicionar métodos:
  - `job_files_read`, `job_files_stat`, `job_files_hash`, `job_files_search`
  - `job_get` já existe

2) Chat intents:
- adicionar intents PT/EN:
  - "ler arquivo X"
  - "detalhes do arquivo X" (stat)
  - "hash do arquivo X"
  - "buscar arquivos com nome Y na pasta X"

3) UX de resultado (ponto crítico):
- Para jobs safe:
  - após `job.request` + `job.enqueue`, fazer polling curto (ex.: 6 tentativas x 500ms/1s)
  - se `executed`, retornar no response:
    - `result_summary`
    - `result_json` (ou `result_data`) truncado/limitado quando necessário
  - se não completou no tempo: retornar "job enfileirado" + `job_id` para acompanhar

DoD C:
- testes unitários (mínimo) para:
  - safe job retorna resultado inline quando rápido
  - fallback para job_id quando demora

---

### D) Console (Next) — renderizar result_json no chat
Repo: `/home/bazari/libervia-console`

1) Confirmar onde a UI do chat renderiza a resposta.
2) Se a resposta incluir `result_json`:
- para list: renderizar tabela simples (name/type/size/modified)
- para scan/suggest: renderizar resumo + itens principais
- para read: renderizar preview com limite + copy

DoD D:
- `npm run build` passa

---

### E) Gate E2E — filesystem_core
Repo: `/home/bazari/libervia-console`

Criar `scripts/e2e_personal_ops_filesystem_core.sh`:
- pré-check: health engine/api/ui
- registrar/login (pode reutilizar padrão do e2e_auth_membership_jobs.sh)
- onboarding (se necessário)
- criar arquivos de teste em `/home/bazari/tmp/libervia-e2e/`
- chamar chat para:
  - list (espera result_json.entries)
  - read (espera content_preview)
  - hash (espera sha256)
  - stat (espera size/type)
  - search (espera matches)

Critério:
- `FAIL=0` e exit code 0

---

### Entregáveis finais
- quais arquivos mudaram (por repo)
- outputs:
  - `./scripts/idl_check_personal_ops.sh`
  - `pytest` do runtime
  - `pytest` do console-api
  - `npm run build` do console
  - `./scripts/e2e_personal_ops_filesystem_core.sh` (PASS)

---

## Prompt F1.5 (DURO) — UX Resultados: tabela/filtros/download para result_json

Regras globais (colar no topo do prompt para Claude):
- **Sempre procurar se já existe** (não reimplementar): `rg`, `ls`, ler specs.
- **IDL é fonte da verdade**: nunca editar artefatos manualmente.
- **Engine**: não tocar salvo ausência comprovada e mudança genérica.
- Mudanças mínimas + testes + gate.

Repo: `/home/bazari/libervia-console`

Objetivo: melhorar UX do chat para exibir `result_json` de forma rica e útil (tabela, filtros, download) sem mudar contracts.

1) Antes de codar:
- localizar onde o chat page renderiza respostas e onde `result_json` chega (types).
- procurar se já existe componente de tabela/filter/download reutilizável.

2) Implementar:
- criar `src/components/results/JobResultViewer.tsx` (ou pasta semelhante)
- subcomponentes:
  - `FilesListTable` (ordenar, filtrar type, buscar, formatar size/mtime)
  - `FilesSearchResults`
  - `FilesReadPreview`
  - `FilesHashResult`
  - `FilesStatPanel`
- adicionar botões: "Baixar JSON" (sempre) e "Baixar CSV" (files.list)

3) Regras de performance:
- se `entries` for grande, limitar renderização (ex.: 200) e avisar "truncado"

4) Testes:
- pelo menos 1 teste por renderer principal (list/read/search)

5) DoD:
- `npm run build` passa
- teste manual: no chat, `files.list` mostra tabela com filtros e botão download

Entregar:
- arquivos alterados
- como testar (passos)

Referência: `docs/specs/saas/melhorias-organizador/07-spec-ux-resultados.md`

---

## Prompt F2 (DURO) — Planos/Preview/Lote: `files.plan.create` + `files.plan.apply` (approval) + gate E2E

Regras globais (colar no topo do prompt para Claude):
- **Sempre procurar se já existe** (não reimplementar): `rg`, `ls`, ler specs.
- **IDL é fonte da verdade**: nunca editar artefatos manualmente.
- **Engine**: não tocar salvo ausência comprovada e mudança genérica.
- Mudanças mínimas + testes + gate.

### Objetivo
Adicionar um fluxo poderoso e seguro:
1) `files.plan.create` (safe) gera preview com ações em lote
2) `files.plan.apply` (destrutivo) exige approval + SoD e aplica exatamente o plano aprovado
3) UI/Chat exibem o plano com tabela + download
4) Gate `scripts/e2e_personal_ops_plan_apply.sh` PASS

### Repositórios (ordem e escopo)
- Repo A (IDL): `/home/bazari/libervia-console`
- Repo B (Runtime): `/home/bazari/libervia-agent-runtime`
- Repo C (Console API): `/home/bazari/libervia-console-api`
- Repo D (Console UI/Next): `/home/bazari/libervia-console`
- Engine: `/home/bazari/engine` (**somente leitura**)

---

### A) IDL — novos job_types e approvals (fonte da verdade)
Repo: `/home/bazari/libervia-console`

1) Antes de mudar:
- `rg -n "files\.plan\.(create|apply|get)" idl/personal_ops/v1.0.0/source.idl -S`

2) Alterar somente `idl/personal_ops/v1.0.0/source.idl`:
- adicionar permissões:
  - `files.plan.create`, `files.plan.get`, `files.plan.apply`
- adicionar endpoints:
  - `POST /personal/jobs/files/plan/create` → `job_type: "files.plan.create"` (safe)
  - `GET  /personal/jobs/files/plan/{plan_id}` → `job_type: "files.plan.get"` (safe)
  - `POST /personal/jobs/files/plan/{plan_id}/apply` → `job_type: "files.plan.apply"` (destrutivo)

3) Approvals canônicos via IDL:
- `approval_rules` para `files.plan.apply` (roles: `inst_owner`, `exec_admin`, quorum 1)
- `separation_of_duties` proibindo requester==decider no step da approval de apply

4) Compilar:
- `./scripts/idl_build_personal_ops.sh`
- `./scripts/idl_check_personal_ops.sh`

DoD A:
- rotas aparecem no `/openapi.json`
- approvals/SoD para apply aparecem nos artefatos gerados

---

### B) Runtime — implementar `files.plan.create/get/apply`
Repo: `/home/bazari/libervia-agent-runtime`

Regras:
- **plan.create** é safe: não muda filesystem, só propõe ações
- **plan.apply** é destrutivo: executa move/rename/delete conforme plano

Implementação sugerida (mínimo):
- Plano armazenado localmente como artifact sob `root_dir` controlado (ex.: `.libervia/plans/{plan_id}.json`) OU usar resultado do job store se já houver artifacts path.
- `plan_hash` (sha256 do JSON do plano)
- `apply` valida `plan_hash` antes de executar
- limites: max_actions (default 200)

Testes:
- create gera ações determinísticas
- apply valida hash
- traversal protection

DoD B:
- `pytest` passa

---

### C) Console API — chat + engine_client para planos
Repo: `/home/bazari/libervia-console-api`

1) Engine client:
- métodos para plan.create/get/apply (job.request/job.get/job.enqueue conforme padrão atual)

2) Chat intents PT/EN:
- "criar plano de limpeza na pasta X"
- "aplicar plano <id>"
- "mostrar plano <id>"

3) UX:
- plan.create retorna preview com tabela (usando `result_json`)
- plan.apply cria approval (destrutivo)

DoD C:
- `pytest` passa

---

### D) Console UI — viewer do plano
Repo: `/home/bazari/libervia-console`

- Reusar `JobResultViewer` e adicionar renderização específica para `files.plan.*`.
- Permitir download JSON/CSV do plano.

DoD D:
- `npm run build` passa

---

### E) Gate E2E — `e2e_personal_ops_plan_apply.sh`
Repo: `/home/bazari/libervia-console`

Criar script que:
- cria fixtures (arquivos duplicados, arquivos a mover/renomear)
- chama chat para plan.create e verifica `actions[]` + `plan_id`
- chama chat para plan.apply → cria approval
- valida SoD: requester não aprova
- aprova com exec_admin
- valida runtime executou (audit/job state)

Critério:
- `FAIL=0` e exit code 0

---

### Entregáveis finais
- outputs:
  - `./scripts/idl_check_personal_ops.sh`
  - `pytest` runtime
  - `pytest` console-api
  - `npm run build` console
  - `./scripts/e2e_personal_ops_plan_apply.sh` PASS

Referência: `docs/specs/saas/melhorias-organizador/08-spec-fase2-planos-preview-lote.md`

---

## Prompt F2.5 (DURO) — Root Dir por Instituição: `/institutions/{id}/settings`

Regras globais (colar no topo do prompt para Claude):
- **Sempre procurar se já existe** (não reimplementar): `rg`, `ls`, ler specs.
- **IDL é fonte da verdade**: nunca editar artefatos manualmente.
- **Engine**: não tocar salvo ausência comprovada e mudança genérica.
- Mudanças mínimas + testes + gate.

### Objetivo
Permitir que o usuário defina `root_dir` no portal por instituição e que o runtime-manager aplique isso automaticamente por tenant.

### Repos
- `/home/bazari/libervia-console-api` (DB + endpoints + internal tenants)
- `/home/bazari/libervia-agent-runtime` (runtime-manager: aplicar root por tenant)
- `/home/bazari/libervia-console` (UI: `/institutions/{id}/settings` + e2e)
- `/home/bazari/engine` (somente leitura)

---

### A) Console API — Persistir e expor settings
Repo: `/home/bazari/libervia-console-api`

1) Antes de codar:
- `rg -n "managed_root_dir|institution settings|/settings" src/app -S`

2) DB:
- adicionar campo `managed_root_dir` na tabela `institutions` (ou tabela `institution_settings` se já existir padrão)

3) Endpoints:
- `GET /institutions/{institution_id}/settings` → retorna `managed_root_dir`
- `PUT /institutions/{institution_id}/settings` → valida e salva

Validações obrigatórias:
- proibir `..`
- proibir path absoluto
- normalizar trailing slash

4) Internal endpoint do runtime-manager:
- `GET /internal/runtime/tenants` deve incluir `managed_root_dir` por tenant

Testes:
- validações de path
- auth/membership (owner/admin)

DoD A:
- `pytest -q` passa

---

### B) Runtime-manager — Aplicar root_dir por tenant
Repo: `/home/bazari/libervia-agent-runtime`

1) Antes de codar:
- localizar onde manager monta config por tenant

2) Implementar:
- ler `managed_root_dir` da resposta do Console API
- calcular `effective_root_dir = /data/<managed_root_dir>`
- se vazio/None: usar default seguro por tenant (ex.: `/data/tmp/libervia-default/<tenant>`)

3) Segurança:
- garantir que `effective_root_dir` começa com `/data/`

DoD B:
- tests/unit para path join/validation

---

### C) Console UI — página `/institutions/{id}/settings`
Repo: `/home/bazari/libervia-console`

1) Criar BFF:
- `GET /api/institutions/[id]/settings`
- `PUT /api/institutions/[id]/settings`
(usar `getAuthHeaders()`)

2) Criar UI:
- `src/app/(app)/institutions/[institutionId]/settings/page.tsx`
- form com input + save
- feedback de sucesso/erro

3) E2E gate novo:
Criar `scripts/e2e_root_dir_per_institution.sh`:
- cria/seleciona instituição
- seta root dir para `tmp/libervia-e2e-root-<rand>`
- cria arquivo dentro desse root
- roda `files.read` nesse arquivo → PASS
- tenta `files.read` fora do root → FAIL esperado

DoD C:
- `npm run build` passa
- `./scripts/e2e_root_dir_per_institution.sh` PASS

Referência: `docs/specs/saas/melhorias-organizador/09-spec-settings-root-dir.md`

---

## Prompt F2.6 (DURO) — Jobs/Plans UI: `/jobs` + `/jobs/{job_id}` (sem mexer no Engine)

Regras globais (colar no topo do prompt para Claude):
- **Sempre procurar se já existe** (não reimplementar): `rg`, `ls`, ler specs.
- **IDL é fonte da verdade**: nunca editar artefatos manualmente.
- **Engine**: não tocar salvo ausência comprovada e mudança genérica.
- Mudanças mínimas + testes + gate.

### Objetivo
Consolidar a experiência de produto para histórico e depuração:
- listar jobs por instituição
- ver detalhes de um job
- ver eventos de auditoria relacionados
- reutilizar JobResultViewer para renderizar result_json

### Repos
- `/home/bazari/libervia-console-api` (endpoints jobs)
- `/home/bazari/libervia-console` (BFF + UI pages)
- `/home/bazari/engine` (somente leitura)

---

### A) Console API — endpoints `/jobs`
Repo: `/home/bazari/libervia-console-api`

1) Antes de codar:
- `rg -n "^@router\\.(get|post)\(\"/jobs" src/app/routers -S`
- verificar se já existe listagem de jobs.

2) Implementar endpoints:
- `GET /jobs?institution_id=...&limit=...&offset=...&job_type=...&state=...`
  - fonte: Engine observe ledger `JOB_REQUESTED` (já existe infraestrutura de observe no audit)
  - extrair `job_id`, `job_type`, `state`, `occurred_at`, `actor_id/roles`
  - (opcional) enriquecer com `GET /personal/jobs/{job_id}` para N itens (N<=20)

- `GET /jobs/{job_id}?institution_id=...`
  - fonte: Engine `GET /personal/jobs/{job_id}`

- `GET /jobs/{job_id}/events?institution_id=...`
  - fonte: observe ledger filtrado por `case_id=job_id` (ou filtrar payload.job_id)

Regras:
- exigir membership (como approvals/audit)
- usar admin_key do Console DB (sem expor)

Testes:
- unit test para parsing de observe events → JobListItem
- test para filtros (job_type/state)

DoD A:
- `pytest -q` passa

---

### B) Console (Next) — BFF + páginas
Repo: `/home/bazari/libervia-console`

1) BFF routes (usar getAuthHeaders + institution cookies):
- `GET /api/jobs` → proxy Console API `/jobs`
- `GET /api/jobs/[jobId]` → proxy `/jobs/{job_id}`
- `GET /api/jobs/[jobId]/events` → proxy `/jobs/{job_id}/events`

2) UI pages:
- `src/app/(app)/jobs/page.tsx`:
  - tabela com filtros (job_type/state/search)
  - link para detalhes

- `src/app/(app)/jobs/[jobId]/page.tsx`:
  - status + params + JobResultViewer + timeline de events

3) Navegação:
- adicionar link "Jobs" no AppShell

DoD B:
- `npm run build` passa

---

### C) Gate E2E
Repo: `/home/bazari/libervia-console`

Criar `scripts/e2e_jobs_history.sh`:
- criar job safe (files.read ou files.list)
- capturar job_id
- chamar `/api/jobs` e verificar que job_id aparece
- chamar `/api/jobs/{job_id}` e verificar state/executed

Rodar também (anti-regressão):
- `./scripts/e2e_personal_ops_filesystem_core.sh`
- `./scripts/e2e_personal_ops_plan_apply.sh`
- `./scripts/e2e_auth_membership_jobs.sh`

Referência: `docs/specs/saas/melhorias-organizador/10-spec-jobs-ui.md`

---

## Prompt F2.7 (DURO) — Jobs UX: Exports + Saved Views (sem mexer no Engine)

Regras globais (colar no topo do prompt para Claude):
- **Sempre procurar se já existe** (não reimplementar): `rg`, `ls`, ler specs.
- **IDL é fonte da verdade**: nunca editar artefatos manualmente.
- **Engine**: não tocar salvo ausência comprovada e mudança genérica.
- Mudanças mínimas + testes + gate.

### Objetivo
Melhorar a página `/jobs` com:
- export da consulta atual (JSON/CSV)
- saved views (localStorage) + shareable URL

### Repo
- `/home/bazari/libervia-console`

---

### A) Auditoria (antes de codar)
- localizar `src/app/(app)/jobs/page.tsx`
- localizar componentes de tabela/filtro existentes
- buscar por `downloadCSV`, `downloadJSON` (já existem em F1.5 results utils)

### B) Implementar Exports
- adicionar botões na UI:
  - Exportar JSON
  - Exportar CSV
- implementação: usar os dados já carregados (ou fazer fetch adicional com `limit=10000` via BFF)
- gerar Blob no browser

### C) Implementar Saved Views
- criar util `src/lib/savedViews.ts` (ou similar)
- persistir em `localStorage`:
  - save current filters + name
  - load view
  - delete view
- representar view na URL (querystring)
- botão “Copiar link”

### D) Tests
- unit test básico para serialização/deserialização de view
- `npm run build` passa

### E) Gate E2E leve
Criar `scripts/e2e_jobs_exports.sh`:
- chamar `/api/jobs` (200)
- chamar rota export (se existir) ou validar que UI gera export (mínimo: testar endpoint BFF export se você criar)

Rodar também (anti-regressão):
- `./scripts/e2e_jobs_history.sh`

Referência: `docs/specs/saas/melhorias-organizador/11-spec-jobs-ux-exports-saved-views.md`



---

## Prompt F3 (DURO) — Autonomia Assistida (Recomendações + Planos) **sem auto-execução destrutiva**

Regras globais (colar no topo do prompt para Claude):
- **Sempre procurar se já existe** (não reimplementar): `rg`, `ls`, ler specs.
- **IDL é fonte da verdade**: nunca editar artefatos manualmente.
- **Engine**: não tocar salvo ausência comprovada e mudança genérica.
- **Nunca executar destrutivo automaticamente**: `files.delete/move/rename` e `files.plan.apply` **sempre** exigem approval + SoD.
- Mudanças mínimas + testes + gates E2E com `FAIL=0`.

### Objetivo
Criar "autonomia assistida" do Organizador:
- o sistema roda periodicamente **somente operações safe** para gerar **recomendações** (planos)
- o humano decide aplicar (gera `files.plan.apply` → approval + SoD)

### Repos (ordem)
- Repo A: `/home/bazari/libervia-console-api` (settings + internal tenants)
- Repo B: `/home/bazari/libervia-agent-runtime` (runtime-manager autonomia)
- Repo C: `/home/bazari/libervia-console` (UI/BFF + gate E2E)
- Repo Engine: `/home/bazari/engine` (**somente leitura**)

---

### Step 0) Verificar serviços (antes de codar)
Repo: `/home/bazari/libervia-console`

- `docker compose --env-file .env.dev -f docker-compose.dev.yml ps`
- `curl -sS http://127.0.0.1:8001/health`
- `curl -sS http://127.0.0.1:3001/health`
- `curl -sS -D - http://127.0.0.1:3002/ | head -n 20`

Se algum health falhar:
- `docker compose --env-file .env.dev -f docker-compose.dev.yml up -d --build`

DoD Step 0:
- prints de `ps` + healths OK.

---

### A) Console API — Settings de autonomia por instituição
Repo: `/home/bazari/libervia-console-api`

1) Auditoria:
- Provar que não existe: `rg -n "autonomy|recommendation|scheduler|plan\.create" src/app -S`

2) Persistir settings na instituição (mínimo canônico):
- `autonomy_enabled: bool` (default `false`)
- `autonomy_plan_create_interval_seconds: int` (default `3600`, min `300`)
- `autonomy_max_plans_per_day: int` (default `6`, max `48`)
- `autonomy_scope_path: str | null` (se null, usar `managed_root_dir`; se ambos null, autonomia não roda)

3) Expor nos endpoints existentes:
- `GET /institutions/{institution_id}/settings`
- `PUT /institutions/{institution_id}/settings`

4) Incluir no endpoint interno do runtime-manager:
- `GET /internal/runtime/tenants` deve retornar também os campos de autonomia.

Regras:
- Somente `inst_owner` pode editar settings.
- Validar limites/strings (path absoluto quando setado).

DoD A:
- `pytest` PASS.
- `curl` do settings retorna os campos.

---

### B) Runtime-manager — Autonomia safe (somente `files.plan.create`)
Repo: `/home/bazari/libervia-agent-runtime`

1) Auditoria:
- Provar que não existe: `rg -n "autonomy|schedule|max_plans_per_day|plan\.create" src/libervia_agent -S`

2) Implementar loop por tenant (sem quebrar o loop de jobs atual):
- Se `autonomy_enabled != true` → skip
- `effective_root_dir` = `autonomy_scope_path` se setado; senão `managed_root_dir`; senão skip
- A cada intervalo:
  - criar job `files.plan.create` (Engine job.request)
  - **enqueue automaticamente** (safe) via `job.enqueue`
  - aguardar execução normal do runtime-manager e report

3) Rate limit por tenant (persistência simples local):
- não exceder `autonomy_max_plans_per_day`
- armazenar contador diário por tenant (ex.: `.libervia/autonomy/{tenant}/YYYY-MM-DD.json`)

4) Segurança (obrigatório):
- **não** chamar `files.plan.apply`
- **não** criar jobs destrutivos

DoD B:
- `pytest` PASS.
- logs claros:
  - `AUTONOMY: created plan job_id=... tenant=...`
  - `AUTONOMY: skipped (disabled/no_root_dir/rate_limited)`

---

### C) Console UI — Recomendações/Planos
Repo: `/home/bazari/libervia-console`

1) Settings UI
- em `/institutions/{id}/settings` adicionar seção "Autonomia":
  - toggle ON/OFF
  - intervalo
  - limite/dia
  - scope path (opcional)

2) UX de recomendações
Escolha preferida (simples e canônica):
- criar página `/plans` (ou `/recommendations`) que lista jobs `files.plan.create` e renderiza resultado (reusar `JobResultViewer` / `FilesPlanViewer`).
- botão "Solicitar aplicação" que cria `files.plan.apply` (vai gerar approval + SoD quando aplicável).

Regras:
- não expor tokens no browser
- sempre via BFF + cookies httpOnly

DoD C:
- `npm run build` PASS.

---

### D) Gate E2E — `e2e_autonomy_assisted.sh`
Repo: `/home/bazari/libervia-console`

Criar `scripts/e2e_autonomy_assisted.sh`:
1) Health checks
2) Register/login owner + onboarding
3) Set `managed_root_dir` e autonomy settings (intervalo curto ex.: 10-15s; max_plans_per_day=2)
4) Aguardar e provar que apareceu job `files.plan.create` e executou (tem `result_json`)
5) Provar que **não** existe `files.plan.apply` criado automaticamente
6) Desligar autonomia e provar que para de criar novos planos

Rodar também (anti-regressão):
- `./scripts/e2e_auth_membership_jobs.sh`
- `./scripts/e2e_personal_ops_filesystem_core.sh`
- `./scripts/e2e_personal_ops_plan_apply.sh`
- `./scripts/e2e_jobs_history.sh`
- `./scripts/e2e_root_dir_per_institution.sh`

DoD D:
- `FAIL=0` em todos os gates.

---

### Entregáveis finais
- Lista de arquivos alterados (por repo)
- Outputs:
  - `pytest` (console-api + runtime)
  - `npm run build` (console)
  - `./scripts/e2e_autonomy_assisted.sh`
  - todos gates anti-regressão
- Confirmação explícita (com evidência): autonomia **não executa** destrutivo e **não chama** `files.plan.apply` automaticamente.
