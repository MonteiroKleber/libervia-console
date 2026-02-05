# Plano linear (correto) — Core genérico + Agente Organizacional (Filesystem)

Objetivo: deixar **Chat → Governança (Engine/IDL) → Outbox → Runtime → Report → Ledger/Audit → UI** funcionando **sem hardcode de regra de negócio no Engine**.

Regras de arquitetura (não-negociáveis)
- O **Engine é core neutro**: não deve conhecer “FileOperation”, “personal files”, etc.
- Regras e modelos específicos do negócio vivem **apenas no bundle gerado do IDL**.
- O Engine faz **enforcement determinístico** (RBAC, mandates, autonomy, policies, invariants, SoD) baseado no registry carregado do bundle.
- Operações que “tocam o mundo” (filesystem) são **Jobs** executados por um runtime externo (Agente Organizacional), com **idempotência e auditoria**.

## Etapa 0 — Auditoria do estado atual (baseline)
Meta: travar evidência do que está quebrando e onde.

Entregável:
- Relatório objetivo (arquivos/funções/condições) + lista de gaps.

Ler e executar prompts:
- Engine: `engine/docs/specs/core-generico/prompts.md`
- Filesystem: `libervia-console/docs/specs/saas/filesystem/prompts.md`

## Etapa 1 — Filesystem Ops como Jobs (modelo correto)
Meta: parar de modelar file ops como “entidade executável” e passar a modelar como **job governado**.

Entregáveis:
- IDL atualizado + bundle recompilado.
- Rotas de job aparecem no `/openapi.json`.
- Execução real funciona (runtime pega job no outbox e reporta resultado).

Specs:
- Filesystem (IDL/jobs): `libervia-console/docs/specs/saas/filesystem/01-idl-modelo-jobs.md`
- Engine (jobs): `engine/docs/specs/core-generico/02-jobs-first-class.md`

## Etapa 2 — Approvals genéricos (sem if/elif por tipo)
Meta: approval aponta para target genérico (job ou entity) e engine resolve via registry + store.

Spec:
- `engine/docs/specs/core-generico/03-approvals-generic.md`

## Etapa 3 — Dispatcher/Router v3 (bind.kinds de job)
Meta: suportar `job.request`, `job.enqueue`, `job.get` (e opcionalmente `job.report`).

Spec:
- `engine/docs/specs/core-generico/05-dispatcher-v3.md`

## Etapa 4 — Runtime filesystem completo e compatível
Meta: garantir suporte real a `file.list` + normalização de `action_type/job_type` + resultado auditável.

Spec:
- `libervia-console/docs/specs/saas/filesystem/03-runtime-executor-filesystem.md`

## Etapa 5 — Console API + UI: E2E com resultados reais
Meta: chat mostra resultado real do filesystem (sem mocks), e destrutivo fecha o ciclo approval → outbox → runtime → report → audit.

Spec:
- `libervia-console/docs/specs/saas/filesystem/02-console-api-contrato-filesystem.md`

## Etapa 6 — (Opcional, mas “correto completo”) GenericEntityStore
Meta: suportar entidades definidas no bundle sem `ENTITY_CONFIG` hardcoded.

Spec:
- `engine/docs/specs/core-generico/04-generic-entity-store.md`

