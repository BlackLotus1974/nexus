# Context Engineering Template

## Header Section

### Title
**Nexus Fundraising Intelligence Platform - Context Engineering Framework**

### Purpose
This template provides AI agents with comprehensive context about the Nexus platform's current state, architecture patterns, and implementation guidelines to ensure consistent, high-quality development aligned with project goals.

**Last Updated:** October 13, 2025
**Current Version:** v0.1.0 (Active Development)
**App Status:** ✅ Running on http://localhost:3000

## Project Overview

### Mission Statement
Nexus transforms fundraising for non-profits by providing AI-powered donor intelligence, relationship mapping, and personalized engagement strategies within minutes instead of hours of manual research.

### Core Value Proposition
- **Speed**: Donor intelligence generation in ≤2 minutes
- **Intelligence**: AI-powered insights from Gemini/OpenAI with automatic fallback
- **Integration**: Seamless CRM synchronization (planned: Salesforce, HubSpot, Bloomerang, Kindful, Neon One)
- **Personalization**: Tailored engagement strategies for each donor

### Target Users
- **Primary**: Development Directors at small-to-medium non-profits
- **Secondary**: Fundraising teams, Major Gift Officers, Executive Directors
- **User Persona**: Sarah (Development Director) - tech-comfortable, manages $25K-$1M gifts, needs efficiency

## Technical Architecture

### Stack Overview
```
Frontend: React 18.3 + Next.js 14.2 (App Router) + TypeScript 5.4 + Tailwind CSS 3.4
State: Redux Toolkit 2.2 + React Query 5.28
Backend: Supabase (PostgreSQL + Edge Functions + Auth + Storage)
AI: Google Gemini 0.24 (primary) + OpenAI 6.2 (fallback)
Automation: n8n workflows (not yet implemented)
Testing: Jest 29.7 + Playwright 1.42 + React Testing Library 14.2
Deployment: Local dev + Vercel (planned) + Supabase Cloud (planned)
```

### Key Architectural Principles
1. **Multi-tenant**: Every table includes `organization_id` for data isolation
2. **Row Level Security (RLS)**: All queries filtered by organization_id at database level
3. **Serverless**: Supabase Edge Functions (Deno runtime) for scalable compute
4. **Type-safe**: Strict TypeScript with auto-generated database types
5. **Performance**: <2s UI operations, <2min AI operations (with progress indicators)
6. **Security**: AES-256 encryption, OAuth 2.0, automatic session refresh

### Database Schema (Implemented)

**5 Applied Migrations:**
1. `20241007_initial_schema.sql` - Core schema with RLS policies
2. `20241008_create_profile_trigger.sql` - Auto-create profiles on signup
3. `20241009_fix_missing_profile.sql` - Handle edge cases
4. `20241010_fix_rls_recursion.sql` - Fix RLS policy recursion
5. `20241011_fix_profile_trigger.sql` - Final trigger corrections

**Core Tables:**
- `organizations` - Multi-tenant root (UUID pk, name, timestamps)
- `profiles` - User accounts (linked to auth.users, organization_id FK)
- `donors` - Donor records with `intelligence_data` JSONB field
- `relationships` - Connection mapping with strength scores (1-10)
- `projects` - Fundraising projects (name, description, concept_note, funding_goal)
- `donor_project_alignments` - AI compatibility scores (0-1)
- `crm_integrations` - CRM credentials and sync status
- `activity_log` - System activity tracking

All tables have:
- UUID primary keys (`gen_random_uuid()`)
- `created_at` and `updated_at` timestamps (auto-updated via triggers)
- RLS policies enforcing organization_id filtering
- Appropriate indexes on organization_id

## Implementation Standards

### Code Quality Requirements
- **TypeScript**: Strict mode enabled, minimal `any` usage (only for type casting)
- **Testing**: Jest for unit tests, Playwright for E2E (infrastructure in place)
- **Performance**: React.memo for expensive components, useMemo for calculations
- **Accessibility**: WCAG 2.1 AA compliance, semantic HTML, ARIA labels
- **Error Handling**: User-friendly messages, retry mechanisms, graceful degradation

### File Structure (Actual)
```
nexus/
├── app/                         # Next.js App Router
│   ├── (auth)/                  # Route group for auth pages
│   │   ├── login/page.tsx       # ✅ Login with email/OAuth
│   │   ├── signup/page.tsx      # ✅ Signup page
│   │   └── forgot-password/page.tsx  # ✅ Password reset
│   ├── dashboard/page.tsx       # ✅ Main dashboard with stats
│   ├── donors/                  # Donor management
│   │   ├── page.tsx             # ✅ Donor list and search
│   │   ├── [id]/page.tsx        # ✅ Individual donor detail
│   │   └── demo/page.tsx        # ✅ Demo page
│   ├── ui-demo/page.tsx         # ✅ Component showcase
│   ├── layout.tsx               # ✅ Root layout with providers
│   ├── page.tsx                 # ✅ Landing page
│   └── globals.css              # Global styles
├── components/
│   ├── ui/                      # ✅ 15+ reusable components
│   │   ├── Button.tsx
│   │   ├── Input.tsx
│   │   ├── Select.tsx
│   │   ├── Modal.tsx
│   │   ├── Card.tsx
│   │   ├── Badge.tsx
│   │   ├── Skeleton.tsx
│   │   ├── Alert.tsx
│   │   └── Progress.tsx
│   ├── donor/                   # ✅ Donor-specific components
│   │   ├── DonorSearch.tsx      # Search form with validation
│   │   ├── DonorList.tsx        # Table/grid view
│   │   ├── DonorListSkeleton.tsx
│   │   ├── IntelligenceBrief.tsx
│   │   └── IntelligenceBriefSkeleton.tsx
│   ├── layout/                  # ✅ Layout components
│   │   ├── DashboardLayout.tsx
│   │   ├── Header.tsx
│   │   └── Sidebar.tsx
│   └── examples/                # Example implementations
├── lib/
│   ├── supabase/
│   │   ├── client.ts            # ✅ Client-side Supabase client
│   │   └── server.ts            # ✅ Server-side client
│   ├── ai/                      # ✅ AI service layer (12 files)
│   │   ├── orchestrator.ts      # Gemini→OpenAI fallback
│   │   ├── gemini.ts            # Gemini implementation
│   │   ├── openai.ts            # OpenAI implementation
│   │   ├── prompts.ts           # Prompt templates
│   │   ├── parser.ts            # Response parsing
│   │   ├── errors.ts            # Error handling
│   │   ├── types.ts             # Type definitions
│   │   ├── config.ts            # Configuration
│   │   ├── utils.ts             # Utilities
│   │   └── index.ts             # Public API
│   ├── auth/                    # ✅ Auth utilities
│   │   ├── AuthProvider.tsx     # Auth context provider
│   │   └── hooks.ts             # useUser, useSession
│   ├── hooks/                   # ✅ React Query hooks
│   │   ├── useDonors.ts         # Donor CRUD operations
│   │   ├── useProjects.ts       # Project operations
│   │   ├── useCRMIntegrations.ts
│   │   ├── useRelationships.ts
│   │   └── index.ts
│   └── react-query/
│       ├── client.ts            # ✅ Query client config
│       └── provider.tsx         # ✅ Provider wrapper
├── store/                       # ✅ Redux Toolkit
│   ├── slices/
│   │   ├── authSlice.ts         # User auth state
│   │   ├── donorSlice.ts        # Donor data & search
│   │   ├── projectSlice.ts      # Project management
│   │   └── crmSlice.ts          # CRM integration status
│   ├── hooks.ts                 # useAppDispatch, useAppSelector
│   ├── provider.tsx             # Redux provider
│   └── index.ts                 # Store configuration
├── types/
│   ├── database.ts              # ✅ Auto-generated Supabase types
│   └── index.ts                 # ✅ Application types
├── supabase/
│   ├── migrations/              # ✅ 5 migrations applied
│   ├── functions/
│   │   ├── donor-intelligence-generator/  # ✅ Working Edge Function
│   │   │   └── index.ts
│   │   └── _shared/             # Shared utilities
│   │       ├── ai-service.ts
│   │       └── cors.ts
│   └── config.toml              # Local config
├── tests/
│   └── e2e/                     # Playwright tests (infrastructure ready)
├── .kiro/specs/                 # Project specifications
│   └── nexus-fundraising-platform/
│       ├── requirements.md
│       ├── design.md
│       └── tasks.md
├── middleware.ts                # ✅ Route protection
├── tsconfig.json                # ✅ TS config with @/* alias
├── tailwind.config.ts           # ✅ Tailwind config
├── playwright.config.ts         # ✅ E2E test config
├── package.json                 # Dependencies & scripts
├── prd.md                       # Product requirements
├── README.md                    # Setup guide
└── CLAUDE.md                    # Development guide
```

### Naming Conventions
- **Components**: PascalCase (e.g., `DonorSearch.tsx`)
- **Pages**: kebab-case or PascalCase (e.g., `page.tsx`, `forgot-password/`)
- **Functions**: camelCase (e.g., `generateDonorIntelligence`)
- **Constants**: UPPER_SNAKE_CASE (e.g., `AI_TIMEOUT_MS`)
- **Database columns**: snake_case (e.g., `organization_id`)
- **Import alias**: `@/*` for all imports (configured in tsconfig.json)

## Feature Implementation Guidelines

### Core Features Status (Current: October 2025)

✅ **FULLY IMPLEMENTED:**

**Database & Backend:**
- ✅ Multi-tenant PostgreSQL schema with 5 migrations
- ✅ Row Level Security (RLS) policies on all tables
- ✅ Profile auto-creation triggers
- ✅ Supabase client/server pattern
- ✅ Edge Function: `donor-intelligence-generator` (fully functional)

**Authentication & Authorization:**
- ✅ Email/password authentication
- ✅ OAuth (Google, Microsoft Azure)
- ✅ Protected routes via middleware
- ✅ Session management with auto-refresh
- ✅ Profile creation with organization_id
- ✅ Login, Signup, Forgot Password pages

**State Management:**
- ✅ Redux Toolkit store with 4 slices
- ✅ React Query integration
- ✅ Custom hooks for all entities (donors, projects, CRM, relationships)
- ✅ Provider hierarchy: ReduxProvider → AuthProvider → ReactQueryProvider

**AI Integration:**
- ✅ AI orchestrator with automatic Gemini→OpenAI fallback
- ✅ Prompt engineering templates
- ✅ Response parsing and validation
- ✅ Error handling with retries
- ✅ Rate limit handling
- ✅ Configuration via environment variables

**UI Components (15+ components):**
- ✅ Button (variants: primary, secondary, outline, ghost, danger)
- ✅ Input (with label, error, helper text)
- ✅ Select dropdown
- ✅ Modal/Dialog
- ✅ Card (with Header, Body variants)
- ✅ Badge
- ✅ Alert (variants: info, success, warning, error)
- ✅ Progress bar (with label, percentage)
- ✅ Skeleton loaders
- ✅ DonorSearch form
- ✅ DonorList (table and grid views)
- ✅ IntelligenceBrief display
- ✅ DashboardLayout with Header/Sidebar

**Pages & Routes:**
- ✅ `/` - Landing page with features
- ✅ `/login` - Email/OAuth login
- ✅ `/signup` - User registration
- ✅ `/forgot-password` - Password reset
- ✅ `/dashboard` - Main dashboard with stats cards
- ✅ `/donors` - Donor list with search
- ✅ `/donors/[id]` - Donor detail page
- ✅ `/donors/demo` - Demo page for testing
- ✅ `/ui-demo` - Component showcase
- ✅ Route protection (middleware enforces auth)

**User Experience:**
- ✅ Loading states with skeleton loaders
- ✅ Progress indicators for AI generation
- ✅ Error handling with user-friendly messages
- ✅ Form validation
- ✅ Recent search history (localStorage)
- ✅ Dark mode support (Tailwind dark: classes)
- ✅ Responsive design (mobile-friendly)

🔄 **IN PROGRESS:**
- 🔄 Full end-to-end testing of donor intelligence workflow
- 🔄 CRM sync button implementations (UI exists, backend pending)
- 🔄 Organization setup and profile completion flows
- 🔄 Intelligence brief AI response refinements
- 🔄 Real-time progress updates during AI generation

⏳ **NOT YET STARTED:**
- ⏳ CRM integrations (Salesforce, HubSpot, Bloomerang, Kindful, Neon One)
- ⏳ n8n workflow automation setup
- ⏳ Relationship mapping via email/LinkedIn analysis
- ⏳ Project-donor alignment analysis algorithm
- ⏳ Engagement strategy generation
- ⏳ Real-time notifications system
- ⏳ Activity feed with actual data
- ⏳ Advanced search and filtering
- ⏳ Bulk operations
- ⏳ Data export functionality
- ⏳ Admin dashboard
- ⏳ Team management

### Implementation Priorities
1. **Critical**: Test and refine donor intelligence generation end-to-end
2. **High**: CRM integration framework (Salesforce first)
3. **High**: Relationship mapping via email analysis
4. **Medium**: Project-donor alignment algorithm
5. **Medium**: n8n workflow automation
6. **Low**: Advanced analytics and reporting
7. **Low**: Mobile optimization

## AI Integration Patterns (Fully Implemented)

### AI Service Architecture
Located in `lib/ai/`, the AI layer provides automatic provider fallback:

**Key Files:**
- `orchestrator.ts` - Central coordinator with Gemini→OpenAI fallback
- `gemini.ts` - Google Gemini API client
- `openai.ts` - OpenAI API client
- `prompts.ts` - Structured prompt templates
- `parser.ts` - Response parsing and validation
- `errors.ts` - Error types and retry logic
- `config.ts` - Environment variable management
- `types.ts` - TypeScript interfaces

### Usage Pattern
```typescript
import { getAIOrchestrator } from '@/lib/ai';

const orchestrator = getAIOrchestrator();
const result = await orchestrator.generateDonorIntelligence({
  name: "John Doe",
  location: "New York, NY",
  context: "Previous donor, tech industry"
});
// Automatically tries Gemini first, falls back to OpenAI on error
// Returns: { success, data: DonorIntelligence, provider, latencyMs, tokensUsed }
```

### Prompt Engineering Standards
- **Structured Output**: JSON responses with defined schemas
- **Context Inclusion**: donor_name (required), location (optional), context (optional)
- **Fallback Handling**: Gemini fails → OpenAI attempts → User-friendly error
- **Rate Limiting**: Exponential backoff with configurable retries (AI_MAX_RETRIES=3)
- **Timeout**: Configurable timeout (AI_TIMEOUT_MS=120000)

### Error Handling Strategy
- **Rate Limits**: Display wait time, queue requests
- **API Failures**: Automatic fallback to secondary provider
- **Timeouts**: 2-minute limit with progress indicators (simulated during generation)
- **Partial Data**: Display available information, note gaps
- **User Errors**: Clear, actionable error messages without technical jargon

## User Experience Guidelines

### Design Principles (Implemented)
- **Clarity**: Clean information hierarchy, obvious CTAs
- **Speed**: Immediate feedback, progress bars for AI operations
- **Trust**: Provider transparency (Gemini/OpenAI shown), confidence indicators
- **Efficiency**: Minimal clicks, recent search history, keyboard-friendly forms

### Loading States (Implemented)
- **Skeleton Loaders**: Match final content structure (DonorListSkeleton, IntelligenceBriefSkeleton)
- **Progress Bars**: Show percentage and current step ("Searching public data...", "Analyzing connections...")
- **Cancellation**: Not yet implemented (planned)
- **Retry**: Included in error alerts

### Error Messages (Implemented)
Examples:
- ❌ Generic: "An error occurred"
- ✅ Specific: "AI service is busy. Please try again in a few minutes."
- ✅ Actionable: Error alerts include close button, retry mechanisms in UI
- ✅ Contextual: "Failed to generate donor intelligence. Please try again."
- ✅ Friendly: No stack traces or technical codes shown to users

## Security & Compliance

### Data Protection (Implemented)
- **Encryption**: Supabase handles encryption at rest and in transit
- **Access Control**: RLS enforces organization_id filtering on all queries
- **Audit Trail**: `activity_log` table structure in place (not yet populated)
- **Data Retention**: Configurable per organization (not yet implemented)

### Authentication Flow (Fully Implemented)
1. User visits `/login` or `/signup`
2. Supabase Auth creates user in `auth.users`
3. Database trigger auto-creates record in `profiles` table with `organization_id`
4. Middleware protects routes: `/dashboard`, `/donors`, `/projects`, `/crm`, `/settings`
5. Session stored in cookies, automatically refreshed
6. AuthProvider updates Redux store with user, profile, and session
7. All database queries filtered by `organization_id` from profile

### API Security
- **Authorization**: Bearer tokens in all Supabase API calls
- **Rate Limiting**: Not yet implemented (planned)
- **Input Validation**: Forms validate on client-side, Edge Functions validate server-side
- **CORS**: Configured in Edge Functions (`_shared/cors.ts`)

## Testing Strategy

### Test Infrastructure (Ready)
- **Jest**: Configured inline in package.json
- **Playwright**: Configuration in `playwright.config.ts`, runs on Chromium
- **React Testing Library**: Installed and ready
- **Commands**:
  - `npm test` - Run Jest unit tests
  - `npm run test:ci` - Run with coverage
  - `npm run test:e2e` - Run Playwright E2E tests

### Test Coverage (Not Yet Implemented)
- **Target**: 80%+ coverage for utilities and services
- **Current**: Tests not yet written (infrastructure ready)
- **Priority**: Add tests for AI orchestrator, Supabase queries, form validation

## Deployment & Operations

### Environment Configuration (Current)
**Development (.env.local):**
```bash
NEXT_PUBLIC_SUPABASE_URL=http://127.0.0.1:64321
NEXT_PUBLIC_SUPABASE_ANON_KEY=[from npx supabase status]
SUPABASE_SERVICE_ROLE_KEY=[from npx supabase status]
GEMINI_API_KEY=your_gemini_api_key
OPENAI_API_KEY=your_openai_api_key
AI_TIMEOUT_MS=120000
AI_MAX_RETRIES=3
AI_VERBOSE_LOGGING=false
NEXT_PUBLIC_APP_URL=http://localhost:3000
```

**Production (Not Yet Configured):**
- Vercel deployment (planned)
- Supabase Cloud (planned)
- Environment variables via Vercel dashboard

### Current Development Setup
1. **Docker Desktop** must be running (required for Supabase)
2. `npx supabase start` - Start local Supabase instance
3. `npm run dev` - Start Next.js dev server on port 3000
4. App accessible at http://localhost:3000
5. Supabase Studio at http://127.0.0.1:64323

### Monitoring (Not Yet Implemented)
- Error tracking (Sentry planned)
- Performance monitoring (Vercel Analytics planned)
- AI usage tracking (custom solution needed)
- Cost monitoring (AI API usage)

## Common Patterns & Solutions

### State Management Pattern (Implemented)
```typescript
// Redux slice for domain state (donors, projects, etc.)
const dispatch = useAppDispatch();
const { donors, loading } = useAppSelector((state) => state.donor);

// React Query for server state (data fetching with caching)
const { data: donors, isLoading, error } = useDonors(organizationId);

// useMutation for create/update operations
const generateIntelligence = useGenerateDonorIntelligence();
await generateIntelligence.mutateAsync({ name, location });

// Local state for UI-only state (modals, form inputs)
const [isOpen, setIsOpen] = useState(false);
```

### Provider Hierarchy (Critical)
```tsx
<ReduxProvider>           {/* Outermost: provides store to all children */}
  <AuthProvider>          {/* Depends on Redux store */}
    <ReactQueryProvider>  {/* Innermost: wraps app content */}
      {children}
    </ReactQueryProvider>
  </AuthProvider>
</ReduxProvider>
```
**Order matters!** Changing this breaks auth and state management.

### Error Boundary Pattern (Not Yet Implemented)
```typescript
// TODO: Add error boundaries for robust error handling
<ErrorBoundary fallback={<ErrorFallback />}>
  <DonorIntelligenceGenerator />
</ErrorBoundary>
```

### Loading State Pattern (Implemented)
```typescript
{isLoading ? <DonorListSkeleton /> : <DonorList donors={donors} />}
{isGenerating && (
  <Progress value={progress} showLabel label="Generating intelligence..." />
)}
```

## Troubleshooting Guide

### Common Issues & Solutions

1. **App Won't Start / Hangs During Compilation**
   - **Cause**: TypeScript errors in Redux slices or Edge Functions blocking build
   - **Solution**: Run `npm run type-check` to identify errors
   - **Note**: Edge Functions (Deno) excluded from Next.js compilation via tsconfig.json

2. **Supabase Connection Errors**
   - **Check**: `npx supabase status` - is local instance running?
   - **Fix**: Ensure Docker Desktop is running
   - **Windows**: Start Docker: `start "" "C:\Program Files\Docker\Docker\Docker Desktop.exe"`

3. **Type Errors After Schema Changes**
   - **Fix**: Regenerate types: `npx supabase gen types typescript --local > types/database.ts`
   - **Note**: Must do this after every migration

4. **Auth Issues / RLS Errors**
   - **Verify**: Is `organization_id` in query filter?
   - **Check**: RLS policies in migrations (20241007_initial_schema.sql)
   - **Debug**: Check middleware logs in console (`[Middleware]` prefix)

5. **AI Generation Failures**
   - **Check**: Are API keys set in `.env.local`?
   - **Verify**: Keys are valid (test in respective dashboards)
   - **Enable debug**: Set `AI_VERBOSE_LOGGING=true`
   - **Fallback**: System automatically tries OpenAI if Gemini fails

6. **Port Already in Use**
   - **Symptom**: "Port 3000 is in use, trying 3001..."
   - **Fix**: Kill existing process or use suggested port
   - **Windows**: `taskkill /F /PID [process_id]`

### Debug Commands
```bash
# Development
npm run dev                    # Start dev server
npm run build                  # Test production build
npm run type-check             # Validate TypeScript
npm run lint                   # Run ESLint

# Database
npx supabase start             # Start local instance
npx supabase stop              # Stop local instance
npx supabase status            # Get connection details
npx supabase db reset          # Reset and reapply migrations
npx supabase migration new <name>  # Create new migration
npx supabase gen types typescript --local > types/database.ts  # Regenerate types

# Testing
npm test                       # Run Jest unit tests
npm run test:ci                # Run with coverage
npm run test:e2e               # Run Playwright E2E tests

# Edge Functions
npx supabase functions serve donor-intelligence-generator  # Test locally
npx supabase functions deploy donor-intelligence-generator # Deploy to remote
```

## Success Metrics

### Technical KPIs (Targets)
- **Performance**: <2s UI response, <2min AI generation
- **Reliability**: >99% uptime, <5% error rate
- **Quality**: >80% test coverage, zero critical security issues
- **Build Time**: <30s development, <3min production

### Business KPIs (Targets)
- **Adoption**: >60% user activation rate (complete first search)
- **Engagement**: >70% monthly active users
- **Satisfaction**: >65 NPS score
- **Efficiency**: 50% reduction in donor research time (vs manual research)

## Future Roadmap

### Next Sprint (Immediate)
- ✅ Fix TypeScript compilation errors (COMPLETED)
- 🔄 End-to-end donor intelligence testing
- ⏳ Add error boundaries
- ⏳ Implement unit tests for AI services
- ⏳ Create demo video / onboarding flow

### Next Quarter (Q1 2026)
- CRM integration framework (Salesforce first)
- Email analysis for relationship mapping
- Project-donor alignment algorithm
- n8n workflow setup
- Beta launch with 3-5 test organizations

### Long-term Vision (2026+)
- Predictive donor scoring (ML model)
- Automated engagement workflows
- Advanced analytics dashboard
- Mobile application (React Native)
- Public API for third-party integrations
- Marketplace for community-built integrations

---

## Agent Instructions

When working on this project, **ALWAYS**:

1. **Check Current Status**: Read this template before starting (it's updated regularly)
2. **Follow Patterns**: Use established conventions (see examples above)
3. **Test Thoroughly**: Run type-check, verify in browser before marking complete
4. **Document Changes**: Update this template when adding new patterns or architecture decisions
5. **Consider UX**: Every interaction should feel fast, intelligent, trustworthy
6. **Maintain Type Safety**: Avoid `any`, regenerate types after schema changes
7. **Filter by organization_id**: CRITICAL - all database queries MUST filter by organization_id

### Quick Checklist Before Committing
- [ ] `npm run type-check` passes
- [ ] `npm run lint` passes
- [ ] Tested in browser (at least smoke test)
- [ ] Updated CLAUDE.md if architecture changed
- [ ] Updated CONTEXT_ENGINEERING_TEMPLATE.md if new patterns added
- [ ] No console.errors in browser
- [ ] Forms validate properly
- [ ] Loading states display correctly
- [ ] Error messages are user-friendly

### Critical Rules
- ❗ **NEVER** commit code with TypeScript errors
- ❗ **NEVER** skip organization_id filtering in queries
- ❗ **ALWAYS** regenerate types after schema changes
- ❗ **ALWAYS** restart dev server after `.env.local` changes
- ❗ **NEVER** expose API keys or secrets in code
- ❗ **ALWAYS** handle errors gracefully with user-friendly messages

---

**Remember**: We're building a platform that fundraisers will rely on daily. Every interaction should feel fast, intelligent, and trustworthy. Code quality matters. User experience matters. Security matters.

**Current App Status**: ✅ **Fully Functional** - Running on http://localhost:3000 with core features implemented and ready for end-to-end testing.
