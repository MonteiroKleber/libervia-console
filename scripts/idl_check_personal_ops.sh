#!/bin/bash
# ==============================================================================
# idl_check_personal_ops.sh
# Verify bundle consistency: no .bak files, artifacts match IDL source
#
# Exits non-zero if:
# - Any .bak* files exist in idl/personal_ops/
# - Build succeeds but leaves uncommitted changes (artifacts out of sync)
# ==============================================================================
set -euo pipefail

SCRIPT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
CONSOLE_ROOT="$(cd "$SCRIPT_DIR/.." && pwd)"
IDL_DIR="$CONSOLE_ROOT/idl/personal_ops"

# Colors for output
RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
NC='\033[0m' # No Color

log_info() { echo -e "${GREEN}[CHECK]${NC} $1"; }
log_warn() { echo -e "${YELLOW}[WARN]${NC} $1"; }
log_error() { echo -e "${RED}[FAIL]${NC} $1" >&2; }
log_pass() { echo -e "${GREEN}[PASS]${NC} $1"; }

ERRORS=0

# ==============================================================================
# Check 1: No .bak files
# ==============================================================================
log_info "Checking for .bak files..."

BAK_FILES=$(find "$IDL_DIR" -name "*.bak*" -o -name "*~" 2>/dev/null || true)

if [ -n "$BAK_FILES" ]; then
    log_error "Found .bak files (forbidden in repo):"
    echo "$BAK_FILES" | while read -r f; do
        echo "  - $f"
    done
    ERRORS=$((ERRORS + 1))
else
    log_pass "No .bak files found"
fi

# ==============================================================================
# Check 2: Run build
# ==============================================================================
log_info "Running build..."

BUILD_SCRIPT="$SCRIPT_DIR/idl_build_personal_ops.sh"

if [ ! -x "$BUILD_SCRIPT" ]; then
    chmod +x "$BUILD_SCRIPT"
fi

if ! "$BUILD_SCRIPT"; then
    log_error "Build failed"
    exit 1
fi

log_pass "Build completed successfully"

# ==============================================================================
# Check 3: No uncommitted changes in idl/personal_ops/
# (If there are changes after build, artifacts were out of sync with IDL)
# ==============================================================================
log_info "Checking for uncommitted changes in idl/personal_ops/..."

cd "$CONSOLE_ROOT"

# Check if git repo
if [ -d ".git" ]; then
    # Get diff for idl/personal_ops directory
    DIFF_OUTPUT=$(git diff --name-only "idl/personal_ops/" 2>/dev/null || true)
    UNTRACKED=$(git ls-files --others --exclude-standard "idl/personal_ops/" 2>/dev/null || true)

    if [ -n "$DIFF_OUTPUT" ] || [ -n "$UNTRACKED" ]; then
        log_error "Uncommitted changes detected after build!"
        log_error "This means artifacts were out of sync with source.idl"
        log_error ""
        log_error "Changed files:"
        [ -n "$DIFF_OUTPUT" ] && echo "$DIFF_OUTPUT" | while read -r f; do echo "  M $f"; done
        [ -n "$UNTRACKED" ] && echo "$UNTRACKED" | while read -r f; do echo "  ? $f"; done
        log_error ""
        log_error "To fix: commit these changes or regenerate from IDL"
        ERRORS=$((ERRORS + 1))
    else
        log_pass "No uncommitted changes - bundle is in sync with IDL"
    fi
else
    log_warn "Not a git repository, skipping diff check"
fi

# ==============================================================================
# Summary
# ==============================================================================
echo ""
if [ $ERRORS -gt 0 ]; then
    log_error "========================================"
    log_error "CHECK FAILED: $ERRORS error(s)"
    log_error "========================================"
    exit 1
fi

log_pass "========================================"
log_pass "ALL CHECKS PASSED"
log_pass "========================================"
exit 0
