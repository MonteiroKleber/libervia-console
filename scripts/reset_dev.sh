#!/bin/bash
# ==============================================================================
# reset_dev.sh
# Reset completo do ambiente de desenvolvimento Libervia
#
# QUANDO USAR:
# - Apos alteracoes no IDL/bundle
# - Quando o estado ficou inconsistente
# - Apos alteracoes em roles/actors/tokens
# - Para comecar do zero com estado limpo
#
# O QUE FAZ:
# - Para todos os containers
# - Remove volumes (banco, ledger, etc)
# - Sobe stack novamente com build
#
# O QUE NAO FAZ:
# - NAO limpa cookies do navegador (faca manualmente)
# - NAO altera .env.dev (voce precisa atualizar RUNTIME_* apos onboarding)
# ==============================================================================
set -euo pipefail

SCRIPT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
CONSOLE_ROOT="$(cd "$SCRIPT_DIR/.." && pwd)"
ENV_FILE="$CONSOLE_ROOT/.env.dev"
COMPOSE_FILE="$CONSOLE_ROOT/docker-compose.dev.yml"

# Colors
RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
BLUE='\033[0;34m'
NC='\033[0m'

log_info() { echo -e "${BLUE}[INFO]${NC} $1"; }
log_warn() { echo -e "${YELLOW}[WARN]${NC} $1"; }
log_pass() { echo -e "${GREEN}[OK]${NC} $1"; }

# ==============================================================================
# Confirmation
# ==============================================================================

echo ""
echo "========================================"
echo "RESET DEV - Libervia Stack"
echo "========================================"
echo ""
log_warn "Este comando vai:"
echo "  - Parar todos os containers"
echo "  - REMOVER todos os volumes (banco, ledger, estado)"
echo "  - Rebuild e subir a stack novamente"
echo ""
log_warn "Voce perdera:"
echo "  - Todas as institutions no banco"
echo "  - Todos os tokens e secrets"
echo "  - Todo o historico de auditoria"
echo ""

read -p "Continuar? (y/N): " -n 1 -r
echo ""
if [[ ! $REPLY =~ ^[Yy]$ ]]; then
    echo "Cancelado."
    exit 0
fi

# ==============================================================================
# Step 1: Stop containers
# ==============================================================================

log_info "Step 1: Parando containers..."
cd "$CONSOLE_ROOT"

if docker compose -f "$COMPOSE_FILE" down 2>/dev/null; then
    log_pass "Containers parados"
else
    log_warn "Nenhum container rodando (ok)"
fi

# ==============================================================================
# Step 2: Remove volumes
# ==============================================================================

log_info "Step 2: Removendo volumes..."

if docker compose -f "$COMPOSE_FILE" down -v 2>/dev/null; then
    log_pass "Volumes removidos"
else
    log_warn "Volumes ja removidos ou inexistentes (ok)"
fi

# ==============================================================================
# Step 3: Clean Next.js cache (optional but recommended)
# ==============================================================================

log_info "Step 3: Limpando cache do Next.js..."

if [[ -d "$CONSOLE_ROOT/.next" ]]; then
    rm -rf "$CONSOLE_ROOT/.next"
    log_pass "Cache .next removido"
else
    log_info "  Cache .next nao existe (ok)"
fi

# ==============================================================================
# Step 4: Rebuild and start
# ==============================================================================

log_info "Step 4: Rebuilding e subindo stack..."

if docker compose --env-file "$ENV_FILE" -f "$COMPOSE_FILE" up -d --build; then
    log_pass "Stack subiu com sucesso"
else
    echo ""
    log_warn "Falha ao subir stack. Verifique os logs:"
    echo "  docker compose -f docker-compose.dev.yml logs"
    exit 1
fi

# Aguardar health
log_info "  Aguardando containers ficarem healthy..."
sleep 10

# ==============================================================================
# Summary
# ==============================================================================

echo ""
echo "========================================"
echo "RESET COMPLETO"
echo "========================================"
echo ""
log_pass "Stack resetada e rodando!"
echo ""
log_info "Proximos passos:"
echo ""
echo "  1. LIMPE OS COOKIES DO NAVEGADOR"
echo "     (DevTools > Application > Cookies > Clear)"
echo ""
echo "  2. Acesse http://localhost:3002/onboarding"
echo "     Complete o onboarding para criar nova institution"
echo ""
echo "  3. (Opcional) Runtime single-tenant (debug):"
echo "     Se voce estiver usando o executor padrao (runtime-manager), NAO precisa configurar nada."
echo ""
echo "     Para usar runtime single-tenant (debug), atualize .env.dev com:"
echo "       - RUNTIME_INSTITUTION_ID (do onboarding)"
echo "       - RUNTIME_AGENT_TOKEN (mostrado apenas uma vez!)"
echo ""
echo "  4. (Opcional) Reinicie o runtime single-tenant:"
echo "     docker compose -f docker-compose.dev.yml --profile single-tenant restart runtime"
echo ""
echo "  4b. (Recomendado) Verifique o runtime-manager:"
echo "     docker compose -f docker-compose.dev.yml logs -f runtime-manager"
echo ""
echo "  5. Valide com smoke test:"
echo "     ./scripts/smoke_dev.sh"
echo ""
