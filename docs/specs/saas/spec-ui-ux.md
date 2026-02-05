# Spec UI/UX — Libervia Console (SaaS Personal Ops)

Base: `documento-visao.md` + `plano-implementacao-producao.md`.

Objetivo deste spec: definir uma UI/UX **completa e implementável** para o `libervia-console` (frontend), consumindo **apenas** a `libervia-console-api`, que por sua vez orquestra o `libervia-engine`.

## Princípios de UX (não negociáveis)

1. **Engine é autoridade**: a UI nunca “decide”; ela **exibe estados do Engine** e permite ações humanas (aprovar/rejeitar) com rastreabilidade.
2. **Clareza sobre governança**: todo pedido no chat precisa resultar em um estado explícito:
   - `allowed` (execução autorizada)
   - `needs_approval` (pendente)
   - `denied` (bloqueado com motivo)
   - `executing` / `executed` / `failed` (resultado real, não simulado)
3. **Nada fake**: se não há evidência real (evento/resultado), a UI deve dizer “Ainda não temos isso” (com o porquê e o próximo passo).
4. **Separação decisão vs execução**: aprovar/rejeitar é uma ação distinta; execução só acontece quando o Engine autoriza e o runtime executa.
5. **Auditabilidade primeiro**: toda tela deve facilitar “como provamos isso?” (IDs, timestamps, trilha).
6. **Segurança por padrão**: nenhum segredo no frontend; ações sensíveis pedem confirmação e exibem impacto.

---

## Personas e objetivos

### Persona A — Owner (dono da instituição)
- Quer “ligar o sistema” rapidamente.
- Quer visibilidade e controle (aprovações e auditoria).
- Quer reduzir risco operacional (“nada destrutivo sem eu ver”).

### Persona B — Executive Admin (operador)
- Executa a rotina: aprova pendências, confere auditoria, dá ordens no chat.
- Quer eficiência (fila de approvals, filtros, atalhos).

### Persona C — Auditor/Compliance (leitura)
- Quer evidências: timeline, export, hashes, IDs.
- Não executa ações nem aprova.

---

## Estrutura do produto (sitemap)

Navegação principal (sidebar ou top-nav, responsivo):
- **Onboarding** (somente até concluído; depois vira “Setup”)
- **Dashboard**
- **Chat**
- **Aprovações**
- **Auditoria**
- **Configurações**

Configurações (subseções):
- Instituição (nome/slug, ambiente)
- Agente/Runtime (download, status, instruções, root_dir)
- Atores & Acesso (memberships; no MVP pode ser simples)
- Exportações (downloads recentes)

---

## Padrões globais de UI

### Layout e padrões de feedback
- Loading: skeletons para listas (dashboard, approvals, auditoria).
- Empty state: sempre com explicação + “o que fazer agora”.
- Error: erro humano (“não foi possível…”) + detalhe técnico colapsável (request_id, code).
- Banner de status do sistema: Engine online/offline, última sincronização, modo “safe/freeze” se aplicável.

### Componentes padrão (design system mínimo)
- `StatusPill`: allowed / needs approval / denied / executing / executed / failed.
- `EventTimeline`: lista de eventos com ícone por tipo + detalhes expandíveis.
- `ApprovalCard`: mostra ação, impacto, dados chave, botões aprovar/rejeitar.
- `ArtifactPanel`: IDs e hashes (case_id, approval_id, job_id, sha256s) com “copiar”.
- `ExplainerBox`: bloco que traduz “por que foi bloqueado” em texto curto.
- `DangerZoneConfirm`: confirmação em 2 passos para ações irreversíveis (ex.: aprovar delete).

### Checklist de componentes (tabela)

Tabela para implementação do design system mínimo no `libervia-console`.

| Componente | Para quê | Estados mínimos | A11y mínimo | MVP |
|---|---|---|---|---|
| `AppShell` | Layout geral + navegação | responsivo, colapsado | landmarks/skip link | Sim |
| `Nav` | Navegação principal | ativo/inativo | `aria-current` | Sim |
| `PageHeader` | Título + ações da página | — | heading correto | Sim |
| `Button` | Ações | default/loading/disabled/danger | foco visível | Sim |
| `Input` / `Textarea` | Formulários | erro/disabled | label + describedby | Sim |
| `Select` | Filtros/form | erro/disabled | label + teclado | Sim |
| `Dialog` | Confirmações | open/close | trap foco + ESC | Sim |
| `Toast` | Feedback rápido | success/error | role apropriada | Sim |
| `BannerStatus` | Status do sistema | online/offline/degraded | texto + ícone | Sim |
| `Skeleton` | Loading | — | não “pular” layout | Sim |
| `EmptyState` | Lista vazia | — | CTA claro | Sim |
| `ErrorState` | Erro de carregamento | retry | detalhe colapsável | Sim |
| `StatusPill` | Estado governado | allowed/needs_approval/denied/executing/executed/failed | não só cor | Sim |
| `EventTimeline` | Auditoria/casos | expand/collapse | botões acessíveis | Sim |
| `ArtifactPanel` | IDs/hashes/provas | copiar | botão “copiar” | Sim |
| `CopyButton` | Copiar IDs/URLs | copied | feedback não intrusivo | Sim |
| `ApprovalCard` | Fila de approvals | pending/decided | ações com confirmação | Sim |
| `DangerZoneConfirm` | Ações irreversíveis | step 1/step 2 | foco + texto claro | Sim |
| `FilterBar` | Filtros de listas | aplicado/limpar | labels | Sim |
| `Table` | Listas densas | sorting (opcional) | cabeçalhos corretos | Sim |
| `Pagination` | Navegação em listas | next/prev | botões com label | Depois |
| `Tabs` | Seções na mesma tela | ativo | teclado (setas) | Depois |
| `CodeBlock` | Detalhe técnico | colapsável | seleção fácil | Sim |

### Acessibilidade
- Navegação por teclado em listas e diálogos.
- Contraste AA.
- Textos de status não dependem só de cor (ícone + label).

---

## Estados canônicos (para todo o produto)

### Estado de “Pedido” (chat → proposta)
Um pedido do usuário deve sempre renderizar:
- `Pedido` (texto original)
- `Intent` (estrutura/ação entendida; se não houver, mostrar “Não entendi ainda”)
- `Decisão do Engine`:
  - allowed / needs_approval / denied
- `Execução`:
  - queued/executing/executed/failed (somente se existir trabalho real)
- `Evidências`:
  - IDs + timestamps + (quando disponível) hashes

### Estados de approval
- `pending`: aguardando decisão humana
- `approved`: aprovado (e então deve aparecer etapa de execução)
- `rejected`: rejeitado (com motivo)
- `expired/canceled`: se existir no Engine; se não, não inventar

---

## Telas e fluxos (wireflow textual)

### 1) Onboarding (tela obrigatória)

Objetivo: criar conta SaaS → criar instituição no Engine → deixar pronto para operar.

**Passo 1: Criar instituição**
- Campos:
  - Nome da instituição (display_name)
  - “Slug” (auto-sugerido; editável com validação)
- CTA: `Criar instituição`
- Estados:
  - Loading (mostra que chama o Engine)
  - Sucesso: mostra `institution_id` + “Próximo passo: ativar agente”
  - Erro: exibir motivo (ex.: slug tomado) e como corrigir

**Passo 2: Provisionar atores**
- Mostrar tabela:
  - owner (humano)
  - executive_admin (humano)
  - organizational_agent (agente)
- Nota: “Tokens são guardados com segurança no backend; o browser não recebe segredos.”

**Passo 3: Instalar contrato (IDL)**
- Mostrar:
  - IDL `personal_ops@v1.0.0`
  - Status do deploy do bundle (released/deployed)
  - Link “ver evidência no ledger” (leva para Auditoria filtrada)

**Passo 4: Instalar runtime**
- Exibir “Download do runtime” (por OS) + “Config file” (ou comando `configure`)
- Campos operacionais:
  - `engine_base_url` (somente leitura; no dev local pode mostrar `http://localhost:8000`)
  - `root_dir` recomendado (texto + botão copiar)
- Checklist com checkbox:
  - Baixei e rodei o runtime
  - Runtime apareceu online (ver em Dashboard)

Critério de aceite UX:
- Onboarding mostra progresso com etapas e “o que está acontecendo” (sem termos internos sem explicação).
- Se o Engine falhar, o usuário entende se foi “rede”, “auth”, “erro de contrato”, etc.

---

### 2) Dashboard (tela obrigatória)

Objetivo: visão rápida do sistema e do agente.

Seções:
- **Status do Agente**
  - Online/offline (último heartbeat; se não existir ainda, mostrar “não disponível”)
  - Última execução e último erro
- **Pendências**
  - contagem de approvals pendentes
  - contagem de ações bloqueadas (denied)
  - CTA: `Ver aprovações`
- **Últimas atividades**
  - tabela com 10 últimos “eventos de alto nível” (pedido/approval/execução)
  - filtro rápido: `Tudo | Aprovações | Execuções | Bloqueios`

Critério de aceite UX:
- Em 5 segundos o usuário entende “tem algo para aprovar?” e “o agente está funcionando?”.

---

### 3) Chat Executivo (tela obrigatória)

Objetivo: dar ordens e acompanhar propostas/execuções.

Layout em 2 painéis:
- Painel A (esquerda): lista de conversas/casos (ou “sessões”)
- Painel B (direita): thread com cards governados

**Input do chat**
- Caixa de texto + sugestões (chips) do MVP:
  - “Listar arquivos em …”
  - “Detectar duplicados em …”
  - “Sugerir limpeza em …”
  - “Renomear arquivo …”
  - “Mover arquivo …”
  - “Deletar arquivo …”

**Resposta do sistema (nunca livre)**
Cada mensagem do sistema é um card:
- `Entendi como:` (Intent estruturado)
- `Decisão:` (StatusPill)
- `Próximo passo:` (ex.: “Aguardando approval do admin”, ou “Executando no runtime”)
- `Evidências:` (ArtifactPanel com IDs/hashes)
- `Detalhes técnicos:` (colapsável)

**Tratamento de negação (denied)**
- Mostrar:
  - “Bloqueado pelo Engine”
  - Motivo curto (tradução)
  - Motivo técnico (code) + link “ver na auditoria”
  - Se aplicável: CTA “Criar solicitação” (somente se existir esse fluxo real; não inventar)

Critério de aceite UX:
- Usuário consegue distinguir “o sistema entendeu” vs “o sistema executou”.
- Se precisar approval, a UI já oferece link direto para a pendência correspondente.

---

### 4) Aprovações (tela obrigatória)

Objetivo: fila eficiente de decisões humanas.

**Lista**
- Filtros:
  - Status: `Pendente | Aprovadas | Rejeitadas`
  - Tipo: `Rename | Move | Delete | Outros`
  - Período
  - Ator solicitante (owner/admin/agent)
- Ordenação:
  - padrão: mais antigas primeiro (SLA)
  - opcional: “maior impacto primeiro” (se houver métrica real)

**Card de approval (detalhe)**
- O que vai acontecer (efeito)
- Alvo (paths, nomes, contagem de arquivos)
- Por que foi solicitado (origem: chat/caso)
- Risco e irreversibilidade (ex.: delete)
- Evidências: approval_id, case_id, hashes
 - Mostrar dois níveis de nome:
   - **Rule name (raw)**: valor original do Engine (para debug/auditoria).
   - **Display name (UX)**: rótulo humano derivado pelo Console API (ex.: "Aprovar operação de arquivos").

**Ações**
- `Aprovar` (com confirmação reforçada para delete)
- `Rejeitar` (com motivo obrigatório)

Critério de aceite UX:
- Aprovar/rejeitar dá feedback imediato (otimista só se garantido; senão “confirmado pelo Engine”).
- Decisão aparece na auditoria e volta para o chat/caso automaticamente.

---

### 5) Auditoria (tela obrigatória)

Objetivo: provar o que aconteceu.

**Lista/timeline**
- Filtros:
  - Tipo: RBAC, Approval Requested, Approval Decided, Execution Started, Execution Result
  - Actor (ator_id ou “owner/admin/agent” quando mapeável)
  - Case ID
  - Dept (`personal_ops`)
  - Allowed/Denied
- Exibir:
  - timestamp
  - evento (nome humano + código)
  - relação com caso (case_id) e approval/job
  - payload (colapsável)

**Export**
- Export JSONL (preferencial)
- Export CSV (visão humana)
- Export “case bundle” (opcional): todos os eventos de um case_id

Critério de aceite UX:
- Auditor consegue reconstruir a história de um caso sem ter acesso a segredos.

---

### 6) Configurações

#### 6.1 Instituição
- Nome e slug (quando permitido)
- Ambiente: `dev` / `prod` (somente informativo)
- Links úteis: base URL do Engine (somente leitura), status

#### 6.2 Runtime / Agente
- Downloads por OS/arch
- “Como instalar” (passo a passo)
- Config:
  - engine_base_url
  - institution_id
  - actor_token (nunca exibir; apenas “token provisionado”)
  - root_dir recomendado

#### 6.3 Acesso (MVP)
- Lista de membros (email, role)
- Convidar membro (opcional no MVP)

---

## Microcopy (linguagem do produto)

Tom: institucional, claro, sem hype de IA.

Padrões:
- “Bloqueado pelo Engine” (não “erro”)
- “Aguardando aprovação humana”
- “Executado no seu runtime local” (quando houver evidência)
- “Sem evidência de execução ainda” (quando não houver)

---

## Métricas de UX (para instrumentação)

- Tempo até “primeira ação executada” (onboarding → primeira execução real).
- Tempo médio de approval (pending → decided).
- Taxa de bloqueios por motivo (RBAC/mandate/policy/autonomy).
- Taxa de sucesso do runtime (executed vs failed).

---

## Critério final de “experiência perfeita” (operacional)

1. Usuário entende **sempre** o estado (allowed/needs approval/denied/executed).
2. O produto nunca finge que executou; execução sem evidência não é exibida como concluída.
3. Aprovações são rápidas de operar e sempre rastreáveis.
4. Auditoria permite provar o fluxo do começo ao fim.
