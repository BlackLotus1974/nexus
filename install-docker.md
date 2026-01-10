# Docker Desktop Installation Guide for Nexus

## Current Status

❌ **Docker Desktop:** Not installed
❌ **WSL 2:** Not installed
✅ **Node.js & npm:** Installed (v20.19.4)
✅ **Next.js dev server:** Running on port 3002

## Installation Steps

### Step 1: Install WSL 2 (Required for Docker Desktop)

**Open PowerShell as Administrator** (Right-click Start → Windows PowerShell (Admin))

```powershell
# Install WSL 2
wsl --install

# This will:
# - Enable WSL feature
# - Install Ubuntu (default distribution)
# - Download and install WSL 2 kernel update
```

**Important:** You will need to **restart your computer** after this step.

### Step 2: Verify WSL Installation

After restart, open PowerShell (doesn't need Admin) and verify:

```powershell
# Check WSL version
wsl --status

# Should show WSL version 2 as default
wsl --list --verbose
```

### Step 3: Download Docker Desktop

**Option A: Direct Download**
Visit: https://desktop.docker.com/win/main/amd/Docker%20Desktop%20Installer.exe

**Option B: Official Page**
Visit: https://docs.docker.com/desktop/install/windows-install/

### Step 4: Install Docker Desktop

1. Run `Docker Desktop Installer.exe`
2. When prompted, ensure **"Use WSL 2 instead of Hyper-V"** is selected
3. Follow the installation wizard
4. Click "Close and restart" when installation completes
5. **Restart your computer**

### Step 5: Start Docker Desktop

1. Launch **Docker Desktop** from Start Menu
2. Accept the Service Agreement if prompted
3. Wait for Docker to start (whale icon in system tray)
4. When the icon stops animating, Docker is ready

### Step 6: Verify Docker Installation

Open a new terminal and run:

```bash
# Check Docker version
docker --version

# Should show something like: Docker version 24.0.x

# Check Docker is running
docker ps

# Should show empty list (no containers running yet)
```

### Step 7: Start Supabase

Once Docker is verified working:

```bash
cd C:\Users\eshay\nexus

# Start Supabase (first time will download ~2GB of images)
npx supabase start

# This will output connection details:
# - API URL: http://localhost:54321
# - Studio URL: http://localhost:54323
# - DB URL: postgresql://postgres:postgres@localhost:54322/postgres

# Apply database migrations
npx supabase db reset

# This will create all tables from the migration file
```

### Step 8: Verify Database Setup

Open Supabase Studio: http://localhost:54323

**Check that these tables exist:**
- organizations
- profiles
- donors
- relationships
- projects
- donor_project_alignments
- crm_integrations
- activity_log

## Expected Timeline

- WSL 2 Installation: ~10 minutes + restart
- Docker Desktop Download: ~5 minutes (depends on internet speed)
- Docker Desktop Installation: ~5 minutes + restart
- Supabase First Start: ~10 minutes (downloads images)
- Total Time: **~30-40 minutes** (including restarts)

## Troubleshooting

### "Virtualization is not enabled"

1. Restart computer and enter BIOS (usually F2, F10, or Del during boot)
2. Find "Virtualization Technology" or "Intel VT-x" or "AMD-V"
3. Enable it
4. Save and exit BIOS

### "WSL 2 installation failed"

```powershell
# Run Windows Update first
# Then try manual installation:
wsl --update
wsl --set-default-version 2
```

### "Docker Desktop won't start"

1. Make sure WSL 2 is properly installed: `wsl --status`
2. Restart Docker Desktop
3. If still failing, restart your computer
4. Check Docker Desktop logs: Settings → Troubleshoot → Get support

### "Port conflicts when starting Supabase"

If ports 54321-54323 are in use:

```bash
# Find what's using the ports
netstat -ano | findstr :54321

# Kill the process (replace <PID> with process ID from netstat)
taskkill /PID <PID> /F
```

## Alternative: Use Remote Supabase (Skip Docker)

If you cannot install Docker Desktop, you can use Supabase cloud:

### 1. Create Remote Project

1. Sign up at https://supabase.com
2. Create a new project (choose a strong password)
3. Wait for project to be ready (~2 minutes)

### 2. Get Credentials

Go to: **Project Settings → API**

Copy:
- Project URL (looks like: https://xxxxx.supabase.co)
- anon/public key
- service_role key (keep secret!)

### 3. Update Environment Variables

Create `.env.local` file:

```env
NEXT_PUBLIC_SUPABASE_URL=https://your-project.supabase.co
NEXT_PUBLIC_SUPABASE_ANON_KEY=your-anon-key-here
SUPABASE_SERVICE_ROLE_KEY=your-service-role-key-here
```

### 4. Apply Migrations to Remote

```bash
# Link to remote project
npx supabase link --project-ref your-project-ref

# Push migrations
npx supabase db push

# Generate types
npx supabase gen types typescript > types/database.ts
```

### 5. Access Remote Dashboard

Visit your project's dashboard at: https://app.supabase.com

## What to Do After Installation

Once Docker and Supabase are running:

1. ✅ Verify tables in Supabase Studio: http://localhost:54323
2. ✅ Test database connection from Next.js app
3. ✅ Begin Phase 2 implementation with subagents
4. ✅ Start with authentication (use `auth-specialist` subagent)

## Quick Reference Commands

```bash
# Supabase commands
npx supabase start          # Start Supabase
npx supabase stop           # Stop Supabase
npx supabase status         # Check status
npx supabase db reset       # Reset database (applies migrations)

# Docker commands
docker ps                   # List running containers
docker images               # List Docker images
docker system prune -a      # Clean up Docker (careful!)

# Development
npm run dev                 # Start Next.js (already running)
npm run type-check          # Check TypeScript
```

## Need Help?

- Docker Desktop Docs: https://docs.docker.com/desktop/
- Supabase Local Dev: https://supabase.com/docs/guides/cli/local-development
- WSL 2 Installation: https://docs.microsoft.com/en-us/windows/wsl/install

---

**Current Status After This Installation:**
- ✅ Project initialized
- ✅ Subagents configured
- ⏳ Docker Desktop (in progress)
- ⏳ Supabase running locally (pending Docker)
- 🚀 Ready for Phase 2 development
