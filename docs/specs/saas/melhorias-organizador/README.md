# Melhorias do Organizador (Personal Ops) — Plano + Specs + Prompts

Este diretório define um roadmap **canônico** para tornar o Organizador (Personal Ops / filesystem) “bem poderoso” em uma máquina local, mantendo:

- **IDL como fonte da verdade** (nunca editar artefatos gerados na mão)
- **Engine neutro** (sem regras de negócio hardcoded)
- Execução real via **jobs** + **approvals/SoD** + **audit ledger**
- Runtime(s) como executores locais governados

## Repositórios (paths canônicos)
- `engine` (core): `/home/bazari/engine`
  - regra: evitar mudanças; só aceitar mudança genérica e comprovada
- `libervia-console` (UI + compose + IDL): `/home/bazari/libervia-console`
- `libervia-console-api` (SaaS backend): `/home/bazari/libervia-console-api`
- `libervia-agent-runtime` (executor local): `/home/bazari/libervia-agent-runtime`

## Conteúdo
- `00-visao.md`: princípios, objetivos e limites
- `01-plano-etapas.md`: plano linear por fases
- `02-spec-fase1-filesystem-core.md`: operações base (read/search/copy/hash/etc.)
- `03-spec-fase2-planos-e-preview.md`: “plan before apply” (dry-run, batches)
- `04-spec-fase3-rotinas-safe.md`: automação segura (agendamentos sem destruição)
- `05-spec-fase4-integracoes-locais.md`: archive/backup/metadata
- `06-gates-e2e.md`: gates e2e e checklist anti-regressão
- `prompts.md`: prompts prontos para Claude Code implementar (por fase)
