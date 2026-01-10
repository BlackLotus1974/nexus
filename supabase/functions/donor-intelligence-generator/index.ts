/**
 * Donor Intelligence Generator Edge Function
 *
 * Generates comprehensive donor intelligence using AI (Gemini/OpenAI)
 * with automatic fallback and stores results in the database.
 *
 * Endpoint: POST /functions/v1/donor-intelligence-generator
 *
 * Request Body:
 * {
 *   "donor_name": string (required, min 2 chars),
 *   "location": string (optional),
 *   "context": string (optional),
 *   "donor_id": string (optional, UUID - for updates)
 * }
 *
 * Response:
 * {
 *   "success": true,
 *   "data": {
 *     "donor_id": "uuid",
 *     "intelligence_data": DonorIntelligence,
 *     "generated_at": "ISO timestamp",
 *     "provider_used": "gemini" | "openai"
 *   }
 * }
 */

import "jsr:@supabase/functions-js/edge-runtime.d.ts";
import { createClient } from 'jsr:@supabase/supabase-js@2';
import { createAIService } from '../_shared/ai-service.ts';
import { handleCors, jsonResponse, errorResponse } from '../_shared/cors.ts';

// ============================================================================
// Input Validation
// ============================================================================

interface RequestBody {
  donor_name: string;
  location?: string;
  context?: string;
  donor_id?: string;
}

function validateRequest(body: any): { valid: boolean; error?: string; data?: RequestBody } {
  if (!body) {
    return { valid: false, error: 'Request body is required' };
  }

  const { donor_name, location, context, donor_id } = body;

  // Validate donor_name
  if (!donor_name || typeof donor_name !== 'string') {
    return { valid: false, error: 'donor_name is required and must be a string' };
  }

  if (donor_name.trim().length < 2) {
    return { valid: false, error: 'donor_name must be at least 2 characters' };
  }

  // Validate optional fields
  if (location !== undefined && typeof location !== 'string') {
    return { valid: false, error: 'location must be a string' };
  }

  if (context !== undefined && typeof context !== 'string') {
    return { valid: false, error: 'context must be a string' };
  }

  if (donor_id !== undefined && typeof donor_id !== 'string') {
    return { valid: false, error: 'donor_id must be a UUID string' };
  }

  // UUID validation (basic)
  if (donor_id && !/^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i.test(donor_id)) {
    return { valid: false, error: 'donor_id must be a valid UUID' };
  }

  return {
    valid: true,
    data: {
      donor_name: donor_name.trim(),
      location: location?.trim(),
      context: context?.trim(),
      donor_id,
    },
  };
}

// ============================================================================
// Main Handler
// ============================================================================

Deno.serve(async (req) => {
  try {
    // Handle CORS preflight
    const corsResponse = handleCors(req);
    if (corsResponse) return corsResponse;

    // Only allow POST requests
    if (req.method !== 'POST') {
      return errorResponse('Method not allowed', 'METHOD_NOT_ALLOWED', 405);
    }

    console.log('[Donor Intelligence] Request received');

    // Parse and validate request body
    let body;
    try {
      body = await req.json();
    } catch (e) {
      return errorResponse('Invalid JSON in request body', 'INVALID_JSON', 400);
    }

    const validation = validateRequest(body);
    if (!validation.valid) {
      return errorResponse(validation.error!, 'VALIDATION_ERROR', 400);
    }

    const { donor_name, location, context, donor_id } = validation.data!;

    // Get authorization header
    const authHeader = req.headers.get('Authorization');
    if (!authHeader) {
      return errorResponse('Missing authorization header', 'UNAUTHORIZED', 401);
    }

    // Create authenticated Supabase client
    const supabaseUrl = Deno.env.get('SUPABASE_URL');
    const supabaseAnonKey = Deno.env.get('SUPABASE_ANON_KEY');

    if (!supabaseUrl || !supabaseAnonKey) {
      console.error('[Donor Intelligence] Missing Supabase environment variables');
      return errorResponse(
        'Server configuration error',
        'SERVER_CONFIG_ERROR',
        500
      );
    }

    const supabase = createClient(supabaseUrl, supabaseAnonKey, {
      global: {
        headers: { Authorization: authHeader },
      },
    });

    // Get authenticated user
    const {
      data: { user },
      error: userError,
    } = await supabase.auth.getUser();

    if (userError || !user) {
      console.error('[Donor Intelligence] Authentication failed:', userError);
      return errorResponse('Authentication failed', 'UNAUTHORIZED', 401);
    }

    console.log(`[Donor Intelligence] User authenticated: ${user.id}`);

    // Get user's organization_id from profiles table
    const { data: profile, error: profileError } = await supabase
      .from('profiles')
      .select('organization_id')
      .eq('id', user.id)
      .single();

    if (profileError || !profile?.organization_id) {
      console.error('[Donor Intelligence] Failed to get user profile:', profileError);
      return errorResponse(
        'User profile not found or missing organization',
        'PROFILE_ERROR',
        403
      );
    }

    const organizationId = profile.organization_id;
    console.log(`[Donor Intelligence] Organization ID: ${organizationId}`);

    // Initialize AI service
    let aiService;
    try {
      aiService = createAIService();
    } catch (e) {
      console.error('[Donor Intelligence] Failed to initialize AI service:', e);
      return errorResponse(
        'AI service configuration error',
        'AI_CONFIG_ERROR',
        500
      );
    }

    // Generate donor intelligence with timeout
    console.log(`[Donor Intelligence] Generating intelligence for: ${donor_name}`);
    const timeoutMs = 120000; // 2 minutes

    const aiPromise = aiService.generateDonorIntelligence({
      name: donor_name,
      location,
      context,
    });

    const timeoutPromise = new Promise((_, reject) => {
      setTimeout(() => reject(new Error('AI generation timeout')), timeoutMs);
    });

    let aiResponse;
    try {
      aiResponse = await Promise.race([aiPromise, timeoutPromise]);
    } catch (e) {
      console.error('[Donor Intelligence] AI generation failed:', e);
      return errorResponse(
        `Failed to generate donor intelligence: ${(e as Error).message}`,
        'AI_GENERATION_ERROR',
        500
      );
    }

    console.log(
      `[Donor Intelligence] AI generation completed with ${aiResponse.provider} ` +
      `(${aiResponse.latencyMs}ms)`
    );

    // Store or update donor record
    const now = new Date().toISOString();
    let donorRecord;

    if (donor_id) {
      // Update existing donor
      console.log(`[Donor Intelligence] Updating donor ${donor_id}`);

      const { data, error } = await supabase
        .from('donors')
        .update({
          name: donor_name,
          location: location || null,
          intelligence_data: aiResponse.data,
          last_updated: now,
        })
        .eq('id', donor_id)
        .eq('organization_id', organizationId) // Ensure user can only update their org's donors
        .select()
        .single();

      if (error) {
        console.error('[Donor Intelligence] Failed to update donor:', error);
        return errorResponse(
          'Failed to update donor record',
          'DATABASE_ERROR',
          500
        );
      }

      donorRecord = data;
    } else {
      // Create new donor
      console.log(`[Donor Intelligence] Creating new donor`);

      const { data, error } = await supabase
        .from('donors')
        .insert({
          name: donor_name,
          location: location || null,
          intelligence_data: aiResponse.data,
          organization_id: organizationId,
          last_updated: now,
        })
        .select()
        .single();

      if (error) {
        console.error('[Donor Intelligence] Failed to create donor:', error);
        return errorResponse(
          'Failed to create donor record',
          'DATABASE_ERROR',
          500
        );
      }

      donorRecord = data;
    }

    console.log(`[Donor Intelligence] Successfully saved donor ${donorRecord.id}`);

    // Return success response
    return jsonResponse({
      success: true,
      data: {
        donor_id: donorRecord.id,
        intelligence_data: aiResponse.data,
        generated_at: now,
        provider_used: aiResponse.provider,
        latency_ms: aiResponse.latencyMs,
      },
    });
  } catch (error) {
    console.error('[Donor Intelligence] Unexpected error:', error);
    return errorResponse(
      'Internal server error',
      'INTERNAL_ERROR',
      500
    );
  }
});

/* To invoke locally:

  1. Run `supabase start`
  2. Set environment variables in .env:
     - GOOGLE_GEMINI_API_KEY or GEMINI_API_KEY
     - OPENAI_API_KEY
  3. Make an HTTP request:

  curl -i --location --request POST 'http://127.0.0.1:54321/functions/v1/donor-intelligence-generator' \
    --header 'Authorization: Bearer YOUR_SUPABASE_ANON_KEY' \
    --header 'Content-Type: application/json' \
    --data '{
      "donor_name": "Bill Gates",
      "location": "Seattle, WA"
    }'

  Or update existing donor:

  curl -i --location --request POST 'http://127.0.0.1:54321/functions/v1/donor-intelligence-generator' \
    --header 'Authorization: Bearer YOUR_SUPABASE_ANON_KEY' \
    --header 'Content-Type: application/json' \
    --data '{
      "donor_name": "Bill Gates",
      "location": "Seattle, WA",
      "donor_id": "existing-uuid-here"
    }'

*/
