/**
 * n8n Webhook Service
 *
 * Handles webhook registration, delivery, and management for n8n integration.
 */

import { supabase } from '@/lib/supabase/client';
import crypto from 'crypto';
import type {
  WebhookRegistration,
  WebhookPayload,
  WebhookDeliveryResult,
  WebhookEventType,
  WebhookRetryConfig,
  EventPayloadMap,
} from './types';
import { DEFAULT_RETRY_CONFIG } from './types';

// ============================================================================
// Webhook Registration
// ============================================================================

/**
 * Register a new webhook
 */
export async function registerWebhook(input: {
  organizationId: string;
  name: string;
  description?: string;
  url: string;
  eventTypes: WebhookEventType[];
  headers?: Record<string, string>;
  retryConfig?: Partial<WebhookRetryConfig>;
}): Promise<WebhookRegistration> {
  // Generate webhook secret for signature verification
  const secret = crypto.randomBytes(32).toString('hex');

  const registration: Partial<WebhookRegistration> = {
    organizationId: input.organizationId,
    name: input.name,
    description: input.description,
    url: input.url,
    secret,
    eventTypes: input.eventTypes,
    status: 'active',
    headers: input.headers,
    retryConfig: {
      ...DEFAULT_RETRY_CONFIG,
      ...input.retryConfig,
    } as WebhookRetryConfig,
    failureCount: 0,
  };

  // Store in database (using activity_log as a temporary storage)
  // In production, you'd want a dedicated webhooks table
  const insertData = {
    organization_id: input.organizationId,
    activity_type: 'webhook_registration',
    entity_type: 'webhook',
    metadata: registration,
  };

  const { data, error } = await supabase
    .from('activity_log')
    .insert(insertData as never)
    .select()
    .single();

  if (error) {
    throw new Error(`Failed to register webhook: ${error.message}`);
  }

  return {
    id: data.id,
    organizationId: input.organizationId,
    name: input.name,
    description: input.description,
    url: input.url,
    secret,
    eventTypes: input.eventTypes,
    status: 'active',
    headers: input.headers,
    retryConfig: registration.retryConfig as WebhookRetryConfig,
    createdAt: new Date(data.created_at || new Date()),
    updatedAt: new Date(data.created_at || new Date()),
    failureCount: 0,
  };
}

/**
 * Get all webhooks for an organization
 */
export async function getWebhooks(
  organizationId: string
): Promise<WebhookRegistration[]> {
  const { data, error } = await supabase
    .from('activity_log')
    .select('*')
    .eq('organization_id', organizationId)
    .eq('activity_type', 'webhook_registration')
    .eq('entity_type', 'webhook');

  if (error) {
    throw new Error(`Failed to fetch webhooks: ${error.message}`);
  }

  return (data || []).map((row) => {
    const metadata = row.metadata as unknown as Partial<WebhookRegistration>;
    return {
      id: row.id,
      organizationId: row.organization_id,
      name: metadata.name || '',
      description: metadata.description,
      url: metadata.url || '',
      secret: metadata.secret || '',
      eventTypes: metadata.eventTypes || [],
      status: metadata.status || 'active',
      headers: metadata.headers,
      retryConfig: metadata.retryConfig,
      createdAt: new Date(row.created_at || new Date()),
      updatedAt: new Date(row.created_at || new Date()),
      lastTriggeredAt: metadata.lastTriggeredAt ? new Date(metadata.lastTriggeredAt) : undefined,
      failureCount: metadata.failureCount || 0,
    } as WebhookRegistration;
  });
}

/**
 * Update webhook status
 */
export async function updateWebhookStatus(
  webhookId: string,
  status: WebhookRegistration['status']
): Promise<void> {
  const { data: existing, error: fetchError } = await supabase
    .from('activity_log')
    .select('metadata')
    .eq('id', webhookId)
    .single();

  if (fetchError) {
    throw new Error(`Failed to fetch webhook: ${fetchError.message}`);
  }

  const metadata = existing.metadata as Record<string, unknown>;
  metadata.status = status;

  const { error } = await supabase
    .from('activity_log')
    .update({ metadata } as never)
    .eq('id', webhookId);

  if (error) {
    throw new Error(`Failed to update webhook status: ${error.message}`);
  }
}

/**
 * Delete a webhook
 */
export async function deleteWebhook(webhookId: string): Promise<void> {
  const { error } = await supabase
    .from('activity_log')
    .delete()
    .eq('id', webhookId);

  if (error) {
    throw new Error(`Failed to delete webhook: ${error.message}`);
  }
}

// ============================================================================
// Webhook Delivery
// ============================================================================

/**
 * Create a signed webhook payload
 */
export function createSignedPayload<T extends WebhookEventType>(
  eventType: T,
  data: EventPayloadMap[T],
  organizationId: string,
  secret: string
): { payload: WebhookPayload<EventPayloadMap[T]>; signature: string } {
  const payload: WebhookPayload<EventPayloadMap[T]> = {
    id: crypto.randomUUID(),
    timestamp: new Date().toISOString(),
    eventType,
    organizationId,
    data,
  };

  const signature = createSignature(JSON.stringify(payload), secret);

  return { payload, signature };
}

/**
 * Create HMAC signature for webhook payload
 */
export function createSignature(payload: string, secret: string): string {
  return crypto.createHmac('sha256', secret).update(payload).digest('hex');
}

/**
 * Verify webhook signature
 */
export function verifySignature(
  payload: string,
  signature: string,
  secret: string
): boolean {
  const expectedSignature = createSignature(payload, secret);
  return crypto.timingSafeEqual(
    Buffer.from(signature),
    Buffer.from(expectedSignature)
  );
}

/**
 * Deliver webhook to registered URL
 */
export async function deliverWebhook(
  webhook: WebhookRegistration,
  payload: WebhookPayload,
  signature: string,
  attemptNumber = 1
): Promise<WebhookDeliveryResult> {
  const startTime = Date.now();

  try {
    const headers: Record<string, string> = {
      'Content-Type': 'application/json',
      'X-Webhook-Signature': signature,
      'X-Webhook-Event': payload.eventType,
      'X-Webhook-Delivery': payload.id,
      ...webhook.headers,
    };

    const response = await fetch(webhook.url, {
      method: 'POST',
      headers,
      body: JSON.stringify(payload),
    });

    const durationMs = Date.now() - startTime;
    const responseBody = await response.text();

    if (!response.ok) {
      return {
        webhookId: webhook.id,
        success: false,
        statusCode: response.status,
        responseBody,
        error: `HTTP ${response.status}: ${response.statusText}`,
        attemptNumber,
        deliveredAt: new Date(),
        durationMs,
      };
    }

    return {
      webhookId: webhook.id,
      success: true,
      statusCode: response.status,
      responseBody,
      attemptNumber,
      deliveredAt: new Date(),
      durationMs,
    };
  } catch (error) {
    const durationMs = Date.now() - startTime;

    return {
      webhookId: webhook.id,
      success: false,
      error: error instanceof Error ? error.message : 'Unknown error',
      attemptNumber,
      deliveredAt: new Date(),
      durationMs,
    };
  }
}

/**
 * Deliver webhook with retries
 */
export async function deliverWebhookWithRetry(
  webhook: WebhookRegistration,
  payload: WebhookPayload,
  signature: string
): Promise<WebhookDeliveryResult> {
  const config = webhook.retryConfig || DEFAULT_RETRY_CONFIG;
  let lastResult: WebhookDeliveryResult | null = null;

  for (let attempt = 1; attempt <= config.maxRetries + 1; attempt++) {
    lastResult = await deliverWebhook(webhook, payload, signature, attempt);

    if (lastResult.success) {
      return lastResult;
    }

    // Don't retry on final attempt
    if (attempt > config.maxRetries) {
      break;
    }

    // Calculate delay with exponential backoff
    const delay = Math.min(
      config.initialDelayMs * Math.pow(config.backoffMultiplier, attempt - 1),
      config.maxDelayMs
    );

    await new Promise((resolve) => setTimeout(resolve, delay));
  }

  return lastResult!;
}

// ============================================================================
// Event Triggering
// ============================================================================

/**
 * Trigger webhooks for an event
 */
export async function triggerWebhooks<T extends WebhookEventType>(
  eventType: T,
  data: EventPayloadMap[T],
  organizationId: string
): Promise<WebhookDeliveryResult[]> {
  // Get all active webhooks for this organization and event type
  const webhooks = await getWebhooks(organizationId);
  const activeWebhooks = webhooks.filter(
    (w) => w.status === 'active' && w.eventTypes.includes(eventType)
  );

  if (activeWebhooks.length === 0) {
    return [];
  }

  const results: WebhookDeliveryResult[] = [];

  for (const webhook of activeWebhooks) {
    const { payload, signature } = createSignedPayload(
      eventType,
      data,
      organizationId,
      webhook.secret
    );

    const result = await deliverWebhookWithRetry(webhook, payload, signature);
    results.push(result);

    // Log delivery result
    await logWebhookDelivery(webhook.id, eventType, payload, result);

    // Update failure count if needed
    if (!result.success) {
      await incrementFailureCount(webhook.id);
    } else {
      await resetFailureCount(webhook.id);
    }
  }

  return results;
}

/**
 * Log webhook delivery attempt
 */
async function logWebhookDelivery(
  webhookId: string,
  eventType: WebhookEventType,
  payload: WebhookPayload,
  result: WebhookDeliveryResult
): Promise<void> {
  try {
    const logData = {
      activity_type: 'webhook_delivery',
      entity_type: 'webhook',
      entity_id: webhookId,
      metadata: {
        eventType,
        payload,
        result,
      },
    };
    await supabase.from('activity_log').insert(logData as never);
  } catch (error) {
    console.error('[Webhook] Failed to log delivery:', error);
  }
}

/**
 * Increment webhook failure count
 */
async function incrementFailureCount(webhookId: string): Promise<void> {
  try {
    const { data, error: fetchError } = await supabase
      .from('activity_log')
      .select('metadata')
      .eq('id', webhookId)
      .single();

    if (fetchError || !data) return;

    const metadata = data.metadata as Record<string, unknown>;
    metadata.failureCount = ((metadata.failureCount as number) || 0) + 1;

    // Pause webhook if too many failures
    if ((metadata.failureCount as number) >= 10) {
      metadata.status = 'failed';
    }

    await supabase
      .from('activity_log')
      .update({ metadata } as never)
      .eq('id', webhookId);
  } catch (error) {
    console.error('[Webhook] Failed to increment failure count:', error);
  }
}

/**
 * Reset webhook failure count on success
 */
async function resetFailureCount(webhookId: string): Promise<void> {
  try {
    const { data, error: fetchError } = await supabase
      .from('activity_log')
      .select('metadata')
      .eq('id', webhookId)
      .single();

    if (fetchError || !data) return;

    const metadata = data.metadata as Record<string, unknown>;
    metadata.failureCount = 0;
    metadata.lastTriggeredAt = new Date().toISOString();

    await supabase
      .from('activity_log')
      .update({ metadata } as never)
      .eq('id', webhookId);
  } catch (error) {
    console.error('[Webhook] Failed to reset failure count:', error);
  }
}

// ============================================================================
// Convenience Functions for Common Events
// ============================================================================

export const webhookEvents = {
  /**
   * Trigger donor.created event
   */
  donorCreated: (
    organizationId: string,
    data: EventPayloadMap['donor.created']
  ) => triggerWebhooks('donor.created', data, organizationId),

  /**
   * Trigger donor.updated event
   */
  donorUpdated: (
    organizationId: string,
    data: EventPayloadMap['donor.updated']
  ) => triggerWebhooks('donor.updated', data, organizationId),

  /**
   * Trigger donor.intelligence_generated event
   */
  donorIntelligenceGenerated: (
    organizationId: string,
    data: EventPayloadMap['donor.intelligence_generated']
  ) => triggerWebhooks('donor.intelligence_generated', data, organizationId),

  /**
   * Trigger project.created event
   */
  projectCreated: (
    organizationId: string,
    data: EventPayloadMap['project.created']
  ) => triggerWebhooks('project.created', data, organizationId),

  /**
   * Trigger project.updated event
   */
  projectUpdated: (
    organizationId: string,
    data: EventPayloadMap['project.updated']
  ) => triggerWebhooks('project.updated', data, organizationId),

  /**
   * Trigger alignment.calculated event
   */
  alignmentCalculated: (
    organizationId: string,
    data: EventPayloadMap['alignment.calculated']
  ) => triggerWebhooks('alignment.calculated', data, organizationId),

  /**
   * Trigger crm.sync_completed event
   */
  crmSyncCompleted: (
    organizationId: string,
    data: EventPayloadMap['crm.sync_completed']
  ) => triggerWebhooks('crm.sync_completed', data, organizationId),

  /**
   * Trigger crm.sync_failed event
   */
  crmSyncFailed: (
    organizationId: string,
    data: EventPayloadMap['crm.sync_failed']
  ) => triggerWebhooks('crm.sync_failed', data, organizationId),

  /**
   * Trigger relationship.discovered event
   */
  relationshipDiscovered: (
    organizationId: string,
    data: EventPayloadMap['relationship.discovered']
  ) => triggerWebhooks('relationship.discovered', data, organizationId),
};

// ============================================================================
// Export Service Object
// ============================================================================

export const webhookService = {
  register: registerWebhook,
  list: getWebhooks,
  updateStatus: updateWebhookStatus,
  delete: deleteWebhook,
  deliver: deliverWebhook,
  deliverWithRetry: deliverWebhookWithRetry,
  trigger: triggerWebhooks,
  createSignature,
  verifySignature,
  events: webhookEvents,
};
