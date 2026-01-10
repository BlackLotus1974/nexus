# Troubleshooting Guide - Supabase Not Accessible

## Current Issue

**Symptom:** http://localhost:54323 is not accessible
**Cause:** Docker Desktop is not running or not properly configured

## Diagnostic Results

✅ **WSL 2:** Installed (Ubuntu, Version 2)
❌ **Docker Desktop:** Not running (docker command not found)
❌ **Supabase:** Cannot start without Docker

## Solution Steps

### Step 1: Verify Docker Desktop Installation

1. **Check if Docker Desktop is installed:**
   - Look for "Docker Desktop" in your Start Menu
   - If not found, you need to install it

2. **If Docker Desktop is NOT installed:**

   **Download and Install:**
   ```
   https://desktop.docker.com/win/main/amd/Docker%20Desktop%20Installer.exe
   ```

   **Installation Steps:**
   - Run the installer
   - **IMPORTANT:** Check "Use WSL 2 instead of Hyper-V" option
   - Complete installation
   - **Restart your computer when prompted**

### Step 2: Start Docker Desktop

1. **Launch Docker Desktop:**
   - Open Start Menu
   - Search for "Docker Desktop"
   - Click to launch

2. **Wait for Docker to start:**
   - You'll see a whale icon in your system tray (bottom-right)
   - The whale icon will animate while starting
   - **Wait until the animation stops** (can take 1-2 minutes)
   - Icon should show "Docker Desktop is running"

3. **Verify Docker is running:**

   Open PowerShell and run:
   ```powershell
   docker --version
   # Should show: Docker version 24.x.x

   docker ps
   # Should show: Empty list or running containers
   ```

### Step 3: Start Supabase

Once Docker Desktop is running:

```bash
cd C:\Users\eshay\nexus

# Start Supabase (first time will download ~2GB of images)
npx supabase start

# This should output connection details like:
# API URL: http://localhost:54321
# Studio URL: http://localhost:54323
# ...
```

**First-time startup takes 5-10 minutes** to download Docker images.

### Step 4: Apply Database Migrations

After Supabase starts:

```bash
npx supabase db reset
```

This creates all the database tables from your migration file.

### Step 5: Verify Setup

1. **Check Supabase Status:**
   ```bash
   npx supabase status
   ```

   Should show all services running:
   - supabase_db_nexus
   - supabase_studio_nexus
   - supabase_kong_nexus
   - etc.

2. **Open Supabase Studio:**
   - Navigate to: http://localhost:54323
   - You should see the Supabase dashboard

3. **Verify Database Tables:**
   - In Supabase Studio, go to "Table Editor"
   - You should see 8 tables:
     - organizations
     - profiles
     - donors
     - relationships
     - projects
     - donor_project_alignments
     - crm_integrations
     - activity_log

## Common Issues

### Issue 1: "Docker Desktop is not installed"

**Solution:**
1. Download from: https://desktop.docker.com/win/main/amd/Docker%20Desktop%20Installer.exe
2. Install with WSL 2 option selected
3. Restart computer
4. Launch Docker Desktop

### Issue 2: "Docker Desktop won't start"

**Causes & Solutions:**

**a) Virtualization not enabled in BIOS:**
1. Restart computer
2. Enter BIOS (usually F2, F10, or Del key during boot)
3. Find "Virtualization Technology" or "Intel VT-x" or "AMD-V"
4. Enable it
5. Save and exit BIOS

**b) Hyper-V or WSL features not enabled:**

Open PowerShell as Administrator and run:
```powershell
# Enable WSL
dism.exe /online /enable-feature /featurename:Microsoft-Windows-Subsystem-Linux /all /norestart

# Enable Virtual Machine Platform
dism.exe /online /enable-feature /featurename:VirtualMachinePlatform /all /norestart

# Restart computer
Restart-Computer
```

**c) Docker service not starting:**
1. Right-click Docker Desktop icon in system tray
2. Select "Restart"
3. If still not working, try "Quit Docker Desktop" then relaunch

### Issue 3: "Port 54323 already in use"

**Check what's using the port:**
```powershell
netstat -ano | findstr :54323
```

**Kill the process:**
```powershell
taskkill /PID <process_id> /F
```

Replace `<process_id>` with the PID from netstat output.

### Issue 4: Supabase containers won't start

**Check Docker has enough resources:**
1. Open Docker Desktop
2. Go to Settings → Resources
3. Ensure:
   - Memory: At least 4GB
   - CPU: At least 2 cores
   - Disk space: At least 10GB free

**Reset Supabase:**
```bash
npx supabase stop
npx supabase start
```

### Issue 5: "Database migration failed"

**Check the error message and try:**
```bash
# View logs
npx supabase logs

# Force reset
npx supabase db reset --no-backup

# If still failing, stop and restart
npx supabase stop
npx supabase start
npx supabase db reset
```

## Alternative: Use Remote Supabase

If you absolutely cannot get Docker Desktop working, use cloud Supabase:

### 1. Create Supabase Account

1. Go to: https://supabase.com
2. Sign up for free account
3. Create a new project
   - Choose a project name
   - Set a strong database password
   - Select a region (closest to you)
4. Wait 2 minutes for project to initialize

### 2. Get Credentials

In your Supabase project:
1. Go to: **Project Settings → API**
2. Copy these values:
   - Project URL
   - anon (public) key
   - service_role key (keep secret!)

### 3. Update Environment Variables

Create `.env.local` in your project:

```env
NEXT_PUBLIC_SUPABASE_URL=https://your-project.supabase.co
NEXT_PUBLIC_SUPABASE_ANON_KEY=your-anon-key-here
SUPABASE_SERVICE_ROLE_KEY=your-service-role-key-here

# AI Services (add when ready)
GOOGLE_GEMINI_API_KEY=your-gemini-key
OPENAI_API_KEY=your-openai-key
```

### 4. Push Migrations

```bash
# Link to your remote project
npx supabase link --project-ref your-project-ref

# The project ref is in your project URL:
# https://[project-ref].supabase.co

# Push your database schema
npx supabase db push

# Generate types
npx supabase gen types typescript > types/database.ts
```

### 5. Access Remote Dashboard

Visit your Supabase project at: https://app.supabase.com

You can now develop without local Docker!

## Quick Command Reference

### Docker Commands
```bash
docker --version          # Check Docker version
docker ps                 # List running containers
docker ps -a              # List all containers
docker images             # List Docker images
```

### Supabase Commands
```bash
npx supabase start        # Start local Supabase
npx supabase stop         # Stop local Supabase
npx supabase status       # Check status
npx supabase db reset     # Reset database & apply migrations
npx supabase logs         # View logs
```

### Development Commands
```bash
npm run dev               # Start Next.js dev server
npm run type-check        # Check TypeScript
npm run build             # Build for production
```

## Next Steps After Setup

Once Supabase is accessible at http://localhost:54323:

1. **Verify Tables:** Check that 8 tables exist in Table Editor
2. **Test Connection:** Your Next.js app should connect successfully
3. **Begin Phase 2:** Use subagents to implement features:
   - `auth-specialist` → Authentication
   - `ui-component-builder` → Dashboard UI
   - `edge-function-developer` → API functions
   - `state-management-expert` → Redux setup
   - `ai-integration-specialist` → Gemini/OpenAI
   - `testing-engineer` → Test coverage

## Getting Help

If you're still stuck:

1. **Check Docker Desktop logs:**
   - Docker Desktop → Settings → Troubleshoot → Get support

2. **Check Supabase logs:**
   ```bash
   npx supabase logs
   ```

3. **Common solutions:**
   - Restart Docker Desktop
   - Restart your computer
   - Ensure no VPN is blocking Docker
   - Check Windows Firewall settings

## Current Status Checklist

Use this to track your setup progress:

- [x] WSL 2 installed
- [ ] Docker Desktop installed
- [ ] Docker Desktop running (check system tray)
- [ ] `docker ps` command works
- [ ] Supabase started successfully
- [ ] http://localhost:54323 accessible
- [ ] Database tables created
- [ ] Next.js dev server running
- [ ] Ready for Phase 2 development

---

**Most Common Issue:** Docker Desktop is installed but not running. Check your system tray for the whale icon!
