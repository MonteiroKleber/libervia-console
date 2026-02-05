# Prompts para Claude Code (por fase)

Uso: copie/cole o prompt da fase no Claude Code **dentro do repositório indicado**.

## Repositórios (paths canônicos)

- `engine` (já existe, pronto): `/home/bazari/engine`
  - Regra: **não alterar** (somente auditoria/leitura), a menos que uma ausência fique provada com rigor.
- `libervia-console` (pasta já existe): `/home/bazari/libervia-console`
  - Observação: esta pasta pode conter apenas docs no momento; se não for um repo, inicializar.
- `libervia-console-api` (criar): `/home/bazari/libervia-console-api`
- `libervia-agent-runtime` (criar): `/home/bazari/libervia-agent-runtime`

Regra: se o repo/pasta não existir, **criar em `/home/bazari/`** e inicializar como projeto (e como git repo se aplicável).

Regras globais para todos os prompts:
- **Não implementar nada “mock”** (sem simular execução).
- **Antes de criar qualquer coisa, procurar se já existe** (`rg`, `ls`, ler docs).
- **Engine**: só alterar se, após verificação rigorosa, o recurso realmente não existir.
- Produzir **DoD** verificável (com comandos e/ou requests `curl`), mantendo mudanças mínimas.

---

## Hotfix 4.x — Security (token leak) + Approvals Pending (Engine)

### Prompt composto (executar em 2 repos)
Você vai executar 2 ajustes: (A) corrigir vazamento de `agent_token` no Console API e (B) adicionar endpoint de listagem de approvals pendentes no Engine. Siga a ordem e não invente nada.

#### (A) Repo 1: `/home/bazari/libervia-console-api`
Objetivo: corrigir segurança do onboarding.

1) Encontre onde o `agent_token` é retornado no onboarding idempotente.
2) Corrija para que:
   - `agent_token` seja retornado **somente** na primeira conclusão do onboarding (primeira vez que é gerado/provisionado).
   - Em chamadas repetidas de `POST /onboarding` com status já `COMPLETED`, a resposta **não** deve conter `agent_token` (retorne `runtime_config=null` ou remova o campo).
3) Garanta que tokens continuam encrypted-at-rest no banco e **nunca** vazam em `/auth/me` ou outros endpoints.
4) Atualize/adicione testes cobrindo:
   - primeira chamada retorna token
   - segunda chamada não retorna token
   - nenhuma rota de “me” retorna token

Critério de aceite:
- Repetir onboarding não expõe segredo; testes passando.

#### (B) Repo 2: `/home/bazari/engine`
Objetivo: criar `GET /approvals/pending` (mínimo necessário) para o portal listar pendências sem varrer ledger no SaaS.

Regras rígidas:
- Antes de codar, prove por busca que esse endpoint não existe.
- Não mudar o comportamento de approvals existentes.
- Pendente = evento `APPROVAL_REQUESTED` sem `APPROVAL_DECIDED` correspondente.
- Segurança: requer admin auth + `X-Institution-Id`.

Implementação:
1) Adicionar endpoint `GET /approvals/pending?limit=100`.
2) Resposta mínima:
   - `approval_id`
   - `created_at`
   - `rule_name` (se inferível do step)
   - `case_id`
   - `step`
   - `requested_by` / `requested_by_roles`
   - `dept_id` (se existir)
3) Adicionar testes cobrindo:
   - lista pendente com 1 approval
   - após decidir, não aparece mais
   - auth inválida falha
4) Documentar um `curl` de exemplo usando a porta do dev compose (`http://localhost:8001`).

Critério de aceite:
- Console API consegue listar approvals pendentes via `GET /approvals/pending` sem heurística.

Importante:
- Não implementar `/personal/files/*` manualmente. Esses endpoints devem surgir do modo IDL (`ENGINE_API_MODE=idl|both`) com bundle ativo. Se não estiverem surgindo, apenas identifique a causa e proponha ajuste de config (não codar endpoints hardcoded).

---

## UX Polish — Approval Display Name (Console API)

### Prompt (Repo: `/home/bazari/libervia-console-api`)
Objetivo: melhorar UX da fila de approvals sem alterar o Engine.

Contexto:
- `rule_name` do Engine pode ser genérico (ex.: `FileOperationFlow.Approve`).
- A UI precisa de um rótulo humano (display) sem perder o valor raw.

Tarefas:
1) Manter `rule_name` original na resposta (raw).
2) Adicionar um campo adicional (ex.: `rule_display_name`) calculado no Console API:
   - Mínimo: mapear `FileOperationFlow.Approve` → "Aprovar operação de arquivos"
   - Mínimo: mapear `FileOperationFlow.Reject` → "Rejeitar operação de arquivos"
3) Se (e somente se) o payload/metadata do approval permitir inferir o tipo (delete/move/rename) de forma confiável, refine o display:
   - "Aprovar delete" / "Aprovar move" / "Aprovar rename"
   - Caso não seja confiável, não inventar.
4) Atualizar schemas e testes:
   - schema aceita o novo campo
   - teste garante que o display é retornado para rule_names conhecidos
   - teste garante fallback determinístico para rule_name desconhecido (ex.: "Aprovação pendente")

Critério de aceite:
- `GET /approvals` (Console API) retorna `rule_name` + `rule_display_name` sem quebrar compatibilidade.

---

## E2E — Multi-tenant Isolation (2 instituições)

### Prompt (Repo: `/home/bazari/libervia-console`)
Objetivo: criar um roteiro/script E2E que prova isolamento multi-tenant end-to-end com **2 instituições** (A e B), sem mocks.

Contexto (dev):
- Engine: `http://localhost:8001`
- Console API: `http://localhost:3001`
- Console: `http://localhost:3002`
- Engine em `ENGINE_API_MODE=idl` e bundle `personal_ops` ativo.

Entregáveis:
1) Um script executável (preferência): `scripts/e2e_multi_tenant.sh`
   - ou, se necessário, `scripts/e2e_multi_tenant.py` (mas prefira bash + curl + jq).
2) Documentação curta: `docs/E2E_MULTI_TENANT.md` com “como rodar” e “o que esperar”.

Regras:
- Não usar chamadas diretas do browser ao Engine.
- Console API deve ser o “broker” para approvals/audit/chat.
- Se precisar de 2 usuários, criar 2 contas no Console API (dev mode ok).
- Segredos nunca devem ser impressos em logs (redigir tokens ao logar).

### Cenário (passo a passo)

#### Setup
1) Criar 2 usuários no Console API:
   - userA (email: `a@example.com`)
   - userB (email: `b@example.com`)
2) Rodar onboarding para cada um:
   - Capturar `institution_id_A` e `institution_id_B`
   - Capturar/armazenar `agent_token_A` e `agent_token_B` **somente** se retornados (primeira vez)

#### Prova 1: isolamento de approvals
3) Criar uma operação destrutiva na instituição A via Console API (chat ou endpoint dedicado):
   - Ex.: “delete <arquivo>” (o arquivo deve estar dentro do `root_dir` do runtime A)
   - Resultado esperado: gera pending approval em A
4) Listar approvals pendentes via Console API:
   - Como userA: deve ver 1 pendente (A)
   - Como userB: deve ver 0 pendentes (não pode ver approvals de A)

#### Prova 2: isolamento de execução + report
5) Aprovar como userA (via Console API) a approval pendente.
6) Simular/rodar o runtime A consumindo o outbox de A (pode ser:
   - executar `libervia-agent run` apontando para outbox de `institution_id_A`, ou
   - executar um “one-shot runner” no script que:
     - lê 1 job do outbox A
     - executa (em pasta de teste)
     - chama `POST /runtime/jobs/{job_id}/report` com headers de A
7) Verificar auditoria:
   - Como userA: timeline contém evento `RUNTIME_JOB_REPORTED` do job da instituição A
   - Como userB: timeline NÃO contém e não consegue acessar eventos de A

#### Prova 3: bloqueio cruzado (hard fail)
8) Tentar reportar job de A usando token de B:
   - chamar `POST /runtime/jobs/{job_id}/report` com `X-Institution-Id=institution_id_A` e `X-Actor-Token=agent_token_B`
   - esperado: 401/403 e nenhum evento novo no ledger

### Saídas (o que o script deve imprimir)
- IDs das instituições (A e B)
- Contagem de approvals pendentes visíveis para A e para B
- `job_id` executado e status do report
- Confirmação de que B não vê dados de A (counts = 0)

### Critério de aceite
- Isolamento comprovado em 3 dimensões: approvals, audit, report API.
- Nenhuma etapa usa heurística ou mock; tudo passa pelos componentes reais.

---

## Hotfix — Engine SAFE_MODE (mandates.json) + Console API per-institution `X-Admin-Key`

### Prompt composto (executar em 2 repos)
Objetivo: (A) diagnosticar e resolver o SAFE_MODE do Engine causado por `mandates.json` **sem afrouxar segurança**, e (B) alinhar Console API para usar **admin key por instituição** (`X-Admin-Key`) em chamadas admin ao Engine.

Regras globais:
- Não “desligar” safe mode por flag sem entender a causa raiz.
- Não remover mandates/policies “na marra” se isso reduzir segurança.
- Qualquer segredo (admin key secret) deve permanecer server-side e encrypted-at-rest.

#### (A) Repo 1: `/home/bazari/engine` (alterar com cautela)
1) Reproduza e identifique:
   - Por que o Engine entrou em SAFE_MODE (mensagem/código).
   - Qual arquivo/config disparou (`mandates.json`).
   - Onde isso é verificado no boot (arquivo e função).
2) Determine o motivo real:
   - JSON inválido? schema inválido? hash/manifest inconsistentes? contrato inválido? path errado?
3) Proponha e aplique a menor correção possível, priorizando:
   - corrigir geração do bundle (se o bundle está errado)
   - corrigir montagem de volumes/path (se o Engine está lendo arquivo antigo/errado)
   - corrigir validação (somente se estiver bugada e você provar)
4) Critério de aceite:
   - Engine sobe em `mode=ACTIVE` (ou equivalente) com o bundle `personal_ops` carregado.
   - `GET /health` confirma que não está em SAFE_MODE.
   - Nenhuma regra de segurança foi removida para “passar”.
5) Entregue relatório final com:
   - causa raiz
   - diff mínimo aplicado
   - como evitar regressão (ex.: ajustar build do bundle ou compose volume)

#### (B) Repo 2: `/home/bazari/libervia-console-api`
Objetivo: remover dependência de `X-Admin-Token` para operações por instituição e usar `X-Admin-Key`.

1) Verifique como o Engine faz bootstrap:
   - primeiro admin key por instituição pode ser criado via `X-Admin-Token`
   - depois disso, operações admin devem usar `X-Admin-Key`
2) Ajuste o onboarding (idempotente):
   - Na primeira criação de instituição: criar o primeiro admin key via `X-Admin-Token`, salvar `key_id` + `secret` encrypted-at-rest.
   - Em chamadas repetidas: não criar key de novo; reutilizar a existente.
3) Atualize `engine_client` e rotas admin (approvals/audit/etc.) para:
   - enviar `X-Institution-Id`
   - autenticar com `X-Admin-Key` (montar header corretamente)
   - manter timeouts/erros normalizados
4) Critério de aceite:
   - Console API consegue listar approvals pendentes e buscar auditoria usando `X-Admin-Key` (sem `X-Admin-Token`).
   - Nenhum segredo é retornado ao frontend.
   - Testes cobrindo:
     - onboarding cria e salva admin key uma vez
     - chamadas admin usam `X-Admin-Key`
     - falta de key resulta em erro claro (500/503 com code específico)

---

## Engine Neutrality Gate — Auditoria e remoção de hardcode de produto

### Prompt (Repo: `/home/bazari/engine`)
Regra inegociável:
- O `engine` é um **core genérico**.
- **Regras de negócio específicas do produto** (ex.: personal ops, finance-pilot, “/personal/files/*”, “FileOperationFlow.*”) são proibidas no código do core.
- Regras de negócio devem existir **somente** nos artefatos gerados do IDL (bundle): `operations.json`, `workflows.json`, `approvals.json`, `mandates.json`, `policies.json`, etc.

Objetivo:
1) Auditar o repositório do Engine e provar se existe hardcode de produto.
2) Se existir, remover/refatorar para que:
   - o Engine continue funcionando
   - SAFE_MODE não dependa de allowlist por produto
   - rotas de negócio continuem vindo do IDL/bundle

Entregáveis obrigatórios (com evidências):

### A) Inventário de mudanças recentes
1) Liste arquivos modificados recentemente relacionados a:
   - SAFE_MODE
   - allowlists/whitelists de endpoint
   - mandates/policies/validation
2) Mostre o diff relevante e descreva o impacto.

### B) Busca por hardcode de produto
3) Faça buscas (`rg`) e reporte resultados para termos/strings como:
- `ALLOWED_ENDPOINT_SIGS`
- `finance-pilot`
- `personal_ops` / `PersonalOps`
- `/personal/` ou `/personal/files`
- `FileOperationFlow`
- qualquer lista fixa de endpoint signatures

4) Para cada ocorrência, classifique:
- **OK (core genérico)**: lógica independente de produto (ex.: parsing genérico, validação genérica).
- **VIOLAÇÃO (produto hardcoded)**: exceção, allowlist, bypass, ou regra específica de um produto.

### C) Correção (se houver VIOLAÇÃO)
5) Para cada VIOLAÇÃO, proponha e aplique a menor correção:
- Remover hardcode por produto.
- Se existir allowlist por segurança, ela deve ser:
  - derivada dinamicamente do registry/operations carregados do bundle, **ou**
  - substituída por validação genérica (schema/integridade) — nunca por nome de endpoint específico.

### D) Provas pós-correção
6) Provar que o Engine segue funcionando:
- `GET /health` em `mode=ACTIVE` (não SAFE_MODE)
- `GET /openapi.json` mostra rotas do bundle (ex.: `/personal/files/*`) quando `ENGINE_API_MODE=idl|both` e bundle ativo
- `GET /approvals/pending` continua funcionando
- `POST /runtime/jobs/{job_id}/report` continua funcionando (enforce `is_agent=true`)

Critério de aceite:
- Nenhuma regra de negócio específica permanece no código do core.
- Toda regra de negócio está nos artefatos do bundle/IDL.
- Testes passam; mudanças mínimas e justificadas.

## Fase 0 — Repos e bases

### Prompt (Repo: `/home/bazari/libervia-console-api` — criar se não existir)
Implemente do zero o repositório `libervia-console-api` (FastAPI + Postgres) com:
- `README.md` com quickstart.
- `Dockerfile` e `.env.example`.
- `GET /health`.
- Estrutura de projeto clara (`src/`, `tests/`).
Critérios: `docker build` funciona; `docker run` expõe `/health`.

### Prompt (Repo: `/home/bazari/libervia-console` — inicializar se não for repo)
Implemente (ou inicialize) o repositório `libervia-console` (Next.js/React) com:
- `README.md` com quickstart.
- `.env.example` apontando para `CONSOLE_API_BASE_URL`.
- Página inicial que chama `GET /health` do Console API e mostra status.
Critérios: `npm run dev` sobe e renderiza status real.

### Prompt (Repo: `/home/bazari/libervia-agent-runtime` — criar se não existir)
Implemente do zero o repositório `libervia-agent-runtime` (Python) com:
- CLI `libervia-agent` com comandos `configure`, `run`, `status` (pode ser stub em Fase 0).
- `pyproject.toml` e `README.md`.
Critérios: `python -m libervia_agent --help` funciona.

---

## Fase 1 — Docker Compose dev (local)

### Prompt (Repo: `/home/bazari/libervia-console`)
Crie `docker-compose.dev.yml` para subir localmente:
- `engine` (porta 8000)
- `console-api` (porta 3001)
- `console` (porta 3000)
- `postgres`
Regras:
- Persistir volumes do Postgres e do Engine.
- Usar `.env.dev` (não commitar segredos).
Critérios:
- `engine`: `GET /health` ok.
- `console-api`: `GET /health` ok.
- `console`: página inicial carrega.

Nota importante (IDL routes):
- Para que rotas geradas pela IDL existam (ex.: `/personal/files/...`), o `engine` precisa estar em modo `ENGINE_API_MODE=idl` (ou `both`) e com um bundle carregado/ativo.
- Se o ambiente estiver rodando em portas alternativas (ex.: `8001`, `3002`, `5433`), atualizar exemplos de `curl` e envs conforme o `docker-compose.dev.yml`.

---

## Fase 2 — Verificação rigorosa do Engine (não mudar se não precisar)

### Prompt (Repo: `/home/bazari/engine` — leitura/auditoria somente)
Objetivo: mapear o que já existe para suportar o SaaS. **NÃO CODE NADA AINDA.**

1) Faça uma auditoria por busca e leitura de código para confirmar:
- endpoints admin para criar instituição e bootstrap de admin-key
- endpoints admin para criar actor tokens (`is_agent=true`)
- endpoints de approvals (decidir approve/reject) e como listar pendências (se existir)
- endpoints read-only para auditoria (timeline/observe)
- se já existe integração “runtime jobs/resultados”

2) Entregue um relatório com:
- lista de endpoints (método+path) e arquivos onde estão implementados
- headers exigidos em cada um
- o que falta para o runtime executar e reportar resultado sem mock

3) Se (e somente se) faltar algo:
- proponha a menor mudança possível no Engine, com justificativa e teste.

Critério: nenhuma alteração no Engine sem prova concreta de ausência.

---

## Fase 2.1 — Follow-up (Runtime Gap: prova e contorno)

### Prompt (Repo: `/home/bazari/engine` — leitura/auditoria somente)
Objetivo: responder exatamente ao que falta (ou já existe) para o **Agent Runtime** operar em laptop, sem inventar nada e sem alterar o Engine.

Entregue um relatório curto e objetivo com as respostas abaixo, sempre citando:
- **Endpoint (método + path)** e **arquivo** onde é implementado, ou
- **Arquivo/pasta** (se for integração via filesystem), ou
- Se não existir: declarar “NÃO EXISTE” e mostrar as buscas (`rg`) que comprovam.

### A) Trabalho autorizado (jobs)
1) Existe algum conceito real de “job”/“task”/“command” para runtime?
   - Onde nasce (qual endpoint/fluxo cria)?
   - Quais campos mínimos existem (job_id, action_type, params, paths, status)?
2) Existe endpoint para o runtime **buscar/puxar** trabalho autorizado?
   - Ex.: `GET/POST /runtime/...`, `/agent/...`, `/jobs/...`, `/outbox/...`
   - Como autentica? (`X-Actor-Token`? `X-Admin-Key`? `X-Institution-Id`?)
3) Se não existe endpoint de jobs, existe uma alternativa segura baseada em:
   - arquivos outbox por instituição (`var/.../outbox/...`)?
   - endpoints “bridge/write” governados que geram outbox?
   - Como o runtime descobriria “o que executar” sem heurística?

### B) Report de resultados (evidência)
4) Existe endpoint para o runtime reportar resultado de execução ao Engine?
   - Onde vira evento no ledger? Quais event_types?
5) Se não existe endpoint, existe mecanismo por filesystem para escrever “resultados” que o Engine lê?
   - Onde e como o Engine consome isso?

### C) Approvals e “pendências”
6) Como listar approvals pendentes via API (para portal/console-api)?
   - Existe endpoint de listagem? Se sim, método+path e schema de resposta.
   - Se não, como o portal pode obter pendências sem varrer ledger inteiro?
7) Como correlacionar approval ↔ ação ↔ (futuro) job?
   - Quais IDs existem hoje (approval_id, case_id) e onde aparecem?

### D) Observabilidade (para UX)
8) Quais endpoints read-only existem para timeline/auditoria?
   - Confirmar `GET /v1/observe/...` e explicar quais filtros suporta.
9) Existe endpoint para “status do agente” (heartbeat/last seen)?
   - Se não existir, qual proxy de estado podemos usar (último evento do actor_id)?

### E) Conclusão (sem code)
10) Dado o que existe hoje, responda objetivamente:
   - Dá para implementar runtime em laptop **sem alterar** o Engine? (Sim/Não)
   - Se “Sim”: descreva o fluxo exato (inputs/outputs) sem heurísticas.
   - Se “Não”: qual é o **mínimo** que falta (1–2 endpoints ou 1 conector) e por quê.

---

## Fase 2.2 — Implementar “Ack/Result” do Runtime (mínimo necessário no Engine)

### Prompt (Repo: `/home/bazari/engine` — alterar somente se realmente não existir)
Contexto: a auditoria concluiu que:
- jobs existem via outbox filesystem
- falta um endpoint para o runtime **reportar resultado/ack** e registrar evidência no ledger

Objetivo: implementar **1 endpoint mínimo** no Engine para registrar “job concluído” (sucesso/erro) de forma idempotente, sem executar nada e sem governar nada.

Regras (rígidas):
1) **Antes de codar**, prove por busca (`rg`) e inspeção que **não existe** endpoint equivalente.
2) Não criar base de dados nova. Persistência deve ser filesystem (alinhado ao outbox) e ledger.
3) O endpoint não pode permitir bypass de approval: ele só aceita “resultados” de jobs que já existam/foram autorizados.
4) Idempotência: reenvio do mesmo `job_id` não duplica evento nem corrompe estado.
5) Segurança:
   - autenticação via `X-Actor-Token` (do agente) + `X-Institution-Id`
   - validar que o token pertence à instituição e é `is_agent=true` (se houver verificação no Engine)
6) Observabilidade: registrar um evento no ledger do tipo claro (ex.: `RUNTIME_JOB_REPORTED`) com payload mínimo (job_id, status, sha256s, exit_code).

Especificação mínima do endpoint (proposta — ajuste aos padrões do Engine):
- `POST /runtime/jobs/{job_id}/report`

Body JSON:
```json
{
  "status": "executed" | "failed",
  "started_at": "ISO8601",
  "finished_at": "ISO8601",
  "exit_code": 0,
  "summary": "texto curto (sem segredos)",
  "artifacts": {
    "stdout_sha256": "…",
    "stderr_sha256": "…",
    "result_sha256": "…"
  }
}
```

Comportamento:
- Validar que existe um job correspondente no outbox (definir o “source of truth” com rigor).
- Escrever um arquivo “ack/result” no filesystem (ex.: `.../outbox-acks/{job_id}.json`), determinístico (keys ordenadas).
- Emitir evento no ledger (uma vez).
- Responder 200 com `{ "success": true, "job_id": "...", "recorded": true }`.

Entregáveis:
- Endpoint implementado + schema Pydantic.
- Teste(s) unitários para:
  - sucesso (primeiro report)
  - idempotência (segundo report)
  - job inexistente (404/409)
  - auth inválida (401/403)
- Documentação curta (README/ops) com `curl` de exemplo.

Critério de aceite:
- Rodando local, dá para:
  1) criar job via mecanismo existente (outbox),
  2) chamar `report`,
  3) ver evento no ledger/observe,
  4) chamar `report` de novo e não duplicar.

---

## Fase 2.3 — Listar Approvals Pendentes (mínimo necessário no Engine)

### Prompt (Repo: `/home/bazari/engine` — alterar somente se realmente não existir)
Contexto: o portal precisa de uma fila de **approvals pendentes**; hoje existe `POST /approvals/{approval_id}/decide`, mas pode não existir endpoint dedicado de listagem.

Objetivo: expor um endpoint read-only para listar approvals pendentes **sem varrer o ledger do lado do SaaS**.

Regras (rígidas):
1) Antes de codar, prove que não existe endpoint equivalente (busca + inspeção).
2) Não inventar estado: pendente = `APPROVAL_REQUESTED` sem `APPROVAL_DECIDED` correspondente.
3) Performance razoável: implementar de forma determinística (pode ser O(n) no MVP, mas sem carregar payloads enormes desnecessariamente).
4) Segurança: requer admin auth e `X-Institution-Id` (multi-tenant).

Especificação mínima (proposta — ajuste aos padrões do Engine):
- `GET /approvals/pending?limit=100`

Resposta (mínima):
```json
{
  "items": [
    {
      "approval_id": "…",
      "created_at": "ISO8601",
      "rule_name": "…",
      "case_id": "…",
      "step": "…",
      "requested_by": "actor_id",
      "requested_by_roles": ["..."],
      "dept_id": "personal_ops"
    }
  ]
}
```

Entregáveis:
- Endpoint implementado + testes.
- Pequena doc com exemplo de `curl` (lembrar porta do dev compose).

Critério de aceite:
- Portal/Console API consegue listar pendentes sem heurística e sem ler filesystem do Engine.

---

## Fase 3 — IDL `personal_ops@v1.0.0`

### Prompt (Repo: `/home/bazari/libervia-console` — versionar a IDL e docs aqui)
Crie a IDL base `personal_ops@v1.0.0` com as operações:
- listar arquivos (allow)
- detectar duplicados (allow)
- sugerir limpeza (allow)
- renomear (approval obrigatório no MVP)
- mover (approval obrigatório)
- deletar (approval obrigatório)

Entregáveis:
- arquivo fonte da IDL em `idl/personal_ops/v1.0.0/source.idl`
- instruções de como compilar/release no Engine (curl/CLI)

Critério:
- uma instituição sandbox consegue instalar o bundle e ver approvals bloqueando ações destrutivas.

---

## Fase 4 — Console API (SaaS)

### Prompt (Repo: `/home/bazari/libervia-console-api`)
Implemente o backend SaaS com FastAPI + Postgres, sem mocks:

Config fixa (dev, já definida):
- `ENGINE_BASE_URL=http://localhost:8001`
- `BUNDLE_NAME=personal-ops`
- `BUNDLE_VERSION=1.0.0`

Regra crítica de segurança (tokens):
- **Nunca** retornar `agent_token` em chamadas repetidas de onboarding.
- O `agent_token` só pode ser exibido **uma única vez** (momento de bootstrap) ou via ação explícita de “rotacionar/regerar token” (com revogação do anterior).

1) Auth mínima (escolha a mais simples e segura para MVP):
- email + senha (bcrypt) OU magic link (token por email; se não houver email, manter “dev mode” local com usuário fixo)

2) Modelo mínimo:
- users, institutions, memberships
- tabela para guardar segredo do Engine (admin key) **encrypted-at-rest** (chave mestra via env)
- tabela para guardar tokens dos 3 atores iniciais (encrypted-at-rest)

3) Endpoint `POST /onboarding` idempotente:
- cria instituição no Engine (escolher `slug` derivado do user)
- bootstrap do 1º admin-key (guardar secret)
- cria actor tokens: owner, executive_admin, organizational_agent (`is_agent=true`)
- dispara `compile/release` do bundle `personal_ops@v1.0.0`
- retorna payload com `engine_institution_id` e instruções/config do runtime

4) Proxies do portal (server-side):
- approvals: listar e decidir
- audit: timeline (read-only)
- chat: texto → intent → proposal no Engine → status governado

Nota (approvals list):
- Se o Engine não tiver endpoint dedicado, implemente (ou exija) `GET /approvals/pending` no Engine (ver Fase 2.3) e consuma via Console API.

Critérios:
- nenhum segredo no frontend
- logs estruturados
- requests ao Engine com timeout e tratamento de erro

---

## Fase 5 — Console (frontend)

### Prompt (Repo: `/home/bazari/libervia-console`)
Implemente as telas obrigatórias consumindo apenas o Console API:
- Onboarding
- Dashboard
- Chat executivo (sempre mostra estado governado)
- Aprovações (pendentes + decidir)
- Auditoria (timeline + filtros básicos)

Critérios:
- sem chamadas diretas ao Engine
- UX do chat: “pedido → proposta → (approval?) → execução → resultado”

---

## Fase 5.1 — UI/UX Implementation (Design System + Wireflows)

### Prompt (Repo: `/home/bazari/libervia-console`)
Implemente a UI/UX **exatamente** como especificado em `docs/specs/saas/spec-ui-ux.md`.

Escopo:
1) Criar um design system mínimo (componentes reutilizáveis) seguindo a tabela “Checklist de componentes”.
2) Implementar as telas:
- Onboarding (com etapas e estados)
- Dashboard (status, pendências, últimas atividades)
- Chat (cards governados; nunca resposta livre)
- Aprovações (fila, filtros e detalhe com confirmação reforçada p/ delete)
- Auditoria (timeline, filtros, export disparado via Console API)
3) Padrões globais:
- skeletons, empty/error states, banners de status
- detalhes técnicos colapsáveis (com `request_id`, `case_id`, `approval_id` quando existir)

Regras:
- Não inventar endpoints do Engine no frontend.
- Se algum dado ainda não existir no Console API, implementar UI com estado “não disponível ainda” (sem simular) e registrar TODOs bem localizados para o backend.
- A UI deve representar claramente os estados: `allowed`, `needs_approval`, `denied`, `executing`, `executed`, `failed`.

Critérios de aceite:
- Todas as 5 telas renderizam e navegam entre si.
- Nenhum segredo aparece no browser (sem tokens/keys).
- Ações sensíveis exigem confirmação (especialmente delete).
- Componentes seguem A11y mínimo (foco, labels, dialog trap).

---

## DoD UI Final — Gate para “UI pronta”

Use este checklist como gate antes de avançar para produção.

### Funcional (end-to-end, sem mock)
- Onboarding: cria instituição e mostra etapas concluídas (sem expor `agent_token` em chamadas repetidas).
- Dashboard: mostra contagem real de approvals pendentes e atividades recentes.
- Chat: cada pedido resulta em `allowed`/`needs_approval`/`denied` (nunca resposta livre). Links para approval/case quando existir.
- Aprovações: lista via Console API (que usa Engine `GET /approvals/pending`); decide approve/reject e reflete estado.
- Auditoria: timeline via Console API (observe/ledger), com filtros básicos e export (JSONL/CSV).
- Execução real: UI consegue exibir evidência de execução/falha baseada em evento `RUNTIME_JOB_REPORTED` (não simular “executado”).

### Segurança
- Zero segredos no frontend (nenhum `X-Admin-Token`, `X-Admin-Key`, `X-Actor-Token`).
- Autorização por membership: usuário A não acessa dados de instituição B (403).
- Ações destrutivas exigem confirmação reforçada (delete).

### UX/A11y
- Loading/empty/error states em todas as páginas principais.
- Dialogs com trap de foco, ESC fecha, foco visível.
- Estados governados sempre visíveis com `StatusPill` (não só cor).

### Observabilidade/Debug
- Erros mostram `code` + `request_id` (quando disponível) em seção colapsável.
- IDs importantes copiáveis (approval_id, case_id, job_id).

---

## Fase 7.1 — UI Integration Polish + E2E com Runtime ativo (fechar PARTIALs)

### Prompt (Repo: `/home/bazari/libervia-console`)
Objetivo: transformar os 4 itens `PARTIAL` do DoD UI Final em `PASS` e executar um E2E real com runtime ativo (sem header manual).

Contexto (dev):
- Engine: `http://localhost:8001`
- Console API: `http://localhost:3001`
- Console (Next): `http://localhost:3002`
- Runtime: `/home/bazari/libervia-agent-runtime` (CLI `libervia-agent`)

Relatório DoD atual (parciais):
- Chat: depende de `x-institution-id` manual
- Aprovações: 403 até ter membership/institution setado
- Auditoria: 403 até ter membership/institution setado
- Execução real: UI pronta, falta runtime rodando gerando `RUNTIME_JOB_REPORTED`

### A) Fechar os 3 PARTIALs de membership/institution (UI)
1) Eliminar a necessidade de header manual `x-institution-id` nas rotas `src/app/api/*`.
2) Implementar “Institution context” no Console:
   - Após onboarding bem-sucedido, persistir `engine_institution_id` de forma segura para o browser usar nas chamadas (ex.: cookie).
   - As rotas Next `src/app/api/*` devem:
     - obter `institution_id` automaticamente (cookie/session)
     - enviar `X-Institution-Id` para o Console API
     - se não existir institution_id: redirecionar/retornar erro orientando ir ao `/onboarding`
3) UX para 403/membership:
   - Se o Console API responder 403 por falta de membership/institution, mostrar mensagem clara:
     - “Você não tem acesso a esta instituição. Faça onboarding ou troque de conta.”
   - Não pedir que o usuário copie headers.

Critério de aceite (A):
- UI funciona sem header manual:
  - `/chat` consegue criar intent/proposal com institution válida
  - `/approvals` lista pendentes (quando existirem) sem 403 indevido
  - `/audit` lista eventos sem 403 indevido

### B) Execução real (fechar o 4º PARTIAL)
4) Rodar um E2E real que prova: chat → approval → runtime executa → audit mostra evidência.

Regras:
- Não mockar execução.
- Não imprimir segredos no terminal (redigir tokens).
- Não mexer no Engine (apenas usar stack existente).

Passo a passo mínimo do E2E:
5) Subir stack:
- `docker compose -f docker-compose.dev.yml up -d`
6) Criar/obter uma instituição via UI ou Console API `/onboarding` (apenas 1).
7) Preparar um arquivo dentro do `root_dir` do runtime (pasta de teste), e pedir um `delete` via UI (Chat) que gere approval pendente.
8) Aprovar na UI em `/approvals` (com confirmação reforçada).
9) Rodar o runtime apontando para:
   - `institution_id` correto
   - `agent_token` correto (somente disponível na primeira conclusão do onboarding; se não tiver, regenerar/rotacionar por um fluxo explícito — não inventar)
   - `root_dir` (pasta de teste)
   - `outbox_dir` da instituição: `var/institutions/{institution_id}/legacy_bridge/outbox/`
10) Confirmar no `/audit` que apareceu `RUNTIME_JOB_REPORTED` para o `job_id` do caso.

Entregáveis (B):
- Um script `scripts/e2e_ui_runtime.sh` que automatiza o máximo possível (curl + jq é suficiente).
- `docs/E2E_UI_RUNTIME.md` com passos manuais para a parte UI (quando inevitável).

### C) Provas e DoD
No relatório final, entregue:
- Status PASS/FAIL para os 4 itens que eram PARTIAL.
- Evidências (redigidas) dos requests:
  - chamadas do Next `/api/*` sem `x-institution-id` manual
  - listagem de approvals na UI
  - evento `RUNTIME_JOB_REPORTED` na auditoria

## Fase 6 — Agent Runtime (Python empacotado)

### Prompt (Repo: `/home/bazari/libervia-agent-runtime`)
Implemente runtime real (sem mock) com:

1) CLI:
- `configure` (salva config local, permissões restritas)
- `run` (loop de polling)
- `status`

2) Execução segura:
- limitar a um `root_dir` configurado (anti path traversal)
- idempotência por `job_id`
- reportar resultados ao Engine (hashes + status)

3) Empacotamento:
- PyInstaller e instruções de build por OS
- checksums de release

Critério:
- em dev local, runtime executa um job autorizado e o Engine registra no ledger.

---

## Fase 7 — Staging local (E2E)

### Prompt (Repo: `/home/bazari/libervia-console` — scripts/docs do E2E aqui)
Crie um roteiro E2E (script ou docs) que prova “sem mock”:
- onboarding cria instituição
- delete gera pending approval
- approval desbloqueia
- runtime executa
- auditoria mostra evidência no ledger

Critério:
- roteiro executável por qualquer dev em máquina limpa.

---

## Fase 8 — Produção VPS (Docker Compose + TLS)

### Prompt (Repo: `/home/bazari/libervia-console` — infra/ops aqui, salvo decisão contrária)
Crie `docker-compose.prod.yml` para VPS com:
- engine, console-api, console, postgres, reverse proxy (Caddy ou Nginx)
- TLS automático (Let’s Encrypt) e headers de segurança
- volumes em `/var/lib/...`
- backup agendado (script + cron)

Critério:
- deploy reproduzível, rollback documentado, e sandbox E2E executado em produção.

---

## Chat Etapa 1 — PT-BR patterns + parâmetro `path` (sem LLM)

### Prompt (Repo: `/home/bazari/libervia-console-api` e `/home/bazari/libervia-console`)
Objetivo: melhorar o chat para suportar português e path específico **sem** integrar LLM, mantendo governança (Engine decide) e sem executar nada fora do contrato (IDL).

Regras:
- Não transformar em chatbot livre.
- Nada executa sem contrato: se o IDL não suporta `path`, ajuste a IDL antes.
- Sem heurísticas perigosas (ex.: jamais permitir `..` ou path absoluto sem validação).

### Passo 0 — Verificação do contrato (IDL)
1) Inspecione o bundle/IDL `personal_ops@1.0.0` e confirme se as operações suportam um campo `path`/`dir` para:
   - list files
   - scan duplicates
   - suggest cleanup
2) Se não suportar:
   - proponha a mudança mínima na IDL (ex.: adicionar `path` como string opcional com default “/”/root_dir)
   - regenere `source.ir.json` e bundle (sem mexer no Engine hardcoded)
   - atualize a documentação `idl/personal_ops/v1.0.0/README.md` com exemplos.

### Passo 1 — Console API: parser de intent PT/EN (regex determinístico)
3) Atualize o parser do chat (`/chat` no Console API) para reconhecer comandos em PT-BR e EN, por exemplo:
   - PT: “listar arquivos”, “liste os arquivos”, “mostre os arquivos”, “arquivos em <pasta>”
   - EN: “list files”, “show files”, “files in <folder>”
   - Duplicados: “detectar duplicados”, “duplicados em <pasta>”
   - Sugestão: “sugerir limpeza”, “sugerir limpeza em <pasta>”
4) Extrair `path` quando o usuário mencionar:
   - “na pasta X”, “em X”, “dentro de X”
   - “in folder X”, “in X”
5) Normalizar path:
   - remover aspas
   - tratar `~` como inválido (ou expandir apenas se você conseguir provar que é seguro e determinístico)
   - bloquear `..` e caminhos absolutos se o runtime trabalha com `root_dir` relativo
   - decidir e documentar: `path` é relativo ao `root_dir` do runtime (recomendado).

### Passo 2 — Console API: chamadas ao Engine com `path`
6) Ajustar `engine_client.py` (Console API) para enviar `path` no payload para as operações allow (list/duplicates/suggest).
7) Garantir que o chat response inclua o intent estruturado com `path` (para a UI renderizar).

### Passo 3 — Console (UI): suporte a path no card do chat
8) Ajustar a UI do chat para exibir:
   - “Intenção: LIST_FILES → path: documentos/”
   - e continuar mostrando status governado (allowed/needs_approval/denied).

### Testes e critérios
9) Adicionar testes no Console API para o parser:
   - PT: “Liste os arquivos na pasta documentos”
   - EN: “list files in documents”
   - Sem path: “listar arquivos”
   - Path inválido: “listar arquivos em ../segredos” → erro 400 com code claro
10) Critério de aceite:
   - Chat entende PT/EN básico e passa `path` quando presente
   - Sem LLM
   - Sem quebrar o contrato (IDL) e sem bypass de governança

---

## Chat Etapa 2 — Execução real (filesystem) para operações `allow` via Runtime

### Prompt (Repo: `/home/bazari/libervia-console-api`, `/home/bazari/libervia-agent-runtime`, `/home/bazari/libervia-console`)
Objetivo: fazer as operações **não destrutivas** do chat executarem de verdade no filesystem via runtime, mantendo governança (Engine decide) e evidência no ledger (`RUNTIME_JOB_REPORTED`).

Escopo (somente allow, sem approval):
- `/personal/files/list`
- `/personal/files/scan/duplicates`
- `/personal/files/suggest/cleanup`

Regras rígidas:
- Nada executa sem contrato: usar apenas payloads previstos no IDL/bundle.
- Execução sempre confinada ao `root_dir` do runtime (sem path traversal).
- Sem hardcode de regra de negócio no Engine core.
- Sem inventar “resultado”: se runtime não rodou, UI deve mostrar “pendente de execução”.

### Parte A — Definir o “job” para allow ops (compatível com outbox)
1) Inspecione o formato atual do outbox no Engine (LegacyWriteAction.to_outbox_dict) e o parser do runtime (Job.from_outbox_dict).
2) Defina como representar allow ops como jobs:
   - `job_id` (UUID)
   - `action_type`: `file.list` / `file.scan_duplicates` / `file.suggest_cleanup` (ou aliases já suportados)
   - `params`: `{ "path": "documentos" }`
   - `institution_id` (implicit via outbox dir)
3) Garanta que o runtime consegue executar esses action_types (implementando handlers se faltar).

### Parte B — Console API: “enqueue” de jobs allow
4) Implementar uma forma segura do Console API solicitar execução allow no runtime, sem bypass:
   - Opção preferida (prod-like): criar um “job” como arquivo JSON no outbox da instituição no Engine (`var/institutions/{id}/legacy_bridge/outbox/{job_id}.json`).
   - O job deve ser determinístico (json com keys ordenadas) e incluir tudo que o runtime precisa.
5) Após criar o job no outbox, o Console API responde ao chat com:
   - `decision=allowed`
   - `job_id`
   - `status=queued` (ou equivalente)

Nota: não adicione endpoints novos no Engine para isso nesta etapa; use o filesystem já existente.

### Parte C — Runtime: executar allow ops e reportar resultado
6) Implementar (ou ajustar) handlers no runtime para:
   - list: retornar lista de arquivos (limitar N resultados, ex.: 200)
   - scan_duplicates: retornar grupos de duplicados (hash por conteúdo, limitar custo)
   - suggest_cleanup: heurística determinística (ex.: arquivos duplicados, nomes comuns, extensões) — sem deletar nada
7) Persistir resultado localmente (opcional) e reportar sempre ao Engine via:
   - `POST /runtime/jobs/{job_id}/report`
   - `status=executed|failed`, `summary`, `artifacts` hashes
8) Guardar artefatos do resultado (json) com hash (para auditoria):
   - exemplo: `result.json` (lista/duplicados/sugestões)
   - `result_sha256` enviado no report

### Parte D — Console: exibir resultado real
9) No chat UI:
   - Se veio `job_id`: exibir “Executando…” / “Aguardando runtime”
   - Após aparecer `RUNTIME_JOB_REPORTED` no audit (poll via Console API), exibir:
     - status executed/failed
     - e mostrar o resultado (lista/duplicados/sugestões) vindo do artefato (se disponível) ou do payload audit (se suficiente)

### Testes e critérios de aceite
10) Criar um E2E mínimo (script + passos) que prova:
   - “listar arquivos em documentos” cria job no outbox
   - runtime consome job, executa, chama report
   - auditoria mostra `RUNTIME_JOB_REPORTED`
   - UI exibe resultado real (não simulado)

Critério de aceite:
- Operações allow passam a produzir resultado real via runtime e evidência no ledger, sem alterar o Engine core.
