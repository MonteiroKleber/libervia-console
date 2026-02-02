# personal-ops Bundle

Governance bundle for personal file operations with approval workflows.

## Source of Truth

**The IDL file is the single source of truth for all governance rules.**

```
idl/personal_ops/
├── v1.0.0/
│   ├── source.idl       <-- EDIT THIS (source of truth)
│   ├── source.ir.json   <-- Generated IR (intermediate)
│   └── README.md        <-- IDL version docs
├── *.json               <-- Generated artifacts (DO NOT EDIT)
├── openapi.yaml         <-- Generated (DO NOT EDIT)
├── bundle.manifest.json <-- Generated (DO NOT EDIT)
└── README.md            <-- This file
```

## RULE: Never Edit Artifacts Manually

The following files are **generated** from `source.idl`:

- `operations.json`
- `rbac.json`
- `mandates.json`
- `approvals.json`
- `autonomy.json`
- `workflows.json`
- `sod.json`
- `invariants.json`
- `policies.json`
- `contract_ledger.json`
- `openapi.yaml`
- `bundle.manifest.json`

**DO NOT** edit these files directly. Any manual changes will be overwritten.

## Build Pipeline

### Build from IDL

```bash
./scripts/idl_build_personal_ops.sh
```

This script:
1. Compiles `source.idl` -> `source.ir.json` (IR)
2. Compiles IR -> bundle artifacts
3. Verifies bundle integrity

### Check Consistency

```bash
./scripts/idl_check_personal_ops.sh
```

This script:
1. Fails if any `.bak*` files exist
2. Runs the build
3. Fails if there are uncommitted changes after build (artifacts out of sync)

## Pre-commit Hook

To enable automatic checks before each commit:

```bash
git config core.hooksPath .githooks
```

The hook will **block commits** when:
- `.bak*` files exist in `idl/personal_ops/`
- Artifact files are changed without corresponding `source.idl` change

## Workflow: Making Governance Changes

1. **Edit** `idl/personal_ops/v1.0.0/source.idl`
2. **Build** `./scripts/idl_build_personal_ops.sh`
3. **Review** generated changes: `git diff idl/personal_ops/`
4. **Stage all**: `git add idl/personal_ops/`
5. **Commit**: both source.idl and artifacts together

## Operations

| Operation | Type | Requires Approval |
|-----------|------|-------------------|
| `files_list` | List files | No (allow) |
| `files_scan_duplicates` | Detect duplicates | No (allow) |
| `files_suggest_cleanup` | Suggest cleanup | No (allow) |
| `files_rename_*` | Rename file | Yes (approval) |
| `files_move_*` | Move file | Yes (approval) |
| `files_delete_*` | Delete file | Yes (approval) |

## Invariants

- `OperationMustHaveSource`: All operations must have source path
- `DeleteMustHaveReason`: Delete must have justification
- `RenameMustHaveTarget`: Rename must have new name
- `MoveMustHaveTarget`: Move must have destination

## Separation of Duties

- `ProposerCannotSelfApprove`: Proposer cannot approve own operation
