#!/bin/bash
# ==============================================================================
# smoke_dev.sh
# Smoke test para validar stack de desenvolvimento Libervia
#
# Uso:
#   ./scripts/smoke_dev.sh           # Apenas validar (assume stack rodando)
#   ./scripts/smoke_dev.sh --up      # Subir stack antes de validar
#   ./scripts/smoke_dev.sh --build   # Subir stack com rebuild
#   ./scripts/smoke_dev.sh --help    # Mostrar ajuda
# ==============================================================================
set -euo pipefail

SCRIPT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
CONSOLE_ROOT="$(cd "$SCRIPT_DIR/.." && pwd)"
ENGINE_ROOT="${ENGINE_ROOT:-/home/bazari/engine}"
ENV_FILE="$CONSOLE_ROOT/.env.dev"
COMPOSE_FILE="$CONSOLE_ROOT/docker-compose.dev.yml"

# Colors
RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
BLUE='\033[0;34m'
NC='\033[0m' # No Color

# Counters
PASS_COUNT=0
FAIL_COUNT=0
WARN_COUNT=0

# ==============================================================================
# Helpers
# ==============================================================================

log_info() { echo -e "${BLUE}[INFO]${NC} $1"; }
log_pass() { echo -e "${GREEN}[PASS]${NC} $1"; PASS_COUNT=$((PASS_COUNT + 1)); }
log_fail() { echo -e "${RED}[FAIL]${NC} $1"; FAIL_COUNT=$((FAIL_COUNT + 1)); }
log_warn() { echo -e "${YELLOW}[WARN]${NC} $1"; WARN_COUNT=$((WARN_COUNT + 1)); }

show_help() {
    cat << EOF
Smoke test para stack de desenvolvimento Libervia.

Uso:
  $0 [opcoes]

Opcoes:
  --up       Subir stack antes de validar (sem rebuild)
  --build    Subir stack com rebuild completo
  --help     Mostrar esta ajuda

Exemplos:
  $0                # Apenas validar stack existente
  $0 --up           # Subir stack e validar
  $0 --build        # Rebuild e validar

Requisitos:
  - docker, docker compose
  - jq
  - curl
  - .env.dev configurado

Saida:
  Exit code 0 se todos os checks passarem
  Exit code 1 se algum check falhar
EOF
    exit 0
}

# ==============================================================================
# Parse args
# ==============================================================================

DO_UP=false
DO_BUILD=false

while [[ $# -gt 0 ]]; do
    case $1 in
        --up)
            DO_UP=true
            shift
            ;;
        --build)
            DO_UP=true
            DO_BUILD=true
            shift
            ;;
        --help|-h)
            show_help
            ;;
        *)
            echo "Opcao desconhecida: $1"
            echo "Use --help para ver opcoes."
            exit 1
            ;;
    esac
done

# ==============================================================================
# Step 1: Verificar dependencias
# ==============================================================================

echo ""
echo "========================================"
echo "SMOKE TEST - Libervia Dev Stack"
echo "========================================"
echo ""

log_info "Step 1: Verificando dependencias..."

# Docker
if command -v docker &> /dev/null; then
    DOCKER_VERSION=$(docker --version | head -1)
    log_pass "Docker instalado: $DOCKER_VERSION"
else
    log_fail "Docker nao encontrado. Instale: https://docs.docker.com/get-docker/"
fi

# Docker Compose
if docker compose version &> /dev/null; then
    COMPOSE_VERSION=$(docker compose version | head -1)
    log_pass "Docker Compose instalado: $COMPOSE_VERSION"
else
    log_fail "Docker Compose nao encontrado. Instale: https://docs.docker.com/compose/install/"
fi

# jq
if command -v jq &> /dev/null; then
    JQ_VERSION=$(jq --version)
    log_pass "jq instalado: $JQ_VERSION"
else
    log_fail "jq nao encontrado. Instale: sudo apt install jq"
fi

# curl
if command -v curl &> /dev/null; then
    log_pass "curl instalado"
else
    log_fail "curl nao encontrado. Instale: sudo apt install curl"
fi

# Abort if deps missing
if [[ $FAIL_COUNT -gt 0 ]]; then
    echo ""
    log_fail "Dependencias faltando. Corrija e tente novamente."
    exit 1
fi

# ==============================================================================
# Step 2: Verificar arquivos de configuracao
# ==============================================================================

log_info "Step 2: Verificando configuracao..."

# .env.dev
if [[ -f "$ENV_FILE" ]]; then
    log_pass ".env.dev existe"
else
    log_fail ".env.dev nao encontrado em $CONSOLE_ROOT"
    log_info "Copie de .env.dev.example ou crie manualmente."
    exit 1
fi

# docker-compose.dev.yml
if [[ -f "$COMPOSE_FILE" ]]; then
    log_pass "docker-compose.dev.yml existe"
else
    log_fail "docker-compose.dev.yml nao encontrado"
    exit 1
fi

# Carregar variaveis do .env.dev
set -a
source "$ENV_FILE"
set +a

# RUNTIME_INSTITUTION_ID
if [[ -n "${RUNTIME_INSTITUTION_ID:-}" ]]; then
    log_pass "RUNTIME_INSTITUTION_ID configurado: ${RUNTIME_INSTITUTION_ID:0:8}..."
else
    log_fail "RUNTIME_INSTITUTION_ID nao configurado em .env.dev"
    log_info "Defina apos completar o onboarding."
fi

# RUNTIME_AGENT_TOKEN
if [[ -n "${RUNTIME_AGENT_TOKEN:-}" ]]; then
    log_pass "RUNTIME_AGENT_TOKEN configurado: ${RUNTIME_AGENT_TOKEN:0:8}..."
else
    log_warn "RUNTIME_AGENT_TOKEN nao configurado (necessario para runtime)"
fi

# ==============================================================================
# Step 3: Subir stack (se solicitado)
# ==============================================================================

if [[ "$DO_UP" == "true" ]]; then
    log_info "Step 3: Subindo stack..."

    cd "$CONSOLE_ROOT"

    if [[ "$DO_BUILD" == "true" ]]; then
        log_info "  Executando: docker compose up -d --build"
        if docker compose --env-file "$ENV_FILE" -f "$COMPOSE_FILE" up -d --build; then
            log_pass "Stack subiu com rebuild"
        else
            log_fail "Falha ao subir stack"
            exit 1
        fi
    else
        log_info "  Executando: docker compose up -d"
        if docker compose --env-file "$ENV_FILE" -f "$COMPOSE_FILE" up -d; then
            log_pass "Stack subiu"
        else
            log_fail "Falha ao subir stack"
            exit 1
        fi
    fi

    # Aguardar health
    log_info "  Aguardando containers ficarem healthy (max 60s)..."
    sleep 5
else
    log_info "Step 3: Pulando (stack deve estar rodando)"
fi

# ==============================================================================
# Step 4: Health checks
# ==============================================================================

log_info "Step 4: Verificando health endpoints..."

# Engine
ENGINE_HEALTH=$(curl -sf http://localhost:8001/health 2>/dev/null || echo "FAIL")
if [[ "$ENGINE_HEALTH" != "FAIL" ]] && echo "$ENGINE_HEALTH" | jq -e '.status == "ok"' > /dev/null 2>&1; then
    log_pass "Engine (8001) healthy"
else
    log_fail "Engine (8001) nao responde ou unhealthy"
    log_info "  Verificar: docker compose -f docker-compose.dev.yml logs engine"
fi

# Console API (returns "status": "healthy" not "ok")
API_HEALTH=$(curl -sf http://localhost:3001/health 2>/dev/null || echo "FAIL")
if [[ "$API_HEALTH" != "FAIL" ]] && echo "$API_HEALTH" | jq -e '.status == "healthy" or .status == "ok"' > /dev/null 2>&1; then
    log_pass "Console API (3001) healthy"
else
    log_fail "Console API (3001) nao responde ou unhealthy"
    log_info "  Verificar: docker compose -f docker-compose.dev.yml logs console-api"
fi

# Console UI
UI_STATUS=$(curl -sf -o /dev/null -w "%{http_code}" http://localhost:3002 2>/dev/null || echo "000")
if [[ "$UI_STATUS" == "200" ]]; then
    log_pass "Console UI (3002) respondendo"
else
    log_fail "Console UI (3002) nao responde (status: $UI_STATUS)"
    log_info "  Verificar: docker compose -f docker-compose.dev.yml logs console"
fi

# Abort if health checks fail
if [[ $FAIL_COUNT -gt 0 ]]; then
    echo ""
    log_fail "Health checks falharam. Stack pode nao estar rodando."
    log_info "Tente: docker compose -f docker-compose.dev.yml up -d"
    exit 1
fi

# ==============================================================================
# Step 5: Verificar runtime institution
# ==============================================================================

log_info "Step 5: Verificando configuracao do runtime..."

if [[ -n "${RUNTIME_INSTITUTION_ID:-}" ]]; then
    INST_PATH="$ENGINE_ROOT/var/institutions/$RUNTIME_INSTITUTION_ID"

    if [[ -d "$INST_PATH" ]]; then
        log_pass "Diretorio da institution existe: $INST_PATH"

        # Verificar legacy_bridge
        BRIDGE_PATH="$INST_PATH/legacy_bridge"
        if [[ -d "$BRIDGE_PATH" ]]; then
            log_pass "legacy_bridge existe"

            # Verificar outbox
            OUTBOX_PATH="$BRIDGE_PATH/outbox"
            if [[ -d "$OUTBOX_PATH" ]]; then
                log_pass "outbox existe"
            else
                log_warn "outbox nao existe (sera criado quando houver jobs)"
            fi
        else
            log_warn "legacy_bridge nao existe em $BRIDGE_PATH"
            log_info "  O Engine deve criar esta pasta ao processar o primeiro job."
        fi
    else
        log_fail "Diretorio da institution NAO existe: $INST_PATH"
        log_info ""
        log_info "  MISMATCH DETECTADO!"
        log_info "  O RUNTIME_INSTITUTION_ID no .env.dev ($RUNTIME_INSTITUTION_ID)"
        log_info "  nao corresponde a nenhuma institution existente no Engine."
        log_info ""
        log_info "  Institutions existentes:"
        ls -1 "$ENGINE_ROOT/var/institutions/" 2>/dev/null | head -5 || echo "    (nenhuma)"
        log_info ""
        log_info "  SOLUCAO:"
        log_info "  1. Complete o onboarding em http://localhost:3002/onboarding"
        log_info "  2. Atualize RUNTIME_INSTITUTION_ID no .env.dev"
        log_info "  SOLUCAO (recomendado): use runtime-manager (multi-tenant)."
        log_info "    - Nao precisa configurar RUNTIME_* manualmente."
        log_info "  Se estiver usando runtime single-tenant (debug):"
        log_info "    1. Atualize RUNTIME_INSTITUTION_ID e RUNTIME_AGENT_TOKEN no .env.dev"
        log_info "    2. Execute: docker compose -f docker-compose.dev.yml --profile single-tenant restart runtime"
    fi
else
    log_warn "RUNTIME_INSTITUTION_ID nao configurado - OK no modo runtime-manager (padrao)."
log_info "  Se quiser usar runtime single-tenant (debug), habilite o profile e configure RUNTIME_* no .env.dev."
fi

# ==============================================================================
# Step 6: Verificar runtime-manager container (executor padrao multi-tenant)
# ==============================================================================

log_info "Step 6: Verificando runtime-manager container..."

# runtime-manager e o executor padrao (multi-tenant)
# runtime (single-tenant) so roda com --profile single-tenant
MANAGER_STATUS=$(docker compose -f "$COMPOSE_FILE" ps runtime-manager --format "{{.Status}}" 2>/dev/null || echo "not found")

if [[ "$MANAGER_STATUS" == *"Up"* ]] || [[ "$MANAGER_STATUS" == *"running"* ]]; then
    log_pass "Runtime-manager container esta rodando"

    # Verificar logs recentes para erros
    MANAGER_LOGS=$(docker compose -f "$COMPOSE_FILE" logs --tail=20 runtime-manager 2>/dev/null || echo "")

    if echo "$MANAGER_LOGS" | grep -vi "Found 0 tenant" | grep -qi "error\|exception\|failed"; then
        log_warn "Runtime-manager logs contem erros recentes"
        log_info "  Verificar: docker compose -f docker-compose.dev.yml logs runtime-manager"
    else
        log_pass "Runtime-manager logs sem erros criticos"
    fi

    # Verificar se esta descobrindo tenants
    if echo "$MANAGER_LOGS" | grep -qi "tenant\|polling\|processing"; then
        log_pass "Runtime-manager parece estar em loop de polling"
    else
        log_warn "Nao foi possivel confirmar loop de polling"
    fi
else
    log_fail "Runtime-manager container nao esta rodando (status: $MANAGER_STATUS)"
    log_info "  Verificar: docker compose -f docker-compose.dev.yml logs runtime-manager"
fi

# ==============================================================================
# Step 7: Smoke API test
# ==============================================================================

log_info "Step 7: Smoke test de API..."

# Tentar pegar approvals (vai falhar sem cookies, mas testa conectividade)
APPROVALS_RESP=$(curl -sf -w "\n%{http_code}" "http://localhost:3001/approvals?institution_id=test" 2>/dev/null || echo -e "\n000")
APPROVALS_CODE=$(echo "$APPROVALS_RESP" | tail -1)

if [[ "$APPROVALS_CODE" == "400" ]] || [[ "$APPROVALS_CODE" == "403" ]] || [[ "$APPROVALS_CODE" == "200" ]]; then
    log_pass "Console API /approvals endpoint responde ($APPROVALS_CODE)"
else
    log_warn "Console API /approvals retornou codigo inesperado: $APPROVALS_CODE"
fi

# Verificar se Engine tem bundles carregados
BUNDLES_RESP=$(curl -sf http://localhost:8001/bundles 2>/dev/null || echo "FAIL")
if [[ "$BUNDLES_RESP" != "FAIL" ]]; then
    BUNDLE_COUNT=$(echo "$BUNDLES_RESP" | jq 'length' 2>/dev/null || echo "0")
    if [[ "$BUNDLE_COUNT" -gt 0 ]]; then
        log_pass "Engine tem $BUNDLE_COUNT bundle(s) carregado(s)"
    else
        log_warn "Engine nao tem bundles carregados (necessario onboarding)"
    fi
else
    log_warn "Nao foi possivel verificar bundles no Engine"
fi

# ==============================================================================
# Summary
# ==============================================================================

echo ""
echo "========================================"
echo "RESULTADO"
echo "========================================"
echo -e "${GREEN}PASS: $PASS_COUNT${NC}"
echo -e "${YELLOW}WARN: $WARN_COUNT${NC}"
echo -e "${RED}FAIL: $FAIL_COUNT${NC}"
echo "========================================"

if [[ $FAIL_COUNT -gt 0 ]]; then
    echo ""
    log_fail "Smoke test FALHOU com $FAIL_COUNT erro(s)"
    echo ""
    log_info "Consulte o runbook para troubleshooting:"
    log_info "  docs/RUNBOOK_DEV.md"
    exit 1
fi

if [[ $WARN_COUNT -gt 0 ]]; then
    echo ""
    log_warn "Smoke test passou com $WARN_COUNT aviso(s)"
    echo ""
    log_info "Alguns items podem precisar de atencao."
    log_info "Consulte: docs/RUNBOOK_DEV.md"
    exit 0
fi

echo ""
log_pass "Smoke test PASSOU!"
echo ""
log_info "Stack pronta para desenvolvimento."
log_info "Acesse: http://localhost:3002"
exit 0
