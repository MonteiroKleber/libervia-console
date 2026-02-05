# 01 — Plano em etapas (linear)

## Fase 0 — Auditoria e baseline (gate)
- Confirmar quais job_types já existem e quais actions o runtime suporta.
- Confirmar limites atuais (paths, root_dir, traversal protection).
- Consolidar gate E2E atual como baseline.

## Fase 1 — Filesystem Core (completo)
Adicionar capacidades “base” que faltam para operar bem:
- `files.read` (safe)
- `files.search` (safe)
- `files.copy` (destrutivo leve / safe dependendo da policy)
- `files.hash` (safe)
- `dir.tree`/`files.list` com paginação/limites (safe)
- `files.stat` (safe)

Entrega: chat + UI conseguem executar e retornar resultados reais dessas operações.

## Fase 1.5 — UX de Resultados (result_json)
- Tabelas, filtros, ordenação e downloads no Console para jobs safe (list/read/search/etc.).
- Novo gate E2E leve para provar renderização/exports (quando aplicável).

## Fase 2 — Planos, preview e lote (power sem risco)
- Introduzir o conceito de **plano** de mudanças (dry-run) para batch rename/move/delete.
- `files.plan.create` (safe)
- `files.plan.apply` (destrutivo → approval)
- `files.plan.status` (safe)

Entrega: usuário vê o que vai mudar antes de aprovar.

## Fase 3 — Rotinas SAFE (automação sem destruição)
- Agendamentos governados (cron) configurados pelo usuário:
  - scan duplicados semanal
  - relatório de “top folders”
  - verificação de “arquivos grandes”
- Rotinas **não** deletam nada; produzem relatórios/audit.

Entrega: automação real sem virar “autonomia destrutiva”.

## Fase 4 — Integrações locais
- `archive.create` (zip)
- `backup.snapshot` (cópia incremental simples)
- `media.metadata` (ex.: fotos) — opcional

## Fase 5 — UX de produto (consolidação)
- telas de “Operações/Jobs” (histórico, filtros, detalhes, artifacts)
- templates de comandos
- exportação de relatórios

## Gate final
- 1 script E2E por fase + gate agregador.
- smoke sempre verde.

## Fase 2.6 — Jobs/Plans UI (histórico)
- Tela `/jobs` e `/jobs/{job_id}` com filtros e detalhes (result_json + audit).
- Sem mudar Engine: listagem derivada do ledger.
