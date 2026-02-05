# Libervia Console

Frontend para a plataforma Libervia.

## Quickstart (Docker Compose)

```bash
# Copiar env
cp .env.dev.example .env.dev

# Subir todos os serviços
docker compose -f docker-compose.dev.yml up -d

# Verificar status
docker compose -f docker-compose.dev.yml ps

# Testar endpoints
curl http://localhost:8001/health   # Engine
curl http://localhost:3001/health   # Console API
open http://localhost:3002          # Console

# Parar
docker compose -f docker-compose.dev.yml down
```

## Portas (Docker Compose)

| Serviço | Porta |
|---------|-------|
| Engine | 8001 |
| Console API | 3001 |
| Console | 3002 |
| Postgres | 5433 |

## Arquitetura

```
┌─────────────────┐     ┌─────────────────┐     ┌─────────────────┐
│  Console (UI)   │────►│  Console API    │────►│     Engine      │
│  localhost:3002 │     │  localhost:3001 │     │  localhost:8001 │
└─────────────────┘     └─────────────────┘     └─────────────────┘
                                │
                                ▼
                        ┌─────────────────┐
                        │    Postgres     │
                        │  localhost:5433 │
                        └─────────────────┘
```

## Fluxo de Onboarding

1. Acesse `http://localhost:3002/onboarding`
2. Informe o nome da instituição (opcional)
3. O sistema cria automaticamente:
   - Instituição no Engine
   - Chaves de administração
   - Tokens de ator (owner, admin, agent)
   - Deploy do bundle `personal-ops`
4. Na primeira conclusão, o sistema exibe o `agent_token` (mostrado apenas uma vez)
5. Use o token para configurar o Agent Runtime

## Rotas do Personal-Ops Bundle

As rotas do produto são registradas via **IDL/bundle** quando o onboarding é concluído com sucesso:

| Rota | Descrição |
|------|-----------|
| `POST /personal/files/list` | Lista arquivos |
| `POST /personal/files/delete` | Propõe deleção de arquivo |
| `POST /personal/files/delete/{id}/submit` | Submete deleção para aprovação |
| `POST /personal/files/rename` | Propõe renomeação de arquivo |
| `POST /personal/files/rename/{id}/submit` | Submete renomeação para aprovação |
| `POST /personal/files/move` | Propõe movimentação de arquivo |
| `POST /personal/files/move/{id}/submit` | Submete movimentação para aprovação |
| `POST /personal/files/operations/{id}/execute` | Executa operação aprovada |
| `POST /personal/files/scan/duplicates` | Escaneia duplicatas |
| `POST /personal/files/suggest/cleanup` | Sugere limpeza |

**Nota:** Estas rotas só aparecem no OpenAPI do Engine após o bundle ser compilado e liberado com sucesso.

## Páginas da UI

| Rota | Descrição |
|------|-----------|
| `/onboarding` | Configuração inicial da instituição |
| `/dashboard` | Visão geral do ambiente |
| `/chat` | Interface de conversa com o agente |
| `/approvals` | Gerenciamento de aprovações pendentes |
| `/audit` | Timeline de eventos de auditoria |
| `/settings` | Configurações da instituição e runtime |

## Contexto de Instituição

A UI utiliza cookies HTTP-only para gerenciar o contexto da instituição:

- `libervia_institution_id`: ID da instituição no Console API
- `libervia_engine_institution_id`: ID da instituição no Engine

Estes cookies são definidos automaticamente após o onboarding bem-sucedido.

## API Routes (Console Frontend)

O Console implementa rotas de API que fazem proxy para o Console API:

| Rota | Método | Descrição |
|------|--------|-----------|
| `/api/institutions` | POST | Onboarding de instituição |
| `/api/dashboard` | GET | Dados do dashboard |
| `/api/chat` | POST | Envio de mensagens |
| `/api/approvals` | GET | Lista aprovações pendentes |
| `/api/approvals` | POST | Decide aprovação |
| `/api/audit/events` | GET | Lista eventos de auditoria |
| `/api/audit/export` | GET | Exporta eventos (JSONL) |

## Runbook de Desenvolvimento

Guia completo para subir e validar a stack:
- [docs/RUNBOOK_DEV.md](docs/RUNBOOK_DEV.md)

```bash
# Smoke test automatizado
./scripts/smoke_dev.sh

# Subir stack e validar
./scripts/smoke_dev.sh --up

# Rebuild completo
./scripts/smoke_dev.sh --build
```

## Teste E2E

Para testar o fluxo completo (chat → approval → runtime → audit), consulte:
- [docs/E2E_UI_RUNTIME.md](docs/E2E_UI_RUNTIME.md)

```bash
# Executar script de teste
./scripts/e2e_ui_runtime.sh
```

## Desenvolvimento Local

```bash
# Instalar dependências
npm install

# Copiar env
cp .env.example .env.local

# Rodar em desenvolvimento
npm run dev

# Acessar
open http://localhost:3000
```

## Variáveis de Ambiente

| Variável | Descrição | Default |
|----------|-----------|---------|
| `NEXT_PUBLIC_CONSOLE_API_BASE_URL` | URL pública da Console API | `http://localhost:3001` |
| `CONSOLE_API_BASE_URL` | URL interna da Console API (Docker) | `http://console-api:8000` |

## Notas Importantes (Dev)

- As rotas do produto (ex.: `/personal/files/*`) são registradas via **IDL/bundle**, então o Engine deve rodar com `ENGINE_API_MODE=idl` (já configurado em `docker-compose.dev.yml`).
- O onboarding do Console API faz `compile/release` usando o artefato `source.ir.json`; no compose isso é fornecido via `BUNDLE_IR_PATH=/app/idl/personal_ops/v1.0.0/source.ir.json` + volume `./idl:/app/idl:ro`.
- Se o onboarding falhar, verifique os logs do Console API e Engine para diagnosticar.

## Troubleshooting

### Onboarding falha com "ENGINE_SLUG_TAKEN"

O slug da instituição já existe no Engine. Isso pode acontecer se:
1. Uma tentativa anterior criou a instituição no Engine mas falhou depois
2. Outra conta já usou o mesmo slug

**Solução:** Limpe os dados e tente novamente, ou use um email diferente.

### 403 "Not a member of this institution"

Os cookies de instituição não estão corretos ou a sessão expirou.

**Solução:**
1. Limpe os cookies do navegador
2. Acesse `/onboarding` novamente
3. Se já tem uma instituição configurada, ela será retornada automaticamente

### Runtime não encontra jobs

O outbox pode estar vazio ou no caminho errado.

**Solução:**
```bash
# Verificar estrutura de diretórios
ls -la /var/engine/institutions/<institution_id>/legacy_bridge/
```
