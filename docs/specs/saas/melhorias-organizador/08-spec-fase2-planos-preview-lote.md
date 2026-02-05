# 08 — Spec Fase 2 (Planos/Preview/Lote) — "Plan before apply"

## Objetivo
Permitir operações poderosas em lote (rename/move/delete) com máxima segurança:

- o sistema gera um **plano** (preview) com todas as ações
- humano revisa e aprova
- runtime aplica o plano
- auditoria registra tudo

## Conceito canônico
Plano não precisa virar “entidade hardcoded”. Para manter o core neutro, o plano pode ser:
- um **job** que produz um artifact (`result_json`) com lista de ações propostas
- um segundo **job** que aplica essas ações (`plan.apply`) e exige approval

## Job types

### `files.plan.create` (safe)
- Input: `path`, `mode`, `filters`, `max_actions`
- Output: `plan_id`, `actions[]`, `summary`, `truncated`

### `files.plan.apply` (destrutivo)
- Input: `plan_id` (ou `actions[]` + `plan_hash`), `confirm: true`
- Requer approval_rules + SoD
- Output: `applied_count`, `failed_count`, `failures[]`

### `files.plan.get` (safe)
- Input: `plan_id`
- Output: plano completo

## Requisitos de segurança
- plano deve conter `plan_hash` (sha256 do conteúdo) e o apply deve validar que está aplicando exatamente aquele plano
- limites:
  - `max_actions` default (ex.: 200)
  - negar apply se exceder limite sem flag explícita
- path confinement (root_dir)

## UX
- Chat:
  - "criar plano de limpeza na pasta X" → mostra preview + botão de download
  - "aplicar plano <id>" → cria approval
- UI:
  - viewer do plano (tabela) reaproveitando componentes de F1.5

## DoD
- novo gate E2E: criar arquivo fixtures → plan.create → plan.apply (approval + SoD) → runtime executa → audit
