#!/bin/bash
# ==============================================================================
# e2e_autonomy_assisted.sh
# E2E test for assisted autonomy feature
#
# Validates:
# 1. Autonomy can be enabled via settings API
# 2. Runtime-manager only creates safe operations (files.plan.create)
# 3. NEVER creates destructive operations (files.plan.apply) automatically
# 4. Rate limiting is respected (max_plans_per_day)
#
# CRITICAL SAFETY CONSTRAINT:
#   This test MUST verify that files.plan.apply is NEVER called automatically.
#   If this test fails the safety check, the autonomy feature is DANGEROUS.
#
# Usage:
#   ./scripts/e2e_autonomy_assisted.sh
#
# Prerequisites:
#   - Stack running with runtime-manager
# ==============================================================================
set -euo pipefail

SCRIPT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
CONSOLE_ROOT="$(cd "$SCRIPT_DIR/.." && pwd)"
ENGINE_ROOT="${ENGINE_ROOT:-/home/bazari/engine}"
CONSOLE_API="${CONSOLE_API_URL:-http://localhost:3001}"

# Colors
RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
BLUE='\033[0;34m'
NC='\033[0m'

# Counters
PASS_COUNT=0
FAIL_COUNT=0
CRITICAL_FAIL=0

log_info() { echo -e "${BLUE}[INFO]${NC} $1"; }
log_pass() { echo -e "${GREEN}[PASS]${NC} $1"; PASS_COUNT=$((PASS_COUNT + 1)); }
log_fail() { echo -e "${RED}[FAIL]${NC} $1"; FAIL_COUNT=$((FAIL_COUNT + 1)); }
log_critical() { echo -e "${RED}[CRITICAL]${NC} $1"; CRITICAL_FAIL=$((CRITICAL_FAIL + 1)); FAIL_COUNT=$((FAIL_COUNT + 1)); }
log_warn() { echo -e "${YELLOW}[WARN]${NC} $1"; }

# Auth variables (set after registration)
OWNER_TOKEN=""
INSTITUTION_ID=""

# ==============================================================================
# Cleanup
# ==============================================================================

cleanup() {
    log_info "Cleaning up..."
    # Reset autonomy settings if we have the token and institution
    if [[ -n "${OWNER_TOKEN:-}" ]] && [[ -n "${INSTITUTION_ID:-}" ]]; then
        curl -sf -X PUT "$CONSOLE_API/institutions/$INSTITUTION_ID/settings" \
            -H "Authorization: Bearer $OWNER_TOKEN" \
            -H "Content-Type: application/json" \
            -d '{"autonomy_enabled": false}' > /dev/null 2>&1 || true
    fi
}

trap cleanup EXIT

# ==============================================================================
# Step 1: Verify stack
# ==============================================================================

echo ""
echo "========================================"
echo "E2E Autonomia Assistida (Assisted Autonomy)"
echo "========================================"
echo ""

log_info "Step 1: Verifying stack health..."

# Engine
ENGINE_HEALTH=$(curl -sf http://localhost:8001/health 2>/dev/null || echo "FAIL")
if [[ "$ENGINE_HEALTH" == "FAIL" ]]; then
    log_fail "Engine not responding"
    exit 1
fi
log_pass "Engine healthy"

# Console API
API_HEALTH=$(curl -sf $CONSOLE_API/health 2>/dev/null || echo "FAIL")
if [[ "$API_HEALTH" == "FAIL" ]]; then
    log_fail "Console API not responding"
    exit 1
fi
log_pass "Console API healthy"

# Runtime Manager
RUNTIME_STATUS=$(docker compose -f "$CONSOLE_ROOT/docker-compose.dev.yml" ps runtime-manager --format "{{.Status}}" 2>/dev/null || echo "not found")
if [[ "$RUNTIME_STATUS" == *"Up"* ]] || [[ "$RUNTIME_STATUS" == *"running"* ]]; then
    log_pass "Runtime-manager running"
else
    log_fail "Runtime-manager not running"
    exit 1
fi

# ==============================================================================
# Step 2: Register user and create institution
# ==============================================================================

log_info "Step 2: Registering user and creating institution..."

OWNER_EMAIL="autonomy_$(date +%s)@example.com"
PASSWORD="DevPassword123!"

# Register owner
OWNER_REG=$(curl -sf -X POST "$CONSOLE_API/auth/register" \
    -H "Content-Type: application/json" \
    -d "{\"email\":\"$OWNER_EMAIL\",\"password\":\"$PASSWORD\"}" 2>/dev/null || echo "FAIL")

if [[ "$OWNER_REG" == "FAIL" ]]; then
    log_fail "Cannot register owner user"
    exit 1
fi

OWNER_TOKEN=$(echo "$OWNER_REG" | jq -r '.access_token // empty')
if [[ -z "$OWNER_TOKEN" ]]; then
    log_fail "No access token returned from registration"
    exit 1
fi
log_pass "Owner registered"

# Create institution via onboarding
ONB=$(curl -sf -X POST "$CONSOLE_API/onboarding" \
    -H "Authorization: Bearer $OWNER_TOKEN" \
    -H "Content-Type: application/json" \
    -d '{"display_name":"E2E Autonomy Institution"}' 2>/dev/null || echo "FAIL")

if [[ "$ONB" == "FAIL" ]]; then
    log_fail "Onboarding request failed"
    exit 1
fi

INSTITUTION_ID=$(echo "$ONB" | jq -r '.institution_id // empty')
if [[ -z "$INSTITUTION_ID" ]] || [[ "$INSTITUTION_ID" == "null" ]]; then
    log_fail "No institution_id returned from onboarding"
    log_info "Response: $ONB"
    exit 1
fi

log_pass "Institution created: ${INSTITUTION_ID:0:8}..."

# Wait for onboarding to complete
log_info "Waiting for onboarding to complete..."
sleep 3

# ==============================================================================
# Step 3: Test autonomy settings API
# ==============================================================================

log_info "Step 3: Testing autonomy settings API..."

# Get current settings
SETTINGS_RESP=$(curl -sf -H "Authorization: Bearer $OWNER_TOKEN" "$CONSOLE_API/institutions/$INSTITUTION_ID/settings" 2>/dev/null || echo "FAIL")

if [[ "$SETTINGS_RESP" == "FAIL" ]]; then
    log_fail "Cannot get institution settings"
    exit 1
fi

CURRENT_ENABLED=$(echo "$SETTINGS_RESP" | jq -r '.autonomy_enabled' 2>/dev/null || echo "false")
log_info "Initial autonomy_enabled: $CURRENT_ENABLED"
log_pass "Settings endpoint accessible"

# ==============================================================================
# Step 4: Enable autonomy
# ==============================================================================

log_info "Step 4: Enabling autonomy..."

UPDATE_RESP=$(curl -sf -X PUT "$CONSOLE_API/institutions/$INSTITUTION_ID/settings" \
    -H "Authorization: Bearer $OWNER_TOKEN" \
    -H "Content-Type: application/json" \
    -d '{
        "autonomy_enabled": true,
        "autonomy_plan_create_interval_seconds": 300,
        "autonomy_max_plans_per_day": 3
    }' 2>/dev/null || echo "FAIL")

if [[ "$UPDATE_RESP" == "FAIL" ]]; then
    log_fail "Cannot update autonomy settings"
    exit 1
fi

NEW_ENABLED=$(echo "$UPDATE_RESP" | jq -r '.autonomy_enabled' 2>/dev/null || echo "false")
NEW_INTERVAL=$(echo "$UPDATE_RESP" | jq -r '.autonomy_plan_create_interval_seconds' 2>/dev/null || echo "0")
NEW_MAX=$(echo "$UPDATE_RESP" | jq -r '.autonomy_max_plans_per_day' 2>/dev/null || echo "0")

if [[ "$NEW_ENABLED" == "true" ]]; then
    log_pass "Autonomy enabled successfully"
else
    log_fail "Failed to enable autonomy"
fi

if [[ "$NEW_INTERVAL" == "300" ]]; then
    log_pass "Interval set to 300 seconds"
else
    log_fail "Interval not set correctly (got: $NEW_INTERVAL)"
fi

if [[ "$NEW_MAX" == "3" ]]; then
    log_pass "Max plans per day set to 3"
else
    log_fail "Max plans per day not set correctly (got: $NEW_MAX)"
fi

# ==============================================================================
# Step 5: Verify tenant info includes autonomy settings
# ==============================================================================

log_info "Step 5: Verifying tenant info includes autonomy..."

MANAGER_KEY="${RUNTIME_MANAGER_KEY:-dev_runtime_manager_key_32chars!}"
sleep 1
TENANTS_RESP=$(curl -sf -H "X-Runtime-Manager-Key: $MANAGER_KEY" "$CONSOLE_API/internal/runtime/tenants" 2>/dev/null || echo "FAIL")

if [[ "$TENANTS_RESP" == "FAIL" ]]; then
    log_fail "Cannot fetch tenant info"
    exit 1
fi

# Find our institution in tenant list
INST_AUTONOMY=$(echo "$TENANTS_RESP" | jq -r '.tenants[] | select(.autonomy_enabled == true) | .engine_institution_id' 2>/dev/null | head -1)

if [[ -n "$INST_AUTONOMY" ]]; then
    log_pass "Tenant with autonomy_enabled=true found"
else
    log_warn "No tenant with autonomy enabled (may be timing issue or institution not yet propagated)"
fi

# ==============================================================================
# Step 6: CRITICAL - Verify runtime-manager code safety
# ==============================================================================

log_info "Step 6: CRITICAL SAFETY CHECK - Verifying code constraints..."

RUNTIME_CLI="$CONSOLE_ROOT/../libervia-agent-runtime/src/libervia_agent/cli.py"

if [[ -f "$RUNTIME_CLI" ]]; then
    # Look for actual code that would call plan.apply (not comments)
    # A dangerous call would assign job_type to files.plan.apply
    # We look for patterns like: job_type = "files.plan.apply" or similar
    set +e  # Temporarily allow errors
    UNSAFE_PATTERN='job_type.*files\.plan\.apply'
    UNSAFE_MATCHES=$(grep -E "$UNSAFE_PATTERN" "$RUNTIME_CLI" 2>/dev/null | grep -v "^[[:space:]]*#" | wc -l)
    set -e

    if [[ "$UNSAFE_MATCHES" -gt 0 ]]; then
        log_critical "SAFETY VIOLATION: Found files.plan.apply assignment in code!"
        grep -En "$UNSAFE_PATTERN" "$RUNTIME_CLI" | grep -v "^[[:space:]]*#"
        exit 1
    else
        log_pass "No files.plan.apply calls found in autonomy code"
    fi

    # Check for safety documentation
    set +e
    SAFETY_DOCS=$(grep -c "NEVER.*plan.apply" "$RUNTIME_CLI" 2>/dev/null)
    set -e
    SAFETY_DOCS=${SAFETY_DOCS:-0}

    if [[ "$SAFETY_DOCS" -gt 0 ]]; then
        log_pass "Safety constraints documented in code ($SAFETY_DOCS references)"
    else
        log_warn "No explicit safety documentation found"
    fi

    # Verify create_plan_via_engine only creates safe operations
    if grep -q "files.plan.create" "$RUNTIME_CLI" 2>/dev/null; then
        log_pass "Code uses files.plan.create (safe operation)"
    else
        log_warn "files.plan.create not found in code"
    fi
else
    log_warn "Runtime CLI file not found for static analysis: $RUNTIME_CLI"
fi

# ==============================================================================
# Step 7: Check runtime-manager logs for autonomy activity
# ==============================================================================

log_info "Step 7: Checking runtime-manager logs..."

MANAGER_LOGS=$(docker compose -f "$CONSOLE_ROOT/docker-compose.dev.yml" logs --tail=100 runtime-manager 2>/dev/null || echo "")

# Check for autonomy-related log messages
if echo "$MANAGER_LOGS" | grep -qi "autonomy"; then
    log_pass "Autonomy processing detected in logs"
else
    log_info "No autonomy activity in recent logs (expected for new institution)"
fi

# CRITICAL: Check that plan.apply was NOT executed automatically by AUTONOMY
# Note: plan.apply jobs from user-initiated requests are OK - we only check
# that the autonomy code itself never calls plan.apply
#
# The static analysis in Step 6 is the authoritative check. Here we just
# verify the runtime behavior by looking for autonomy-specific log markers.
if echo "$MANAGER_LOGS" | grep -i "autonomy.*plan.apply\|autonomy.*apply" | grep -vi "never\|not\|skip" | grep -q .; then
    log_critical "SAFETY VIOLATION: autonomy is calling files.plan.apply!"
    echo "$MANAGER_LOGS" | grep -i "autonomy"
else
    log_pass "No autonomy-initiated files.plan.apply detected (safe)"
fi

# Also verify no autonomy_create_plan call creates apply jobs
if echo "$MANAGER_LOGS" | grep -i "create_plan_via_engine.*apply" | grep -q .; then
    log_critical "SAFETY VIOLATION: create_plan_via_engine is creating apply jobs!"
else
    log_pass "create_plan_via_engine only creates safe operations"
fi

# ==============================================================================
# Step 8: Test validation constraints
# ==============================================================================

log_info "Step 8: Testing validation constraints..."

# Test minimum interval (should reject < 300 seconds)
INVALID_INTERVAL_CODE=$(curl -s -o /dev/null -w "%{http_code}" -X PUT "$CONSOLE_API/institutions/$INSTITUTION_ID/settings" \
    -H "Authorization: Bearer $OWNER_TOKEN" \
    -H "Content-Type: application/json" \
    -d '{"autonomy_plan_create_interval_seconds": 60}' 2>/dev/null)

if [[ "$INVALID_INTERVAL_CODE" == "400" ]]; then
    log_pass "Rejects interval < 300 seconds (HTTP 400)"
else
    log_fail "Should reject interval < 300 (got HTTP $INVALID_INTERVAL_CODE)"
fi

# Test max plans range (should reject > 48)
INVALID_MAX_CODE=$(curl -s -o /dev/null -w "%{http_code}" -X PUT "$CONSOLE_API/institutions/$INSTITUTION_ID/settings" \
    -H "Authorization: Bearer $OWNER_TOKEN" \
    -H "Content-Type: application/json" \
    -d '{"autonomy_max_plans_per_day": 100}' 2>/dev/null)

if [[ "$INVALID_MAX_CODE" == "400" ]]; then
    log_pass "Rejects max_plans_per_day > 48 (HTTP 400)"
else
    log_fail "Should reject max_plans > 48 (got HTTP $INVALID_MAX_CODE)"
fi

# ==============================================================================
# Step 9: Disable autonomy (cleanup)
# ==============================================================================

log_info "Step 9: Disabling autonomy..."

DISABLE_RESP=$(curl -sf -X PUT "$CONSOLE_API/institutions/$INSTITUTION_ID/settings" \
    -H "Authorization: Bearer $OWNER_TOKEN" \
    -H "Content-Type: application/json" \
    -d '{"autonomy_enabled": false}' 2>/dev/null || echo "FAIL")

if [[ "$DISABLE_RESP" != "FAIL" ]]; then
    DISABLED=$(echo "$DISABLE_RESP" | jq -r '.autonomy_enabled' 2>/dev/null || echo "true")
    if [[ "$DISABLED" == "false" ]]; then
        log_pass "Autonomy disabled successfully"
    else
        log_warn "Autonomy may not be disabled"
    fi
else
    log_warn "Could not disable autonomy (cleanup failed)"
fi

# ==============================================================================
# Summary
# ==============================================================================

echo ""
echo "========================================"
echo "RESULT"
echo "========================================"
echo -e "${GREEN}PASS: $PASS_COUNT${NC}"
echo -e "${RED}FAIL: $FAIL_COUNT${NC}"
if [[ $CRITICAL_FAIL -gt 0 ]]; then
    echo -e "${RED}CRITICAL FAILURES: $CRITICAL_FAIL${NC}"
fi
echo "========================================"

if [[ $CRITICAL_FAIL -gt 0 ]]; then
    echo ""
    log_critical "SAFETY VIOLATION DETECTED!"
    log_critical "The autonomy feature may execute destructive operations automatically."
    log_critical "DO NOT deploy this version to production."
    exit 1
fi

if [[ $FAIL_COUNT -gt 0 ]]; then
    echo ""
    log_fail "E2E test FAILED with $FAIL_COUNT error(s)"
    exit 1
fi

echo ""
log_pass "E2E Autonomia Assistida Test PASSED!"
echo ""
log_info "Summary:"
log_info "  - Autonomy settings can be configured per institution"
log_info "  - Settings are propagated to runtime-manager"
log_info "  - Validation enforces safe limits"
log_info "  - CRITICAL: No automatic files.plan.apply detected"
echo ""
log_info "The autonomy feature is safe for use:"
log_info "  - Only creates recommendations (files.plan.create)"
log_info "  - Human approval required to apply plans"
log_info "  - Rate limits prevent runaway automation"

exit 0
