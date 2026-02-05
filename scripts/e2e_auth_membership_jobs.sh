#!/usr/bin/env bash
set -euo pipefail

# E2E gate: Auth + Invite + SoD Approval + Job execution
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

require_200() {
  local code
  code=$(http_code "$@")
  if [[ "$code" == "200" ]]; then ok "$1"; else no "$1 (http=$code)"; fi
}

step "Health checks"
code_engine=$(http_code "$ENGINE_URL/health")
code_api=$(http_code "$API_URL/health")
if [[ "$code_engine" == "200" ]]; then ok "Engine health"; else no "Engine health (http=$code_engine)"; fi
if [[ "$code_api" == "200" ]]; then ok "Console API health"; else no "Console API health (http=$code_api)"; fi

# ---------------------------------------------------------------------------
# NOTE:
# This gate assumes the next-phase implementation exists:
# - Console API supports prod-like auth in dev when flags enabled
# - Membership invites endpoints exist
# If not implemented yet, this script will fail (by design).
# ---------------------------------------------------------------------------

OWNER_EMAIL=${OWNER_EMAIL:-"owner_$(date +%s)@example.com"}
EXEC_EMAIL=${EXEC_EMAIL:-"exec_$(date +%s)@example.com"}
PASSWORD=${PASSWORD:-"DevPassword123!"}

step "Register/Login owner"
owner_reg=$(json -X POST "$API_URL/auth/register" -H 'Content-Type: application/json' -d "{\"email\":\"$OWNER_EMAIL\",\"password\":\"$PASSWORD\"}")
owner_token=$(echo "$owner_reg" | jq -r '.access_token // empty')
if [[ -n "$owner_token" ]]; then ok "Owner registered"; else no "Owner register failed: $owner_reg"; fi

step "Onboarding (creates institution)"
onb=$(json -X POST "$API_URL/onboarding" -H "Authorization: Bearer $owner_token" -H 'Content-Type: application/json' -d '{"display_name":"E2E Auth Institution"}')
institution_id=$(echo "$onb" | jq -r '.institution_id // empty')
status=$(echo "$onb" | jq -r '.status // empty')
if [[ -n "$institution_id" && "$status" != "failed" ]]; then ok "Onboarding returned institution_id=$institution_id (status=$status)"; else no "Onboarding failed: $onb"; fi

step "Create test file in host root_dir (runtime-manager uses /home/bazari mounted as /data)"
TEST_DIR="/home/bazari/tmp/libervia-e2e"
TEST_FILE="$TEST_DIR/e2e-delete.txt"
mkdir -p "$TEST_DIR"
echo "delete-me" > "$TEST_FILE"
ok "Created $TEST_FILE"

step "Invite exec_admin"
inv=$(json -X POST "$API_URL/institutions/$institution_id/invites" \
  -H "Authorization: Bearer $owner_token" \
  -H 'Content-Type: application/json' \
  -d "{\"email\":\"$EXEC_EMAIL\",\"role\":\"exec_admin\"}")
invite_token=$(echo "$inv" | jq -r '.invite_token // empty')
if [[ -n "$invite_token" ]]; then ok "Invite created"; else no "Invite failed: $inv"; fi

step "Register/Login exec_admin"
exec_reg=$(json -X POST "$API_URL/auth/register" -H 'Content-Type: application/json' -d "{\"email\":\"$EXEC_EMAIL\",\"password\":\"$PASSWORD\"}")
exec_token=$(echo "$exec_reg" | jq -r '.access_token // empty')
if [[ -n "$exec_token" ]]; then ok "Exec registered"; else no "Exec register failed: $exec_reg"; fi

step "Accept invite"
acc=$(json -X POST "$API_URL/invites/accept" \
  -H "Authorization: Bearer $exec_token" \
  -H 'Content-Type: application/json' \
  -d "{\"token\":\"$invite_token\"}")
acc_ok=$(echo "$acc" | jq -r '.status // empty')
if [[ -n "$acc_ok" ]]; then ok "Invite accepted"; else no "Invite accept failed: $acc"; fi

step "Create destructive job via chat (delete)"
# Path is relative to runtime ROOT_DIR=/data, mapped from host /home/bazari.
# So host /home/bazari/tmp/... maps to runtime /data/tmp/...
rel_path="tmp/libervia-e2e/e2e-delete.txt"
chat=$(json -X POST "$API_URL/chat?institution_id=$institution_id" \
  -H "Authorization: Bearer $owner_token" \
  -H 'Content-Type: application/json' \
  -d "{\"message\":\"deletar arquivo $rel_path\"}")
approval_id=$(echo "$chat" | jq -r '.approval_id // empty')
job_id=$(echo "$chat" | jq -r '.job_id // empty')
if [[ -n "$approval_id" && -n "$job_id" ]]; then ok "Delete request created approval_id=$approval_id job_id=$job_id"; else no "Chat delete failed: $chat"; fi

step "SoD check: owner cannot approve own request"
owner_dec=$(http_code -X POST "$API_URL/approvals/$approval_id/decide?institution_id=$institution_id" \
  -H "Authorization: Bearer $owner_token" \
  -H 'Content-Type: application/json' \
  -d '{"decision":"approve","reason":"e2e"}')
if [[ "$owner_dec" == "403" ]]; then ok "Owner blocked by SoD"; else no "Expected 403 SoD for owner (got $owner_dec)"; fi

step "Exec_admin approves"
exec_dec=$(json -X POST "$API_URL/approvals/$approval_id/decide?institution_id=$institution_id" \
  -H "Authorization: Bearer $exec_token" \
  -H 'Content-Type: application/json' \
  -d '{"decision":"approve","reason":"e2e"}')
if echo "$exec_dec" | jq -e '.decision' >/dev/null 2>&1; then ok "Exec approved"; else no "Exec approve failed: $exec_dec"; fi

step "Wait for runtime execution (poll audit for RUNTIME_JOB_REPORTED case_id==job_id)"
# Poll Console API audit timeline (15 tries, 2s)
found=0
for i in $(seq 1 15); do
  ev=$(json "$API_URL/audit/timeline?institution_id=$institution_id&event_type=RUNTIME_JOB_REPORTED&limit=50" -H "Authorization: Bearer $owner_token")
  if echo "$ev" | jq -e --arg jid "$job_id" '.events[]? | select(.case_id == $jid)' >/dev/null 2>&1; then
    found=1
    break
  fi
  sleep 2
done

if [[ "$found" == "1" ]]; then ok "Runtime reported execution"; else no "Timeout waiting runtime report"; fi

# Final
step "Summary"
echo "PASS=$pass FAIL=$fail"
if [[ "$fail" -gt 0 ]]; then exit 2; fi
exit 0
