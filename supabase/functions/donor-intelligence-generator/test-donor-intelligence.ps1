# Test script for Donor Intelligence Generator Edge Function (Windows PowerShell)
#
# Usage:
#   .\test-donor-intelligence.ps1 [local|production]
#
# Requirements:
#   - Supabase CLI installed
#   - Supabase running (for local tests)
#   - Valid environment variables set

param(
    [string]$TestMode = "local"
)

# Configuration
if ($TestMode -eq "local") {
    Write-Host "Testing locally..." -ForegroundColor Green

    # Get local Supabase anon key
    $statusOutput = npx supabase status
    $anonKeyLine = $statusOutput | Select-String "anon key"
    $ANON_KEY = ($anonKeyLine -split '\s+')[2]

    $FUNCTION_URL = "http://127.0.0.1:54321/functions/v1/donor-intelligence-generator"
} else {
    Write-Host "Testing production..." -ForegroundColor Green

    # You need to set these manually for production
    if (-not $env:SUPABASE_PROJECT_URL -or -not $env:SUPABASE_ANON_KEY) {
        Write-Host "Error: Set SUPABASE_PROJECT_URL and SUPABASE_ANON_KEY for production testing" -ForegroundColor Red
        exit 1
    }

    $FUNCTION_URL = "$env:SUPABASE_PROJECT_URL/functions/v1/donor-intelligence-generator"
    $ANON_KEY = $env:SUPABASE_ANON_KEY
}

Write-Host "Function URL: $FUNCTION_URL`n"

# Test 1: Create new donor
Write-Host "==========================================" -ForegroundColor Cyan
Write-Host "Test 1: Create New Donor" -ForegroundColor Cyan
Write-Host "==========================================" -ForegroundColor Cyan

$headers1 = @{
    "Authorization" = "Bearer $ANON_KEY"
    "Content-Type" = "application/json"
}

$body1 = @{
    donor_name = "Elon Musk"
    location = "Austin, TX"
    context = "Tech entrepreneur interested in space and sustainable energy"
} | ConvertTo-Json

try {
    $response1 = Invoke-WebRequest -Uri $FUNCTION_URL -Method POST -Headers $headers1 -Body $body1
    Write-Host "Status: $($response1.StatusCode)"
    Write-Host "Response: $($response1.Content)" -ForegroundColor Green
} catch {
    Write-Host "Error: $_" -ForegroundColor Red
    Write-Host "Response: $($_.Exception.Response)" -ForegroundColor Red
}

Write-Host "`n"

# Test 2: Invalid request (missing donor_name)
Write-Host "==========================================" -ForegroundColor Cyan
Write-Host "Test 2: Invalid Request (Missing Name)" -ForegroundColor Cyan
Write-Host "==========================================" -ForegroundColor Cyan

$body2 = @{
    location = "Austin, TX"
} | ConvertTo-Json

try {
    $response2 = Invoke-WebRequest -Uri $FUNCTION_URL -Method POST -Headers $headers1 -Body $body2
    Write-Host "Status: $($response2.StatusCode)"
    Write-Host "Response: $($response2.Content)"
} catch {
    Write-Host "Expected Error - Status: $($_.Exception.Response.StatusCode.value__)"
    $reader = [System.IO.StreamReader]::new($_.Exception.Response.GetResponseStream())
    $errorBody = $reader.ReadToEnd()
    Write-Host "Response: $errorBody" -ForegroundColor Yellow
}

Write-Host "`n"

# Test 3: Short donor name (validation error)
Write-Host "==========================================" -ForegroundColor Cyan
Write-Host "Test 3: Validation Error (Name Too Short)" -ForegroundColor Cyan
Write-Host "==========================================" -ForegroundColor Cyan

$body3 = @{
    donor_name = "E"
} | ConvertTo-Json

try {
    $response3 = Invoke-WebRequest -Uri $FUNCTION_URL -Method POST -Headers $headers1 -Body $body3
    Write-Host "Status: $($response3.StatusCode)"
    Write-Host "Response: $($response3.Content)"
} catch {
    Write-Host "Expected Error - Status: $($_.Exception.Response.StatusCode.value__)"
    $reader = [System.IO.StreamReader]::new($_.Exception.Response.GetResponseStream())
    $errorBody = $reader.ReadToEnd()
    Write-Host "Response: $errorBody" -ForegroundColor Yellow
}

Write-Host "`n"

# Test 4: Missing authentication
Write-Host "==========================================" -ForegroundColor Cyan
Write-Host "Test 4: Missing Authentication" -ForegroundColor Cyan
Write-Host "==========================================" -ForegroundColor Cyan

$headers4 = @{
    "Content-Type" = "application/json"
}

$body4 = @{
    donor_name = "Test Donor"
} | ConvertTo-Json

try {
    $response4 = Invoke-WebRequest -Uri $FUNCTION_URL -Method POST -Headers $headers4 -Body $body4
    Write-Host "Status: $($response4.StatusCode)"
    Write-Host "Response: $($response4.Content)"
} catch {
    Write-Host "Expected Error - Status: $($_.Exception.Response.StatusCode.value__)"
    $reader = [System.IO.StreamReader]::new($_.Exception.Response.GetResponseStream())
    $errorBody = $reader.ReadToEnd()
    Write-Host "Response: $errorBody" -ForegroundColor Yellow
}

Write-Host "`n"

# Test 5: Method not allowed (GET request)
Write-Host "==========================================" -ForegroundColor Cyan
Write-Host "Test 5: Method Not Allowed (GET)" -ForegroundColor Cyan
Write-Host "==========================================" -ForegroundColor Cyan

try {
    $response5 = Invoke-WebRequest -Uri $FUNCTION_URL -Method GET -Headers $headers1
    Write-Host "Status: $($response5.StatusCode)"
    Write-Host "Response: $($response5.Content)"
} catch {
    Write-Host "Expected Error - Status: $($_.Exception.Response.StatusCode.value__)"
    $reader = [System.IO.StreamReader]::new($_.Exception.Response.GetResponseStream())
    $errorBody = $reader.ReadToEnd()
    Write-Host "Response: $errorBody" -ForegroundColor Yellow
}

Write-Host "`n"

# Test 6: CORS preflight
Write-Host "==========================================" -ForegroundColor Cyan
Write-Host "Test 6: CORS Preflight (OPTIONS)" -ForegroundColor Cyan
Write-Host "==========================================" -ForegroundColor Cyan

$headersCors = @{
    "Access-Control-Request-Method" = "POST"
    "Access-Control-Request-Headers" = "authorization,content-type"
}

try {
    $responseCors = Invoke-WebRequest -Uri $FUNCTION_URL -Method OPTIONS -Headers $headersCors
    Write-Host "Status: $($responseCors.StatusCode)"
    Write-Host "Headers:" -ForegroundColor Green
    $responseCors.Headers | Format-Table
} catch {
    Write-Host "Error: $_" -ForegroundColor Red
}

Write-Host "`n"

Write-Host "==========================================" -ForegroundColor Green
Write-Host "All tests completed!" -ForegroundColor Green
Write-Host "==========================================" -ForegroundColor Green
