# Prompts — Filesystem (Agente Organizacional)

## Prompt 1 — Auditoria (erro `file.list` + alinhamento outbox/runtime)
Você vai produzir um relatório objetivo do porquê `file.list` falha no runtime.

Repos:
- `/home/bazari/libervia-agent-runtime`
- `/home/bazari/libervia-console-api`
- `/home/bazari/libervia-console`

Checklist (com evidências):
1) Provar qual `libervia-agent` está rodando (binário/versão) e se corresponde ao código.
2) Capturar um outbox real `{job_id}.json` que falhou e mostrar `action_type`/`params`.
3) Listar quais `action_type` o executor reconhece hoje e comparar com o payload.
4) Propor e implementar o fix mínimo (normalização `.strip()` + alias se necessário) + testes.

Gate obrigatório (anti-retrabalho e anti-regressão):
- Antes de criar novos handlers, procurar por handlers existentes e aliases já suportados.
- Ao ajustar parsing/aliases, adicionar testes para não quebrar action_types antigos (compatibilidade retroativa).

## Prompt 2 — Atualizar IDL para Jobs (filesystem)
Repo: `/home/bazari/libervia-console`

Objetivo: substituir `FileOperation` (entidade) por `job` para filesystem ops.

DoD:
- Bundle recompilado.
- `operations.json` contém `bind.kind` de job (request/enqueue/get).

## Prompt 2.1 — (Gate) Provar que o bundle atual está “errado” para execução real
Antes de mudar IDL, você deve mostrar:
- No `operations.json` atual, `bind.kind` é `create/transition` com `entity=FileOperation`.
- Não existe efeito “enqueue outbox/job” no `transition_def.effects` (só `set_state/bump_version`).
Conclusão esperada: “executed” no bundle não significa “executado no mundo”.

## Prompt 3 — Console API/UI E2E com resultado real
Repos:
- `/home/bazari/libervia-console-api`
- `/home/bazari/libervia-console`

Objetivo: chat “listar arquivos em X” retorna resultado real (sem mocks) via job lifecycle.

Requisito:
- Nenhum endpoint escreve outbox fora do Engine.
 - Antes de criar novas rotas/API routes, procurar por rotas existentes em `src/app/api/*` e reaproveitar.
