# E2E Test: UI + Runtime Integration

Este documento descreve como executar o teste E2E completo que prova o fluxo:
**chat → approval → runtime executa → audit mostra evidência**

## Pré-requisitos

1. **Stack rodando:**
   ```bash
   cd /home/bazari/libervia-console
   docker compose -f docker-compose.dev.yml up -d
   ```

2. **Dependências:**
   - `jq` instalado: `sudo apt install jq`
   - Python 3.x (para o Agent Runtime)

## Teste Automatizado (Parcial)

Execute o script que valida a integração da UI:

```bash
./scripts/e2e_ui_runtime.sh
```

Este script:
- Verifica que o stack está saudável
- Testa os endpoints da UI com cookies (sem header manual)
- Cria arquivo de teste para delete
- Mostra instruções para os passos manuais

## Passos Manuais

### 1. Verificar Institution

A instituição é criada automaticamente no primeiro acesso ao onboarding.
Verifique os IDs:

```bash
# Console API DB
docker exec libervia-console-postgres-1 psql -U libervia -d libervia \
  -c "SELECT id, engine_institution_id, display_name FROM institutions;"
```

### 2. Configurar Agent Runtime

```bash
cd /home/bazari/libervia-agent-runtime

# Instalar dependências
pip install -e .

# Configurar (substitua os valores)
libervia-agent configure \
  --api-url http://localhost:8001 \
  --token "<AGENT_TOKEN>" \
  --institution-id "<ENGINE_INSTITUTION_ID>" \
  --root-dir /tmp/e2e_test_files \
  --poll-interval 5
```

**Nota:** O `AGENT_TOKEN` é gerado durante o onboarding bem-sucedido.
Se o onboarding falhou, será necessário criar o token manualmente via Engine API.

### 3. Criar Arquivo de Teste

```bash
mkdir -p /tmp/e2e_test_files
echo "Test file for E2E" > /tmp/e2e_test_files/test.txt
```

### 4. Solicitar Delete via Chat (UI)

1. Acesse http://localhost:3002/chat
2. Envie a mensagem: `delete file test.txt`
3. O sistema deve retornar que a operação requer aprovação

### 5. Aprovar na UI

1. Acesse http://localhost:3002/approvals
2. Encontre a aprovação pendente
3. Clique em "Aprovar" e confirme

### 6. Executar Runtime

```bash
cd /home/bazari/libervia-agent-runtime

# Iniciar o runtime
libervia-agent run
```

O runtime irá:
- Buscar jobs pendentes do outbox
- Executar a operação de delete
- Reportar o resultado ao Engine

### 7. Verificar Auditoria

1. Acesse http://localhost:3002/audit
2. Procure por evento `RUNTIME_JOB_REPORTED`
3. Verifique que contém o `job_id` do caso aprovado

## Troubleshooting

### "No actor token found for role"

O Console API não tem um actor token para chamar o Engine.
Isso significa que o onboarding não completou com sucesso.

**Solução:** Verificar logs do Console API e Engine para entender a falha.

### "Not a member of this institution" (403)

Os cookies de institution não estão sendo enviados corretamente.

**Solução:**
1. Limpar cookies do browser
2. Refazer o onboarding em /onboarding
3. Verificar que os cookies foram setados

### Runtime não encontra jobs

O outbox pode estar vazio ou no caminho errado.

**Solução:**
```bash
# Verificar outbox
ls -la /var/engine/institutions/<institution_id>/legacy_bridge/outbox/
```

## Evidências Esperadas

Ao completar o E2E com sucesso:

1. **Chat:** Retorna proposta com `requires_approval: true`
2. **Approvals:** Lista a aprovação pendente
3. **Approval decide:** Atualiza status para `approved`
4. **Runtime:** Executa job e reporta
5. **Audit:** Mostra evento `RUNTIME_JOB_REPORTED` com status

## Verificação Final (DoD)

```bash
# Testar sem header manual
COOKIES="libervia_institution_id=<ID>; libervia_engine_institution_id=<ENGINE_ID>"

# Dashboard
curl -s -b "$COOKIES" http://localhost:3002/api/dashboard | jq '.agent'

# Approvals
curl -s -b "$COOKIES" http://localhost:3002/api/approvals | jq '.approvals'

# Audit
curl -s -b "$COOKIES" http://localhost:3002/api/audit/events | jq '.events[] | select(.event_type == "RUNTIME_JOB_REPORTED")'
```
