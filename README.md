# Nexus Fundraising Intelligence Platform

AI-powered fundraising assistant that transforms how non-profits research donors, discover warm connections, and personalize engagement.

## Overview

Nexus integrates with existing CRMs and productivity tools to provide intelligent donor insights and strategic recommendations within minutes, replacing manual research processes with automated intelligence generation.

## Tech Stack

- **Frontend**: React 18 + Next.js 14 + TypeScript
- **State Management**: Redux Toolkit + React Query
- **Styling**: Tailwind CSS
- **Backend**: Supabase (PostgreSQL + Edge Functions + Auth + Storage)
- **Automation**: n8n workflows
- **AI**: Google Gemini (primary) + OpenAI (fallback)

## Getting Started

### Prerequisites

- Node.js 20+ and npm ✅ (Installed)
- **Docker Desktop** (Required for local Supabase) - See installation guide below
- WSL 2 (Windows only, required for Docker)
- Git

### Installation

1. Clone the repository:
```bash
git clone <repository-url>
cd nexus
```

2. Install dependencies:
```bash
npm install
```

3. **Install Docker Desktop** (if not already installed):

   **Automated Setup (Windows - Run as Administrator):**
   ```powershell
   # Open PowerShell as Administrator
   cd C:\Users\eshay\nexus
   .\setup-windows.ps1
   ```

   **Manual Setup:**
   - See detailed guide: [install-docker.md](install-docker.md)
   - Download: https://desktop.docker.com/win/main/amd/Docker%20Desktop%20Installer.exe
   - Install WSL 2 first: `wsl --install` (requires restart)
   - Install Docker Desktop with "Use WSL 2" option (requires restart)
   - Start Docker Desktop and wait for it to be ready

4. Set up environment variables (for remote Supabase or custom config):
```bash
cp .env.local.example .env.local
# Edit .env.local with your actual credentials
```

5. Start Supabase locally (requires Docker Desktop running):
```bash
npx supabase start
```

6. Run database migrations:
```bash
npx supabase db reset
```

6. Start the development server:
```bash
npm run dev
```

Open [http://localhost:3000](http://localhost:3000) to view the application.

## Development Commands

### Development
- `npm run dev` - Start Next.js development server
- `npm run build` - Build production bundle
- `npm run start` - Start production server
- `npm run lint` - Run ESLint
- `npm run type-check` - Run TypeScript type checking

### Testing
- `npm test` - Run Jest unit tests
- `npm run test:ci` - Run tests in CI mode with coverage
- `npm run test:e2e` - Run Playwright end-to-end tests

### Database
- `npx supabase start` - Start local Supabase instance
- `npx supabase stop` - Stop local Supabase instance
- `npx supabase db reset` - Reset local database
- `npx supabase migration new <name>` - Create new migration
- `npx supabase db push` - Apply migrations to remote
- `npx supabase gen types typescript --local > types/database.ts` - Generate TypeScript types

## Project Structure

```
nexus/
├── app/                    # Next.js App Router
│   ├── layout.tsx         # Root layout
│   ├── page.tsx           # Home page
│   └── globals.css        # Global styles
├── components/            # React components
│   └── ui/               # Reusable UI components
├── lib/                  # Utility functions and services
│   └── supabase/        # Supabase client configuration
├── store/                # Redux store and slices
├── types/                # TypeScript type definitions
├── supabase/             # Supabase configuration
│   ├── migrations/       # Database migrations
│   └── config.toml       # Supabase config
├── .kiro/specs/          # Project specifications
└── CLAUDE.md             # Claude Code guidance

```

## Key Features

1. **AI Donor Intelligence** - Comprehensive donor research in ≤2 minutes
2. **Relationship Mapping** - Warm path discovery via email/LinkedIn analysis
3. **CRM Integration** - Bidirectional sync with major CRMs
4. **Engagement Strategy** - AI-generated personalized outreach
5. **Project-Donor Alignment** - Match projects with compatible donors

## Architecture

- **Multi-tenant**: Organization-level data isolation via Row Level Security
- **Security**: AES-256 encryption, OAuth 2.0, automatic token refresh
- **Performance**: <2s UI operations, <2min AI operations
- **Scalability**: Serverless Edge Functions with auto-scaling

## Database Schema

Core tables:
- `organizations` - Multi-tenant organization data
- `profiles` - User accounts linked to auth.users
- `donors` - Donor records with intelligence_data JSONB
- `relationships` - Connection mapping with strength scores
- `projects` - Fundraising projects
- `donor_project_alignments` - AI-generated alignment scores
- `crm_integrations` - CRM connection credentials and sync status

All tables include `organization_id` for multi-tenancy and Row Level Security policies.

## Contributing

See [CLAUDE.md](CLAUDE.md) for development guidelines and architecture details.

## License

Proprietary - All rights reserved
