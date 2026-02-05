# 04 — Spec Fase 3 (Rotinas SAFE)

## Meta
Automação contínua sem destruição: agendamentos configurados pelo usuário.

## Regras
- Rotinas não deletam/movem/renomeiam automaticamente.
- Rotina é configurada por UI e auditada.

## Onde implementar
- `libervia-console-api` gerencia schedules (DB) e dispara job.request no Engine usando o actor token do usuário (inst_owner) quando chegar a hora.
- Isso mantém “quem solicitou” rastreável.

## DoD
- criar rotina na UI
- esperar execução ou forçar trigger
- ver job e audit
