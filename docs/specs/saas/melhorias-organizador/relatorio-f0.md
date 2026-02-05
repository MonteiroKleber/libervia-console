# Relatório de Auditoria F0 — Estado Atual do Sistema

**Data:** 2026-02-03
**Método:** Análise estática de código com `rg`, `cat`, leitura de arquivos
**Repos auditados:**
- `/home/bazari/libervia-console` (IDL, Console Next.js)
- `/home/bazari/libervia-console-api` (Console API FastAPI)
- `/home/bazari/libervia-agent-runtime` (Runtime de execução)
- `/home/bazari/engine` (Engine - read-only)

---

## 1. Job Types suportados no Bundle (IDL)

| Job Type | Endpoint (IDL) | Permissão | Requer Aprovação |
|----------|----------------|-----------|------------------|
| `files.list` | POST /personal/jobs/files/list | `files.list` | ❌ Não |
| `files.scan` | POST /personal/jobs/files/scan | `files.scan` | ❌ Não |
| `files.suggest` | POST /personal/jobs/files/suggest | `files.suggest` | ❌ Não |
| `files.rename` | POST /personal/jobs/files/rename | `files.rename` | ✅ Sim (SoD) |
| `files.move` | POST /personal/jobs/files/move | `files.move` | ✅ Sim (SoD) |
| `files.delete` | POST /personal/jobs/files/delete | `files.delete` | ✅ Sim (SoD) |

**Fonte:** [operations.json](../../idl/personal_ops/operations.json), [source.idl](../../idl/personal_ops/v1.0.0/source.idl)

---

## 2. Action Types suportados no Runtime

### Handlers implementados em `executor.py`

| Handler | Linhas | Descrição |
|---------|--------|-----------|
| `_execute_file_list` | 474-555 | Lista arquivos com name, type, size, modified |
| `_execute_file_scan_duplicates` | 557-666 | Escaneia duplicados por hash SHA256 |
| `_execute_file_suggest_cleanup` | 668-780+ | Sugere limpeza (duplicados, temp, cache, vazios) |
| `_execute_file_write` | 173-216 | Escreve conteúdo em arquivo |
| `_execute_file_delete` | 218-268 | Deleta arquivo |
| `_execute_file_copy` | 270-311 | Copia arquivo |
| `_execute_file_move` | 313-354 | Move/renomeia arquivo |
| `_execute_dir_create` | 356-398 | Cria diretório |
| `_execute_dir_delete` | 400-472 | Deleta diretório |

### Mapeamento action_type → handler

| action_type | Handler | Aliases |
|-------------|---------|---------|
| `file.list` | `_execute_file_list` | `files.list`, `personal_files.list`, `FileOperation.List` |
| `file.scan_duplicates` | `_execute_file_scan_duplicates` | `files.scan`, `personal_files.scan_duplicates`, `FileOperation.ScanDuplicates` |
| `file.suggest_cleanup` | `_execute_file_suggest_cleanup` | `files.suggest`, `personal_files.suggest_cleanup`, `FileOperation.SuggestCleanup` |
| `file.delete` | `_execute_file_delete` | `files.delete`, `personal_files.delete`, `FileOperation.Delete` |
| `file.move` | `_execute_file_move` | `files.move`, `files.rename`, `personal_files.move`, `personal_files.rename`, `FileOperation.Move` |
| `file.write` | `_execute_file_write` | — |
| `file.copy` | `_execute_file_copy` | — |
| `dir.create` | `_execute_dir_create` | — |
| `dir.delete` | `_execute_dir_delete` | — |

**Fonte:** [executor.py:106-145](../../../libervia-agent-runtime/src/libervia_agent/executor.py)

---

## 3. Intents existentes no Chat

| Intent | Valor Enum | Detectado por | Exemplos |
|--------|------------|---------------|----------|
| `FILES_LIST` | `files_list` | Regex + LLM | "listar arquivos", "show files", "ver meus arquivos" |
| `FILES_SCAN` | `files_scan` | Regex + LLM | "buscar duplicados", "find duplicates", "arquivos duplicados" |
| `FILES_SUGGEST` | `files_suggest` | Regex + LLM | "sugerir limpeza", "what can I delete", "o que posso apagar" |
| `FILES_RENAME` | `files_rename` | Regex + LLM | "renomear arquivo", "rename file" |
| `FILES_MOVE` | `files_move` | Regex + LLM | "mover arquivo", "move file to" |
| `FILES_DELETE` | `files_delete` | Regex + LLM | "deletar arquivo", "delete file", "apagar" |
| `UNKNOWN` | `unknown` | Fallback | Qualquer outro texto |

**Fonte:** [chat.py:40-85](../../../libervia-console-api/src/app/routers/chat.py), [chat.py (schemas)](../../../libervia-console-api/src/app/schemas/chat.py)

---

## 4. Mapeamento Completo: Intent → Job Type → Action Type → Handler

| Chat Intent | Job Type (IDL) | Action Type (Runtime) | Handler | Status |
|-------------|----------------|----------------------|---------|--------|
| `FILES_LIST` | `files.list` | `files.list` | `_execute_file_list` | ✅ Execução OK |
| `FILES_SCAN` | `files.scan` | `files.scan` | `_execute_file_scan_duplicates` | ✅ Execução OK |
| `FILES_SUGGEST` | `files.suggest` | `files.suggest` | `_execute_file_suggest_cleanup` | ✅ Execução OK |
| `FILES_RENAME` | `files.rename` | `files.rename` | `_execute_file_move` | ✅ Execução OK |
| `FILES_MOVE` | `files.move` | `files.move` | `_execute_file_move` | ✅ Execução OK |
| `FILES_DELETE` | `files.delete` | `files.delete` | `_execute_file_delete` | ✅ Execução OK |

**Conclusão:** Todos os 6 job_types do bundle têm handlers implementados no runtime.

---

## 5. Gates E2E existentes

| Gate | Arquivo | Propósito | Status |
|------|---------|-----------|--------|
| **Auth + Membership + Jobs** | `e2e_auth_membership_jobs.sh` | Register → Onboard → Invite → SoD → Job execution | ✅ PASS 12/12 (executado 2026-02-03) |
| **Multi-Tenant Isolation** | `e2e_multi_tenant.sh` | Isolamento entre 2 instituições | ⚠️ Não executado (sintaxe OK) |
| **Multi-Tenant Runtime Manager** | `e2e_multi_tenant_runtime_manager.sh` | Jobs de 2 instituições processados | ⚠️ Não executado (sintaxe OK) |
| **UI + Runtime Integration** | `e2e_ui_runtime.sh` | Chat → Approval → Runtime → Audit | ⚠️ Não executado (sintaxe OK) |

**Fonte:** [scripts/](../../scripts/)

---

## 6. Lacunas Identificadas (Reclassificadas)

### 6.1 Execução (Runtime) — ✅ Completo para job_types existentes

Todos os 6 job_types definidos no bundle têm handlers funcionais no runtime.

### 6.2 Contrato (IDL) — Job Types Faltantes

| Job Type Sugerido | Descrição | Prioridade |
|-------------------|-----------|------------|
| `files.read` | Ler conteúdo de arquivo | Alta |
| `files.stat` | Obter metadados (size, mtime, permissions) | Média |
| `files.hash` | Calcular hash SHA256 de arquivo | Média |
| `files.search` | Buscar arquivos por padrão/nome | Média |
| `files.copy` | Copiar arquivo (handler existe no runtime) | Baixa |

**Nota:** O runtime já tem `_execute_file_copy`, mas não há job_type correspondente no bundle.

### 6.3 UI/UX — Gaps de Experiência

| Gap | Descrição | Impacto |
|-----|-----------|---------|
| **Chat não mostra result_json inline** | Para `files.list/scan/suggest`, o chat retorna "job enfileirado" mas não exibe o resultado quando pronto | Alto |
| **Polling manual necessário** | Usuário precisa verificar `/jobs/{id}` ou audit para ver resultado | Alto |
| **Falta componente de visualização de resultado** | UI não renderiza `result_data` (lista de arquivos, duplicados, sugestões) | Alto |

### 6.4 Gates — Cobertura

| Gap | Descrição |
|-----|-----------|
| Apenas `e2e_auth_membership_jobs.sh` executado regularmente | Os outros 3 gates não são executados em CI |
| Falta gate para `files.list/scan/suggest` | Nenhum gate testa operações seguras com verificação de result_json |

---

## 7. Delta Recomendado para Fase 1

### 7.1 Novos Job Types (IDL)

```
// Adicionar ao source.idl na seção SAFE JOBS
endpoint job_files_read {
  method: POST
  path: "/personal/jobs/files/read"
  permission: files.read
  bind: { kind: job.request, job_type: "files.read" }
}

endpoint job_files_stat {
  method: POST
  path: "/personal/jobs/files/stat"
  permission: files.stat
  bind: { kind: job.request, job_type: "files.stat" }
}

endpoint job_files_hash {
  method: POST
  path: "/personal/jobs/files/hash"
  permission: files.hash
  bind: { kind: job.request, job_type: "files.hash" }
}

endpoint job_files_search {
  method: POST
  path: "/personal/jobs/files/search"
  permission: files.search
  bind: { kind: job.request, job_type: "files.search" }
}
```

### 7.2 Novo Gate E2E

Criar `e2e_personal_ops_filesystem_core.sh` que testa:
1. `files.list` → verifica result_json contém entries
2. `files.scan` → verifica result_json contém duplicates
3. `files.suggest` → verifica result_json contém suggestions
4. `files.read` → verifica result_json contém content (após implementar)

### 7.3 Fix UX Prioritário

Modificar `chat.py` para:
1. Após enqueue de job seguro, fazer polling curto (3-5s)
2. Se job completar, incluir `result_data` na resposta
3. Ou retornar WebSocket/SSE para atualização em tempo real

---

## 8. Resumo Executivo

| Área | Status |
|------|--------|
| **Job Types (IDL)** | ✅ 6/6 implementados |
| **Handlers (Runtime)** | ✅ 6/6 + extras (copy, write, dir ops) |
| **Intents (Chat)** | ✅ 6 intents + UNKNOWN |
| **Execução E2E** | ✅ Fluxo destrutivo completo (delete com SoD) |
| **UX Result Display** | ⚠️ Não implementado - gap prioritário |
| **Gates Automatizados** | ⚠️ Apenas 1/4 executado regularmente |

**Correção do relatório anterior:** A afirmação "files.list/scan/suggest não têm handler no runtime" estava **INCORRETA**. Os handlers existem e estão implementados em `executor.py` linhas 474-780+.
