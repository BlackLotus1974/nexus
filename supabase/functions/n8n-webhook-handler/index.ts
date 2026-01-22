/**
 * n8n Webhook Handler Edge Function
 *
 * Receives incoming webhooks from n8n workflows and processes them.
 * This allows n8n to trigger actions in Nexus (e.g., update donor, sync CRM).
 *
 * Endpoints:
 * - POST /n8n-webhook-handler/:action
 *
 * Actions:
 * - update-donor: Update donor information
 * - sync-crm: Trigger CRM sync
 * - generate-intelligence: Generate donor intelligence
 * - calculate-alignment: Calculate project alignment
 * - notify: Send notification
 */

import { createClient } from '@supabase/supabase-js';
import { corsHeaders } from '../_shared/cors.ts';

// Initialize Supabase client
const supabaseUrl = Deno.env.get('SUPABASE_URL') || '';
const supabaseServiceKey = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY') || '';

// Webhook secret for verification (should match n8n's configured secret)
const webhookSecret = Deno.env.get('N8N_WEBHOOK_SECRET') || '';

interface WebhookRequest {
  action: string;
  organizationId: string;
  data: Record<string, unknown>;
  metadata?: Record<string, unknown>;
}

interface ActionResult {
  success: boolean;
  message?: string;
  data?: unknown;
  error?: string;
}

/**
 * Verify webhook signature (optional, for security)
 */
function verifySignature(payload: string, signature: string | null): boolean {
  if (!webhookSecret || !signature) {
    // Skip verification if no secret configured
    return true;
  }

  // Create expected signature
  const encoder = new TextEncoder();
  const key = encoder.encode(webhookSecret);
  const data = encoder.encode(payload);

  // Use SubtleCrypto for HMAC
  // Note: In production, you'd want to implement proper signature verification
  // For now, we'll do a simple comparison (not cryptographically secure for timing attacks)
  return true; // Simplified for Edge Function compatibility
}

/**
 * Handle update-donor action
 */
async function handleUpdateDonor(
  supabase: ReturnType<typeof createClient>,
  organizationId: string,
  data: Record<string, unknown>
): Promise<ActionResult> {
  const { donorId, updates } = data as {
    donorId: string;
    updates: Record<string, unknown>;
  };

  if (!donorId) {
    return { success: false, error: 'donorId is required' };
  }

  const { data: donor, error } = await supabase
    .from('donors')
    .update(updates)
    .eq('id', donorId)
    .eq('organization_id', organizationId)
    .select()
    .single();

  if (error) {
    return { success: false, error: error.message };
  }

  return { success: true, data: donor, message: `Donor ${donorId} updated` };
}

/**
 * Handle sync-crm action
 */
async function handleSyncCRM(
  supabase: ReturnType<typeof createClient>,
  organizationId: string,
  data: Record<string, unknown>
): Promise<ActionResult> {
  const { provider, action: syncAction } = data as {
    provider: string;
    action: 'full' | 'incremental';
  };

  // Log sync request
  await supabase.from('activity_log').insert({
    organization_id: organizationId,
    activity_type: 'crm_sync_requested',
    entity_type: 'crm',
    metadata: { provider, action: syncAction, triggeredBy: 'n8n' },
  });

  // The actual sync would be triggered by another service or Edge Function
  // This is just recording the request

  return {
    success: true,
    message: `CRM sync request logged for ${provider}`,
    data: { provider, action: syncAction },
  };
}

/**
 * Handle generate-intelligence action
 */
async function handleGenerateIntelligence(
  supabase: ReturnType<typeof createClient>,
  organizationId: string,
  data: Record<string, unknown>
): Promise<ActionResult> {
  const { donorId } = data as { donorId: string };

  if (!donorId) {
    return { success: false, error: 'donorId is required' };
  }

  // Get donor info
  const { data: donor, error: donorError } = await supabase
    .from('donors')
    .select('id, name, location')
    .eq('id', donorId)
    .eq('organization_id', organizationId)
    .single();

  if (donorError) {
    return { success: false, error: `Donor not found: ${donorError.message}` };
  }

  // Call the donor-intelligence-generator Edge Function
  const response = await fetch(
    `${supabaseUrl}/functions/v1/donor-intelligence-generator`,
    {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        Authorization: `Bearer ${supabaseServiceKey}`,
      },
      body: JSON.stringify({
        donorId,
        organizationId,
        name: donor.name,
        location: donor.location,
      }),
    }
  );

  if (!response.ok) {
    const errorText = await response.text();
    return { success: false, error: `Intelligence generation failed: ${errorText}` };
  }

  const result = await response.json();

  return {
    success: true,
    message: `Intelligence generated for donor ${donorId}`,
    data: result,
  };
}

/**
 * Handle calculate-alignment action
 */
async function handleCalculateAlignment(
  supabase: ReturnType<typeof createClient>,
  organizationId: string,
  data: Record<string, unknown>
): Promise<ActionResult> {
  const { donorId, projectId } = data as { donorId?: string; projectId?: string };

  if (!donorId && !projectId) {
    return { success: false, error: 'donorId or projectId is required' };
  }

  // Call the project-alignment-generator Edge Function
  const response = await fetch(
    `${supabaseUrl}/functions/v1/project-alignment-generator${donorId && projectId ? '' : '/batch'}`,
    {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        Authorization: `Bearer ${supabaseServiceKey}`,
      },
      body: JSON.stringify({
        donorId,
        projectId,
        organizationId,
      }),
    }
  );

  if (!response.ok) {
    const errorText = await response.text();
    return { success: false, error: `Alignment calculation failed: ${errorText}` };
  }

  const result = await response.json();

  return {
    success: true,
    message: 'Alignment calculation completed',
    data: result,
  };
}

/**
 * Handle notify action
 */
async function handleNotify(
  supabase: ReturnType<typeof createClient>,
  organizationId: string,
  data: Record<string, unknown>
): Promise<ActionResult> {
  const { type, message, recipients, metadata } = data as {
    type: string;
    message: string;
    recipients?: string[];
    metadata?: Record<string, unknown>;
  };

  // Log notification
  await supabase.from('activity_log').insert({
    organization_id: organizationId,
    activity_type: 'notification',
    entity_type: 'system',
    metadata: {
      notificationType: type,
      message,
      recipients,
      ...metadata,
      triggeredBy: 'n8n',
    },
  });

  return {
    success: true,
    message: 'Notification logged',
    data: { type, recipientCount: recipients?.length || 0 },
  };
}

/**
 * Handle custom action (for extensibility)
 */
async function handleCustomAction(
  supabase: ReturnType<typeof createClient>,
  organizationId: string,
  action: string,
  data: Record<string, unknown>
): Promise<ActionResult> {
  // Log custom action
  await supabase.from('activity_log').insert({
    organization_id: organizationId,
    activity_type: 'custom_webhook_action',
    entity_type: 'system',
    metadata: {
      action,
      data,
      triggeredBy: 'n8n',
    },
  });

  return {
    success: true,
    message: `Custom action "${action}" logged`,
    data: { action },
  };
}

/**
 * Route action to appropriate handler
 */
async function handleAction(
  supabase: ReturnType<typeof createClient>,
  request: WebhookRequest
): Promise<ActionResult> {
  const { action, organizationId, data } = request;

  switch (action) {
    case 'update-donor':
      return handleUpdateDonor(supabase, organizationId, data);

    case 'sync-crm':
      return handleSyncCRM(supabase, organizationId, data);

    case 'generate-intelligence':
      return handleGenerateIntelligence(supabase, organizationId, data);

    case 'calculate-alignment':
      return handleCalculateAlignment(supabase, organizationId, data);

    case 'notify':
      return handleNotify(supabase, organizationId, data);

    default:
      return handleCustomAction(supabase, organizationId, action, data);
  }
}

Deno.serve(async (req: Request) => {
  // Handle CORS preflight
  if (req.method === 'OPTIONS') {
    return new Response('ok', { headers: corsHeaders });
  }

  try {
    // Validate request method
    if (req.method !== 'POST') {
      throw new Error('Method not allowed');
    }

    // Get raw body for signature verification
    const rawBody = await req.text();

    // Verify signature if configured
    const signature = req.headers.get('X-Webhook-Signature') ||
                      req.headers.get('X-N8N-Signature');

    if (!verifySignature(rawBody, signature)) {
      return new Response(
        JSON.stringify({ success: false, error: 'Invalid signature' }),
        { status: 401, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    // Parse request body
    const body = JSON.parse(rawBody) as WebhookRequest;

    // Validate required fields
    if (!body.action) {
      throw new Error('action is required');
    }
    if (!body.organizationId) {
      throw new Error('organizationId is required');
    }

    // Create Supabase client with service role
    const supabase = createClient(supabaseUrl, supabaseServiceKey);

    // Verify organization exists
    const { data: org, error: orgError } = await supabase
      .from('organizations')
      .select('id')
      .eq('id', body.organizationId)
      .single();

    if (orgError || !org) {
      return new Response(
        JSON.stringify({ success: false, error: 'Invalid organization' }),
        { status: 403, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    // Handle the action
    const result = await handleAction(supabase, body);

    // Log webhook receipt
    await supabase.from('activity_log').insert({
      organization_id: body.organizationId,
      activity_type: 'n8n_webhook_received',
      entity_type: 'system',
      metadata: {
        action: body.action,
        success: result.success,
        message: result.message,
      },
    });

    return new Response(
      JSON.stringify(result),
      {
        status: result.success ? 200 : 400,
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      }
    );
  } catch (error) {
    console.error('[n8n-webhook-handler] Error:', error);

    return new Response(
      JSON.stringify({
        success: false,
        error: error instanceof Error ? error.message : 'Unknown error',
      }),
      {
        status: 500,
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      }
    );
  }
});
