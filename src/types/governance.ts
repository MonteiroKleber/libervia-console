/**
 * Governance status types - Engine authority states
 */
export type GovernanceStatus =
  | 'allowed'
  | 'needs_approval'
  | 'denied'
  | 'executing'
  | 'executed'
  | 'failed'

export type ApprovalStatus = 'pending' | 'approved' | 'rejected' | 'expired' | 'canceled'

/**
 * Timeline event from Engine/Audit
 */
export interface TimelineEvent {
  event_id: string
  event_type: string
  timestamp: string
  actor_id?: string
  actor_roles?: string[]
  case_id?: string
  step?: string
  payload?: Record<string, unknown>
}

/**
 * Approval item from Engine
 */
export interface ApprovalItem {
  approval_id: string
  case_id: string
  rule_name: string
  display_name?: string
  operation_type: string
  target_path?: string
  reason?: string
  requested_by: string
  requested_at: string
  status: ApprovalStatus
  decided_by?: string
  decided_at?: string
  decision_reason?: string
}

/**
 * Institution info
 */
export interface Institution {
  id: string
  slug: string
  display_name: string
  engine_institution_id?: string
  created_at: string
}

/**
 * Onboarding step status
 */
export interface OnboardingStep {
  id: string
  title: string
  description: string
  status: 'pending' | 'in_progress' | 'completed' | 'error'
  errorMessage?: string
}

export type JobStatus = 'queued' | 'executing' | 'executed' | 'failed'

/**
 * Job result from runtime execution
 */
export interface JobResult {
  path?: string
  entries?: Array<{
    name: string
    type: 'file' | 'dir'
    size?: number
    modified?: number
  }>
  total?: number
  truncated?: boolean
  // For scan duplicates
  files_scanned?: number
  duplicate_groups?: number
  total_wasted_bytes?: number
  duplicates?: Array<{
    hash: string
    files: Array<{ path: string; size: number }>
    count: number
    wasted_bytes: number
  }>
  // For suggest cleanup
  files_analyzed?: number
  total_recoverable_bytes?: number
  suggestions?: {
    duplicates?: Array<unknown>
    temp_files?: Array<{ path: string; reason: string; size: number }>
    empty_files?: Array<{ path: string; reason: string; size: number }>
    cache_dirs?: Array<{ path: string; reason: string; size: number }>
  }
  summary?: {
    duplicates?: number
    temp_files?: number
    empty_files?: number
    cache_dirs?: number
  }
  // For files.read
  content?: string
  size?: number
  // For files.stat
  exists?: boolean
  type?: string
  mtime?: string
  ctime?: string
  mode?: number
  // For files.hash
  hash?: string
  // For files.search
  pattern?: string
  matches?: Array<{ path: string; type: string }>
  // For files.plan.create
  plan_id?: string
  plan_mode?: string
  actions?: Array<{
    action: 'delete' | 'move' | 'rename'
    path?: string
    source?: string
    dest?: string
    reason: string
    size?: number
    original?: string
    hash?: string
  }>
  actions_count?: number
  plan_hash?: string
  stats?: {
    files_analyzed?: number
    total_bytes_recoverable?: number
    by_reason?: Record<string, number>
  }
  // For files.plan.apply
  applied_count?: number
  failed_count?: number
  total_actions?: number
  applied_actions?: Array<{
    action: string
    path?: string
    source?: string
    dest?: string
    status: string
  }>
  failures?: Array<{
    action: string
    path?: string
    source?: string
    dest?: string
    error: string
  }>
}

/**
 * Chat message from system
 */
export interface ChatMessage {
  id: string
  type: 'user' | 'system'
  content: string
  timestamp: string
  // System message fields
  intent?: {
    action: string
    target?: string
    params?: Record<string, unknown>
  }
  decision?: GovernanceStatus
  approval_id?: string
  case_id?: string
  job_id?: string
  job_status?: JobStatus
  job_result?: JobResult
  error_code?: string
  error_message?: string
}
