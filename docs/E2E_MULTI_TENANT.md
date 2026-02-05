# E2E Multi-Tenant Isolation Test

This document describes how to run and interpret the end-to-end multi-tenant isolation test.

## Overview

The E2E test proves that the Libervia Console + Engine stack correctly isolates data between tenants (institutions). It creates **2 institutions** (A and B) and verifies that:

1. **Approval Isolation**: User A cannot see approvals from Institution B
2. **Report API Isolation**: Agent token B cannot report jobs for Institution A
3. **Audit Isolation**: User A cannot see audit events from Institution B
4. **Engine API Isolation**: Tokens are scoped to their institution

## Prerequisites

Before running the test:

1. **Docker Compose stack running**:
   ```bash
   cd /home/bazari/libervia-console
   docker compose -f docker-compose.dev.yml up -d
   ```

2. **Wait for services to be ready** (about 30 seconds):
   ```bash
   # Check Console API
   curl http://localhost:3001/health

   # Check Engine
   curl http://localhost:8001/health
   ```

3. **Required tools**:
   - `curl` (HTTP client)
   - `jq` (JSON processor)

## How to Run

```bash
cd /home/bazari/libervia-console
./scripts/e2e_multi_tenant.sh
```

### Environment Variables

| Variable | Default | Description |
|----------|---------|-------------|
| `CONSOLE_API_URL` | `http://localhost:3001` | Console API base URL |
| `ENGINE_URL` | `http://localhost:8001` | Engine API base URL |

Example with custom URLs:

```bash
CONSOLE_API_URL=http://console:3001 ENGINE_URL=http://engine:8001 ./scripts/e2e_multi_tenant.sh
```

## What to Expect

### Success Output

```
==============================================
 E2E Multi-Tenant Isolation Test
==============================================

Console API: http://localhost:3001
Engine API:  http://localhost:8001
Timestamp:   1706745600

========================================
 Setting up User A
========================================
[INFO] Logging in as dev user...
[INFO] Dev user token obtained: eyJhbGciOiJIUzI1N...
[INFO] Running onboarding for Institution A...
[PASS] Institution A created: 550e8400-e29b-41d4-a716-446655440001
[INFO] Engine Institution A: 660e8400-e29b-41d4-a716-446655440001
[INFO] Agent Token A obtained: agent_token_a_xxx...

========================================
 Setting up User B
========================================
[INFO] Attempting to register User B...
[INFO] Running onboarding for Institution B...
[PASS] Institution B created: 550e8400-e29b-41d4-a716-446655440002

========================================
 Testing Approval Isolation
========================================
[INFO] Test 1: User A lists approvals for Institution A...
[PASS] User A can list Institution A approvals (count: 0)
[INFO] Test 2: User A tries to list approvals for Institution B...
[PASS] User A correctly denied access to Institution B approvals (403)

========================================
 Testing Report API Isolation
========================================
[INFO] Test: Agent B tries to report job for Institution A...
[PASS] Agent B correctly denied report to Institution A (status: 403)

========================================
 Testing Audit Isolation
========================================
[INFO] Test 1: User A lists audit for Institution A...
[PASS] User A can list Institution A audit timeline
[INFO] Test 2: User A tries to list audit for Institution B...
[PASS] User A correctly denied access to Institution B audit (403)

========================================
 Testing Direct Engine API Isolation
========================================
[INFO] Test: Token A tries to access Institution B via Engine...
[PASS] Token A correctly denied access to Institution B Engine data

========================================
 Test Summary
========================================

  Passed: 7
  Failed: 0

All isolation tests passed!

Verified:
  - Approval isolation between institutions
  - Report API cross-institution blocking
  - Audit isolation between institutions
  - Direct Engine API tenant isolation
```

### Exit Codes

| Code | Meaning |
|------|---------|
| `0` | All tests passed |
| `1` | Setup failed (could not create users/institutions) |
| `2` | One or more isolation tests failed |

## Test Phases

### Phase 1: Setup

Creates two isolated environments:

1. **User A** logs in (dev mode uses `dev@libervia.xyz`)
2. **Institution A** is created via onboarding
3. **User B** registration attempted (may use same dev user)
4. **Institution B** is created via onboarding

Each institution receives:
- Unique `institution_id` (Console API)
- Unique `engine_institution_id` (Engine)
- Unique `agent_token` (first onboarding only)

### Phase 2: Create Test Data

Creates a file operation in Institution A:

1. Proposes a delete operation via Engine API
2. Submits for approval (creates pending approval)

This creates data that should be visible ONLY to Institution A members.

### Phase 3: Approval Isolation

Tests the `/approvals` endpoint:

| Test | Expected Result |
|------|-----------------|
| User A lists Institution A approvals | 200 OK with approvals |
| User A lists Institution B approvals | 403 Forbidden |
| User B lists Institution A approvals | 403 Forbidden |

### Phase 4: Report API Isolation

Tests the `/runtime/jobs/{id}/report` endpoint:

| Test | Expected Result |
|------|-----------------|
| Agent B reports job for Institution A | 403 Forbidden |

### Phase 5: Audit Isolation

Tests the `/audit/timeline` endpoint:

| Test | Expected Result |
|------|-----------------|
| User A lists Institution A audit | 200 OK |
| User A lists Institution B audit | 403 Forbidden |

### Phase 6: Direct Engine Isolation

Tests Engine API directly (bypassing Console API):

| Test | Expected Result |
|------|-----------------|
| Token A accesses Institution B via Engine | 403 Forbidden |

## Troubleshooting

### "Dev login failed"

The Console API is not running or the dev user was not auto-created:

```bash
# Check Console API logs
docker compose -f docker-compose.dev.yml logs console-api

# Verify dev mode is enabled
grep DEV_MODE docker-compose.dev.yml
```

### "Onboarding failed"

Check that the Engine is running and the bundle is loaded:

```bash
# Check Engine logs
docker compose -f docker-compose.dev.yml logs engine

# Verify bundle path
docker compose -f docker-compose.dev.yml exec engine ls /app/bundles/personal_ops
```

### "Agent tokens not available"

Agent tokens are only returned on the FIRST onboarding call. If you've already run onboarding:

1. Reset the database:
   ```bash
   docker compose -f docker-compose.dev.yml down -v
   docker compose -f docker-compose.dev.yml up -d
   ```

2. Or manually delete the institution from the database

### "Unexpected 500 errors"

Check service logs for stack traces:

```bash
docker compose -f docker-compose.dev.yml logs --tail=100
```

## Architecture

```
                                    E2E Test Script
                                          │
                    ┌─────────────────────┴─────────────────────┐
                    │                                           │
                    ▼                                           ▼
            ┌───────────────┐                          ┌───────────────┐
            │ Console API   │                          │    Engine     │
            │ :3001         │                          │    :8001      │
            ├───────────────┤                          ├───────────────┤
            │ /auth/login   │                          │ /personal/... │
            │ /onboarding   │──────proxy──────────────▶│ /approvals/.. │
            │ /approvals    │                          │ /runtime/...  │
            │ /audit        │                          │               │
            └───────────────┘                          └───────────────┘
                    │                                           │
                    ▼                                           ▼
            ┌───────────────┐                          ┌───────────────┐
            │  PostgreSQL   │                          │  State Store  │
            │  (Console DB) │                          │  (In-memory)  │
            └───────────────┘                          └───────────────┘

Isolation Boundary:
┌─────────────────────────────────────────────────────────────────────┐
│ Institution A                                                       │
│  - institution_id: 550e8400-...                                    │
│  - engine_institution_id: 660e8400-...                             │
│  - agent_token: scoped to this institution                         │
│  - approvals: only visible to members                              │
│  - audit events: only visible to members                           │
└─────────────────────────────────────────────────────────────────────┘
                              ✖ No cross-access ✖
┌─────────────────────────────────────────────────────────────────────┐
│ Institution B                                                       │
│  - institution_id: 550e8400-... (different)                        │
│  - engine_institution_id: 660e8400-... (different)                 │
│  - agent_token: scoped to this institution                         │
│  - approvals: only visible to members                              │
│  - audit events: only visible to members                           │
└─────────────────────────────────────────────────────────────────────┘
```

## Security Guarantees

This test verifies the following security properties:

1. **Data Isolation**: No data leakage between institutions
2. **Token Scoping**: Tokens are valid only for their institution
3. **Authorization Enforcement**: 403 returned for cross-institution access
4. **Defense in Depth**: Both Console API and Engine enforce isolation

## Extending the Test

To add new isolation tests, edit [e2e_multi_tenant.sh](../scripts/e2e_multi_tenant.sh):

```bash
test_new_feature_isolation() {
    log_section "Testing New Feature Isolation"

    # Add your test cases here
    log_info "Test: Description..."
    local response=$(http_get "$CONSOLE_API_URL/new-feature?institution_id=$INSTITUTION_A_ID" "$TOKEN_A")
    # ... validate response
}

# Add to main():
test_new_feature_isolation
```
