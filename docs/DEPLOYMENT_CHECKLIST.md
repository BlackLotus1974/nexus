# Edge Function Deployment Checklist

Complete checklist for deploying the donor-intelligence-generator Edge Function to production.

## Pre-Deployment Checklist

### 1. Environment Setup

- [ ] Supabase CLI installed (`npm install -g supabase`)
- [ ] Supabase account created
- [ ] Project created in Supabase Dashboard
- [ ] Google Gemini API key obtained (https://makersuite.google.com/app/apikey)
- [ ] OpenAI API key obtained (https://platform.openai.com/api-keys)
- [ ] Git repository initialized

### 2. Local Testing

- [ ] Supabase running locally (`npx supabase start`)
- [ ] Environment variables set in `supabase/.env`
- [ ] Edge function tested locally (see test scripts)
- [ ] AI integration verified (Gemini and OpenAI)
- [ ] Database operations working
- [ ] Authentication flow tested
- [ ] Organization isolation verified

### 3. Database Setup

- [ ] Database migrations run (`npx supabase db reset`)
- [ ] Tables created (donors, profiles, organizations, etc.)
- [ ] RLS policies enabled on all tables
- [ ] Test organization created
- [ ] Test user profile created with organization_id
- [ ] Sample donor records created for testing

## Deployment Steps

### Step 1: Link to Supabase Project

```bash
# Get your project reference from Supabase Dashboard
# Settings > General > Reference ID

# Link local project
npx supabase link --project-ref YOUR_PROJECT_REF

# Verify link
npx supabase status
```

- [ ] Project linked successfully
- [ ] Status shows remote connection

### Step 2: Push Database Schema

```bash
# Generate migration from current schema
npx supabase db diff --schema public -f initial_schema

# Push migrations to remote
npx supabase db push
```

- [ ] Migrations generated
- [ ] Migrations pushed to remote
- [ ] Verify tables in Supabase Dashboard > Database > Tables

### Step 3: Set Production Secrets

```bash
# Set AI API keys
npx supabase secrets set GOOGLE_GEMINI_API_KEY=your_gemini_key_here
npx supabase secrets set OPENAI_API_KEY=your_openai_key_here

# Verify secrets are set
npx supabase secrets list
```

- [ ] Gemini API key set
- [ ] OpenAI API key set
- [ ] Secrets list shows both keys (values hidden)

### Step 4: Deploy Edge Function

```bash
# Deploy the function
npx supabase functions deploy donor-intelligence-generator

# Verify deployment
npx supabase functions list
```

- [ ] Function deployed successfully
- [ ] Function appears in list
- [ ] No deployment errors

### Step 5: Verify Deployment

```bash
# Get production URL and anon key from Dashboard
# Settings > API > Project URL and anon/public key

# Test the deployed function
curl -i --location --request POST 'https://YOUR_PROJECT_REF.supabase.co/functions/v1/donor-intelligence-generator' \
  --header 'Authorization: Bearer YOUR_PRODUCTION_ANON_KEY' \
  --header 'Content-Type: application/json' \
  --data '{
    "donor_name": "Test Donor",
    "location": "New York, NY"
  }'
```

- [ ] Function responds (200 OK)
- [ ] Success response received
- [ ] Donor created in database
- [ ] Intelligence data populated
- [ ] Provider used (gemini or openai) logged

### Step 6: Test Error Scenarios

```bash
# Test validation error
curl -X POST 'https://YOUR_PROJECT_REF.supabase.co/functions/v1/donor-intelligence-generator' \
  -H 'Authorization: Bearer YOUR_ANON_KEY' \
  -H 'Content-Type: application/json' \
  -d '{"donor_name": "X"}'

# Test authentication error
curl -X POST 'https://YOUR_PROJECT_REF.supabase.co/functions/v1/donor-intelligence-generator' \
  -H 'Content-Type: application/json' \
  -d '{"donor_name": "Test"}'
```

- [ ] Validation errors return 400
- [ ] Auth errors return 401
- [ ] Error messages are clear
- [ ] Error codes are correct

### Step 7: Monitor Function

1. **Supabase Dashboard**
   - [ ] Navigate to Edge Functions > donor-intelligence-generator
   - [ ] Check Recent Invocations
   - [ ] Review Logs for errors
   - [ ] Monitor Performance metrics

2. **Test Production Flow**
   - [ ] Create test organization
   - [ ] Create test user
   - [ ] Authenticate user
   - [ ] Call function with real data
   - [ ] Verify donor appears in dashboard
   - [ ] Check intelligence_data quality

## Post-Deployment Checklist

### 1. Documentation

- [ ] Update README with production URL
- [ ] Document production environment variables
- [ ] Add troubleshooting guide
- [ ] Create runbook for common issues

### 2. Monitoring Setup

- [ ] Set up error alerting (Supabase Dashboard)
- [ ] Configure log retention
- [ ] Create performance dashboards
- [ ] Set up uptime monitoring

### 3. Security Review

- [ ] Verify RLS policies active
- [ ] Check organization isolation
- [ ] Review API key security
- [ ] Verify no sensitive data in logs
- [ ] Test rate limiting (if implemented)

### 4. Performance Tuning

- [ ] Monitor average response times
- [ ] Check AI provider usage ratio
- [ ] Review timeout occurrences
- [ ] Optimize if needed

### 5. Integration Testing

- [ ] Test from frontend application
- [ ] Verify authentication flow
- [ ] Check error handling in UI
- [ ] Test with various donor data
- [ ] Verify update functionality

## Rollback Plan

If deployment fails or issues occur:

```bash
# View previous versions
npx supabase functions list --show-versions donor-intelligence-generator

# Rollback to previous version
npx supabase functions deploy donor-intelligence-generator --version PREVIOUS_VERSION

# Or redeploy from last known good commit
git checkout LAST_GOOD_COMMIT
npx supabase functions deploy donor-intelligence-generator
```

## Production URLs

**Supabase Dashboard:**
- Project URL: `https://app.supabase.com/project/YOUR_PROJECT_REF`

**Edge Function Endpoint:**
- URL: `https://YOUR_PROJECT_REF.supabase.co/functions/v1/donor-intelligence-generator`

**API Keys:**
- Get from: Settings > API > Project API keys

## Environment Variables Reference

### Required for Edge Functions

| Variable | Source | How to Set |
|----------|--------|------------|
| `GOOGLE_GEMINI_API_KEY` | Google AI Studio | `npx supabase secrets set` |
| `OPENAI_API_KEY` | OpenAI Dashboard | `npx supabase secrets set` |
| `SUPABASE_URL` | Auto-set | N/A |
| `SUPABASE_ANON_KEY` | Auto-set | N/A |

### Required for Frontend

| Variable | Source | File |
|----------|--------|------|
| `NEXT_PUBLIC_SUPABASE_URL` | Supabase Settings > API | `.env.local` |
| `NEXT_PUBLIC_SUPABASE_ANON_KEY` | Supabase Settings > API | `.env.local` |
| `SUPABASE_SERVICE_ROLE_KEY` | Supabase Settings > API | `.env.local` (server only) |

## Common Issues and Solutions

### Issue: Secrets not found

**Solution:**
```bash
npx supabase secrets set GOOGLE_GEMINI_API_KEY=your_key
npx supabase secrets set OPENAI_API_KEY=your_key
```

### Issue: Function not accessible

**Solution:**
- Check function is deployed: `npx supabase functions list`
- Verify project is linked: `npx supabase status`
- Check Supabase project status in dashboard

### Issue: Database errors

**Solution:**
- Verify migrations pushed: `npx supabase db remote commit`
- Check RLS policies in Dashboard > Database > Policies
- Verify organization_id exists in profiles

### Issue: AI generation fails

**Solution:**
- Check API keys are valid
- Verify quotas not exceeded
- Review function logs for detailed errors
- Test AI APIs directly

## Success Criteria

Deployment is successful when:

- [x] Function deploys without errors
- [x] Function responds to requests
- [x] Authentication works
- [x] Organization isolation verified
- [x] AI generation works (Gemini or OpenAI)
- [x] Donors saved to database
- [x] Intelligence data populated correctly
- [x] Error handling works
- [x] Logs are clear and helpful
- [x] Performance meets targets (< 2 min response)

## Next Functions to Deploy

After successful deployment of donor-intelligence-generator:

1. [ ] `relationship-analyzer` - Email/LinkedIn analysis
2. [ ] `crm-sync-handler` - CRM integration
3. [ ] `engagement-recommender` - Outreach strategies
4. [ ] `project-alignment-analyzer` - Donor-project matching

## Support Resources

- **Supabase Docs**: https://supabase.com/docs/guides/functions
- **Deno Docs**: https://deno.land/manual
- **Project Docs**: `docs/edge-functions-setup.md`
- **Function README**: `supabase/functions/donor-intelligence-generator/README.md`

---

**Deployment Date:** _________________

**Deployed By:** _________________

**Production URL:** _________________

**Verified By:** _________________

**Notes:**
_________________________________________________________________
_________________________________________________________________
_________________________________________________________________
