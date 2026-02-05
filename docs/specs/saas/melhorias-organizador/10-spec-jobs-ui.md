# 10 — Spec: Jobs/Plans UI (Histórico em `/jobs`)

## Objetivo
Consolidar uma tela de histórico de execução para dar visibilidade completa do que aconteceu (e quando):

- lista de jobs por instituição (com filtros)
- detalhes de um job (status, inputs, approvals, result_json, artifacts)
- visão de planos (plan.create/plan.apply) agrupando por `plan_id`

Sem quebrar nada canônico:
- **não mexer no Engine**
- Console UI não chama Engine direto
- Console UI chama BFF (Next API) → Console API → Engine

## O que já existe hoje
- Engine expõe `GET /personal/jobs/{job_id}`
- Console API expõe endpoint de status de job (via Engine) usado pelo chat (ex.: `/chat/jobs/{job_id}/status`)
- Engine expõe auditoria via `GET /v1/observe/ledger/events` com `payload.job_id`

## Estratégia canônica (sem criar endpoint novo no Engine)

### Listagem de jobs
Como não existe (por padrão) um `GET /personal/jobs` no Engine, a listagem deve ser derivada do ledger:
- buscar eventos `JOB_REQUESTED` via observe
- extrair `job_id`, `job_type`, `state`, timestamps e requester
- (opcional) enriquecer chamando `GET /personal/jobs/{job_id}` para os N primeiros itens (N pequeno)

### Detalhe do job
- chamar `GET /personal/jobs/{job_id}` via Console API
- exibir `state`, `job_type`, `params`, `result_summary`, `result_json`
- link para approvals relacionadas (via ledger: `APPROVAL_REQUESTED` com `payload.job_id` ou case_id)

### Planos
- `files.plan.create` cria um plano (geralmente `plan_id` == job_id do create ou campo no result)
- `files.plan.apply` referencia `plan_id`
- UI deve agrupar por `plan_id` e mostrar:
  - preview (create)
  - execução (apply)
  - status final

## Requisitos de UX

### Página `/jobs`
- tabela com colunas:
  - created_at
  - job_type
  - state
  - requested_by
  - actions ("ver detalhes")
- filtros:
  - job_type
  - state
  - texto livre (job_id)
- paginação (limit/offset)

### Página `/jobs/{job_id}`
- header com job_id + copy
- bloco "Status" (state + timestamps)
- bloco "Entrada" (params_json formatado)
- bloco "Resultado" (JobResultViewer reaproveitado)
- bloco "Auditoria" (events filtrados por case_id/job_id)

## API necessária (Console API)
Adicionar endpoints novos (apenas Console API):
- `GET /jobs?institution_id=...&limit=...&offset=...&job_type=...&state=...`
  - fonte: observe ledger JOB_REQUESTED
- `GET /jobs/{job_id}?institution_id=...`
  - fonte: Engine `GET /personal/jobs/{job_id}`
- `GET /jobs/{job_id}/events?institution_id=...`
  - fonte: observe ledger por `case_id=job_id` (ou filtro por payload.job_id)

## DoD
- `/jobs` mostra histórico (não vazio após uso)
- `/jobs/{job_id}` mostra detalhes + resultado (result_json) usando JobResultViewer
- filtros básicos funcionam
- gate E2E cria um job safe + valida que aparece no `/jobs` e que `/jobs/{id}` retorna executed
