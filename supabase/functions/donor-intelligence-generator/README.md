# Donor Intelligence Generator Edge Function

Generates comprehensive donor intelligence using AI (Gemini as primary, OpenAI as fallback) and stores results in the database with proper organization-level isolation.

## Endpoint

```
POST /functions/v1/donor-intelligence-generator
```

## Authentication

Requires a valid Supabase authentication token in the `Authorization` header:

```
Authorization: Bearer <YOUR_SUPABASE_AUTH_TOKEN>
```

## Request Body

```typescript
{
  donor_name: string;      // Required, minimum 2 characters
  location?: string;       // Optional location information
  context?: string;        // Optional additional context for AI
  donor_id?: string;       // Optional UUID - if provided, updates existing donor
}
```

## Response Format

### Success Response (200)

```json
{
  "success": true,
  "data": {
    "donor_id": "uuid",
    "intelligence_data": {
      "summary": "Brief overview of the donor",
      "keyInsights": ["insight 1", "insight 2"],
      "givingCapacity": "high|medium|low|unknown",
      "estimatedCapacity": "Amount range or description",
      "preferredCauses": ["cause 1", "cause 2"],
      "connectionPoints": [
        {
          "type": "location|network|cause|organization|shared_interest|other",
          "description": "Description of connection",
          "strength": 8
        }
      ],
      "geographicConnections": ["Israel", "Other locations"],
      "israeliConnections": ["Specific Israeli organizations"],
      "philanthropicHistory": ["Past donation 1", "Past donation 2"],
      "recommendedApproach": "Detailed engagement strategy",
      "confidence": 0.85,
      "dataSources": ["source 1", "source 2"]
    },
    "generated_at": "2025-10-08T14:30:00.000Z",
    "provider_used": "gemini",
    "latency_ms": 5234
  }
}
```

### Error Response

```json
{
  "success": false,
  "error": {
    "message": "Error description",
    "code": "ERROR_CODE"
  }
}
```

## Error Codes

- `VALIDATION_ERROR` (400) - Invalid request body
- `UNAUTHORIZED` (401) - Missing or invalid authentication
- `PROFILE_ERROR` (403) - User profile not found or missing organization
- `METHOD_NOT_ALLOWED` (405) - Request method is not POST
- `AI_CONFIG_ERROR` (500) - AI service configuration failed
- `AI_GENERATION_ERROR` (500) - AI generation failed
- `DATABASE_ERROR` (500) - Database operation failed
- `INTERNAL_ERROR` (500) - Unexpected server error

## Features

### Security
- **Authentication**: Validates Supabase JWT token
- **Organization Isolation**: All operations filtered by user's organization_id
- **Row Level Security**: Respects RLS policies on donors table
- **Input Validation**: Comprehensive validation of all inputs

### AI Integration
- **Primary Provider**: Google Gemini (gemini-1.5-pro)
- **Fallback Provider**: OpenAI (gpt-4-turbo-preview)
- **Automatic Failover**: Seamlessly falls back to OpenAI if Gemini fails
- **Timeout Protection**: 2-minute timeout for AI operations

### Database Operations
- **Create New Donor**: Omit `donor_id` to create new record
- **Update Existing**: Include `donor_id` to update existing donor
- **Organization Scoped**: All operations respect organization_id

## Environment Variables

Required environment variables (set via `supabase secrets set`):

```bash
SUPABASE_URL              # Auto-set by Supabase
SUPABASE_ANON_KEY        # Auto-set by Supabase
GOOGLE_GEMINI_API_KEY    # Or GEMINI_API_KEY
OPENAI_API_KEY           # OpenAI API key
```

## Local Development

### 1. Set Environment Variables

Create a `.env` file in your project root:

```bash
GOOGLE_GEMINI_API_KEY=your_gemini_key_here
OPENAI_API_KEY=your_openai_key_here
```

### 2. Start Supabase

```bash
npx supabase start
```

### 3. Test the Function

```bash
# Get your local Supabase anon key
ANON_KEY=$(npx supabase status | grep "anon key" | awk '{print $3}')

# Create a test donor
curl -i --location --request POST 'http://127.0.0.1:54321/functions/v1/donor-intelligence-generator' \
  --header "Authorization: Bearer $ANON_KEY" \
  --header 'Content-Type: application/json' \
  --data '{
    "donor_name": "Bill Gates",
    "location": "Seattle, WA"
  }'
```

## Deployment

### Deploy to Supabase

```bash
# Deploy the function
npx supabase functions deploy donor-intelligence-generator

# Set required secrets
npx supabase secrets set GOOGLE_GEMINI_API_KEY=your_key_here
npx supabase secrets set OPENAI_API_KEY=your_key_here
```

### Verify Deployment

```bash
# Test with production endpoint
curl -i --location --request POST 'https://your-project.supabase.co/functions/v1/donor-intelligence-generator' \
  --header 'Authorization: Bearer YOUR_SUPABASE_ANON_KEY' \
  --header 'Content-Type: application/json' \
  --data '{
    "donor_name": "Test Donor",
    "location": "New York, NY"
  }'
```

## Performance

- **Target Response Time**: ≤ 2 minutes
- **Timeout**: 120 seconds (2 minutes)
- **AI Provider Latency**:
  - Gemini: Typically 3-10 seconds
  - OpenAI: Typically 5-15 seconds
- **Database Operations**: < 100ms

## Monitoring

View function logs:

```bash
# Local development
npx supabase functions serve donor-intelligence-generator

# Production (Supabase Dashboard)
Project > Edge Functions > donor-intelligence-generator > Logs
```

## Architecture

```
Request → CORS → Validation → Auth Check → Get User Profile
    ↓
Get Organization ID → Initialize AI Service → Generate Intelligence
    ↓
Store/Update in Database → Return Response
```

## Testing

See `test-donor-intelligence.sh` for a complete test script.

## Related Files

- `supabase/functions/_shared/ai-service.ts` - AI service implementation
- `supabase/functions/_shared/cors.ts` - CORS utilities
- `lib/ai/orchestrator.ts` - AI orchestrator (reference implementation)
- `types/database.ts` - Database types

## Troubleshooting

### "Missing required environment variables"

Ensure both `GOOGLE_GEMINI_API_KEY` and `OPENAI_API_KEY` are set:

```bash
npx supabase secrets set GOOGLE_GEMINI_API_KEY=your_key
npx supabase secrets set OPENAI_API_KEY=your_key
```

### "Authentication failed"

Ensure you're passing a valid Supabase auth token in the Authorization header.

### "User profile not found or missing organization"

The authenticated user must have a profile record with a valid `organization_id`.

### "AI generation timeout"

The function has a 2-minute timeout. If AI generation consistently fails:
1. Check AI API keys are valid
2. Verify API quotas/rate limits
3. Review Supabase function logs for detailed error messages

## Support

For issues or questions:
1. Check Supabase function logs
2. Review error codes and messages
3. Verify environment variables are set correctly
4. Test AI services directly using the health check endpoint
