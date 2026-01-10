/**
 * CORS Utilities for Edge Functions
 */

export const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
};

/**
 * Handle CORS preflight requests
 */
export function handleCors(req: Request): Response | null {
  if (req.method === 'OPTIONS') {
    return new Response('ok', { headers: corsHeaders });
  }
  return null;
}

/**
 * Create JSON response with CORS headers
 */
export function jsonResponse(data: any, status = 200): Response {
  return new Response(JSON.stringify(data), {
    status,
    headers: {
      ...corsHeaders,
      'Content-Type': 'application/json',
    },
  });
}

/**
 * Create error response with CORS headers
 */
export function errorResponse(message: string, code: string, status = 500): Response {
  return jsonResponse(
    {
      success: false,
      error: {
        message,
        code,
      },
    },
    status
  );
}
