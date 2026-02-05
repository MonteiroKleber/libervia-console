# 03 — Spec Fase 2 (Planos/Preview/Lote)

## Meta
Permitir operações poderosas sem risco: usuário aprova um **plano** (preview) e só então aplica.

## Conceito
- Um plano é uma lista de ações (move/rename/delete) geradas por uma análise.
- Aplicar plano é destrutivo, exige approval e SoD.

## Implementação canônica
- Planos devem ser representados como **jobs** (com artifacts/result_json) para manter o core simples.
  - `plan.create` gera artifact (lista de ações)
  - `plan.apply` executa ações (enqueued) — approval

## Novos job_types
- `files.plan.create`
- `files.plan.apply`
- `files.plan.get`

## DoD
- user cria plano (safe) → recebe preview
- user aprova apply → runtime executa lote
- audit registra e artifacts ficam acessíveis
