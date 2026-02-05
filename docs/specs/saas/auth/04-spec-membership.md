# 04 — Spec (Console API + Console): Membership/Invites

## Objetivo
Suportar o fluxo canônico de SoD via duas contas:
- solicitante (inst_owner)
- aprovador (exec_admin)

## Requisitos

### Console API (DB)
- Guardar membership por instituição.
- Implementar convite por token (dev-friendly):
  - Em dev, retornar `invite_token` na resposta para facilitar testes.
  - Em prod, enviar por email (fora de escopo agora).

### Console API (endpoints)
Mínimo:
- `GET /institutions` (do usuário)
- `GET /institutions/{id}/members`
- `POST /institutions/{id}/invites` (criar convite)
- `POST /invites/accept` (aceitar convite)

### Provisionamento no Engine (canônico)
Ao aceitar convite:
- usar `admin_key` da instituição (Console API já guarda encrypted-at-rest)
- criar actor no Engine com roles IDL corretas
- guardar `ActorToken` encrypted-at-rest

## DoD
- Owner cria convite `exec_admin`.
- Outro usuário aceita.
- Usuário exec_admin consegue aprovar; solicitante não consegue (SoD).
