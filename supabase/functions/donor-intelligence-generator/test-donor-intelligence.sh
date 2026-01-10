#!/bin/bash

# Test script for Donor Intelligence Generator Edge Function
#
# Usage:
#   ./test-donor-intelligence.sh [local|production]
#
# Requirements:
#   - Supabase CLI installed
#   - Supabase running (for local tests)
#   - Valid environment variables set

set -e

# Configuration
TEST_MODE="${1:-local}"

if [ "$TEST_MODE" = "local" ]; then
    # Local testing
    echo "Testing locally..."

    # Get local Supabase URL and anon key
    SUPABASE_URL="http://127.0.0.1:54321"
    ANON_KEY=$(npx supabase status | grep "anon key" | awk '{print $3}')
    FUNCTION_URL="$SUPABASE_URL/functions/v1/donor-intelligence-generator"
else
    # Production testing
    echo "Testing production..."

    # You need to set these manually for production
    if [ -z "$SUPABASE_PROJECT_URL" ] || [ -z "$SUPABASE_ANON_KEY" ]; then
        echo "Error: Set SUPABASE_PROJECT_URL and SUPABASE_ANON_KEY for production testing"
        exit 1
    fi

    FUNCTION_URL="$SUPABASE_PROJECT_URL/functions/v1/donor-intelligence-generator"
    ANON_KEY="$SUPABASE_ANON_KEY"
fi

echo "Function URL: $FUNCTION_URL"
echo ""

# Test 1: Create new donor
echo "=========================================="
echo "Test 1: Create New Donor"
echo "=========================================="

curl -i --location --request POST "$FUNCTION_URL" \
  --header "Authorization: Bearer $ANON_KEY" \
  --header 'Content-Type: application/json' \
  --data '{
    "donor_name": "Elon Musk",
    "location": "Austin, TX",
    "context": "Tech entrepreneur interested in space and sustainable energy"
  }'

echo -e "\n\n"

# Test 2: Invalid request (missing donor_name)
echo "=========================================="
echo "Test 2: Invalid Request (Missing Name)"
echo "=========================================="

curl -i --location --request POST "$FUNCTION_URL" \
  --header "Authorization: Bearer $ANON_KEY" \
  --header 'Content-Type: application/json' \
  --data '{
    "location": "Austin, TX"
  }'

echo -e "\n\n"

# Test 3: Short donor name (validation error)
echo "=========================================="
echo "Test 3: Validation Error (Name Too Short)"
echo "=========================================="

curl -i --location --request POST "$FUNCTION_URL" \
  --header "Authorization: Bearer $ANON_KEY" \
  --header 'Content-Type: application/json' \
  --data '{
    "donor_name": "E"
  }'

echo -e "\n\n"

# Test 4: Missing authentication
echo "=========================================="
echo "Test 4: Missing Authentication"
echo "=========================================="

curl -i --location --request POST "$FUNCTION_URL" \
  --header 'Content-Type: application/json' \
  --data '{
    "donor_name": "Test Donor"
  }'

echo -e "\n\n"

# Test 5: Invalid JSON
echo "=========================================="
echo "Test 5: Invalid JSON"
echo "=========================================="

curl -i --location --request POST "$FUNCTION_URL" \
  --header "Authorization: Bearer $ANON_KEY" \
  --header 'Content-Type: application/json' \
  --data '{invalid json}'

echo -e "\n\n"

# Test 6: Method not allowed (GET request)
echo "=========================================="
echo "Test 6: Method Not Allowed (GET)"
echo "=========================================="

curl -i --location --request GET "$FUNCTION_URL" \
  --header "Authorization: Bearer $ANON_KEY"

echo -e "\n\n"

# Test 7: CORS preflight
echo "=========================================="
echo "Test 7: CORS Preflight (OPTIONS)"
echo "=========================================="

curl -i --location --request OPTIONS "$FUNCTION_URL" \
  --header 'Access-Control-Request-Method: POST' \
  --header 'Access-Control-Request-Headers: authorization,content-type'

echo -e "\n\n"

echo "=========================================="
echo "All tests completed!"
echo "=========================================="
