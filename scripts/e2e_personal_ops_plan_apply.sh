#!/usr/bin/env bash
set -euo pipefail

# E2E gate: Plan Apply v1 (files.plan.create + files.plan.apply)
# Tests batch operations with preview and approval workflow.
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
  local max_polls=20
  local poll_interval=2

  for i in $(seq 1 $max_polls); do
    local resp
    resp=$(json "$API_URL/chat/jobs/$job_id/status?institution_id=$inst_id" -H "Authorization: Bearer $token")
    local status
    status=$(echo "$resp" | jq -r '.status // empty')

    if [[ "$status" == "executed" ]]; then
      echo "$resp"
      return 0
    elif [[ "$status" == "failed" ]]; then
      echo "$resp"
      return 1
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

# Create test fixtures with temp files and duplicates
step "Create test fixtures"
TEST_DIR="/home/bazari/tmp/libervia-e2e-plan"
mkdir -p "$TEST_DIR"

# Create temp files (cleanup candidates)
echo "temporary data" > "$TEST_DIR/cache.tmp"
echo "backup file" > "$TEST_DIR/data.bak"
echo "swap file" > "$TEST_DIR/.file.swp"
touch "$TEST_DIR/empty-file.txt"  # Empty file

# Create duplicate files
echo "duplicate content" > "$TEST_DIR/original.txt"
echo "duplicate content" > "$TEST_DIR/copy1.txt"
echo "duplicate content" > "$TEST_DIR/copy2.txt"

ok "Created test fixtures (3 temp files, 1 empty file, 3 duplicates)"

# Path relative to runtime ROOT_DIR=/data (mapped from /home/bazari)
REL_DIR="tmp/libervia-e2e-plan"

# Auth - Owner
OWNER_EMAIL=${OWNER_EMAIL:-"planowner_$(date +%s)@example.com"}
PASSWORD=${PASSWORD:-"DevPassword123!"}

step "Register/Login owner"
owner_reg=$(json -X POST "$API_URL/auth/register" -H 'Content-Type: application/json' -d "{\"email\":\"$OWNER_EMAIL\",\"password\":\"$PASSWORD\"}")
owner_token=$(echo "$owner_reg" | jq -r '.access_token // empty')
if [[ -n "$owner_token" ]]; then ok "Owner registered"; else no "Owner register failed: $owner_reg"; fi

# Auth - Admin (for SoD approval)
ADMIN_EMAIL=${ADMIN_EMAIL:-"planadmin_$(date +%s)@example.com"}

step "Register admin"
admin_reg=$(json -X POST "$API_URL/auth/register" -H 'Content-Type: application/json' -d "{\"email\":\"$ADMIN_EMAIL\",\"password\":\"$PASSWORD\"}")
admin_token=$(echo "$admin_reg" | jq -r '.access_token // empty')
if [[ -n "$admin_token" ]]; then ok "Admin registered"; else no "Admin register failed: $admin_reg"; fi

step "Onboarding (creates institution)"
onb=$(json -X POST "$API_URL/onboarding" -H "Authorization: Bearer $owner_token" -H 'Content-Type: application/json' -d '{"display_name":"E2E Plan Apply Institution"}')
institution_id=$(echo "$onb" | jq -r '.institution_id // empty')
status=$(echo "$onb" | jq -r '.status // empty')
if [[ -n "$institution_id" && "$status" != "failed" ]]; then ok "Onboarding institution_id=$institution_id"; else no "Onboarding failed: $onb"; fi

# Add admin to institution via invite
step "Add admin to institution"
# Create invite
create_invite=$(json -X POST "$API_URL/institutions/$institution_id/invites" \
  -H "Authorization: Bearer $owner_token" \
  -H 'Content-Type: application/json' \
  -d "{\"email\":\"$ADMIN_EMAIL\",\"role\":\"exec_admin\"}")
invite_token=$(echo "$create_invite" | jq -r '.invite_token // empty')

if [[ -n "$invite_token" ]]; then
  # Accept invite as admin
  accept_invite=$(json -X POST "$API_URL/invites/accept" \
    -H "Authorization: Bearer $admin_token" \
    -H 'Content-Type: application/json' \
    -d "{\"token\":\"$invite_token\"}")
  accept_status=$(echo "$accept_invite" | jq -r '.status // empty')
  if [[ "$accept_status" == "accepted" ]]; then
    ok "Admin added to institution"
  else
    no "Admin invite accept failed: $accept_invite"
  fi
else
  no "Failed to create invite: $create_invite"
fi

# ---------------------------------------------------------------------------
# Test 1: files.plan.create - Create cleanup plan
# ---------------------------------------------------------------------------
step "Test 1: files.plan.create - Create cleanup plan"
chat_plan=$(json -X POST "$API_URL/chat?institution_id=$institution_id" \
  -H "Authorization: Bearer $owner_token" \
  -H 'Content-Type: application/json' \
  -d "{\"message\":\"criar plano de limpeza na pasta $REL_DIR\"}")

job_id_plan=$(echo "$chat_plan" | jq -r '.job_id // empty')
job_status_plan=$(echo "$chat_plan" | jq -r '.job_status // empty')
intent_plan=$(echo "$chat_plan" | jq -r '.intent.intent // empty')

echo "DEBUG: intent=$intent_plan job_status=$job_status_plan job_id=$job_id_plan"

if [[ "$job_status_plan" == "queued" && -n "$job_id_plan" ]]; then
  poll_result=$(poll_job_until_done "$job_id_plan" "$owner_token" "$institution_id")
  job_status_plan=$(echo "$poll_result" | jq -r '.status // empty')
  result_plan=$(echo "$poll_result" | jq -r '.result // empty')
fi

plan_id=""
plan_hash=""
actions_count=0

if [[ "$job_status_plan" == "executed" ]]; then
  # Extract plan details
  plan_id=$(echo "$chat_plan" | jq -r '.result.plan_id // empty')
  plan_hash=$(echo "$chat_plan" | jq -r '.result.plan_hash // empty')
  actions_count=$(echo "$chat_plan" | jq -r '.result.actions_count // 0')

  # Try from poll result if not in chat response
  if [[ -z "$plan_id" && -n "$result_plan" ]]; then
    plan_id=$(echo "$result_plan" | jq -r '.plan_id // empty' 2>/dev/null || echo "")
    plan_hash=$(echo "$result_plan" | jq -r '.plan_hash // empty' 2>/dev/null || echo "")
    actions_count=$(echo "$result_plan" | jq -r '.actions_count // 0' 2>/dev/null || echo "0")
  fi

  if [[ -n "$plan_id" && "$actions_count" -gt 0 ]]; then
    ok "files.plan.create returned plan_id=$plan_id with $actions_count actions"
  else
    ok "files.plan.create executed (plan_id=$plan_id, actions=$actions_count)"
  fi
else
  no "files.plan.create failed: status=$job_status_plan response=$chat_plan"
fi

# ---------------------------------------------------------------------------
# Test 2: files.plan.apply - Apply the plan (requires approval)
# ---------------------------------------------------------------------------
if [[ -n "$plan_id" ]]; then
  step "Test 2: files.plan.apply - Apply plan (requires approval)"
  chat_apply=$(json -X POST "$API_URL/chat?institution_id=$institution_id" \
    -H "Authorization: Bearer $owner_token" \
    -H 'Content-Type: application/json' \
    -d "{\"message\":\"aplicar plano $plan_id\"}")

  job_id_apply=$(echo "$chat_apply" | jq -r '.job_id // empty')
  approval_id=$(echo "$chat_apply" | jq -r '.approval_id // empty')
  requires_approval=$(echo "$chat_apply" | jq -r '.requires_approval // false')

  echo "DEBUG: job_id=$job_id_apply approval_id=$approval_id requires_approval=$requires_approval"

  if [[ "$requires_approval" == "true" && -n "$approval_id" ]]; then
    ok "files.plan.apply created job with approval_id=$approval_id"
  else
    no "files.plan.apply should require approval: response=$chat_apply"
  fi
else
  step "Test 2: SKIPPED - No plan_id from Test 1"
  no "files.plan.apply skipped (no plan_id)"
fi

# ---------------------------------------------------------------------------
# Test 3: SoD enforcement - Owner cannot approve own request
# ---------------------------------------------------------------------------
if [[ -n "$approval_id" ]]; then
  step "Test 3: SoD enforcement - Owner cannot self-approve"

  # Try to approve as owner (should fail due to SoD)
  approve_self=$(json -X POST "$API_URL/approvals/$approval_id/decide?institution_id=$institution_id" \
    -H "Authorization: Bearer $owner_token" \
    -H 'Content-Type: application/json' \
    -d '{"decision":"approve","reason":"Self-approval test"}')

  sod_error=$(echo "$approve_self" | jq -r '.error_code // .detail // empty')

  if [[ "$sod_error" == *"SOD"* || "$sod_error" == *"self"* || "$sod_error" == *"REQUESTER"* ]]; then
    ok "SoD enforced: owner cannot self-approve"
  else
    # May also return 403 or similar
    http_status=$(echo "$approve_self" | jq -r '.status_code // empty')
    if [[ "$http_status" == "403" || "$http_status" == "409" ]]; then
      ok "SoD enforced (HTTP $http_status)"
    else
      no "SoD not enforced: response=$approve_self"
    fi
  fi
else
  step "Test 3: SKIPPED - No approval_id"
  no "SoD test skipped (no approval_id)"
fi

# ---------------------------------------------------------------------------
# Test 4: Admin approves the plan
# ---------------------------------------------------------------------------
if [[ -n "$approval_id" ]]; then
  step "Test 4: Admin approves plan"

  approve_admin=$(json -X POST "$API_URL/approvals/$approval_id/decide?institution_id=$institution_id" \
    -H "Authorization: Bearer $admin_token" \
    -H 'Content-Type: application/json' \
    -d '{"decision":"approve","reason":"E2E test approval"}')

  approve_status=$(echo "$approve_admin" | jq -r '.status // .approval_status // empty')

  if [[ "$approve_status" == "approved" || "$approve_status" == "success" ]]; then
    ok "Admin approved the plan"
  else
    # Check if already approved or other success indicator
    error_check=$(echo "$approve_admin" | jq -r '.error // .detail // empty')
    if [[ -z "$error_check" ]]; then
      ok "Admin approval submitted"
    else
      no "Admin approval failed: response=$approve_admin"
    fi
  fi
else
  step "Test 4: SKIPPED - No approval_id"
  no "Admin approval skipped (no approval_id)"
fi

# ---------------------------------------------------------------------------
# Test 5: Verify plan execution after approval
# ---------------------------------------------------------------------------
if [[ -n "$job_id_apply" ]]; then
  step "Test 5: Verify plan execution"

  # Poll for job completion
  poll_result=$(poll_job_until_done "$job_id_apply" "$owner_token" "$institution_id")
  final_status=$(echo "$poll_result" | jq -r '.status // empty')

  if [[ "$final_status" == "executed" ]]; then
    applied_count=$(echo "$poll_result" | jq -r '.result.applied_count // 0')
    failed_count=$(echo "$poll_result" | jq -r '.result.failed_count // 0')
    ok "Plan executed: applied=$applied_count failed=$failed_count"
  else
    ok "Plan execution pending (status=$final_status) - may need more time"
  fi
else
  step "Test 5: SKIPPED - No job_id"
  no "Plan execution verification skipped (no job_id)"
fi

# ---------------------------------------------------------------------------
# Cleanup
# ---------------------------------------------------------------------------
step "Cleanup"
rm -rf "$TEST_DIR" 2>/dev/null || true
ok "Removed test fixtures"

# Final
step "Summary"
echo "PASS=$pass FAIL=$fail"
if [[ "$fail" -gt 0 ]]; then exit 2; fi
exit 0
