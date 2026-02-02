# personal_ops@v1.0.0

Governanca de operacoes pessoais de arquivos com approvals para acoes destrutivas.

## Operacoes

| Operacao | Tipo | Requer Approval |
|----------|------|-----------------|
| `files_list` | Listar arquivos | Nao (allow) |
| `files_scan_duplicates` | Detectar duplicados | Nao (allow) |
| `files_suggest_cleanup` | Sugerir limpeza | Nao (allow) |
| `files_rename_*` | Renomear arquivo | Sim (approval MVP) |
| `files_move_*` | Mover arquivo | Sim (approval MVP) |
| `files_delete_*` | Deletar arquivo | Sim (approval MVP) |

## Fluxo de Operacoes Destrutivas

```
1. User propoe operacao (POST /personal/files/delete)
2. Agent submete para approval (POST /personal/files/delete/{id}/submit)
3. Guardian ou User (distinto) decide (POST /approvals/{approval_id}/decide)
4. Agent executa se aprovado (POST /personal/files/operations/{id}/execute)
```

## Compilar e Fazer Release

### Passo 1: Converter DSL para IRCS JSON

```bash
# Dentro do diretorio engine/
cd /home/bazari/engine

# Converter IDL DSL para IRCS v1 JSON
PYTHONPATH=src python -m engine.idl_dsl \
    /home/bazari/libervia-console/idl/personal_ops/v1.0.0/source.idl \
    -o /home/bazari/libervia-console/idl/personal_ops/v1.0.0/source.ir.json

# Validar apenas (sem gerar JSON)
PYTHONPATH=src python -m engine.idl_dsl \
    /home/bazari/libervia-console/idl/personal_ops/v1.0.0/source.idl \
    --validate
```

### Passo 2: Compile e Release (para instituicao existente)

```bash
# Ler o arquivo IR JSON
IR_CONTENT=$(cat /home/bazari/libervia-console/idl/personal_ops/v1.0.0/source.ir.json)

# Compilar e fazer release
curl -X POST http://localhost:8001/ise/compile/release \
    -H "Content-Type: application/json" \
    -H "X-Admin-Token: ${ENGINE_ISE_ADMIN_TOKEN}" \
    -d "{
        \"idl\": $(echo "$IR_CONTENT" | jq -Rs .),
        \"bundle_name\": \"personal-ops\",
        \"institution_id\": \"${INSTITUTION_ID}\",
        \"validate_finance_pilot\": false
    }"
```

**Resposta esperada:**
```json
{
    "status": "ok",
    "release_id": "rel-xxxx",
    "bundle_name": "personal-ops",
    "bundle_hash": "461c78a5d8310a71..."
}
```

### Alternativa: Build Sandbox (sem deploy)

```bash
# Build para sandbox (nao requer admin token)
curl -X POST http://localhost:8001/pipeline/build \
    -H "Content-Type: application/json" \
    -d "{
        \"text\": \"Governanca de arquivos pessoais com approval para delete/move/rename\",
        \"bundle_name\": \"personal-ops\"
    }"
```

**Resposta com gaps:**
```json
{
    "status": "NEEDS_ANSWERS",
    "gaps": [...],
    "answers_template": {...}
}
```

**Resposta apos resolver gaps:**
```json
{
    "status": "BUILD_OK",
    "run_id": "uuid-xxx",
    "bundle_path": "bundles/dev-runs/uuid-xxx/personal-ops/",
    "bundle_hash": "sha256:..."
}
```

### Opcao 3: Pipeline Deploy (NL -> Deploy)

```bash
curl -X POST http://localhost:8001/pipeline/deploy \
    -H "Content-Type: application/json" \
    -H "X-Admin-Token: ${ENGINE_ISE_ADMIN_TOKEN}" \
    -d "{
        \"text\": \"Governanca de arquivos pessoais com approval para delete/move/rename\",
        \"bundle_name\": \"personal-ops\",
        \"target\": \"production\"
    }"
```

## Testar Approvals Bloqueando Acoes Destrutivas

### 1. Criar instituicao sandbox

```bash
curl -X POST http://localhost:8001/admin/institutions \
    -H "Content-Type: application/json" \
    -H "X-Admin-Token: ${ENGINE_ISE_ADMIN_TOKEN}" \
    -d '{"slug": "sandbox-personal-ops", "display_name": "Sandbox Personal Ops"}'
```

### 2. Instalar bundle na instituicao

```bash
# Usar o release_id do passo anterior
curl -X POST http://localhost:8001/ise/compile/release \
    -H "Content-Type: application/json" \
    -H "X-Admin-Token: ${ENGINE_ISE_ADMIN_TOKEN}" \
    -d "{
        \"idl\": $(cat idl/personal_ops/v1.0.0/source.idl | jq -Rs .),
        \"bundle_name\": \"personal-ops\",
        \"institution_id\": \"${SANDBOX_INSTITUTION_ID}\",
        \"validate_finance_pilot\": false
    }"
```

### 3. Propor operacao de delete

```bash
curl -X POST http://localhost:8001/personal/files/delete \
    -H "Content-Type: application/json" \
    -H "X-Institution-Id: ${SANDBOX_INSTITUTION_ID}" \
    -H "X-Actor-Token: ${USER_TOKEN}" \
    -d '{
        "operation_type": "delete",
        "source_path": "/tmp/arquivo-teste.txt",
        "reason": "Arquivo duplicado identificado pelo scan"
    }'
```

### 4. Submeter para approval

```bash
curl -X POST http://localhost:8001/personal/files/delete/${OPERATION_ID}/submit \
    -H "Content-Type: application/json" \
    -H "X-Institution-Id: ${SANDBOX_INSTITUTION_ID}" \
    -H "X-Actor-Token: ${USER_TOKEN}"
```

**Resposta esperada (202):**
```json
{
    "status": "PENDING_APPROVAL",
    "approval_id": "apr-xxxx"
}
```

### 5. Decidir approval (com outro ator)

```bash
# Guardian ou outro User (SoD: nao pode ser o mesmo que propos)
curl -X POST http://localhost:8001/approvals/${APPROVAL_ID}/decide \
    -H "Content-Type: application/json" \
    -H "X-Institution-Id: ${SANDBOX_INSTITUTION_ID}" \
    -H "X-Actor-Token: ${GUARDIAN_TOKEN}" \
    -d '{"decision": "approve", "reason": "Confirmado arquivo duplicado"}'
```

### 6. Verificar no observe/timeline

```bash
curl http://localhost:8001/observe/${SANDBOX_INSTITUTION_ID}/timeline \
    -H "X-Admin-Token: ${ENGINE_ISE_ADMIN_TOKEN}"
```

## Arquitetura

```
User propoe delete
       |
       v
[FileOperation: Proposed]
       |
       v (submit)
[FileOperation: PendingApproval] <-- Approval required
       |
       v (Guardian/User decide)
[Approved]  ou  [Rejected]
       |
       v (Agent executa)
[Executed]  ou  [Failed]
```

## Invariantes

- `OperationMustHaveSource`: Toda operacao deve ter caminho de origem
- `DeleteMustHaveReason`: Delete deve ter justificativa
- `RenameMustHaveTarget`: Rename deve ter novo nome
- `MoveMustHaveTarget`: Move deve ter destino

## Separation of Duties

- `ProposerCannotSelfApprove`: Quem propoe nao pode aprovar a propria operacao
