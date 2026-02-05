# 01 — Plano linear (sem Billing)

## Etapa 0 — Auditoria (sem codar)
- Confirmar o estado atual de auth no Console API.
- Confirmar se o Console (Next) tem ou não páginas `/login` e `/register`.
- Mapear onde cookies/sessão vivem.

## Etapa 1 — Auth “quase-prod” no Console API
- Manter `auth_mode=dev`, mas permitir:
  - desligar auto-login (dev)
  - habilitar registro/login real em dev (feature flags)
- Garantir testes.

## Etapa 2 — Sessão + telas de auth no Console (Next)
- Implementar login/register/logout.
- BFF `/api/auth/*` grava JWT em cookie httpOnly.
- Middleware bloqueia rotas `(app)`.

## Etapa 3 — Membership no Console API
- Criar convites (invite token em dev).
- Aceitar convite (usuário logado) e criar membership.
- Provisionar no Engine actor/token do membro com role IDL correta.

## Etapa 4 — Membership UI no Console
- Tela de conta.
- Tela de instituições (trocar instituição ativa).
- Tela “Convidar conta de aprovação (exec_admin)” + aceitar convite.

## Etapa 5 — Gate E2E anti-regressão
- Script: login owner → onboarding → invite exec_admin → accept → delete job → SoD bloqueia self-approve → approve exec_admin → job executa → audit mostra eventos.
