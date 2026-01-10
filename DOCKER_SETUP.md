# Docker Desktop Setup for Supabase

## Issue

Supabase local development requires Docker Desktop to be installed and running on Windows.

## Error Message

```
failed to inspect service: error during connect: in the default daemon configuration on Windows,
the docker client must be run with elevated privileges to connect:
Get "http://%2F%2F.%2Fpipe%2Fdocker_engine/v1.51/containers/supabase_db_nexus/json":
open //./pipe/docker_engine: The system cannot find the file specified.
```

## Solution: Install Docker Desktop

### Step 1: Download Docker Desktop

Visit: https://docs.docker.com/desktop/install/windows-install/

Or direct download: https://desktop.docker.com/win/main/amd/Docker%20Desktop%20Installer.exe

### Step 2: System Requirements

**Windows 10/11:**
- WSL 2 backend (recommended)
- Windows 10 64-bit: Home or Pro 21H1 (build 19043) or higher
- Windows 11 64-bit: Home or Pro 21H2 or higher

**Hardware:**
- 64-bit processor with Second Level Address Translation (SLAT)
- 4GB system RAM
- BIOS-level hardware virtualization support must be enabled

### Step 3: Enable WSL 2 (if not already enabled)

Open PowerShell as Administrator and run:

```powershell
wsl --install
wsl --set-default-version 2
```

Restart your computer if prompted.

### Step 4: Install Docker Desktop

1. Run the Docker Desktop Installer
2. Follow the installation wizard
3. Choose "Use WSL 2 instead of Hyper-V" option
4. Complete the installation
5. Restart your computer

### Step 5: Start Docker Desktop

1. Launch Docker Desktop from Start Menu
2. Wait for Docker to start (you'll see a whale icon in system tray)
3. Docker is ready when the icon stops animating

### Step 6: Verify Docker Installation

Open a new terminal and run:

```bash
docker --version
docker ps
```

You should see Docker version information and an empty container list.

## After Docker is Running

Once Docker Desktop is installed and running, you can start Supabase:

```bash
# Start Supabase (first time - will download images)
npx supabase start

# This will:
# - Download Supabase Docker images (~2GB)
# - Start all required services
# - Display connection details

# Apply database migrations
npx supabase db reset

# View Supabase Studio
# Navigate to: http://localhost:54323
```

## Supabase Services

When running, Supabase starts these services:

- **PostgreSQL Database** - Port 54322
- **Supabase Studio** - http://localhost:54323 (Admin UI)
- **API Gateway** - http://localhost:54321
- **Auth Service** - Authentication endpoints
- **Storage Service** - File storage
- **Edge Functions Runtime** - Serverless functions

## Common Docker Commands

```bash
# Check Docker status
docker ps

# View all containers (including stopped)
docker ps -a

# Stop Supabase
npx supabase stop

# Restart Supabase
npx supabase start

# View Supabase logs
npx supabase logs

# Remove all Supabase data and containers
npx supabase stop --no-backup
```

## Troubleshooting

### Docker Desktop won't start

1. Ensure virtualization is enabled in BIOS
2. Check Windows Features: Hyper-V and WSL 2 should be enabled
3. Try running Docker Desktop as Administrator
4. Check Docker Desktop logs: Settings → Troubleshoot → Get support

### "Docker daemon is not running"

1. Make sure Docker Desktop is running (check system tray)
2. Restart Docker Desktop
3. Restart your computer

### WSL 2 installation issues

```powershell
# Update WSL
wsl --update

# Check WSL version
wsl --list --verbose

# Set default version
wsl --set-default-version 2
```

### Port conflicts

If ports 54321-54323 are in use:

```bash
# Find processes using ports
netstat -ano | findstr :54321

# Kill process by PID (from netstat output)
taskkill /PID <process_id> /F
```

## Alternative: Remote Supabase (No Docker)

If you cannot install Docker Desktop, you can use a remote Supabase instance:

1. Sign up at https://supabase.com
2. Create a new project
3. Get your project URL and keys from Settings → API
4. Update `.env.local`:

```env
NEXT_PUBLIC_SUPABASE_URL=https://your-project.supabase.co
NEXT_PUBLIC_SUPABASE_ANON_KEY=your-anon-key
SUPABASE_SERVICE_ROLE_KEY=your-service-role-key
```

5. Apply migrations to remote:

```bash
# Link to remote project
npx supabase link --project-ref your-project-ref

# Push migrations
npx supabase db push
```

## Next Steps

Once Docker is running and Supabase is started:

1. Access Supabase Studio: http://localhost:54323
2. Verify database tables exist
3. Test authentication
4. Begin implementing features

## Resources

- Docker Desktop Documentation: https://docs.docker.com/desktop/
- Supabase Local Development: https://supabase.com/docs/guides/cli/local-development
- WSL 2 Installation: https://docs.microsoft.com/en-us/windows/wsl/install
