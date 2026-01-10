# CLAUDE.md

This file provides guidance to Claude Code (claude.ai/code) when working with code in this repository.

## Project Overview

**Nexus Fundraising Intelligence Platform** - An AI-powered fundraising assistant for non-profits to research donors, discover warm connections, and personalize engagement through CRM integration and intelligent insights.

**Current Status:** Active development. Core architecture implemented including authentication, state management, AI integration, and UI components.

## Repository Structure

```
nexus/
├── app/                    # Next.js App Router (pages and layouts)
├── components/             # React components
│   ├── donor/             # Donor-related components (search, list, intelligence brief)
│   ├── layout/            # Layout components (dashboard, header, sidebar)
│   ├── ui/                # Reusable UI components (button, input, modal, etc.)
│   └── examples/          # Example implementations
├── lib/                    # Utility functions and services
│   ├── supabase/          # Supabase client configuration (client.ts, server.ts)
│   ├── ai/                # AI service layer (Gemini, OpenAI, orchestrator)
│   ├── auth/              # Authentication hooks and utilities
│   ├── hooks/             # React hooks for data fetching (donors, projects, CRM)
│   └── react-query/       # React Query configuration
├── store/                  # Redux Toolkit store and slices
│   ├── slices/            # Redux slices (auth, donor, project, crm)
│   └── provider.tsx       # Redux provider component
├── types/                  # TypeScript type definitions
│   └── database.ts        # Auto-generated Supabase types
├── supabase/               # Supabase configuration
│   ├── migrations/         # Database migrations (5 migrations applied)
│   ├── functions/          # Edge Functions (donor-intelligence-generator)
│   │   ├── _shared/       # Shared utilities for edge functions
│   │   └── donor-intelligence-generator/
│   └── config.toml         # Local Supabase configuration
├── tests/                  # Playwright E2E tests
├── .kiro/specs/            # Project specifications (requirements, design, tasks)
├── prd.md                  # Product Requirements Document
└── CLAUDE.md               # This file
```

## Technology Stack

- **Frontend:** React 18 + Next.js 14 (App Router) + TypeScript
- **State:** Redux Toolkit (implemented) + React Query (implemented)
- **Styling:** Tailwind CSS
- **Backend:** Supabase (PostgreSQL + Edge Functions + Auth + Storage)
- **Automation:** n8n (for CRM integrations and workflows - not yet implemented)
- **AI:** Google Gemini (primary) + OpenAI (fallback) - orchestrator implemented in `lib/ai/`
- **Testing:** Jest (unit tests) + Playwright (E2E tests) + React Testing Library

## Common Development Commands

**Development:**
```bash
npm run dev              # Start Next.js dev server (http://localhost:3000)
npm run build            # Build for production
npm run start            # Start production server
npm run lint             # Run ESLint
npm run type-check       # TypeScript type checking
```

**Testing:**
```bash
npm test                 # Run Jest unit tests
npm run test:ci          # Run tests with coverage
npm run test:e2e         # Run Playwright E2E tests
```

**Database (Supabase):**
```bash
npx supabase start       # Start local Supabase (requires Docker Desktop)
npx supabase stop        # Stop local Supabase
npx supabase status      # Check status and get connection details
npx supabase db reset    # Reset database and run migrations
npx supabase migration new <name>  # Create new migration
npx supabase db push     # Apply migrations to remote database
npx supabase gen types typescript --local > types/database.ts  # Generate types
npx supabase functions serve <name>  # Test edge function locally
npx supabase functions deploy <name> # Deploy edge function to remote
```

**Windows-Specific Notes:**
- Local Supabase requires **Docker Desktop** to be running
- Docker Desktop requires **WSL 2** to be enabled (`wsl --install` in PowerShell as Administrator)
- Use PowerShell or Windows Terminal for best results
- If Docker isn't running, start it: `start "" "C:\Program Files\Docker\Docker\Docker Desktop.exe"`
- Check Docker status: `docker ps`
- See [README.md](README.md) for complete Docker installation guide

## Environment Setup

**Required Environment Variables** (`.env.local`):
```bash
# Supabase (get from npx supabase status or Supabase dashboard)
NEXT_PUBLIC_SUPABASE_URL=your-supabase-url
NEXT_PUBLIC_SUPABASE_ANON_KEY=your-supabase-anon-key
SUPABASE_SERVICE_ROLE_KEY=your-service-role-key

# AI Services
GOOGLE_GEMINI_API_KEY=your-gemini-api-key
OPENAI_API_KEY=your-openai-api-key

# Optional AI Configuration
AI_TIMEOUT_MS=120000              # Default: 2 minutes
AI_MAX_RETRIES=3                   # Default: 3 retries
AI_VERBOSE_LOGGING=false           # Set true for debugging

# n8n (not yet implemented)
N8N_WEBHOOK_URL=your-n8n-webhook-url

# App Configuration
NEXT_PUBLIC_APP_URL=http://localhost:3000
```

**Setup Steps:**
1. Copy `.env.local.example` to `.env.local`
2. For local development, run `npx supabase start` and copy the credentials from output
3. Add your AI API keys (Gemini and/or OpenAI)
4. Restart dev server after changing environment variables

## Architecture Principles

### Multi-Tenant Data Isolation
- **All tables include `organization_id`** for tenant separation
- **Every database query MUST filter by `organization_id`**
- Row Level Security (RLS) policies enforce access control at the database level
- See [supabase/migrations/20241007_initial_schema.sql](supabase/migrations/20241007_initial_schema.sql:114-228) for RLS implementation

### Database Schema (Implemented)
Core tables in place:
- `organizations` - Multi-tenant root
- `profiles` - User accounts linked to `auth.users`
- `donors` - Donor records with `intelligence_data` JSONB field
- `relationships` - Connection mapping with strength scores
- `projects` - Fundraising projects
- `donor_project_alignments` - AI-generated compatibility scores
- `crm_integrations` - CRM credentials and sync status
- `activity_log` - System activity tracking

**Applied Migrations** (in [supabase/migrations/](supabase/migrations/)):
1. `20241007_initial_schema.sql` - Core schema with RLS policies
2. `20241008_create_profile_trigger.sql` - Auto-create profiles on user signup
3. `20241009_fix_missing_profile.sql` - Handle edge cases for profile creation
4. `20241010_fix_rls_recursion.sql` - Fix RLS policy recursion issues
5. `20241011_fix_profile_trigger.sql` - Final profile trigger corrections

All tables have:
- UUID primary keys
- `created_at` and `updated_at` timestamps (auto-updated via triggers)
- RLS policies for organization-level isolation
- Appropriate indexes for performance

### Supabase Client Pattern
- **Client-side:** Use `lib/supabase/client.ts` (uses anon key, respects RLS)
- **Server-side:** Use `lib/supabase/server.ts` (uses service role key for admin operations)
- Import type `Database` from `@/types/database` for type-safe queries

**Import Path Convention:**
- Use `@/*` alias for all imports (e.g., `import { createClient } from '@/lib/supabase/client'`)
- Configured in [tsconfig.json](tsconfig.json) with `"paths": { "@/*": ["./*"] }`
- Applies to all TypeScript/React files in the project

### Next.js App Router Patterns
- **File-based routing:** Each `page.tsx` in `app/` directory creates a route
- **Route groups:** Folders wrapped in parentheses like `(auth)` group routes without affecting URL structure
- **Dynamic routes:** `[id]` folders create dynamic route segments (e.g., `/donors/[id]`)
- **Layouts:** `layout.tsx` files provide shared UI structure for child routes
- **Loading states:** `loading.tsx` files provide automatic loading UI during navigation
- **Error boundaries:** `error.tsx` files handle errors at the route level

### Data Flow Architecture
1. React UI → Supabase client → Supabase Edge Functions
2. Edge Functions orchestrate AI (Gemini/OpenAI) + n8n workflows
3. n8n handles CRM integrations, email analysis, LinkedIn scraping
4. Results stored in PostgreSQL with RLS enforcement
5. UI updates via React Query + Supabase real-time subscriptions

## Implementation Guidelines

### When Creating New Database Tables
1. Include `organization_id UUID REFERENCES organizations(id) ON DELETE CASCADE NOT NULL`
2. Add `created_at` and `updated_at` timestamps with trigger
3. Create appropriate indexes (especially on `organization_id`)
4. Enable Row Level Security with `ALTER TABLE <name> ENABLE ROW LEVEL SECURITY`
5. Add RLS policies filtering by `organization_id` via `profiles` table lookup
6. Generate TypeScript types: `npx supabase gen types typescript --local > types/database.ts`

### When Creating Edge Functions (Supabase Functions)
Pattern to follow:
```typescript
import { createClient } from '@supabase/supabase-js'

Deno.serve(async (req) => {
  // 1. Validate input
  const { input } = await req.json()

  // 2. Create authenticated Supabase client
  const supabase = createClient(...)

  // 3. Verify user's organization_id
  const { data: profile } = await supabase
    .from('profiles')
    .select('organization_id')
    .eq('id', user.id)
    .single()

  // 4. Perform operation (AI call, data processing, etc.)
  // Always filter queries by organization_id

  // 5. Return structured response
  return new Response(JSON.stringify({ success: true, data }))
})
```

**Deployment:**
- Test locally: `npx supabase functions serve <function-name>`
- Deploy to remote: `npx supabase functions deploy <function-name>`
- Edge functions must complete within 2 minutes (hard timeout)
- Use `_shared/` directory for code reused across multiple functions

### AI Integration Pattern (Implemented)
The AI layer is centralized in `lib/ai/` with automatic provider fallback:

**Architecture:**
- `orchestrator.ts` - Central coordinator with automatic Gemini→OpenAI fallback
- `gemini.ts` - Google Gemini service implementation
- `openai.ts` - OpenAI service implementation
- `prompts.ts` - Structured prompt templates
- `parser.ts` - Response parsing and validation
- `errors.ts` - Error handling and retry logic
- `types.ts` - TypeScript interfaces for AI requests/responses
- `config.ts` - Configuration and environment variable management
- `utils.ts` - Shared utility functions
- `test-helpers.ts` - Testing utilities for AI services
- `example.ts` - Example usage patterns

**Usage Pattern:**
```typescript
import { getAIOrchestrator } from '@/lib/ai';

const orchestrator = getAIOrchestrator();
const result = await orchestrator.generateDonorIntelligence({
  donor_name: "John Doe",
  location: "New York, NY",
  context: "Previous donor, tech industry"
});
// Automatically tries Gemini first, falls back to OpenAI on error
```

**Edge Function Integration:**
- See [supabase/functions/donor-intelligence-generator/index.ts](supabase/functions/donor-intelligence-generator/index.ts)
- Shared AI service in [supabase/functions/_shared/ai-service.ts](supabase/functions/_shared/ai-service.ts)
- Keep operations under 2-minute timeout
- Store AI responses in JSONB fields (`intelligence_data`, `analysis_data`, etc.)

### State Management (Implemented)
**Redux Store Structure:**
- `authSlice` - User authentication state and session management
- `donorSlice` - Donor data, search state, and intelligence results
- `projectSlice` - Fundraising projects and alignment data
- `crmSlice` - CRM integration status and sync state

See [store/index.ts](store/index.ts) for store configuration.

**React Query Usage:**
- Custom hooks in `lib/hooks/` for data fetching:
  - `useDonors()` - Fetch and cache donor data
  - `useProjects()` - Fetch and cache projects
  - `useCRMIntegrations()` - Manage CRM connections
  - `useRelationships()` - Fetch relationship mappings
- Configure React Query client in [lib/react-query/client.ts](lib/react-query/client.ts)
- Wrap app in providers: ReduxProvider → AuthProvider → ReactQueryProvider (see [app/layout.tsx](app/layout.tsx))
- **Provider order matters:** ReduxProvider must be outermost to provide store to all children; AuthProvider needs access to store; ReactQueryProvider wraps the rest

**Local UI State:**
- Keep transient UI state (modals, forms, dropdowns) in component useState/useReducer
- Use controlled components for form inputs

## Critical Requirements

1. **Multi-tenancy** - Every database query MUST filter by `organization_id`
2. **RLS Enforcement** - Every new table MUST have Row Level Security policies
3. **Performance Targets:**
   - UI operations: ≤2 seconds response time
   - AI operations: ≤2 minutes total time
4. **Security:**
   - Use AES-256 encryption for sensitive data (CRM credentials, API tokens)
   - Never log or expose credentials
   - Use environment variables for secrets
5. **Error Handling** - Always implement fallback strategies for external services (AI, CRM, n8n)

### Component Architecture
**UI Components** (`components/ui/`):
- Built with Tailwind CSS, reusable across the app
- Include: Button, Input, Select, Modal, Card, Badge, Skeleton, Alert, Progress
- Follow composition pattern for flexibility
- See `/ui-demo` route for interactive component showcase

**Donor Components** (`components/donor/`):
- `DonorSearch.tsx` - Search form with validation
- `DonorList.tsx` - Displays donor records with pagination
- `IntelligenceBrief.tsx` - Shows AI-generated donor insights
- Skeleton components for loading states

**Layout Components** (`components/layout/`):
- `DashboardLayout.tsx` - Main application shell
- `Header.tsx` - Top navigation bar
- `Sidebar.tsx` - Side navigation menu

### Testing Configuration
**Jest (Unit Tests):**
- Configuration inline in [package.json](package.json) (no separate jest.config.js)
- Run with `npm test` or `npm run test:ci` (with coverage)
- Uses `@testing-library/react` for component testing
- Uses `@testing-library/jest-dom` for assertions
- Test files should be co-located with source files or in `__tests__` directories

**Playwright (E2E Tests):**
- Configuration in [playwright.config.ts](playwright.config.ts)
- Test directory: `tests/e2e/`
- Runs against local dev server (auto-started)
- Run with `npm run test:e2e`
- Uses Chromium by default, configurable for other browsers
- Screenshots captured on failure, trace on retry

### Authentication Flow
1. User signs up/in via Supabase Auth (email/password or OAuth)
2. `auth.users` record created automatically
3. Profile trigger creates corresponding `profiles` record with `organization_id`
4. Middleware ([middleware.ts](middleware.ts)) protects routes and refreshes sessions
5. Use `lib/auth/hooks.ts` for auth state in components:
   - `useUser()` - Get current user
   - `useSession()` - Get session state
6. AuthProvider wraps app to manage auth context

**Protected Routes** (enforced by [middleware.ts](middleware.ts)):
- `/dashboard` - Main dashboard
- `/donors` - Donor management
- `/donors/[id]` - Individual donor detail page
- `/projects` - Project management
- `/crm` - CRM integrations
- `/settings` - User settings

**Public Routes:**
- `/` - Landing page
- `/login`, `/signup`, `/forgot-password` - Auth pages (using `(auth)` route group)
- `/auth/callback` - OAuth callback handler

**Development/Demo Routes:**
- `/ui-demo` - UI component showcase
- `/donors/demo` - Donor search/intelligence demo

**Route Groups:**
- `(auth)` - Groups authentication pages without affecting URL structure

**Important:** Profile creation happens via database trigger (see [supabase/migrations/20241008_create_profile_trigger.sql](supabase/migrations/20241008_create_profile_trigger.sql)). Recent fixes ensure profile is created correctly and RLS policies avoid recursion.

## Project Documentation

For detailed specifications and requirements:
- [prd.md](prd.md) - Complete Product Requirements Document
- [.kiro/specs/nexus-fundraising-platform/requirements.md](.kiro/specs/nexus-fundraising-platform/requirements.md) - Feature requirements
- [.kiro/specs/nexus-fundraising-platform/design.md](.kiro/specs/nexus-fundraising-platform/design.md) - System architecture and technical design
- [README.md](README.md) - Setup instructions and development guide

## Recent Implementation Notes

**Completed:**
- ✅ Database schema with RLS policies (5 migrations applied)
- ✅ Supabase client configuration (client/server pattern)
- ✅ Redux store with 4 slices (auth, donor, project, crm)
- ✅ React Query integration with custom hooks
- ✅ AI orchestrator with Gemini/OpenAI fallback
- ✅ Edge function for donor intelligence generation
- ✅ Authentication flow with profile auto-creation
- ✅ Core UI component library (15+ components)
- ✅ Donor search and display components
- ✅ Playwright E2E test setup

**In Progress/Planned:**
- n8n workflow automation setup
- CRM integration implementation (Salesforce, HubSpot, Bloomerang, Kindful, Neon One)
- Relationship mapping features (warm path discovery)
- Project-donor alignment algorithm
- Advanced search and filtering
- Real-time notifications and activity feed

## Development Workflow Best Practices

### When Adding New Features
1. **Database changes first**: Create migration, update RLS policies, regenerate types
2. **Backend logic**: Implement Edge Functions if needed
3. **State management**: Add Redux slice if global state is needed, or React Query hook for data fetching
4. **UI components**: Build components in `components/`, reuse existing UI components from `components/ui/`
5. **Testing**: Write Jest unit tests for utilities/services, Playwright E2E tests for critical flows

### Common Gotchas
- **Always filter by `organization_id`** in database queries (multi-tenancy requirement)
- **Restart dev server** after changing `.env.local` variables
- **Regenerate types** after database schema changes: `npx supabase gen types typescript --local > types/database.ts`
- **Docker must be running** for local Supabase to work
- **Provider order matters** in app layout: ReduxProvider → AuthProvider → ReactQueryProvider
- **Edge functions timeout at 2 minutes** - design for async operations if needed
- **RLS policies** can cause "infinite recursion" errors if not carefully designed (see migration fixes)

### Debugging Tips
- Check Supabase logs: `npx supabase status` shows API URLs and keys
- Enable AI verbose logging: Set `AI_VERBOSE_LOGGING=true` in `.env.local`
- Check middleware logs for auth issues (logged to console with `[Middleware]` prefix)
- Use React Query DevTools (available in development mode)
- Check browser console for client-side errors
- Use `docker logs <container-id>` to debug Docker/Supabase issues
- Test individual components in isolation at `/ui-demo`
- Test donor features without full setup at `/donors/demo`

### Quick Reference - File Locations
**Configuration Files:**
- `tsconfig.json` - TypeScript configuration with `@/*` path alias
- `tailwind.config.ts` - Tailwind CSS configuration
- `playwright.config.ts` - E2E test configuration
- `next.config.mjs` - Next.js configuration
- `supabase/config.toml` - Local Supabase configuration
- `.env.local` - Environment variables (copy from `.env.local.example`)

**Key Source Files:**
- `middleware.ts` - Route protection and auth session management
- `app/layout.tsx` - Root layout with provider hierarchy
- `lib/supabase/client.ts` - Client-side Supabase client
- `lib/supabase/server.ts` - Server-side Supabase client
- `lib/ai/orchestrator.ts` - AI provider coordination with automatic fallback
- `store/index.ts` - Redux store configuration
- `types/database.ts` - Auto-generated Supabase types (regenerate after schema changes)
