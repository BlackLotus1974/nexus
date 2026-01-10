# Edge Functions Setup and Deployment Guide

Complete guide for setting up, testing, and deploying Supabase Edge Functions for the Nexus Fundraising Intelligence Platform.

## Table of Contents

1. [Prerequisites](#prerequisites)
2. [Local Development Setup](#local-development-setup)
3. [Environment Variables](#environment-variables)
4. [Testing Locally](#testing-locally)
5. [Deployment](#deployment)
6. [Monitoring and Debugging](#monitoring-and-debugging)
7. [Troubleshooting](#troubleshooting)

## Prerequisites

- Supabase CLI installed (`npm install -g supabase`)
- Node.js 18+ and npm installed
- Docker Desktop running (for local Supabase)
- Google Gemini API Key
- OpenAI API Key
- Git (for version control)

## Local Development Setup

### 1. Start Supabase Locally

```bash
# Navigate to project root
cd c:/Users/eshay/nexus

# Start Supabase (this starts all services including Edge Functions runtime)
npx supabase start

# Verify it's running
npx supabase status
```

Expected output:
```
API URL: http://127.0.0.1:64321
GraphQL URL: http://127.0.0.1:64321/graphql/v1
DB URL: postgresql://postgres:postgres@127.0.0.1:64322/postgres
Studio URL: http://127.0.0.1:64323
Inbucket URL: http://127.0.0.1:64324
JWT secret: super-secret-jwt-token-with-at-least-32-characters-long
anon key: eyJhbG...
service_role key: eyJhbG...
```

### 2. Set Environment Variables

Create or update `supabase/.env`:

```bash
# AI Service Keys (required for Edge Functions)
GOOGLE_GEMINI_API_KEY=your_gemini_api_key_here
OPENAI_API_KEY=your_openai_api_key_here
```

Also update your project's `.env.local`:

```bash
# Copy example if not exists
cp .env.local.example .env.local

# Edit .env.local and add:
GOOGLE_GEMINI_API_KEY=your_gemini_api_key_here
OPENAI_API_KEY=your_openai_api_key_here
```

### 3. Verify Function Structure

```bash
# List all Edge Functions
ls supabase/functions/

# Should show:
# donor-intelligence-generator/
# _shared/
```

## Environment Variables

### Required Variables

Edge Functions require these environment variables:

| Variable | Description | Source |
|----------|-------------|--------|
| `SUPABASE_URL` | Supabase project URL | Auto-set by Supabase |
| `SUPABASE_ANON_KEY` | Public anonymous key | Auto-set by Supabase |
| `GOOGLE_GEMINI_API_KEY` | Google Gemini API key | Manual - get from Google AI Studio |
| `OPENAI_API_KEY` | OpenAI API key | Manual - get from OpenAI dashboard |

### Setting Variables

**Local Development:**

Edit `supabase/.env`:
```bash
GOOGLE_GEMINI_API_KEY=your_key_here
OPENAI_API_KEY=your_key_here
```

**Production:**

Use Supabase secrets:
```bash
npx supabase secrets set GOOGLE_GEMINI_API_KEY=your_key_here
npx supabase secrets set OPENAI_API_KEY=your_key_here
```

View secrets:
```bash
npx supabase secrets list
```

## Testing Locally

### Method 1: Using Test Scripts

**Windows (PowerShell):**

```powershell
cd supabase/functions/donor-intelligence-generator
.\test-donor-intelligence.ps1 local
```

**Linux/Mac (Bash):**

```bash
cd supabase/functions/donor-intelligence-generator
chmod +x test-donor-intelligence.sh
./test-donor-intelligence.sh local
```

### Method 2: Using curl

First, get your local anon key:

```bash
# Get anon key
npx supabase status | grep "anon key"
# Copy the key shown
```

Then test:

```bash
# Replace YOUR_ANON_KEY with the key from above
curl -i --location --request POST 'http://127.0.0.1:54321/functions/v1/donor-intelligence-generator' \
  --header 'Authorization: Bearer YOUR_ANON_KEY' \
  --header 'Content-Type: application/json' \
  --data '{
    "donor_name": "Bill Gates",
    "location": "Seattle, WA",
    "context": "Philanthropist interested in global health and education"
  }'
```

### Method 3: Using Supabase Studio

1. Open Supabase Studio: http://127.0.0.1:64323
2. Navigate to Edge Functions
3. Select `donor-intelligence-generator`
4. Use the built-in test interface

### Expected Response

Success (200):
```json
{
  "success": true,
  "data": {
    "donor_id": "uuid-here",
    "intelligence_data": {
      "summary": "Brief donor overview...",
      "keyInsights": ["insight 1", "insight 2"],
      "givingCapacity": "high",
      "preferredCauses": ["cause 1", "cause 2"],
      ...
    },
    "generated_at": "2025-10-08T14:30:00.000Z",
    "provider_used": "gemini",
    "latency_ms": 5234
  }
}
```

## Deployment

### Prerequisites

1. Link your local project to Supabase:

```bash
npx supabase link --project-ref your-project-ref
```

2. Set production secrets:

```bash
npx supabase secrets set GOOGLE_GEMINI_API_KEY=your_production_key
npx supabase secrets set OPENAI_API_KEY=your_production_key
```

### Deploy Edge Function

```bash
# Deploy single function
npx supabase functions deploy donor-intelligence-generator

# Or deploy all functions
npx supabase functions deploy
```

### Verify Deployment

```bash
# List deployed functions
npx supabase functions list

# View function details
npx supabase functions inspect donor-intelligence-generator
```

### Test Production Deployment

```bash
# Get your production URL and anon key from Supabase Dashboard
# Project Settings > API

# Test the production endpoint
curl -i --location --request POST 'https://your-project.supabase.co/functions/v1/donor-intelligence-generator' \
  --header 'Authorization: Bearer YOUR_PRODUCTION_ANON_KEY' \
  --header 'Content-Type: application/json' \
  --data '{
    "donor_name": "Test Donor",
    "location": "New York, NY"
  }'
```

## Monitoring and Debugging

### View Logs

**Local Development:**

```bash
# Watch logs in real-time
npx supabase functions serve donor-intelligence-generator --debug

# Or view logs from another terminal
docker logs supabase_edge_runtime_nexus -f
```

**Production:**

1. Supabase Dashboard → Edge Functions → donor-intelligence-generator → Logs
2. Or use CLI:

```bash
npx supabase functions logs donor-intelligence-generator
```

### Common Log Patterns

**Success:**
```
[Donor Intelligence] Request received
[Donor Intelligence] User authenticated: uuid
[Donor Intelligence] Organization ID: uuid
[Donor Intelligence] Generating intelligence for: Donor Name
[AI Service] Attempting Gemini API...
[Donor Intelligence] AI generation completed with gemini (5234ms)
[Donor Intelligence] Successfully saved donor uuid
```

**AI Fallback:**
```
[AI Service] Gemini failed, falling back to OpenAI: Error message
[Donor Intelligence] AI generation completed with openai (8432ms)
```

**Error:**
```
[Donor Intelligence] Authentication failed: Invalid JWT
[Donor Intelligence] AI generation failed: API key invalid
```

### Performance Monitoring

Track these metrics:

- **Response Time**: Should be < 120 seconds (target: 5-15 seconds)
- **Success Rate**: Should be > 95%
- **AI Provider Usage**: Gemini vs OpenAI ratio
- **Error Rate**: Monitor authentication, validation, and AI errors

## Troubleshooting

### Issue: "Missing required environment variables"

**Cause:** AI API keys not set

**Solution:**
```bash
# Local
# Edit supabase/.env and add keys

# Production
npx supabase secrets set GOOGLE_GEMINI_API_KEY=your_key
npx supabase secrets set OPENAI_API_KEY=your_key
```

### Issue: "Authentication failed"

**Cause:** Invalid or missing Authorization header

**Solution:**
- Ensure you're passing `Authorization: Bearer <token>` header
- Get valid token from Supabase auth
- For local testing, use the anon key from `npx supabase status`

### Issue: "User profile not found or missing organization"

**Cause:** Authenticated user doesn't have a profile with organization_id

**Solution:**
```sql
-- Check user's profile
SELECT * FROM profiles WHERE id = 'user-id-here';

-- Create profile if missing
INSERT INTO profiles (id, email, organization_id)
VALUES ('user-id', 'user@example.com', 'org-id');
```

### Issue: "AI generation timeout"

**Cause:** AI API taking longer than 2 minutes

**Solution:**
1. Check AI API status (Gemini, OpenAI)
2. Verify API keys are valid
3. Check rate limits on AI APIs
4. Review function logs for detailed error

### Issue: Function not deploying

**Cause:** Various deployment issues

**Solution:**
```bash
# Check Supabase CLI is linked
npx supabase status

# Re-link if needed
npx supabase link --project-ref your-project-ref

# Check function syntax
npx supabase functions serve donor-intelligence-generator --debug

# Try forced deployment
npx supabase functions deploy donor-intelligence-generator --force
```

### Issue: "Database error" when saving donor

**Cause:** RLS policy or database issue

**Solution:**
```sql
-- Check RLS policies on donors table
SELECT * FROM pg_policies WHERE tablename = 'donors';

-- Verify organization exists
SELECT * FROM organizations WHERE id = 'org-id';

-- Test insert manually
INSERT INTO donors (name, location, organization_id)
VALUES ('Test', 'Location', 'org-id');
```

### Issue: Cannot access function locally

**Cause:** Supabase not running or wrong port

**Solution:**
```bash
# Restart Supabase
npx supabase stop
npx supabase start

# Check status
npx supabase status

# Verify function URL (should be port 54321)
# http://127.0.0.1:54321/functions/v1/donor-intelligence-generator
```

## Advanced Configuration

### Adjust Timeout

Edit function code in `index.ts`:

```typescript
const timeoutMs = 180000; // 3 minutes instead of 2
```

### Custom AI Model

Edit `_shared/ai-service.ts`:

```typescript
// Change Gemini model
const model = genAI.getGenerativeModel({ model: 'gemini-1.5-flash' });

// Change OpenAI model
const completion = await openai.chat.completions.create({
  model: 'gpt-3.5-turbo', // Faster, cheaper
  ...
});
```

### Enable Verbose Logging

Add to Edge Function environment:

```bash
# Production
npx supabase secrets set AI_VERBOSE_LOGGING=true

# Local - add to supabase/.env
AI_VERBOSE_LOGGING=true
```

## Security Best Practices

1. **Never commit API keys** - Use environment variables only
2. **Use RLS policies** - All database operations respect organization_id
3. **Validate all inputs** - Function validates donor_name, location, etc.
4. **Authentication required** - All requests must be authenticated
5. **Rate limiting** - Consider adding rate limiting for production
6. **Monitor logs** - Watch for suspicious activity

## Next Steps

After deploying the donor intelligence function:

1. **Test thoroughly** - Run all test scenarios
2. **Monitor performance** - Track response times and success rates
3. **Implement other functions**:
   - relationship-analyzer
   - crm-sync-handler
   - engagement-recommender
4. **Integrate with frontend** - Connect to React components
5. **Setup alerts** - Configure monitoring and alerting

## Related Documentation

- [Donor Intelligence Function README](../supabase/functions/donor-intelligence-generator/README.md)
- [AI Service Documentation](../lib/ai/README.md)
- [Supabase Edge Functions Docs](https://supabase.com/docs/guides/functions)
- [Deno Runtime Docs](https://deno.land/manual)

## Support

For issues:
1. Check function logs (local or production)
2. Review error codes and messages
3. Consult this troubleshooting guide
4. Check Supabase status page
5. Review AI provider status pages
