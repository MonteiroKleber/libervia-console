# Runtime (libervia-agent) — Executor Filesystem

Requisitos mínimos
- Confinamento em `root_dir` (sem path traversal).
- Normalização de `action_type/job_type` (trim + aliases).
- Suporte obrigatório: `file.list`, `file.delete`, `file.move`, `file.rename`, `file.scan_duplicates`, `file.suggest_cleanup`.

Formato recomendado de report (runtime → engine)
- `status`: executed|failed
- `summary`: string curta
- `exit_code`: int
- `result`: objeto pequeno (ex.: `items`, `count`, `truncated`)
- `artifacts`: opcional (refs + sha256)

Auditoria do erro atual
“Unknown action type: file.list” geralmente indica:
- binário antigo em execução, ou
- `action_type` divergente (ex.: whitespace), ou
- payload do outbox com campo diferente do esperado.

DoD mínimo (verificável)
- Com runtime rodando e `root_dir` configurado:
  - `file.list` executa e retorna lista real
  - `file.delete` exige approval antes de aparecer no outbox
  - `RUNTIME_JOB_REPORTED` aparece no ledger

