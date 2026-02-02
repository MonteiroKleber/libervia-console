#!/bin/bash
# ==============================================================================
# idl_build_personal_ops.sh
# Build personal-ops bundle from source IDL
#
# Pipeline: source.idl -> source.ir.json -> bundle artifacts -> verify
# ==============================================================================
set -euo pipefail

SCRIPT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
CONSOLE_ROOT="$(cd "$SCRIPT_DIR/.." && pwd)"
ENGINE_ROOT="${ENGINE_ROOT:-/home/bazari/engine}"

IDL_DIR="$CONSOLE_ROOT/idl/personal_ops"
SOURCE_IDL="$IDL_DIR/v1.0.0/source.idl"
SOURCE_IR="$IDL_DIR/v1.0.0/source.ir.json"
BUNDLE_NAME="personal-ops"

# Colors for output
RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
NC='\033[0m' # No Color

log_info() { echo -e "${GREEN}[INFO]${NC} $1"; }
log_warn() { echo -e "${YELLOW}[WARN]${NC} $1"; }
log_error() { echo -e "${RED}[ERROR]${NC} $1" >&2; }

# ==============================================================================
# Pre-flight checks
# ==============================================================================
log_info "Starting build for $BUNDLE_NAME"
log_info "Console root: $CONSOLE_ROOT"
log_info "Engine root:  $ENGINE_ROOT"

if [ ! -f "$SOURCE_IDL" ]; then
    log_error "Source IDL not found: $SOURCE_IDL"
    exit 1
fi

if [ ! -d "$ENGINE_ROOT/src/engine" ]; then
    log_error "Engine not found at: $ENGINE_ROOT"
    exit 1
fi

# ==============================================================================
# Step 1: IDL -> IR (source.idl -> source.ir.json)
# RULE: IDL is the single source of truth. NO FALLBACK to existing IR.
# ==============================================================================
log_info "Step 1: Compiling IDL to IR..."

cd "$ENGINE_ROOT"

# Compile IDL -> IR (MUST succeed, no fallback)
if ! PYTHONPATH=src python -m engine.idl_dsl "$SOURCE_IDL" -o "$SOURCE_IR" --quiet; then
    log_error "IDL compilation FAILED"
    log_error ""
    log_error "The IDL must compile successfully. Artifacts cannot be generated from stale IR."
    log_error ""
    log_error "To debug, run:"
    log_error "  cd $ENGINE_ROOT"
    log_error "  PYTHONPATH=src python -m engine.idl_dsl $SOURCE_IDL --validate"
    log_error ""
    log_error "If the IDL uses unsupported syntax, update the Engine parser first."
    exit 1
fi

log_info "  Generated: $SOURCE_IR"

# ==============================================================================
# Step 2: IR -> Bundle (source.ir.json -> bundle artifacts)
# ==============================================================================
log_info "Step 2: Compiling IR to bundle..."

# Compile to parent directory (idl/personal_ops/) with bundle-name
PYTHONPATH=src python -m engine.ise compile-ircs \
    "$SOURCE_IR" \
    -o "$IDL_DIR" \
    --bundle-name "$BUNDLE_NAME" \
    --quiet

# The compiler creates bundles under output_dir/bundle_name/
# We need to move artifacts to IDL_DIR root
BUNDLE_OUTPUT="$IDL_DIR/$BUNDLE_NAME"

if [ -d "$BUNDLE_OUTPUT" ] && [ "$BUNDLE_OUTPUT" != "$IDL_DIR" ]; then
    log_info "  Moving artifacts from $BUNDLE_OUTPUT to $IDL_DIR..."

    # Move all generated files to IDL_DIR root
    for f in "$BUNDLE_OUTPUT"/*; do
        if [ -e "$f" ]; then
            mv -f "$f" "$IDL_DIR/"
        fi
    done

    # Remove empty directory
    rmdir "$BUNDLE_OUTPUT" 2>/dev/null || true
fi

log_info "  Bundle artifacts generated in: $IDL_DIR"

# ==============================================================================
# Step 3: Verify bundle integrity
# ==============================================================================
log_info "Step 3: Verifying bundle..."

VERIFY_SCRIPT="$ENGINE_ROOT/ops/checks/verify_bundle.sh"
if [ ! -x "$VERIFY_SCRIPT" ]; then
    log_warn "Verify script not executable, attempting chmod..."
    chmod +x "$VERIFY_SCRIPT"
fi

if ! "$VERIFY_SCRIPT" "$IDL_DIR"; then
    log_error "Bundle verification FAILED"
    exit 1
fi

# ==============================================================================
# Summary
# ==============================================================================
BUNDLE_HASH=$(sha256sum "$IDL_DIR/bundle.manifest.json" | cut -d' ' -f1)

echo ""
log_info "========================================"
log_info "BUILD SUCCESSFUL"
log_info "========================================"
log_info "Bundle:    $BUNDLE_NAME"
log_info "Location:  $IDL_DIR"
log_info "Hash:      ${BUNDLE_HASH:0:16}..."
log_info ""
log_info "Generated files:"
ls -1 "$IDL_DIR"/*.json "$IDL_DIR"/*.yaml 2>/dev/null | while read -r f; do
    echo "  - $(basename "$f")"
done
echo ""
log_info "OK"
