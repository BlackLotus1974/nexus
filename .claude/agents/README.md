# Nexus Project Subagents

This directory contains specialized AI subagents configured for the Nexus Fundraising Intelligence Platform development.

## Available Subagents

### 1. **auth-specialist**
**Purpose:** Supabase authentication and authorization expert
**Use For:**
- Implementing Supabase Auth with Next.js
- Row Level Security (RLS) policies
- Protected routes and middleware
- OAuth integration
- Session management

**Phase:** Phase 2 - Core Features
**Tools:** Read, Write, Edit, Bash, Grep, Glob

### 2. **ui-component-builder**
**Purpose:** React component specialist with Tailwind CSS
**Use For:**
- Building dashboard and UI components
- DonorSearch, IntelligenceBrief, RelationshipMap components
- Responsive design and accessibility
- Form handling and validation
- Data visualization

**Phase:** Phase 2 - Core Features
**Tools:** Read, Write, Edit, Glob, Grep

### 3. **edge-function-developer**
**Purpose:** Supabase Edge Functions specialist
**Use For:**
- donor-intelligence-generator function
- relationship-analyzer function
- crm-sync-handler function
- engagement-recommender function
- AI API integration in Edge Functions

**Phase:** Phase 2 - Core Features
**Tools:** Read, Write, Edit, Bash, Grep

### 4. **state-management-expert**
**Purpose:** Redux Toolkit and React Query specialist
**Use For:**
- Setting up Redux store and slices
- React Query hooks for data fetching
- Client-side caching strategies
- Real-time data synchronization
- Optimistic UI updates

**Phase:** Phase 2 - Core Features
**Tools:** Read, Write, Edit, Grep, Glob

### 5. **testing-engineer**
**Purpose:** Testing specialist (Jest, Playwright, RTL)
**Use For:**
- Writing unit tests for components and utilities
- Integration tests for API and database operations
- End-to-end tests for complete workflows
- Test coverage analysis
- Mocking strategies

**Phase:** Phase 2 - Core Features
**Tools:** Read, Write, Edit, Bash, Grep

### 6. **ai-integration-specialist**
**Purpose:** Google Gemini and OpenAI API expert
**Use For:**
- Implementing Gemini API integration
- OpenAI fallback strategies
- Prompt engineering for fundraising domain
- Token management and cost optimization
- AI service error handling

**Phase:** Phase 2 - Core Features
**Tools:** Read, Write, Edit, Bash, Grep

## How to Use Subagents

### Automatic Invocation

Claude Code will automatically delegate tasks to appropriate subagents based on context. The subagents are designed to be proactive.

### Explicit Invocation

You can explicitly request a subagent:

```
> Use the auth-specialist subagent to implement Supabase authentication

> Have the ui-component-builder create the DonorSearch component

> Ask the edge-function-developer to create the donor-intelligence-generator function
```

### Chaining Subagents

For complex workflows:

```
> First use ui-component-builder to create the login form, then use auth-specialist to wire up authentication

> Use edge-function-developer to create the function, then use testing-engineer to write tests
```

## Development Workflow Examples

### Phase 2 Implementation

**Example 1: Authentication Flow**
```
1. auth-specialist → Implement Supabase Auth
2. ui-component-builder → Create login/signup pages
3. state-management-expert → Add auth slice to Redux
4. testing-engineer → Write auth flow tests
```

**Example 2: Donor Intelligence Feature**
```
1. ui-component-builder → Create DonorSearch component
2. edge-function-developer → Build donor-intelligence-generator
3. ai-integration-specialist → Implement Gemini/OpenAI integration
4. state-management-expert → Add donor slice and React Query hooks
5. testing-engineer → Write component and integration tests
```

**Example 3: Dashboard Implementation**
```
1. ui-component-builder → Create DashboardLayout and navigation
2. state-management-expert → Set up Redux store configuration
3. auth-specialist → Add route protection middleware
4. testing-engineer → Write E2E tests for dashboard
```

## Subagent Best Practices

1. **Focused Scope:** Each subagent handles specific domain expertise
2. **Context Preservation:** Subagents maintain separate context windows
3. **Proactive Use:** Subagents include "use proactively" in descriptions
4. **Tool Limitations:** Each subagent has access only to needed tools
5. **Type Safety:** All subagents follow TypeScript strict mode

## Managing Subagents

### View All Agents
```
/agents
```

### Edit an Agent
1. Run `/agents`
2. Select agent to edit
3. Modify description, tools, or system prompt

### Create Custom Agent
1. Run `/agents`
2. Select "Create New Agent"
3. Follow the guided setup

## Next Steps

Based on IMPLEMENTATION_STATUS.md Phase 2 priorities:

1. **Start with auth-specialist** → Implement authentication
2. **Use ui-component-builder** → Create dashboard and core UI
3. **Engage state-management-expert** → Set up Redux and React Query
4. **Deploy edge-function-developer** → Build backend functions
5. **Leverage ai-integration-specialist** → Connect AI services
6. **Finish with testing-engineer** → Ensure quality and coverage

## Related Documentation

- [IMPLEMENTATION_STATUS.md](../../IMPLEMENTATION_STATUS.md) - Current project status
- [design.md](.kiro/specs/nexus-fundraising-platform/design.md) - System architecture
- [requirements.md](.kiro/specs/nexus-fundraising-platform/requirements.md) - Feature requirements
- [CLAUDE.md](../../CLAUDE.md) - Claude Code guidance
