/**
 * n8n API Client
 *
 * Client for interacting with n8n workflow automation platform.
 */

import type {
  N8nConfig,
  N8nWorkflow,
  WorkflowExecution,
} from './types';
import { DEFAULT_N8N_CONFIG } from './types';

// ============================================================================
// Client Configuration
// ============================================================================

let clientConfig: N8nConfig | null = null;

/**
 * Configure the n8n client
 */
export function configureN8nClient(config: N8nConfig): void {
  clientConfig = {
    ...DEFAULT_N8N_CONFIG,
    ...config,
  };
}

/**
 * Get the current client configuration
 */
export function getN8nConfig(): N8nConfig | null {
  return clientConfig;
}

/**
 * Check if n8n client is configured
 */
export function isN8nConfigured(): boolean {
  return clientConfig !== null && !!clientConfig.baseUrl;
}

// ============================================================================
// HTTP Utilities
// ============================================================================

async function n8nFetch<T>(
  endpoint: string,
  options: RequestInit = {}
): Promise<T> {
  if (!clientConfig) {
    throw new Error('n8n client not configured. Call configureN8nClient first.');
  }

  const url = `${clientConfig.baseUrl}${endpoint}`;
  const headers: Record<string, string> = {
    'Content-Type': 'application/json',
    ...(options.headers as Record<string, string>),
  };

  if (clientConfig.apiKey) {
    headers['X-N8N-API-KEY'] = clientConfig.apiKey;
  }

  const controller = new AbortController();
  const timeout = setTimeout(() => {
    controller.abort();
  }, clientConfig.timeout || 30000);

  try {
    const response = await fetch(url, {
      ...options,
      headers,
      signal: controller.signal,
    });

    if (!response.ok) {
      const errorBody = await response.text();
      throw new Error(`n8n API error: ${response.status} ${response.statusText} - ${errorBody}`);
    }

    return response.json();
  } finally {
    clearTimeout(timeout);
  }
}

// ============================================================================
// Workflow API
// ============================================================================

/**
 * List all workflows
 */
export async function listWorkflows(): Promise<N8nWorkflow[]> {
  const data = await n8nFetch<{ data: N8nWorkflow[] }>('/api/v1/workflows');
  return data.data || [];
}

/**
 * Get a specific workflow
 */
export async function getWorkflow(workflowId: string): Promise<N8nWorkflow | null> {
  try {
    return await n8nFetch<N8nWorkflow>(`/api/v1/workflows/${workflowId}`);
  } catch (error) {
    if ((error as Error).message.includes('404')) {
      return null;
    }
    throw error;
  }
}

/**
 * Activate a workflow
 */
export async function activateWorkflow(workflowId: string): Promise<N8nWorkflow> {
  return n8nFetch<N8nWorkflow>(`/api/v1/workflows/${workflowId}/activate`, {
    method: 'POST',
  });
}

/**
 * Deactivate a workflow
 */
export async function deactivateWorkflow(workflowId: string): Promise<N8nWorkflow> {
  return n8nFetch<N8nWorkflow>(`/api/v1/workflows/${workflowId}/deactivate`, {
    method: 'POST',
  });
}

// ============================================================================
// Execution API
// ============================================================================

/**
 * List workflow executions
 */
export async function listExecutions(options?: {
  workflowId?: string;
  status?: WorkflowExecution['status'];
  limit?: number;
}): Promise<WorkflowExecution[]> {
  const params = new URLSearchParams();

  if (options?.workflowId) {
    params.append('workflowId', options.workflowId);
  }
  if (options?.status) {
    params.append('status', options.status);
  }
  if (options?.limit) {
    params.append('limit', String(options.limit));
  }

  const queryString = params.toString();
  const endpoint = `/api/v1/executions${queryString ? `?${queryString}` : ''}`;

  const data = await n8nFetch<{ data: WorkflowExecution[] }>(endpoint);
  return data.data || [];
}

/**
 * Get a specific execution
 */
export async function getExecution(executionId: string): Promise<WorkflowExecution | null> {
  try {
    return await n8nFetch<WorkflowExecution>(`/api/v1/executions/${executionId}`);
  } catch (error) {
    if ((error as Error).message.includes('404')) {
      return null;
    }
    throw error;
  }
}

/**
 * Retry a failed execution
 */
export async function retryExecution(executionId: string): Promise<WorkflowExecution> {
  return n8nFetch<WorkflowExecution>(`/api/v1/executions/${executionId}/retry`, {
    method: 'POST',
  });
}

/**
 * Delete an execution
 */
export async function deleteExecution(executionId: string): Promise<void> {
  await n8nFetch<void>(`/api/v1/executions/${executionId}`, {
    method: 'DELETE',
  });
}

// ============================================================================
// Webhook Trigger API
// ============================================================================

/**
 * Trigger a webhook workflow
 */
export async function triggerWebhookWorkflow<T = unknown>(
  webhookPath: string,
  data: Record<string, unknown>
): Promise<T> {
  if (!clientConfig) {
    throw new Error('n8n client not configured. Call configureN8nClient first.');
  }

  const basePath = clientConfig.webhookBasePath || '/webhook';
  const url = `${clientConfig.baseUrl}${basePath}${webhookPath}`;

  const controller = new AbortController();
  const timeout = setTimeout(() => {
    controller.abort();
  }, clientConfig.timeout || 30000);

  try {
    const response = await fetch(url, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify(data),
      signal: controller.signal,
    });

    if (!response.ok) {
      const errorBody = await response.text();
      throw new Error(`n8n webhook error: ${response.status} ${response.statusText} - ${errorBody}`);
    }

    const contentType = response.headers.get('content-type');
    if (contentType?.includes('application/json')) {
      return response.json();
    }

    return response.text() as unknown as T;
  } finally {
    clearTimeout(timeout);
  }
}

/**
 * Trigger a test webhook (for testing workflows)
 */
export async function triggerTestWebhook<T = unknown>(
  webhookPath: string,
  data: Record<string, unknown>
): Promise<T> {
  if (!clientConfig) {
    throw new Error('n8n client not configured. Call configureN8nClient first.');
  }

  const url = `${clientConfig.baseUrl}/webhook-test${webhookPath}`;

  const controller = new AbortController();
  const timeout = setTimeout(() => {
    controller.abort();
  }, clientConfig.timeout || 30000);

  try {
    const response = await fetch(url, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify(data),
      signal: controller.signal,
    });

    const contentType = response.headers.get('content-type');
    if (contentType?.includes('application/json')) {
      return response.json();
    }

    return response.text() as unknown as T;
  } finally {
    clearTimeout(timeout);
  }
}

// ============================================================================
// Health Check
// ============================================================================

/**
 * Check if n8n is healthy and reachable
 */
export async function healthCheck(): Promise<{
  healthy: boolean;
  version?: string;
  error?: string;
}> {
  if (!clientConfig) {
    return { healthy: false, error: 'n8n client not configured' };
  }

  try {
    // n8n has a /healthz endpoint
    const controller = new AbortController();
    const timeout = setTimeout(() => {
      controller.abort();
    }, 5000); // 5 second timeout for health check

    try {
      const response = await fetch(`${clientConfig.baseUrl}/healthz`, {
        signal: controller.signal,
      });

      if (response.ok) {
        return { healthy: true };
      }

      return {
        healthy: false,
        error: `n8n returned status ${response.status}`,
      };
    } finally {
      clearTimeout(timeout);
    }
  } catch (error) {
    return {
      healthy: false,
      error: error instanceof Error ? error.message : 'Unknown error',
    };
  }
}

// ============================================================================
// Export Client Object
// ============================================================================

export const n8nClient = {
  configure: configureN8nClient,
  getConfig: getN8nConfig,
  isConfigured: isN8nConfigured,
  workflows: {
    list: listWorkflows,
    get: getWorkflow,
    activate: activateWorkflow,
    deactivate: deactivateWorkflow,
  },
  executions: {
    list: listExecutions,
    get: getExecution,
    retry: retryExecution,
    delete: deleteExecution,
  },
  webhook: {
    trigger: triggerWebhookWorkflow,
    triggerTest: triggerTestWebhook,
  },
  healthCheck,
};
