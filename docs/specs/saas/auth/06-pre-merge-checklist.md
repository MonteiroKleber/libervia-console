# 06 — Checklist antes de merge (anti-regressão)

Este checklist é para rodar **sempre** antes de aceitar mudanças que afetam:
- IDL/bundle
- Engine/Console API contracts
- Auth/Accounts/Membership
- runtime-manager

## 0) Regras (não negociáveis)
- **Não editar artefatos gerados na mão** (IDL é a fonte da verdade).
- **Não mexer no Engine com regra de negócio**.
- Se mudar contrato HTTP, **atualizar o gate** e a doc do gate.

## 1) Gates obrigatórios (local)
Rodar no repo `/home/bazari/libervia-console`:

```bash
./scripts/idl_check_personal_ops.sh
./scripts/smoke_dev.sh --up
./scripts/e2e_auth_membership_jobs.sh
```

Critérios:
- `idl_check_personal_ops.sh` retorna `0`
- `smoke_dev.sh --up` retorna `FAIL=0`
- `e2e_auth_membership_jobs.sh` retorna `FAIL=0`

## 2) Config “prod-like dev” (para o e2e_auth_membership_jobs.sh)
- Console (Next): `CONSOLE_REQUIRE_AUTH=true`
- Console API:
  - `DEV_AUTO_LOGIN=false`
  - `ALLOW_REGISTRATION_IN_DEV=true`

## 3) Mudou enum/modelo? (Postgres)
Se mudou enums do Console API (ex.: `MembershipRole`, `InviteStatus`) e começou a dar erro estranho, faça reset parcial do banco:

```bash
cd /home/bazari/libervia-console
docker compose -f docker-compose.dev.yml down -v
docker compose --env-file .env.dev -f docker-compose.dev.yml up -d
```

Depois:
- limpar cookies do browser
- refazer onboarding

## 4) Contratos HTTP (quando mudar)
Sempre que mudar:
- se `institution_id` vai em query ou body
- shape de resposta de approvals/audit

Atualizar:
- `scripts/e2e_auth_membership_jobs.sh`
- `docs/specs/saas/auth/05-e2e-gate.md`
