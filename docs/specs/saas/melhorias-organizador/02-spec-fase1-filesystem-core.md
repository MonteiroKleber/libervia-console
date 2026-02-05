# 02 — Spec Fase 1 (Filesystem Core)

## Meta
Cobrir 80% das operações de filesystem que um usuário espera, com governança.

## Novos job_types (IDL)
- `files.read`
- `files.search`
- `files.copy`
- `files.hash`
- `files.stat`
- (evolução) `files.list` com `limit/offset` e `recursive` já existe, mas padronizar schema.

## Contratos (inputs/outputs) — sugestão

### files.read (safe)
Input:
- `path: string`
- `max_bytes?: int` (default pequeno)

Output:
- `path`
- `encoding` (best-effort)
- `truncated: bool`
- `content_preview` (string)

### files.search (safe)
Input:
- `path: string`
- `query: string`
- `max_results?: int`
- `file_glob?: string`

Output:
- `matches: [{path, line, snippet}]`
- `total` / `truncated`

### files.copy (policy)
Input:
- `source_path`
- `destination_path`
- `overwrite?: bool`

Output:
- `copied: bool`

Obs: copy pode ser safe se não sobrescreve e escreve em subdir; por padrão tratar como **destrutivo leve** (approval opcional por policy).

### files.hash (safe)
Input:
- `path`
- `algorithm: "sha256"` (fixo MVP)

Output:
- `sha256`

### files.stat (safe)
Input:
- `path`

Output:
- `exists`, `type`, `size`, `mtime`

## Runtime
- Implementar actions correspondentes no executor com root_dir confinement.
- Garantir limites (max bytes, max results, max depth) para não travar.

## UI/Chat
- Extender intents e extração de params (PT/EN).
- Mostrar resultado com bom UX (preview + copy button).

## DoD
- IDL compila, artefatos gerados, engine registra rotas job.*.
- runtime executa e reporta.
- E2E: pelo menos `files.read` e `files.search` funcionando.
