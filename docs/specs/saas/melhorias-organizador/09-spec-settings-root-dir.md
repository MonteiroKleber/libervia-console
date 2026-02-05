# 09 — Spec: Configuração de Root Dir por Instituição (Portal)

## Objetivo
Permitir que o usuário configure, **no portal**, qual pasta da máquina será gerenciada pelo Organizador para uma instituição específica.

- UI: `/institutions/{id}/settings`
- Persistência: Console API (DB)
- Aplicação: runtime-manager usa essa configuração por tenant
- Engine: **não muda** (core neutro)

## Conceito
- Cada instituição tem um `managed_root_dir` (ex.: `tmp/files`, `Documents/Org`).
- O runtime-manager monta a pasta base (`/data` via Docker). O `managed_root_dir` deve ser um **subpath de `/data`**.
- Todas as operações no runtime devem ser confinadas ao `root_dir` efetivo do tenant.

## Regras de segurança
- Proibir `..` e paths absolutos no campo salvo.
- Normalizar (trim, remover barras finais).
- Validar que o caminho resolvido está dentro do mount permitido (ex.: `/data`).
- Não permitir configurar `/data` inteiro por default (opcional), sugerir pasta dedicada.

## API (Console API)
Adicionar endpoints:
- `GET /institutions/{institution_id}/settings`
- `PUT /institutions/{institution_id}/settings`

Schema:
- `managed_root_dir: str` (relativo ao mount do runtime; ex.: `tmp/libervia-work`)
- `updated_at`

Permissão:
- apenas membros (ou apenas owner) podem ver/alterar — decidir e documentar.

## runtime-manager
- Ao buscar tenants em `/internal/runtime/tenants`, incluir `managed_root_dir`.
- Para cada tenant:
  - calcular `effective_root_dir = /data/<managed_root_dir>`
  - configurar o executor por tenant com esse root
- Se não houver `managed_root_dir`, usar default seguro (ex.: `/data/tmp/libervia-default/<tenant>`).

## UI
Página `/institutions/{id}/settings`:
- input “Pasta gerenciada (root dir)”
- botão salvar
- alertas:
  - “isso limita o acesso do agente”
  - “não use /home inteiro”

## DoD
- user salva root dir
- runtime-manager começa a usar no próximo refresh (sem restart da stack)
- e2e prova:
  - set root dir para `tmp/libervia-e2e-root`
  - criar arquivo dentro dessa pasta
  - `files.read` funciona
  - `files.read` fora dessa pasta falha (confinement)
