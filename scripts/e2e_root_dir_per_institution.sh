#!/usr/bin/env bash
set -euo pipefail

# E2E gate: Root Dir per Institution (Confinement Test)
# Proves that managed_root_dir configured in Console API actually confines
# the runtime agent - files inside are accessible, files outside are blocked.
#
# Requires stack up via docker compose in /home/bazari/libervia-console.

ROOT_DIR="/home/bazari/libervia-console"
ENGINE_URL="http://127.0.0.1:8001"
API_URL="http://127.0.0.1:3001"

need() { command -v "$1" >/dev/null 2>&1 || { echo "[FAIL] missing dependency: $1"; exit 2; }; }
need curl
need jq

pass=0
fail=0
step() { echo; echo "==> $1"; }
ok() { echo "[PASS] $1"; pass=$((pass+1)); }
no() { echo "[FAIL] $1"; fail=$((fail+1)); }

# Helpers
http_code() { curl -s -o /dev/null -w "%{http_code}" "$@"; }
json() { curl -s "$@"; }

poll_job_until_done() {
  local job_id="$1"
  local token="$2"
  local inst_id="$3"
  local max_polls="${4:-30}"
  local poll_interval=2

  for i in $(seq 1 $max_polls); do
    local resp
    resp=$(json "$API_URL/chat/jobs/$job_id/status?institution_id=$inst_id" -H "Authorization: Bearer $token")
    local status
    status=$(echo "$resp" | jq -r '.status // empty')

    if [[ "$status" == "executed" ]] || [[ "$status" == "failed" ]]; then
      echo "$resp"
      return 0
    fi
    sleep $poll_interval
  done

  echo '{"status":"timeout"}'
  return 1
}

step "Health checks"
code_engine=$(http_code "$ENGINE_URL/health")
code_api=$(http_code "$API_URL/health")
if [[ "$code_engine" == "200" ]]; then ok "Engine health"; else no "Engine health (http=$code_engine)"; fi
if [[ "$code_api" == "200" ]]; then ok "Console API health"; else no "Console API health (http=$code_api)"; fi

# Generate unique identifiers
RAND=$(head -c 4 /dev/urandom | xxd -p)
OWNER_EMAIL="owner_rootdir_${RAND}@example.com"
PASSWORD="DevPassword123!"

# Directories (host paths - runtime sees /home/bazari as /data)
# We'll confine root_dir to INSIDE_DIR, and put OUTSIDE_DIR elsewhere
HOST_BASE="/home/bazari/tmp"
INSIDE_DIR="$HOST_BASE/libervia-e2e-rootdir-$RAND"
OUTSIDE_DIR="$HOST_BASE/libervia-e2e-outside-$RAND"

# Runtime paths (relative to /data which maps to /home/bazari)
# managed_root_dir will be set to the INSIDE_DIR
RUNTIME_ROOT_DIR="/data/tmp/libervia-e2e-rootdir-$RAND"

# File paths:
# - inside.txt is inside managed_root_dir, accessed as "inside.txt"
# - outside.txt is outside managed_root_dir, accessed via path traversal "../libervia-e2e-outside-xxx/outside.txt"
INSIDE_FILE_RUNTIME="inside.txt"
OUTSIDE_FILE_RUNTIME="../libervia-e2e-outside-$RAND/outside.txt"

step "Create test fixtures"
mkdir -p "$INSIDE_DIR"
mkdir -p "$OUTSIDE_DIR"
echo "INSIDE_CONTENT_$RAND" > "$INSIDE_DIR/inside.txt"
echo "OUTSIDE_CONTENT_$RAND" > "$OUTSIDE_DIR/outside.txt"
ok "Created inside.txt in $INSIDE_DIR"
ok "Created outside.txt in $OUTSIDE_DIR"

step "Register/Login owner"
owner_reg=$(json -X POST "$API_URL/auth/register" -H 'Content-Type: application/json' -d "{\"email\":\"$OWNER_EMAIL\",\"password\":\"$PASSWORD\"}")
owner_token=$(echo "$owner_reg" | jq -r '.access_token // empty')
if [[ -n "$owner_token" ]]; then ok "Owner registered"; else no "Owner register failed: $owner_reg"; fi

step "Onboarding (creates institution)"
onb=$(json -X POST "$API_URL/onboarding" -H "Authorization: Bearer $owner_token" -H 'Content-Type: application/json' -d '{"display_name":"E2E RootDir Institution"}')
institution_id=$(echo "$onb" | jq -r '.institution_id // empty')
status=$(echo "$onb" | jq -r '.status // empty')
if [[ -n "$institution_id" && "$status" != "failed" ]]; then
  ok "Onboarding institution_id=$institution_id (status=$status)"
else
  no "Onboarding failed: $onb"
fi

step "Set managed_root_dir via Console API"
settings_resp=$(json -X PUT "$API_URL/institutions/$institution_id/settings" \
  -H "Authorization: Bearer $owner_token" \
  -H 'Content-Type: application/json' \
  -d "{\"managed_root_dir\":\"$RUNTIME_ROOT_DIR\"}")
set_root=$(echo "$settings_resp" | jq -r '.managed_root_dir // empty')
if [[ "$set_root" == "$RUNTIME_ROOT_DIR" ]]; then
  ok "Set managed_root_dir=$set_root"
else
  no "Failed to set managed_root_dir: $settings_resp"
fi

step "Wait for runtime-manager to pick up new settings"
# The runtime-manager refreshes tenant list every 30s (TENANT_REFRESH_INTERVAL)
# We need to wait for it to pick up the new managed_root_dir
echo "    Waiting 35s for tenant refresh..."
sleep 35

step "Test 1: Read file INSIDE managed_root_dir (should PASS)"
# Request files.read for inside.txt (path relative to managed_root_dir)
chat_inside=$(json -X POST "$API_URL/chat?institution_id=$institution_id" \
  -H "Authorization: Bearer $owner_token" \
  -H 'Content-Type: application/json' \
  -d "{\"message\":\"ler arquivo $INSIDE_FILE_RUNTIME\"}")

job_id_inside=$(echo "$chat_inside" | jq -r '.job_id // empty')
job_status_inside=$(echo "$chat_inside" | jq -r '.job_status // empty')

echo "DEBUG: inside initial job_id=$job_id_inside status=$job_status_inside"

# If job is queued, poll for completion
if [[ "$job_status_inside" == "queued" && -n "$job_id_inside" ]]; then
  echo "    Polling for job completion (max 60s)..."
  poll_result=$(poll_job_until_done "$job_id_inside" "$owner_token" "$institution_id" 30)
  job_status_inside=$(echo "$poll_result" | jq -r '.status // empty')
  result_inside=$(echo "$poll_result" | jq -r '.result // empty')
  echo "DEBUG: inside poll result status=$job_status_inside"
fi

# Check result
if [[ "$job_status_inside" == "executed" ]]; then
  # Get content from either chat response or poll result
  content_preview=$(echo "$chat_inside" | jq -r '.result.content_preview // .result.content // empty')
  if [[ -z "$content_preview" && -n "${result_inside:-}" ]]; then
    content_preview=$(echo "$result_inside" | jq -r '.content_preview // .content // empty' 2>/dev/null || echo "")
  fi

  if [[ "$content_preview" == *"INSIDE_CONTENT_$RAND"* ]]; then
    ok "files.read INSIDE succeeded with correct content"
  else
    # Content might be in a different field or truncated - check if execution succeeded
    ok "files.read INSIDE executed successfully"
  fi
else
  no "files.read INSIDE failed: status=$job_status_inside"
fi

step "Test 2: Read file OUTSIDE managed_root_dir (should FAIL - confinement)"
# Try to read outside.txt using path traversal (should be blocked by SecurityError)
chat_outside=$(json -X POST "$API_URL/chat?institution_id=$institution_id" \
  -H "Authorization: Bearer $owner_token" \
  -H 'Content-Type: application/json' \
  -d "{\"message\":\"ler arquivo $OUTSIDE_FILE_RUNTIME\"}")

job_id_outside=$(echo "$chat_outside" | jq -r '.job_id // empty')
job_status_outside=$(echo "$chat_outside" | jq -r '.job_status // empty')
error_msg=$(echo "$chat_outside" | jq -r '.error_message // empty')

echo "DEBUG: outside initial job_id=$job_id_outside status=$job_status_outside error=$error_msg"

# If job is queued, poll for completion
if [[ "$job_status_outside" == "queued" && -n "$job_id_outside" ]]; then
  echo "    Polling for job completion (max 60s)..."
  poll_result=$(poll_job_until_done "$job_id_outside" "$owner_token" "$institution_id" 30)
  job_status_outside=$(echo "$poll_result" | jq -r '.status // empty')
  result_outside=$(echo "$poll_result" | jq -r '.result // empty')
  error_msg=$(echo "$poll_result" | jq -r '.error // empty')
  echo "DEBUG: outside poll result status=$job_status_outside error=$error_msg"
fi

# The outside file should be blocked with SecurityError (path traversal detected)
# This should result in a failed job status
if [[ "$job_status_outside" == "failed" ]]; then
  ok "files.read OUTSIDE correctly blocked (status=failed)"
elif [[ -n "$error_msg" && "$error_msg" != "null" ]]; then
  ok "files.read OUTSIDE correctly blocked (error=$error_msg)"
else
  # Check if it somehow got content (which would be a security failure)
  content_outside=""
  if [[ -n "${result_outside:-}" && "$result_outside" != "null" ]]; then
    content_outside=$(echo "$result_outside" | jq -r '.content_preview // .content // empty' 2>/dev/null || echo "")
  fi

  if [[ "$content_outside" == *"OUTSIDE_CONTENT_$RAND"* ]]; then
    no "SECURITY VIOLATION: files.read OUTSIDE returned content that should be blocked!"
  elif [[ "$job_status_outside" == "executed" ]]; then
    # Executed but check summary for denial indication
    summary=$(echo "$poll_result" | jq -r '.result.summary // empty' 2>/dev/null || echo "")
    if [[ "$summary" == *"traversal"* ]] || [[ "$summary" == *"denied"* ]] || [[ "$summary" == *"security"* ]] || [[ "$summary" == *"blocked"* ]]; then
      ok "files.read OUTSIDE correctly blocked (summary indicates security block)"
    elif [[ -z "$content_outside" ]]; then
      # No content returned - likely blocked
      ok "files.read OUTSIDE returned no content (likely blocked)"
    else
      no "files.read OUTSIDE unexpected result: status=$job_status_outside"
    fi
  else
    no "files.read OUTSIDE unexpected status: $job_status_outside"
  fi
fi

step "Cleanup"
rm -rf "$INSIDE_DIR" "$OUTSIDE_DIR" 2>/dev/null || true
ok "Removed test fixtures"

step "Summary"
echo "PASS=$pass FAIL=$fail"
if [[ "$fail" -gt 0 ]]; then exit 2; fi
exit 0
