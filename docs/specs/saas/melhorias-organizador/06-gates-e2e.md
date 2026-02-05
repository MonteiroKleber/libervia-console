# 06 — Gates E2E (anti-regressão)

## Gates existentes
- `scripts/smoke_dev.sh`
- `scripts/e2e_auth_membership_jobs.sh` (auth/membership/jobs)

## Gates novos (por fase)
- `scripts/e2e_personal_ops_filesystem_core.sh` (Fase 1)
- `scripts/e2e_personal_ops_plan_apply.sh` (Fase 2)
- `scripts/e2e_personal_ops_schedules_safe.sh` (Fase 3)

## Regra
Nenhuma fase é “concluída” sem:
- build ok
- unit tests ok
- e2e ok
