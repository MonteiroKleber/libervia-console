# 00 — Visão (Auth / Accounts / Membership UI)

## Objetivo
Implementar **login/criação de conta reais** e **membership UI** para suportar o fluxo canônico:

- usuário (inst_owner) solicita ação destrutiva
- a mesma conta **não pode** aprovar (SoD)
- uma segunda conta (exec_admin) aprova
- runtime-manager executa
- auditoria registra eventos

## Fora de escopo (neste bloco)
- Billing/Planos/Pagamentos
- Entitlements por plano

## Repositórios e responsabilidades

- `engine` (`/home/bazari/engine`)
  - **Não mexer** neste bloco, salvo ausência comprovada e mudança genérica.

- `libervia-console-api` (`/home/bazari/libervia-console-api`)
  - Auth: login/register/logout, sessão/token
  - Membership: convites, aceitar convite, listar instituições/membros
  - Integração canônica com Engine para provisionar actors/tokens por role

- `libervia-console` (`/home/bazari/libervia-console`)
  - UI/UX: telas de login/registro/conta/instituições/membership
  - BFF: rotas `src/app/api/*` para sessão (cookie httpOnly) e proxy do Console API

## Definição “dev próximo de prod”
- Pode continuar `auth_mode=dev`, mas:
  - deve existir caminho para testar login/registro reais
  - token nunca vai para localStorage
  - rotas do app exigem sessão

## Risco principal
- Regressão e instabilidade por mudanças parciais.

Mitigação:
- Implementar em passos pequenos.
- Gate E2E rodável sempre.
