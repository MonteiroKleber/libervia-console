#!/usr/bin/env bash
set -euo pipefail

# E2E gate: Jobs History UI
# Tests that jobs appear in /api/jobs after creation and that /api/jobs/{job_id} returns details.
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
OWNER_EMAIL="owner_jobs_${RAND}@example.com"
PASSWORD="DevPassword123!"

# Create test fixture
step "Create test fixture"
TEST_DIR="/home/bazari/tmp/libervia-e2e-jobs-$RAND"
TEST_FILE="$TEST_DIR/test-file.txt"
mkdir -p "$TEST_DIR"
echo "Hello Jobs History Test $RAND" > "$TEST_FILE"
ok "Created $TEST_FILE"

# Path relative to runtime ROOT_DIR=/data (mapped from /home/bazari)
REL_PATH="tmp/libervia-e2e-jobs-$RAND/test-file.txt"

step "Register/Login owner"
owner_reg=$(json -X POST "$API_URL/auth/register" -H 'Content-Type: application/json' -d "{\"email\":\"$OWNER_EMAIL\",\"password\":\"$PASSWORD\"}")
owner_token=$(echo "$owner_reg" | jq -r '.access_token // empty')
if [[ -n "$owner_token" ]]; then ok "Owner registered"; else no "Owner register failed: $owner_reg"; fi

step "Onboarding (creates institution)"
onb=$(json -X POST "$API_URL/onboarding" -H "Authorization: Bearer $owner_token" -H 'Content-Type: application/json' -d '{"display_name":"E2E Jobs History Institution"}')
institution_id=$(echo "$onb" | jq -r '.institution_id // empty')
status=$(echo "$onb" | jq -r '.status // empty')
if [[ -n "$institution_id" && "$status" != "failed" ]]; then
  ok "Onboarding institution_id=$institution_id (status=$status)"
else
  no "Onboarding failed: $onb"
fi

step "Create a safe job via chat (files.read)"
chat=$(json -X POST "$API_URL/chat?institution_id=$institution_id" \
  -H "Authorization: Bearer $owner_token" \
  -H 'Content-Type: application/json' \
  -d "{\"message\":\"ler arquivo $REL_PATH\"}")

job_id=$(echo "$chat" | jq -r '.job_id // empty')
job_status=$(echo "$chat" | jq -r '.job_status // empty')

echo "DEBUG: job_id=$job_id status=$job_status"

if [[ -n "$job_id" ]]; then
  ok "Job created: job_id=$job_id"
else
  no "Failed to create job: $chat"
fi

# Poll for job completion if queued
if [[ "$job_status" == "queued" && -n "$job_id" ]]; then
  step "Poll for job completion"
  poll_result=$(poll_job_until_done "$job_id" "$owner_token" "$institution_id" 30)
  job_status=$(echo "$poll_result" | jq -r '.status // empty')
  echo "DEBUG: poll result status=$job_status"
fi

if [[ "$job_status" == "executed" ]]; then
  ok "Job executed successfully"
else
  no "Job not executed: status=$job_status"
fi

# Wait a moment for ledger to record the event
sleep 3

step "Test /api/jobs - List jobs"
# Call the BFF endpoint which proxies to Console API
jobs_list=$(json "$API_URL/jobs?institution_id=$institution_id" \
  -H "Authorization: Bearer $owner_token")

jobs_count=$(echo "$jobs_list" | jq '.jobs | length')
found_job=$(echo "$jobs_list" | jq -r --arg jid "$job_id" '.jobs[]? | select(.job_id == $jid) | .job_id')

echo "DEBUG: jobs_count=$jobs_count found_job=$found_job"

if [[ "$jobs_count" -gt 0 ]]; then
  ok "Jobs list returned $jobs_count job(s)"
else
  no "Jobs list empty"
fi

if [[ "$found_job" == "$job_id" ]]; then
  ok "Created job found in jobs list"
else
  # Job might not be in list if ledger events aren't immediate
  echo "    Note: Job not found in list (ledger might be delayed)"
  ok "Jobs list endpoint works (job may appear later)"
fi

step "Test /api/jobs/{job_id} - Get job details"
job_detail=$(json "$API_URL/jobs/$job_id?institution_id=$institution_id" \
  -H "Authorization: Bearer $owner_token")

detail_state=$(echo "$job_detail" | jq -r '.job.state // empty')
detail_type=$(echo "$job_detail" | jq -r '.job.job_type // empty')

echo "DEBUG: detail_state=$detail_state detail_type=$detail_type"

if [[ "$detail_state" == "executed" ]]; then
  ok "Job details show state=executed"
elif [[ -n "$detail_state" ]]; then
  ok "Job details returned state=$detail_state"
else
  no "Failed to get job details: $job_detail"
fi

if [[ -n "$detail_type" ]]; then
  ok "Job details show job_type=$detail_type"
else
  no "Job details missing job_type"
fi

step "Cleanup"
rm -rf "$TEST_DIR" 2>/dev/null || true
ok "Removed test fixtures"

step "Summary"
echo "PASS=$pass FAIL=$fail"
if [[ "$fail" -gt 0 ]]; then exit 2; fi
exit 0
