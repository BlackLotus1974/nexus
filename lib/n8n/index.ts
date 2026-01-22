/**
 * n8n Workflow Integration Module
 *
 * Provides integration with n8n workflow automation platform for:
 * - Webhook registration and delivery
 * - Workflow triggering
 * - Event-driven automation
 *
 * @example
 * ```typescript
 * import { webhookService, n8nClient } from '@/lib/n8n';
 *
 * // Register a webhook
 * const webhook = await webhookService.register({
 *   organizationId: 'org-123',
 *   name: 'Donor Created Notification',
 *   url: 'https://n8n.example.com/webhook/donor-created',
 *   eventTypes: ['donor.created'],
 * });
 *
 * // Trigger an event
 * await webhookService.events.donorCreated('org-123', {
 *   donorId: 'donor-456',
 *   name: 'John Doe',
 *   organizationId: 'org-123',
 * });
 *
 * // Configure n8n client
 * n8nClient.configure({
 *   baseUrl: 'https://n8n.example.com',
 *   apiKey: 'your-api-key',
 * });
 *
 * // Trigger a workflow via webhook
 * const result = await n8nClient.webhook.trigger('/donor-processing', {
 *   donorId: 'donor-456',
 * });
 * ```
 */

// Types
export * from './types';

// Webhook service
export {
  webhookService,
  webhookEvents,
  registerWebhook,
  getWebhooks,
  updateWebhookStatus,
  deleteWebhook,
  deliverWebhook,
  deliverWebhookWithRetry,
  triggerWebhooks,
  createSignature,
  verifySignature,
  createSignedPayload,
} from './webhook';

// n8n API client
export {
  n8nClient,
  configureN8nClient,
  getN8nConfig,
  isN8nConfigured,
  listWorkflows,
  getWorkflow,
  activateWorkflow,
  deactivateWorkflow,
  listExecutions,
  getExecution,
  retryExecution,
  deleteExecution,
  triggerWebhookWorkflow,
  triggerTestWebhook,
  healthCheck,
} from './client';
