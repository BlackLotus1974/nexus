/**
 * n8n Workflow Integration Types
 *
 * Types for n8n workflow automation integration with Nexus.
 */

// ============================================================================
// Webhook Types
// ============================================================================

/**
 * Webhook event types that can trigger workflows
 */
export type WebhookEventType =
  | 'donor.created'
  | 'donor.updated'
  | 'donor.intelligence_generated'
  | 'project.created'
  | 'project.updated'
  | 'alignment.calculated'
  | 'crm.sync_completed'
  | 'crm.sync_failed'
  | 'relationship.discovered'
  | 'custom';

/**
 * Status of a webhook registration
 */
export type WebhookStatus = 'active' | 'paused' | 'failed' | 'deleted';

/**
 * Webhook registration configuration
 */
export interface WebhookRegistration {
  id: string;
  organizationId: string;
  name: string;
  description?: string;
  url: string;
  secret: string;
  eventTypes: WebhookEventType[];
  status: WebhookStatus;
  headers?: Record<string, string>;
  retryConfig?: WebhookRetryConfig;
  createdAt: Date;
  updatedAt: Date;
  lastTriggeredAt?: Date;
  failureCount: number;
}

/**
 * Retry configuration for webhook delivery
 */
export interface WebhookRetryConfig {
  maxRetries: number;
  initialDelayMs: number;
  maxDelayMs: number;
  backoffMultiplier: number;
}

/**
 * Payload sent to webhooks
 */
export interface WebhookPayload<T = unknown> {
  id: string;
  timestamp: string;
  eventType: WebhookEventType;
  organizationId: string;
  data: T;
  metadata?: Record<string, unknown>;
}

/**
 * Result of a webhook delivery attempt
 */
export interface WebhookDeliveryResult {
  webhookId: string;
  success: boolean;
  statusCode?: number;
  responseBody?: string;
  error?: string;
  attemptNumber: number;
  deliveredAt: Date;
  durationMs: number;
}

/**
 * Webhook delivery log entry
 */
export interface WebhookDeliveryLog {
  id: string;
  webhookId: string;
  eventType: WebhookEventType;
  payload: WebhookPayload;
  result: WebhookDeliveryResult;
  createdAt: Date;
}

// ============================================================================
// n8n Workflow Types
// ============================================================================

/**
 * n8n workflow definition (simplified)
 */
export interface N8nWorkflow {
  id: string;
  name: string;
  description?: string;
  active: boolean;
  webhookUrl?: string;
  createdAt: Date;
  updatedAt: Date;
}

/**
 * n8n workflow execution status
 */
export type WorkflowExecutionStatus =
  | 'running'
  | 'success'
  | 'error'
  | 'waiting'
  | 'canceled';

/**
 * n8n workflow execution result
 */
export interface WorkflowExecution {
  id: string;
  workflowId: string;
  status: WorkflowExecutionStatus;
  startedAt: Date;
  stoppedAt?: Date;
  mode: 'manual' | 'trigger' | 'retry';
  data?: Record<string, unknown>;
  error?: {
    message: string;
    stack?: string;
  };
}

// ============================================================================
// Integration Configuration Types
// ============================================================================

/**
 * n8n connection configuration
 */
export interface N8nConfig {
  baseUrl: string;
  apiKey?: string;
  webhookBasePath?: string;
  timeout?: number;
}

/**
 * Workflow template definitions for common operations
 */
export interface WorkflowTemplate {
  id: string;
  name: string;
  description: string;
  eventType: WebhookEventType;
  defaultConfig: Record<string, unknown>;
}

// ============================================================================
// Event Payload Types (specific data shapes for each event)
// ============================================================================

export interface DonorCreatedPayload {
  donorId: string;
  name: string;
  location?: string;
  organizationId: string;
}

export interface DonorUpdatedPayload {
  donorId: string;
  name: string;
  changes: Record<string, { old: unknown; new: unknown }>;
  organizationId: string;
}

export interface DonorIntelligenceGeneratedPayload {
  donorId: string;
  name: string;
  intelligenceSummary: string;
  confidence: number;
  organizationId: string;
}

export interface ProjectCreatedPayload {
  projectId: string;
  name: string;
  description?: string;
  fundingGoal?: number;
  organizationId: string;
}

export interface ProjectUpdatedPayload {
  projectId: string;
  name: string;
  changes: Record<string, { old: unknown; new: unknown }>;
  organizationId: string;
}

export interface AlignmentCalculatedPayload {
  donorId: string;
  donorName: string;
  projectId: string;
  projectName: string;
  alignmentScore: number;
  organizationId: string;
}

export interface CRMSyncCompletedPayload {
  provider: string;
  syncId: string;
  recordsProcessed: number;
  recordsCreated: number;
  recordsUpdated: number;
  recordsFailed: number;
  durationMs: number;
  organizationId: string;
}

export interface CRMSyncFailedPayload {
  provider: string;
  syncId: string;
  error: string;
  failedAt: string;
  organizationId: string;
}

export interface RelationshipDiscoveredPayload {
  sourcedonorId: string;
  targetDonorId: string;
  connectionType: string;
  pathScore: number;
  organizationId: string;
}

// ============================================================================
// Type Maps
// ============================================================================

/**
 * Maps event types to their payload types
 */
export type EventPayloadMap = {
  'donor.created': DonorCreatedPayload;
  'donor.updated': DonorUpdatedPayload;
  'donor.intelligence_generated': DonorIntelligenceGeneratedPayload;
  'project.created': ProjectCreatedPayload;
  'project.updated': ProjectUpdatedPayload;
  'alignment.calculated': AlignmentCalculatedPayload;
  'crm.sync_completed': CRMSyncCompletedPayload;
  'crm.sync_failed': CRMSyncFailedPayload;
  'relationship.discovered': RelationshipDiscoveredPayload;
  custom: Record<string, unknown>;
};

/**
 * Default retry configuration
 */
export const DEFAULT_RETRY_CONFIG: WebhookRetryConfig = {
  maxRetries: 3,
  initialDelayMs: 1000,
  maxDelayMs: 30000,
  backoffMultiplier: 2,
};

/**
 * Default n8n configuration
 */
export const DEFAULT_N8N_CONFIG: Partial<N8nConfig> = {
  webhookBasePath: '/webhook',
  timeout: 30000, // 30 seconds
};
