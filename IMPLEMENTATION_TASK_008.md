# Task-008: Connect Frontend to Backend - End-to-End Donor Intelligence

## Overview
Connect the donor search UI to the donor-intelligence-generator Edge Function to enable complete end-to-end functionality. This task bridges the gap between the frontend components and backend AI services.

## Objectives
1. Update React Query hooks to call the actual Edge Function
2. Implement proper error handling and loading states
3. Test the complete donor intelligence workflow
4. Add environment variable configuration
5. Ensure proper authentication flow

## Current State Analysis

### ✅ Completed Components
- **Frontend UI**: DonorSearch, IntelligenceBrief, DonorList components
- **Backend Function**: donor-intelligence-generator Edge Function
- **AI Services**: Gemini and OpenAI integration classes
- **Database Schema**: Complete with RLS policies
- **Authentication**: Supabase Auth system

### 🔄 Missing Connections
- Frontend components use simulated data
- React Query hooks don't call actual Edge Functions
- Environment variables not configured for AI APIs
- Error handling needs backend integration
- Loading states need real timing

## Implementation Tasks

### Task 008-1: Configure Environment Variables
**Priority**: High
**Estimated Time**: 30 minutes

#### Subtasks:
1. Add AI API keys to `.env.local.example`
2. Update `.env.local` with actual API keys
3. Verify Edge Function can access environment variables
4. Test API key validation

#### Acceptance Criteria:
- [ ] GEMINI_API_KEY configured in environment
- [ ] OPENAI_API_KEY configured in environment  
- [ ] Edge Function can access both keys
- [ ] Invalid keys return proper error messages

### Task 008-2: Update React Query Hooks
**Priority**: High
**Estimated Time**: 1 hour

#### Subtasks:
1. Update `lib/hooks/useDonors.ts` to call Edge Function
2. Replace simulated data with actual API calls
3. Implement proper error handling for API failures
4. Add retry logic for failed requests
5. Update loading states to match actual timing

#### Files to Modify:
- `lib/hooks/useDonors.ts`
- `lib/supabase/client.ts` (if needed for function calls)

#### Acceptance Criteria:
- [ ] `useCreateDonor` calls donor-intelligence-generator function
- [ ] Function receives proper organization_id from auth
- [ ] Errors are caught and displayed to user
- [ ] Loading states reflect actual processing time
- [ ] Success responses update the UI correctly

### Task 008-3: Test Authentication Flow
**Priority**: High  
**Estimated Time**: 45 minutes

#### Subtasks:
1. Test signup → profile creation → donor search flow
2. Verify RLS policies work correctly
3. Test organization isolation
4. Ensure proper session management

#### Acceptance Criteria:
- [ ] New users can sign up and access donor search
- [ ] Users only see their organization's donors
- [ ] Sessions persist across browser refreshes
- [ ] Logout clears all state properly

### Task 008-4: Implement Error Boundaries
**Priority**: Medium
**Estimated Time**: 45 minutes

#### Subtasks:
1. Create ErrorBoundary component for AI failures
2. Add specific error messages for different failure types
3. Implement retry mechanisms
4. Add fallback UI for degraded functionality

#### Files to Create/Modify:
- `components/ui/ErrorBoundary.tsx`
- `app/donors/page.tsx` (wrap with error boundary)
- `components/donor/DonorSearch.tsx` (error handling)

#### Acceptance Criteria:
- [ ] AI API failures show user-friendly messages
- [ ] Rate limit errors suggest retry timing
- [ ] Network errors offer retry buttons
- [ ] Partial failures still show available data

### Task 008-5: Add Real-time Progress Updates
**Priority**: Medium
**Estimated Time**: 1 hour

#### Subtasks:
1. Implement WebSocket or polling for progress updates
2. Show detailed progress steps during AI generation
3. Add estimated time remaining
4. Handle long-running requests gracefully

#### Acceptance Criteria:
- [ ] Users see progress during AI generation
- [ ] Progress bar reflects actual completion percentage
- [ ] Long requests don't timeout prematurely
- [ ] Users can cancel in-progress requests

### Task 008-6: End-to-End Testing
**Priority**: High
**Estimated Time**: 1 hour

#### Subtasks:
1. Test complete user workflow from signup to intelligence brief
2. Test error scenarios (invalid API keys, rate limits, etc.)
3. Test with multiple users and organizations
4. Verify data persistence and retrieval

#### Test Scenarios:
- [ ] New user signup → donor search → view intelligence
- [ ] Existing user login → search history → new search
- [ ] API failure → error display → retry success
- [ ] Multiple concurrent searches
- [ ] Organization data isolation

## Technical Implementation Details

### Environment Variables Required
```bash
# .env.local
NEXT_PUBLIC_SUPABASE_URL=your_supabase_url
NEXT_PUBLIC_SUPABASE_ANON_KEY=your_supabase_anon_key
SUPABASE_SERVICE_ROLE_KEY=your_service_role_key
GEMINI_API_KEY=your_gemini_api_key
OPENAI_API_KEY=your_openai_api_key
```

### Updated React Query Hook Structure
```typescript
// lib/hooks/useDonors.ts
export const useCreateDonor = () => {
  return useMutation({
    mutationFn: async (data: CreateDonorInput) => {
      const { data: result, error } = await supabase.functions.invoke(
        'donor-intelligence-generator',
        {
          body: {
            name: data.name,
            location: data.location,
            organization_id: data.organizationId
          }
        }
      );
      
      if (error) throw error;
      return result;
    },
    onSuccess: (data) => {
      // Update cache and UI
      queryClient.invalidateQueries(['donors']);
    },
    onError: (error) => {
      // Handle specific error types
      console.error('Donor creation failed:', error);
    }
  });
};
```

### Error Handling Strategy
```typescript
// Handle different error types
const handleDonorCreationError = (error: any) => {
  if (error.message?.includes('rate limit')) {
    return 'AI service is busy. Please try again in a few minutes.';
  }
  if (error.message?.includes('API key')) {
    return 'Service configuration error. Please contact support.';
  }
  if (error.message?.includes('timeout')) {
    return 'Request timed out. Please try again.';
  }
  return 'An unexpected error occurred. Please try again.';
};
```

## Dependencies
- Task-001: Database types ✅
- Task-002: Authentication system ✅
- Task-003: Redux and React Query ✅
- Task-005: Donor UI components ✅
- Task-006: Edge Function ✅
- Task-007: AI services ✅

## Success Metrics
- [ ] Complete donor search workflow works end-to-end
- [ ] AI generation completes within 2 minutes
- [ ] Error rate < 5% for valid requests
- [ ] User can successfully create and view donor intelligence
- [ ] Multiple users can work simultaneously without conflicts

## Testing Checklist

### Manual Testing
- [ ] Sign up new user
- [ ] Search for donor "John Smith" in "New York"
- [ ] Verify intelligence brief displays
- [ ] Test with invalid donor name
- [ ] Test with API keys disabled
- [ ] Test concurrent searches
- [ ] Test browser refresh during search

### Automated Testing (Future)
- [ ] Unit tests for updated hooks
- [ ] Integration tests for Edge Function calls
- [ ] E2E tests for complete workflow

## Rollback Plan
If issues arise:
1. Revert React Query hooks to use simulated data
2. Add feature flag to toggle between real/simulated data
3. Maintain UI functionality while debugging backend

## Documentation Updates
- [ ] Update README.md with environment variable setup
- [ ] Document error handling patterns
- [ ] Add troubleshooting guide for common issues

## Estimated Total Time: 4-5 hours

This task will complete the core functionality of the Nexus platform, enabling users to perform real AI-powered donor research through the web interface.