# 02 — Spec (Console API): Auth/Session (dev próximo de prod)

## Estado atual (esperado)
- Existe `/auth/login`, `/auth/register`, `/auth/me`.
- Em `auth_mode=dev`, hoje tende a existir auto-login e registro bloqueado.

## Objetivo
Manter o conforto do dev, mas permitir testes próximos de produção:

- **Dev**: pode auto-logar, mas só se uma flag permitir.
- **Prod-like**: exigir token `Authorization: Bearer ...`.
- **Registro**: opcionalmente permitido em dev (flag) para testar UX real.

## Requisitos

### Config
Adicionar settings (defaults seguros):
- `dev_auto_login: bool = True`
- `allow_registration_in_dev: bool = False`

### Rotas
- `POST /auth/login`
  - Em dev com `dev_auto_login=True`: retorna token do dev user (mantém comportamento).
  - Caso contrário: autentica via email/senha.

- `POST /auth/register`
  - Em dev com `allow_registration_in_dev=True`: permite.
  - Caso contrário: retorna erro claro (400/403).

- `POST /auth/logout`
  - Sem estado server-side obrigatório (MVP). Retorna 200 para permitir o Console limpar cookie.

- `GET /auth/me`
  - Nunca expor segredos (admin keys, tokens do engine, etc).

## Testes (mínimo)
- Dev auto-login ON: `/auth/me` funciona sem header.
- Dev auto-login OFF: `/auth/me` exige Authorization.
- allow_registration_in_dev ON: register+login funciona.

## DoD
- `pytest` verde.
- Evidências com `curl`.
