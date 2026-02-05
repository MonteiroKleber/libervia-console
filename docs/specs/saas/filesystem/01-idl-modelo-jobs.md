# IDL — Modelo correto para Filesystem: Jobs (não entidades)

Problema atual
- O bundle `personal_ops` modela “file ops” como entidade (`FileOperation`) com transitions.
- Isso força o Engine a ter storage + workflow “por entidade”, e quebra com `Unsupported entity type`.

Modelo correto (MVP consistente)
- “File ops” devem ser **jobs governados**.
- Entidades (se existirem) servem para “estado durável institucional” (ex.: `CleanupPlan`), não para executar.

JobSpec mínimo (por operação)
- `job_type` (ex.: `file.list`, `file.delete`, `file.move`, `file.rename`, `file.scan_duplicates`, `file.suggest_cleanup`)
- `params_schema`
- `result_schema` (pequeno; para outputs grandes, usar artifacts)
- `risk`: `safe` | `destructive`
- `approval_required`: bool
- `rbac_permission` (já existe no operations.json)
- `idempotency`: required

Rotas (bind.kind) esperadas
- `POST /personal/files/list` → `job.request`
- `POST /personal/files/delete` → `job.request` (gera approval)
- `POST /personal/files/jobs/{job_id}/enqueue` → `job.enqueue` (após approval)
- `GET /personal/files/jobs/{job_id}` → `job.get` (status + result/artifacts)
- Runtime report permanece em `POST /runtime/jobs/{job_id}/report` (Engine)

## Resultado para `file.list` (recomendação)
Para permitir UX imediata sem explodir payload:
- `result.items`: lista limitada (ex.: até 200 nomes)
- `result.count`: total
- `result.truncated`: bool
- se `truncated=true`, anexar `artifact` com JSON completo (opcional)

