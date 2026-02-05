LIBERVIA
Agente de Organização Pessoal Governada
Especificação Completa de Produto – Produção
1. Visão do Produto

O produto Libervia Personal Ops é um SaaS que permite a qualquer pessoa ou empresa operar agentes automatizados sob governança computacional determinística, com:

controle explícito de autoridade

auditoria em tempo real

separação entre decisão e execução

aprovação humana quando necessário

rastreabilidade criptográfica

Não é um assistente pessoal comum.
Não é um chatbot.
Não é um agente autônomo.

É um funcionário digital governado, subordinado a uma instituição criada pelo próprio usuário.

2. Princípios Inegociáveis

Engine é a autoridade

Nenhuma decisão, permissão ou exceção existe fora do Engine.

IA nunca decide

IA pode sugerir, executar ou solicitar.

A decisão sempre é humana ou institucional.

Nada executa sem contrato

Tudo que o agente faz está declarado em IDL.

Nada destrutivo sem aprovação

Ações irreversíveis exigem aprovação explícita.

Auditoria é arquitetura

Não existe “log opcional”.

Tudo vira evento no ledger.

Nada fake

Sem respostas simuladas.

Sem fluxos mockados.

Se não executa de verdade, não existe.

3. Arquitetura Geral
┌─────────────────────────────┐
│        Libervia Console     │  (Frontend)
│  Portal + Chat Executivo    │
└───────────────▲─────────────┘
                │
┌───────────────┴─────────────┐
│     Libervia Console API     │  (Backend SaaS)
│  Auth | Billing | Onboarding│
│  Orquestra Engine           │
└───────────────▲─────────────┘
                │
┌───────────────┴─────────────┐
│        Libervia Engine      │  (Autoridade)
│  Instituições | IDL | RBAC  │
│  Workflows | Approvals      │
│  Ledger Imutável            │
└───────────────▲─────────────┘
                │
┌───────────────┴─────────────┐
│   Agent Runtime (Local)     │
│  Executor Governado         │
│  (Laptop / Desktop)         │
└─────────────────────────────┘

4. Repositórios Oficiais
4.1 engine (já existe) >> entender tudo sobre engine em /home/bazari/engine

Responsabilidade

Instituições

Atores

Tokens

IDL

Compile / Release

Enforcement

Workflows

Approvals

Ledger

Nada de SaaS aqui.
Engine é neutro, institucional e reutilizável.

4.2 libervia-console-api (NOVO – obrigatório)

Função
Backend do SaaS.
Nunca decide. Nunca governa.

Responsabilidades

Autenticação de usuários

Billing / planos

Mapeamento user_id → institution_id

Orquestrar chamadas administrativas ao Engine

Gerenciar sessões do portal

Gerenciar downloads do Agent Runtime

Nunca

Implementar regras

Criar exceções

Aprovar ações

Bypassar Engine

4.3 libervia-console (NOVO – frontend limpo)

Função
Interface humana do sistema.

Responsabilidades

Onboarding

Visualização de ações

Aprovações

Auditoria

Chat executivo

Nunca

Chamar Engine com admin-token

Tomar decisões

Executar ações diretas

4.4 libervia-agent-runtime (NOVO)

Função
Executor local governado.

Responsabilidades

Executar ações locais (filesystem, organização, análise)

Somente após autorização explícita do Engine

Reportar resultado ao Engine

Nunca

Decidir

Ampliar permissão

Executar fora do contrato

5. Fluxo de Onboarding (Produção)
5.1 Criar Conta (SaaS)

Usuário cria conta no Console.

5.2 Criar Instituição (Engine)

Console API executa:

POST /admin/institutions
→ institution_id

5.3 Criar Departamento Padrão
personal_ops


Ativado automaticamente.

5.4 Criar Atores

Atores iniciais:

Ator	Tipo
owner	humano
executive_admin	humano
organizational_agent	agente (is_agent=true)

Tokens separados para cada ator.

5.5 Seed da IDL Base

IDL personal_ops@v1.0.0 registrada no Engine.

5.6 Compile + Release
POST /ise/compile/release
{ institution_id, dept, idl_version }

5.7 Resultado do Onboarding

Instituição pronta, com:

agente ativo

contrato declarado

workflow funcional

ledger em funcionamento

6. IDL – Agente Organizacional (Base)
Capacidades
Ação	Tipo
listar arquivos	permitido
detectar duplicados	permitido
sugerir limpeza	permitido
renomear arquivos	approval configurável
mover arquivos	approval
deletar arquivos	approval obrigatório
Regras

agente nunca executa destrutivo sem approval

agente nunca cria permissão

agente nunca executa fora do dept

7. Agent Runtime (Local)
Instalação

Usuário baixa binário via Console

Binário recebe:

institution_id

actor_token

engine_base_url

Execução

Agente recebe ordem (via Chat)

Agente cria proposta no Engine

Se permitido:

Engine autoriza

Agente executa

Se exigir approval:

Entra em fila

Admin aprova

Agente executa

Resultado é reportado ao Engine

8. Portal (Libervia Console)
8.1 Telas Obrigatórias
1. Onboarding

criar instituição

ativar agente

ver regras ativas

2. Dashboard

status do agente

últimas ações

pendências

3. Chat Executivo

dar ordens

receber propostas

receber bloqueios explicados

4. Aprovações

lista de ações pendentes

aprovar / rejeitar

ver impacto da decisão

5. Auditoria

timeline humana

filtros por tipo

exportação

9. Chat (Regra de Ouro)

O chat não fala com LLM direto.

Fluxo:

Usuário → Chat → Intent
Intent → Engine (proposal)
Engine → approval ou allow
Agente executa
Resultado → Engine → Chat

10. Segurança

Multi-tenant por institution_id

Tokens com escopo

Nenhum segredo no frontend

Tudo auditável

Tudo rastreável

11. O Que NÃO Terá

Chatbot “livre”

Autonomia implícita

Execução silenciosa

Logs apagáveis

Decisão probabilística

“Modo rápido sem approval”

12. Posicionamento de Mercado

“Não vendemos IA.
Vendemos controle.”

“Automação sem governança é risco operacional.”

“Aqui, a IA trabalha.
Quem decide é você.”

13. Critério Final de Produção

O produto só pode ir ao mercado se:

Agente executa algo real

Approval bloqueia de verdade

Ledger prova tudo

Nada é simulado

Engine é autoridade absoluta