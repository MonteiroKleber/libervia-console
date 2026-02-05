#!/usr/bin/env bash
set -euo pipefail

# E2E gate: Archive Create v1 (archive.create)

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

http_code() { curl -s -o /dev/null -w "%{http_code}" "$@"; }
json() { curl -s "$@"; }

poll_job_until_done() {
  local job_id="$1"
  local token="$2"
  local inst_id="$3"
  local max_polls=25
  local poll_interval=2

  for _ in $(seq 1 $max_polls); do
    local resp status
    resp=$(json "$API_URL/chat/jobs/$job_id/status?institution_id=$inst_id" -H "Authorization: Bearer $token")
    status=$(echo "$resp" | jq -r '.status // empty')
    if [[ "$status" == "executed" || "$status" == "failed" ]]; then
      echo "$resp"
      [[ "$status" == "executed" ]]
      return
    fi
    sleep $poll_interval
  done
  echo '{"status":"timeout"}'
  return 1
}

step "Health checks"
code_engine=$(http_code "$ENGINE_URL/health")
code_api=$(http_code "$API_URL/health")
[[ "$code_engine" == "200" ]] && ok "Engine health" || no "Engine health (http=$code_engine)"
[[ "$code_api" == "200" ]] && ok "Console API health" || no "Console API health (http=$code_api)"

step "Create fixtures"
TEST_DIR="/home/bazari/tmp/libervia-e2e-archive-$(date +%s)"
mkdir -p "$TEST_DIR/sub"
echo "hello" > "$TEST_DIR/a.txt"
echo "world" > "$TEST_DIR/sub/b.txt"
ok "Created fixtures in $TEST_DIR"

REL_DIR="tmp/$(basename "$TEST_DIR")"

OWNER_EMAIL=${OWNER_EMAIL:-"archiveowner_$(date +%s)@example.com"}
PASSWORD=${PASSWORD:-"DevPassword123!"}

step "Register/Login owner"
payload_register=$(jq -n --arg email "$OWNER_EMAIL" --arg password "$PASSWORD" \
  '{email: $email, password: $password}')
owner_reg=$(json -X POST "$API_URL/auth/register" -H 'Content-Type: application/json' -d "$payload_register")
owner_token=$(echo "$owner_reg" | jq -r '.access_token // empty')
[[ -n "$owner_token" ]] && ok "Owner registered" || no "Owner register failed: $owner_reg"

step "Onboarding (creates institution)"
onb=$(json -X POST "$API_URL/onboarding" -H "Authorization: Bearer $owner_token" -H 'Content-Type: application/json' -d '{"display_name":"E2E Archive Institution"}')
institution_id=$(echo "$onb" | jq -r '.institution_id // empty')
status=$(echo "$onb" | jq -r '.status // empty')
[[ -n "$institution_id" && "$status" != "failed" ]] && ok "Onboarding institution_id=$institution_id" || no "Onboarding failed: $onb"

step "archive.create via chat"
payload_chat=$(jq -n --arg message "zipar a pasta \"$REL_DIR\"" \
  '{message: $message}')
chat_resp=$(json -X POST "$API_URL/chat?institution_id=$institution_id" \
  -H "Authorization: Bearer $owner_token" \
  -H 'Content-Type: application/json' \
  -d "$payload_chat")
job_id=$(echo "$chat_resp" | jq -r '.job_id // empty')
[[ -n "$job_id" ]] && ok "Job created job_id=$job_id" || no "No job_id: $chat_resp"

step "Poll job"
job_status_resp=$(poll_job_until_done "$job_id" "$owner_token" "$institution_id" || true)
job_status=$(echo "$job_status_resp" | jq -r '.status // empty')

if [[ "$job_status" == "executed" ]]; then
  archive_path=$(echo "$job_status_resp" | jq -r '.result.archive_path // empty')
  sha256=$(echo "$job_status_resp" | jq -r '.result.sha256 // empty')
  size_bytes=$(echo "$job_status_resp" | jq -r '.result.size_bytes // 0')
  files_added=$(echo "$job_status_resp" | jq -r '.result.files_added // 0')

  if [[ -n "$archive_path" && "$archive_path" == *.zip && -n "$sha256" && "$size_bytes" -gt 0 && "$files_added" -ge 1 ]]; then
    ok "Archive created: $archive_path (files=$files_added size=$size_bytes)"
  else
    no "Unexpected result_json: $(echo "$job_status_resp" | jq -c '.result // {}')"
  fi

  if [[ -n "$archive_path" ]]; then
    host_path="/home/bazari/$archive_path"
    [[ -f "$host_path" ]] && ok "Archive file exists: $host_path" || no "Archive file missing: $host_path"
  fi
else
  no "Job did not execute: $job_status_resp"
fi

echo
if [[ $fail -eq 0 ]]; then
  echo "ALL PASS ($pass)"
  exit 0
else
  echo "FAILURES ($fail)"
  exit 1
fi
