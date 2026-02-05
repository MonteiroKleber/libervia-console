# Runbook: Desenvolvimento Local

Guia completo para subir e validar a stack Libervia em ambiente de desenvolvimento.

## 1. Pre-requisitos

### Software necessario

```bash
# Docker e Docker Compose
docker --version      # >= 20.x
docker compose version  # >= 2.x

# jq (parser JSON)
jq --version          # qualquer versao
# Instalar: sudo apt install jq

# curl
curl --version        # qualquer versao
```

### Estrutura de diretorios

A stack assume que os repositorios estao lado a lado:

```
/home/bazari/
├── engine/               # Engine (governa regras e ledger)
├── libervia-console/     # Console UI + compose principal
├── libervia-console-api/ # Backend do Console
└── libervia-agent-runtime/ # Runtime que executa jobs
```

---

## 2. Subir a Stack

### 2.1 Configurar variaveis de ambiente

```bash
cd /home/bazari/libervia-console

# Verificar .env.dev (ja deve existir)
cat .env.dev
```

Variaveis importantes:

| Variavel | Descricao |
|----------|-----------|
| `RUNTIME_INSTITUTION_ID` | UUID da instituicao no Engine (modo single-tenant) |
| `RUNTIME_AGENT_TOKEN` | Token do agente (modo single-tenant) |
| `RUNTIME_MANAGER_KEY` | Chave de autenticacao (modo multi-tenant) |

### 2.2 Escolher modo de Runtime

O sistema suporta dois modos de runtime:

#### Modo Multi-Tenant (RECOMENDADO)

Zero config manual. O `runtime-manager` descobre automaticamente todos os tenants:

```bash
# Subir stack com runtime-manager (multi-tenant)
docker compose --env-file .env.dev -f docker-compose.dev.yml up -d

# O runtime-manager ja esta configurado para descobrir tenants automaticamente
# Nao precisa atualizar .env.dev apos cada onboarding!
```

#### Modo Single-Tenant (debug)

Requer configuracao manual de `RUNTIME_INSTITUTION_ID` e `RUNTIME_AGENT_TOKEN`:

```bash
# Subir stack com runtime single-tenant (profile especifico)
docker compose --env-file .env.dev -f docker-compose.dev.yml --profile single-tenant up -d
```

### 2.3 Subir todos os servicos

```bash
cd /home/bazari/libervia-console

# Subir com build (primeira vez ou apos alteracoes)
docker compose --env-file .env.dev -f docker-compose.dev.yml up -d --build

# Subir sem rebuild (dia a dia)
docker compose --env-file .env.dev -f docker-compose.dev.yml up -d

# Verificar status
docker compose -f docker-compose.dev.yml ps
```

### 2.3 Acompanhar logs

```bash
# Todos os servicos
docker compose -f docker-compose.dev.yml logs -f

# Servico especifico
docker compose -f docker-compose.dev.yml logs -f engine
docker compose -f docker-compose.dev.yml logs -f console-api
docker compose -f docker-compose.dev.yml logs -f runtime-manager
# (Opcional) runtime single-tenant (debug)
docker compose -f docker-compose.dev.yml --profile single-tenant logs -f runtime
```

---

## 3. Health Checks

### 3.1 Verificar endpoints de saude

```bash
# Engine (porta 8001)
curl -s http://localhost:8001/health | jq .
# Esperado: {"status": "ok", ...}

# Console API (porta 3001)
curl -s http://localhost:3001/health | jq .
# Esperado: {"status": "ok", ...}

# Console UI (porta 3002)
curl -s -o /dev/null -w "%{http_code}" http://localhost:3002
# Esperado: 200
```

### 3.2 Verificar containers

```bash
docker compose -f docker-compose.dev.yml ps --format "table {{.Name}}\t{{.Status}}\t{{.Ports}}"
```

Todos devem estar `healthy` ou `running`.

---

## 4. Onboarding (Primeira Execucao)

### 4.1 Completar via UI

1. Acesse http://localhost:3002/onboarding
2. Informe um nome para a instituicao (ex: "Dev Local")
3. Clique em "Continuar"
4. **IMPORTANTE:** Anote o `agent_token` exibido (mostrado apenas uma vez!)

### 4.2 Verificar cookies

Apos o onboarding bem-sucedido, dois cookies sao setados:

| Cookie | Descricao |
|--------|-----------|
| `libervia_institution_id` | ID da instituicao no Console API |
| `libervia_engine_institution_id` | ID da instituicao no Engine |

Para verificar (DevTools do browser > Application > Cookies):
- Ambos devem estar presentes e ser UUIDs validos

### 4.3 Configurar Runtime

#### Modo Multi-Tenant (RECOMENDADO)

**Nao precisa fazer nada!** O `runtime-manager` descobre automaticamente a nova institution.

Verifique os logs para confirmar:
```bash
docker compose -f docker-compose.dev.yml logs runtime-manager | grep -i tenant
# Deve mostrar: "Found X tenant(s)"
```

#### Modo Single-Tenant (debug)

Se estiver usando o profile `single-tenant`, atualize o `.env.dev`:

```bash
# Editar .env.dev
# Substituir RUNTIME_AGENT_TOKEN pelo token anotado
# Substituir RUNTIME_INSTITUTION_ID pelo engine_institution_id

# Exemplo:
RUNTIME_INSTITUTION_ID=e4d0e4c4-597c-46bc-a7fd-a23ac05b83fd
RUNTIME_AGENT_TOKEN=vFz0BSTa_bkV-ZuaBlUXDnwC8RRWRxUWPd0KprjSU8E
```

E reiniciar o runtime:
```bash
docker compose -f docker-compose.dev.yml --profile single-tenant restart runtime
docker compose -f docker-compose.dev.yml --profile single-tenant logs -f runtime
```

---

## 5. Duas Contas (SoD Estrito)

O sistema implementa **Separacao de Deveres (SoD)**: quem solicita NAO pode aprovar.
Para testar E2E, sao necessarias DUAS contas na MESMA instituicao.

### 5.1 Conta 1: inst_owner (solicita operacoes)

Esta e a conta criada no onboarding. Ela pode:
- Criar jobs via chat
- Ver aprovacoes pendentes
- **NAO pode aprovar suas proprias solicitacoes**

### 5.2 Conta 2: exec_admin (aprova operacoes)

Para criar uma segunda conta:

1. Abra uma janela anonima/outro browser
2. Acesse http://localhost:3002/onboarding
3. Use um email DIFERENTE
4. **IMPORTANTE:** O admin da primeira conta deve convidar este usuario

Alternativa (dev): Usar a mesma conta com role diferente no Engine:
- A Console API cria tokens para `inst_owner` e `exec_admin`
- O teste E2E pode trocar entre eles via login/logout

### 5.3 Garantir mesma instituicao

Ambas as contas DEVEM ser membros da MESMA instituicao:

```bash
# Verificar no banco
docker exec libervia-console-postgres-1 psql -U libervia -d libervia -c \
  "SELECT u.email, im.role, i.display_name
   FROM users u
   JOIN institution_memberships im ON u.id = im.user_id
   JOIN institutions i ON im.institution_id = i.id;"
```

---

## 6. Fluxos E2E

### 6.1 Operacao SAFE (files.list)

Operacoes safe nao requerem aprovacao. Fluxo direto:

```bash
# Via chat UI (http://localhost:3002/chat)
# Mensagem: "list files in /tmp"

# Resultado esperado:
# 1. job.request -> cria job
# 2. job.enqueue -> coloca no outbox (sem approval)
# 3. runtime -> processa job
# 4. job.get -> retorna executed com resultado
```

### 6.2 Operacao DESTRUTIVA (files.delete)

Operacoes destrutivas requerem aprovacao. Fluxo completo:

```bash
# === Passo 1: Criar arquivo de teste ===
mkdir -p /tmp/e2e_test_files
echo "arquivo para deletar" > /tmp/e2e_test_files/test_delete.txt

# === Passo 2: Solicitar delete (inst_owner) ===
# Via chat UI (http://localhost:3002/chat)
# Mensagem: "delete file test_delete.txt"
# Resultado: job criado com status "pending_approval"

# === Passo 3: inst_owner tenta aprovar ===
# Via UI (http://localhost:3002/approvals)
# Clicar "Aprovar"
# Resultado: ERRO - "Separacao de Deveres (SoD)"
# Banner amarelo com mensagem: "Voce nao pode aprovar a propria solicitacao"

# === Passo 4: exec_admin aprova ===
# Fazer login com conta exec_admin
# Via UI (http://localhost:3002/approvals)
# Clicar "Aprovar"
# Resultado: Aprovacao concedida

# === Passo 5: Executor executa ===
# O executor padrao (runtime-manager) processa o job automaticamente
# Verificar logs:
docker compose -f docker-compose.dev.yml logs -f runtime-manager

# (Opcional) se estiver usando runtime single-tenant (debug):
docker compose -f docker-compose.dev.yml --profile single-tenant logs -f runtime

# === Passo 6: Verificar resultado ===
# Via audit (http://localhost:3002/audit)
# Procurar evento: RUNTIME_JOB_REPORTED
# Status: executed
```

### 6.3 Verificacao via API

```bash
# Cookies (pegar do browser apos login)
COOKIES="libervia_institution_id=<ID>; libervia_engine_institution_id=<ENGINE_ID>"

# Dashboard - status do agente
curl -s -b "$COOKIES" http://localhost:3002/api/dashboard | jq '.agent'

# Approvals - lista pendentes
curl -s -b "$COOKIES" http://localhost:3002/api/approvals | jq '.approvals'

# Audit - eventos do runtime
curl -s -b "$COOKIES" http://localhost:3002/api/audit/events | jq '.events[] | select(.event_type == "RUNTIME_JOB_REPORTED")'
```

---

## 7. Troubleshooting

### 7.1 TIMEOUT em list/chat

**Sintoma:** Requisicao de list fica pendurada ou retorna timeout.

**Causa provavel:** Runtime apontando para institution errada.

**Diagnostico:**
```bash
# Verificar RUNTIME_INSTITUTION_ID no .env.dev
grep RUNTIME_INSTITUTION_ID .env.dev

# Verificar se a pasta da institution existe
ls -la ../engine/var/institutions/

# Comparar os IDs - DEVEM ser iguais
```

**Solucao:**
1. Corrigir `RUNTIME_INSTITUTION_ID` no `.env.dev`
2. Reiniciar (padrao): `docker compose -f docker-compose.dev.yml restart runtime-manager`

Se estiver usando runtime single-tenant (debug): `docker compose -f docker-compose.dev.yml --profile single-tenant restart runtime`

### 7.2 Approvals vazias

**Sintoma:** Pagina de approvals mostra lista vazia mesmo havendo jobs pendentes.

**Causas provaveis:**
1. Cookies de institution incorretos
2. Usuario sem membership na institution
3. Filtro de status ativo

**Diagnostico:**
```bash
# Verificar cookies (DevTools > Application > Cookies)
# libervia_institution_id e libervia_engine_institution_id devem existir

# Verificar membership no banco
docker exec libervia-console-postgres-1 psql -U libervia -d libervia -c \
  "SELECT * FROM institution_memberships WHERE user_id = '<USER_ID>';"

# Verificar approvals no Engine
curl -s http://localhost:8001/approvals -H "X-Institution-ID: <ENGINE_ID>" | jq .
```

**Solucao:**
1. Limpar cookies do browser
2. Refazer login
3. Se necessario, refazer onboarding

### 7.3 403 RBAC / Forbidden

**Sintoma:** Requisicao retorna 403 com mensagem de RBAC.

**Causa provavel:** Role do usuario nao tem permissao para a operacao.

**Diagnostico:**
```bash
# Verificar role no banco
docker exec libervia-console-postgres-1 psql -U libervia -d libervia -c \
  "SELECT u.email, im.role FROM users u
   JOIN institution_memberships im ON u.id = im.user_id;"

# Verificar roles permitidas no bundle
cat idl/personal_ops/rbac.json | jq .
```

**Solucao:** Verificar se a operacao requer role especifica no IDL.

### 7.4 Not Found em enqueue

**Sintoma:** Enqueue retorna 404 ou "bundle not found".

**Causa provavel:** Bundle nao foi carregado/released no Engine.

**Diagnostico:**
```bash
# Verificar bundles no Engine
curl -s http://localhost:8001/bundles | jq .

# Verificar logs do onboarding
docker compose -f docker-compose.dev.yml logs console-api | grep -i bundle
```

**Solucao:**
1. Refazer onboarding (faz compile/release automatico)
2. Ou fazer release manual via Engine API

### 7.5 SoD Violation (403)

**Sintoma:** Ao aprovar, recebe erro "Separacao de Deveres".

**Causa:** Usuario tentando aprovar sua propria solicitacao.

**Solucao:** Usar conta diferente (exec_admin) para aprovar.

### 7.6 Runtime nao processa jobs

**Sintoma:** Jobs ficam no outbox sem serem processados.

**Diagnostico:**
```bash
# Verificar se runtime-manager esta rodando
docker compose -f docker-compose.dev.yml ps runtime-manager

# Verificar logs do runtime-manager
docker compose -f docker-compose.dev.yml logs -f runtime-manager

# Verificar outbox
ls -la ../engine/var/institutions/<INSTITUTION_ID>/legacy_bridge/outbox/
```

**Causas provaveis:**
1. Token invalido
2. Institution ID incorreto (modo single-tenant)
3. Outbox montado em path errado

### 7.7 Runtime-manager nao encontra tenants

**Sintoma:** Logs mostram "Found 0 tenant(s)" mesmo com onboarding completo.

**Diagnostico:**
```bash
# Verificar endpoint de tenants diretamente
MANAGER_KEY=$(grep RUNTIME_MANAGER_KEY .env.dev | cut -d= -f2)
curl -s -H "X-Runtime-Manager-Key: $MANAGER_KEY" http://localhost:3001/internal/runtime/tenants | jq .

# Verificar se institution tem onboarding completo
docker exec libervia-console-postgres-1 psql -U libervia -d libervia -c \
  "SELECT id, display_name, onboarding_status FROM institutions;"
```

**Causas provaveis:**
1. `RUNTIME_MANAGER_KEY` nao configurada no Console API
2. Onboarding nao completou (status != 'completed')
3. Actor token nao foi criado

**Solucao:**
1. Verificar `.env.dev` tem `RUNTIME_MANAGER_KEY`
2. Reiniciar console-api: `docker compose -f docker-compose.dev.yml restart console-api`
3. Se necessario, refazer onboarding

### 7.8 Erro 401 no endpoint interno

**Sintoma:** Runtime-manager recebe 401 ao buscar tenants.

**Causa:** `RUNTIME_MANAGER_KEY` no runtime-manager nao coincide com a do Console API.

**Solucao:**
```bash
# Verificar que ambos usam a mesma key
grep RUNTIME_MANAGER_KEY .env.dev

# Reiniciar ambos os servicos
docker compose -f docker-compose.dev.yml restart console-api runtime-manager
```

---

## 8. Reset Completo do Ambiente

### 8.1 Quando usar reset

Use o reset quando:
- Alterou o IDL/bundle e precisa estado limpo
- Alterou roles/actors no IDL
- Alterou enums do Console API (MembershipRole/InviteStatus)
- Estado ficou inconsistente (erros estranhos)
- Quer comecar do zero

### 8.2 Comando de reset

```bash
# Reset oficial (interativo, pede confirmacao)
./scripts/reset_dev.sh
```

Este script:
1. Para todos os containers
2. Remove volumes (banco, ledger, estado)
3. Limpa cache do Next.js
4. Rebuild e sobe a stack

### 8.3 Passos manuais apos reset

O script NAO faz automaticamente:

1. **Limpar cookies do navegador**
   - DevTools > Application > Cookies > Clear all
   - Ou usar janela anonima

2. **Completar onboarding**
   - Acessar http://localhost:3002/onboarding
   - Anotar o `agent_token` (mostrado apenas uma vez!)

3. **Atualizar .env.dev**
   ```bash
   # Copiar os novos valores do onboarding
   RUNTIME_INSTITUTION_ID=<novo_engine_institution_id>
   RUNTIME_AGENT_TOKEN=<novo_agent_token>
   ```

4. **Verificar executor (runtime-manager)**
   ```bash
   docker compose -f docker-compose.dev.yml logs -f runtime-manager
   ```

   (Opcional) runtime single-tenant (debug):
   ```bash
   docker compose -f docker-compose.dev.yml --profile single-tenant restart runtime
   ```

5. **Validar**
   ```bash
   ./scripts/smoke_dev.sh
   ```

### 8.4 Reset parcial (apenas banco)

Se precisa resetar apenas o banco (sem rebuild):

```bash
# Parar e remover volumes
docker compose -f docker-compose.dev.yml down -v

# Subir novamente (sem --build)
docker compose --env-file .env.dev -f docker-compose.dev.yml up -d

# Refazer onboarding
```

---

## 9. NUNCA FAZER

### 9.1 NAO editar artefatos do bundle manualmente

Os arquivos em `idl/personal_ops/*.json` sao GERADOS.
Qualquer edicao manual sera sobrescrita no proximo build.

```
# ERRADO - nunca fazer isso:
vim idl/personal_ops/rbac.json
vim idl/personal_ops/sod.json

# CORRETO - editar apenas o IDL:
vim idl/personal_ops/v1.0.0/source.idl
./scripts/idl_build_personal_ops.sh
```

### 9.2 NAO editar state do Engine diretamente

Os arquivos em `engine/var/` sao gerenciados pelo Engine.
Editar manualmente pode corromper o estado.

```
# ERRADO - nunca fazer isso:
vim ../engine/var/institutions/<id>/state.json
rm -rf ../engine/var/ledger/*

# CORRETO - usar APIs do Engine ou refazer onboarding
```

### 9.3 NAO usar --build desnecessariamente

Rebuild completo demora. Use apenas quando necessario:

```bash
# Usar --build apenas quando:
# - Alterou Dockerfile
# - Alterou requirements/package.json
# - Primeira execucao apos clone

# Dia a dia (sem --build):
docker compose -f docker-compose.dev.yml up -d
```

---

## 10. Comandos Uteis

### Parar stack
```bash
docker compose -f docker-compose.dev.yml down
```

### Parar e limpar volumes (CUIDADO - perde dados)
```bash
docker compose -f docker-compose.dev.yml down -v
```

### Rebuild forcado de um servico
```bash
docker compose -f docker-compose.dev.yml up -d --build --force-recreate engine
```

### Ver uso de recursos
```bash
docker stats
```

### Entrar em container para debug
```bash
docker compose -f docker-compose.dev.yml exec engine bash
docker compose -f docker-compose.dev.yml exec console-api bash
```

---

## 11. Scripts de Validacao

### 11.1 Smoke Test (basico)

Valida que a stack esta saudavel:

```bash
./scripts/smoke_dev.sh

# Ou com subida automatica:
./scripts/smoke_dev.sh --up
```

### 11.2 E2E Multi-Tenant

Valida o funcionamento do runtime-manager multi-tenant:

```bash
./scripts/e2e_multi_tenant_runtime_manager.sh
```

Este script verifica:
- Runtime-manager esta rodando
- Endpoint interno de tenants funciona
- Autenticacao esta correta
- Nao ha erros de TIMEOUT

---

## 12. Checklist Pre-Commit

Antes de commitar alteracoes:

- [ ] Stack sobe sem erros: `docker compose up -d`
- [ ] Health checks passam: `curl localhost:8001/health && curl localhost:3001/health`
- [ ] Smoke test passa: `./scripts/smoke_dev.sh`
- [ ] Nenhum arquivo `.bak*` no IDL: `ls idl/personal_ops/*.bak* 2>/dev/null`
- [ ] Artefatos em sync com IDL: `./scripts/idl_check_personal_ops.sh`
