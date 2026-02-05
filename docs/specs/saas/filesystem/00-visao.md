# Filesystem (Agente Organizacional) — Visão

Este diretório documenta tudo que é específico do “Agente Organizacional” (filesystem): modelo, contratos, E2E e prompts.

Princípios
- O Engine **não toca o filesystem**: ele governa e audita.
- O Runtime (agente) executa e reporta; não decide.
- “Regra de negócio” do produto fica no **bundle do IDL**.

Status atual (resumo)
- Rotas `/personal/files/*` aparecem via IDL, mas hoje estão modeladas como `FileOperation` (entidade) e falham no Engine por `Unsupported entity type`.
- O runtime apresenta erro “Unknown action type: file.list” em alguns cenários: precisa auditoria de versão/normalização/alinhamento de outbox.

