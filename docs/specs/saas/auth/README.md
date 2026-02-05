# SaaS — Auth / Accounts / Membership (sem Billing)

Este diretório define o **próximo bloco canônico** do produto: **autenticação real + contas + membership UI**, mantendo **Billing/Planos fora do escopo**.

## Princípios (não negociáveis)

1) **Engine é core neutro**
- Nada de regra de negócio específica do produto no Engine.
- Qualquer mudança no Engine precisa ser **provada necessária** (buscar rigorosamente se já existe) e ser **genérica**.

2) **Console API não governa**
- Console API autentica usuários, gerencia sessões e membership no SaaS.
- Toda governança de execução (RBAC/mandates/approvals/SoD) continua no Engine.

3) **Fonte da verdade do produto**
- Para governança/contratos: IDL → artefatos gerados.
- Para Auth/Accounts/Membership: specs aqui + implementação nos repos `libervia-console` e `libervia-console-api`.

4) **Anti-regressão é obrigatório**
- Antes de codar: `rg`, `ls`, ler docs/código (não recriar o que já existe).
- Depois de codar: rodar gates (unit + e2e) e registrar evidências.

## Conteúdo
- `00-visao.md`: visão do bloco e objetivos
- `01-plano-linear.md`: plano linear de implementação
- `02-spec-console-api-auth.md`: Auth/Session no Console API (dev próximo de prod)
- `03-spec-console-auth-ui.md`: telas e BFF no Console (Next)
- `04-spec-membership.md`: convites + membership + provisionamento no Engine
- `05-e2e-gate.md`: gate E2E anti-regressão (login + invite + approve + job)
- `prompts.md`: prompts prontos para Claude Code (com DoD e comandos)
- `06-pre-merge-checklist.md`: checklist antes de merge (anti-regressão)
