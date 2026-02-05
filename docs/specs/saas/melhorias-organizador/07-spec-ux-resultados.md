# 07 — Spec UX: Resultados (result_json) no Console

## Objetivo
Transformar respostas baseadas em `result_json` em uma experiência de produto:
- tabela bonita (list)
- filtros e busca
- paginação/limites visuais
- download (JSON/JSONL/CSV quando aplicável)
- estado e histórico por job

Sem quebrar nada canônico:
- não mexer no Engine
- não mexer no runtime
- não editar artefatos do bundle manualmente

## Escopo v1 (mínimo poderoso)

### 1) Chat: renderização rica por tipo de job
- `files.list` → tabela com colunas:
  - name, type, size, modified
  - ordenação (name, size, modified)
  - filtro por `type` (file/dir)
  - busca (substring)
- `files.search` → lista de matches + filtro por path + copy
- `files.hash` → bloco com sha256 + copy
- `files.stat` → key/value (type/size/mtime/exists)
- `files.scan` / `files.suggest` → cards + tabelas simples

### 2) Componente reutilizável: `JobResultViewer`
Criar um componente único que recebe:
- `job_type`
- `result_json`
- `result_summary`

E delega para subcomponentes (ListResultTable, SearchResultsList, etc.).

### 3) Download
Adicionar botões:
- "Baixar JSON" (sempre)
- "Baixar CSV" (apenas para tabelas como files.list)

Implementação canônica:
- gerar o arquivo no browser (Blob) a partir do `result_json` já retornado.
- não chamar Engine direto.

### 4) Job details (opcional v1)
Adicionar no chat um link "Ver detalhes do job" que abre:
- `/jobs/{job_id}` (nova página) mostrando:
  - status, timestamps
  - result_summary
  - viewer do result_json

## DoD
- `npm run build` passa
- testes (mínimo): snapshot/units para os renderers principais
- UX manual:
  - list: filtro/ordenar funciona
  - download json/csv funciona
