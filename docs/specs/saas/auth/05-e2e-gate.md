# 05 — Gate E2E anti-regressão (Auth + Invite + Approval + Job)

## Objetivo
Rodar sempre após mudanças para evitar regressões.

## Pré-requisitos
- stack dev rodando via `docker compose` no repo `libervia-console`.
- runtime-manager ativo (multi-tenant).
- `jq` e `curl` instalados.

## Script
- `scripts/e2e_auth_membership_jobs.sh`

## O que o gate prova
1) login/register (ou dev modo configurado)
2) onboarding cria instituição
3) convite exec_admin
4) aceitar convite
5) delete job cria approval
6) SoD bloqueia auto-approve do solicitante
7) exec_admin aprova
8) job enfileira/executa via runtime-manager
9) audit contém `JOB_REQUESTED`, `APPROVAL_REQUESTED`, `APPROVAL_DECIDED`, `JOB_ENQUEUED`, `RUNTIME_JOB_REPORTED`

## Notas importantes (blindagem)

### 1) Enums do Postgres (Console API)
Se você alterou enums como `MembershipRole`/`InviteStatus` e o ambiente começou a falhar de forma não determinística, o caminho canônico é **resetar o banco** (porque o Postgres pode manter valores antigos):

```bash
cd /home/bazari/libervia-console
docker compose -f docker-compose.dev.yml down -v
docker compose --env-file .env.dev -f docker-compose.dev.yml up -d
```

Depois:
- limpar cookies do browser
- refazer onboarding

### 2) Contrato HTTP é parte do gate
Se mudar contrato (ex.: `institution_id` via query vs body, status code de SoD, etc.), você deve:
- atualizar `scripts/e2e_auth_membership_jobs.sh`
- registrar a mudança aqui neste documento
