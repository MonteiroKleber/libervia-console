# 11 — Spec: Jobs UX (Exports + Saved Views)

## Objetivo
Consolidar a tela `/jobs` como ferramenta de operação:
- exportar lista/consulta (JSON/CSV/JSONL)
- salvar filtros como “views” (ex.: "Falhas", "Plan Apply pendentes", "Últimas 24h")
- compartilhar view via URL (sem vazar segredos)

Sem quebrar nada canônico:
- sem mexer no Engine
- Console UI → BFF → Console API

## Escopo v1

### 1) Exports
Na página `/jobs`:
- botão **Exportar JSON** (sempre)
- botão **Exportar CSV** (sempre)
- botão **Exportar JSONL** (opcional)

Regras:
- export respeita filtros atuais (job_type/state/text search)
- export respeita paginação? (recomendado exportar a consulta completa até um limite, ex.: 10k)
- export gerado no browser (Blob), sem chamar Engine

### 2) Saved Views
Um “Saved View” é:
- `name`
- `filters` (job_type/state/query)
- `sort`
- `created_at`

Persistência v1 (dev/prod-like):
- `localStorage` no browser (não guarda segredos, só filtros)
- opcional v2: persistir no Console API por usuário

### 3) Shareable URLs
- toda view é representável por querystring:
  - `/jobs?state=failed&job_type=files.plan.apply&from=24h`
- botão “Copiar link”

### 4) UX
- dropdown “Views” com:
  - salvar view atual
  - carregar view
  - deletar view
- badge mostrando filtros ativos

## DoD
- export JSON/CSV baixa corretamente
- saved views funcionam (criar, aplicar, remover)
- `npm run build` passa
- gate E2E leve valida que endpoint `/api/jobs` + export route retornam 200
