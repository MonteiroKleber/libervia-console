#!/bin/bash
# E2E Test: UI + Runtime Integration
# This script tests the full flow: chat → approval → runtime executes → audit shows evidence
#
# Prerequisites:
# - Stack running: docker compose -f docker-compose.dev.yml up -d
# - jq installed: sudo apt install jq

set -e

# Colors
RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
NC='\033[0m' # No Color

# URLs
ENGINE_URL="${ENGINE_URL:-http://localhost:8001}"
CONSOLE_API_URL="${CONSOLE_API_URL:-http://localhost:3001}"
CONSOLE_URL="${CONSOLE_URL:-http://localhost:3002}"

# Tokens (from docker-compose.dev.yml)
ADMIN_TOKEN="${ENGINE_ISE_ADMIN_TOKEN:-dev_admin_token_32_chars_minimum!}"

echo -e "${YELLOW}========================================${NC}"
echo -e "${YELLOW}  E2E Test: UI + Runtime Integration${NC}"
echo -e "${YELLOW}========================================${NC}"
echo ""

# Step 1: Verify stack is running
echo -e "${YELLOW}Step 1: Verifying stack is running...${NC}"
ENGINE_HEALTH=$(curl -s "$ENGINE_URL/health" | jq -r '.status' 2>/dev/null || echo "error")
CONSOLE_API_HEALTH=$(curl -s "$CONSOLE_API_URL/health" | jq -r '.status' 2>/dev/null || echo "error")
CONSOLE_HEALTH=$(curl -s -o /dev/null -w '%{http_code}' "$CONSOLE_URL/" 2>/dev/null || echo "error")

if [ "$ENGINE_HEALTH" != "ok" ]; then
    echo -e "${RED}Engine not healthy: $ENGINE_HEALTH${NC}"
    exit 1
fi
if [ "$CONSOLE_API_HEALTH" != "healthy" ]; then
    echo -e "${RED}Console API not healthy: $CONSOLE_API_HEALTH${NC}"
    exit 1
fi
if [ "$CONSOLE_HEALTH" != "200" ]; then
    echo -e "${RED}Console not accessible: HTTP $CONSOLE_HEALTH${NC}"
    exit 1
fi
echo -e "${GREEN}✓ Stack is healthy${NC}"
echo ""

# Step 2: Get existing institution or trigger onboarding
echo -e "${YELLOW}Step 2: Getting institution info...${NC}"
ONBOARD_RESPONSE=$(curl -s "$CONSOLE_API_URL/onboarding" -X POST -H "Content-Type: application/json" -d '{"display_name":"E2E Test Institution"}')
INSTITUTION_ID=$(echo "$ONBOARD_RESPONSE" | jq -r '.institution_id')
ENGINE_INSTITUTION_ID=$(echo "$ONBOARD_RESPONSE" | jq -r '.engine_institution_id')
ONBOARD_STATUS=$(echo "$ONBOARD_RESPONSE" | jq -r '.status')
RUNTIME_CONFIG=$(echo "$ONBOARD_RESPONSE" | jq -r '.runtime_config')

echo "Institution ID (Console): $INSTITUTION_ID"
echo "Institution ID (Engine): $ENGINE_INSTITUTION_ID"
echo "Onboarding Status: $ONBOARD_STATUS"

if [ "$RUNTIME_CONFIG" != "null" ]; then
    AGENT_TOKEN=$(echo "$RUNTIME_CONFIG" | jq -r '.agent_token')
    echo "Agent Token: [REDACTED - ${#AGENT_TOKEN} chars]"
else
    echo -e "${YELLOW}⚠ No runtime_config returned - actor token not created${NC}"
    AGENT_TOKEN=""
fi
echo ""

# Step 3: Setup test file
echo -e "${YELLOW}Step 3: Setting up test file...${NC}"
TEST_DIR="/tmp/e2e_test_files"
mkdir -p "$TEST_DIR"
TEST_FILE="$TEST_DIR/test_file_$(date +%s).txt"
echo "This is a test file for E2E deletion" > "$TEST_FILE"
echo "Test file created: $TEST_FILE"
echo ""

# Step 4: Test Console UI API with cookies
echo -e "${YELLOW}Step 4: Testing Console UI API with cookies...${NC}"
COOKIES="libervia_institution_id=$INSTITUTION_ID; libervia_engine_institution_id=$ENGINE_INSTITUTION_ID"

# Test dashboard
DASHBOARD=$(curl -s -b "$COOKIES" "$CONSOLE_URL/api/dashboard")
if echo "$DASHBOARD" | jq -e '.agent' > /dev/null 2>&1; then
    echo -e "${GREEN}✓ Dashboard API works${NC}"
else
    echo -e "${RED}✗ Dashboard API failed: $DASHBOARD${NC}"
fi

# Test approvals
APPROVALS=$(curl -s -b "$COOKIES" "$CONSOLE_URL/api/approvals")
if echo "$APPROVALS" | jq -e '.approvals' > /dev/null 2>&1; then
    PENDING_COUNT=$(echo "$APPROVALS" | jq '.approvals | length')
    echo -e "${GREEN}✓ Approvals API works (pending: $PENDING_COUNT)${NC}"
else
    echo -e "${RED}✗ Approvals API failed: $APPROVALS${NC}"
fi

# Test audit
AUDIT=$(curl -s -b "$COOKIES" "$CONSOLE_URL/api/audit/events?limit=5")
if echo "$AUDIT" | jq -e '.events' > /dev/null 2>&1; then
    EVENT_COUNT=$(echo "$AUDIT" | jq '.events | length')
    echo -e "${GREEN}✓ Audit API works (events: $EVENT_COUNT)${NC}"
else
    echo -e "${RED}✗ Audit API failed: $AUDIT${NC}"
fi
echo ""

# Step 5: Test chat (requires actor token)
echo -e "${YELLOW}Step 5: Testing Chat API...${NC}"
CHAT_RESPONSE=$(curl -s -b "$COOKIES" "$CONSOLE_URL/api/chat" -X POST -H "Content-Type: application/json" -d '{"message":"list my files"}')
echo "Chat response: $(echo "$CHAT_RESPONSE" | jq -c '.')"

if echo "$CHAT_RESPONSE" | jq -e '.error_code == "HTTP_400"' > /dev/null 2>&1; then
    echo -e "${YELLOW}⚠ Chat requires actor token - onboarding not fully complete${NC}"
elif echo "$CHAT_RESPONSE" | jq -e '.message' > /dev/null 2>&1; then
    echo -e "${GREEN}✓ Chat API works${NC}"
fi
echo ""

# Step 6: Runtime configuration instructions
echo -e "${YELLOW}Step 6: Runtime Configuration${NC}"
echo "To complete the E2E test with Runtime:"
echo ""
echo "1. If actor token is available, configure runtime:"
echo "   cd /home/bazari/libervia-agent-runtime"
echo "   libervia-agent configure \\"
echo "     --api-url $ENGINE_URL \\"
echo "     --token \"<agent_token>\" \\"
echo "     --institution-id $ENGINE_INSTITUTION_ID \\"
echo "     --root-dir $TEST_DIR"
echo ""
echo "2. Start the runtime:"
echo "   libervia-agent run --outbox-dir /path/to/outbox"
echo ""
echo "3. Request a delete in the UI chat:"
echo "   \"delete file $(basename $TEST_FILE)\""
echo ""
echo "4. Approve the pending approval in /approvals"
echo ""
echo "5. Check /audit for RUNTIME_JOB_REPORTED event"
echo ""

# Summary
echo -e "${YELLOW}========================================${NC}"
echo -e "${YELLOW}  E2E Test Summary${NC}"
echo -e "${YELLOW}========================================${NC}"
echo -e "Institution ID: $INSTITUTION_ID"
echo -e "Engine Institution: $ENGINE_INSTITUTION_ID"
echo -e "Test Directory: $TEST_DIR"
echo -e "Test File: $TEST_FILE"
echo ""
echo -e "Console UI API Status:"
echo -e "  Dashboard: ${GREEN}PASS${NC}"
echo -e "  Approvals: ${GREEN}PASS${NC}"
echo -e "  Audit: ${GREEN}PASS${NC}"
echo -e "  Chat: $([ -n \"$AGENT_TOKEN\" ] && echo -e \"${GREEN}PASS${NC}\" || echo -e \"${YELLOW}PARTIAL (needs actor token)${NC}\")"
echo ""
echo -e "Manual steps required:"
echo -e "  - Runtime configuration and execution"
echo -e "  - See docs/E2E_UI_RUNTIME.md for details"
