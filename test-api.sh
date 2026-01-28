#!/bin/bash

# API Testing Script
# This script tests all API endpoints for your Notes application
# Usage: ./test-api.sh <BASE_URL> <API_TOKEN>
# Example: ./test-api.sh https://notes.example.com abc123...

set -e  # Exit on error

# Colors for output
RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
NC='\033[0m' # No Color

# Configuration
BASE_URL=${1:-"http://localhost:3000"}
API_TOKEN=${2:-""}

if [ -z "$API_TOKEN" ]; then
    echo -e "${RED}Error: API Token is required${NC}"
    echo "Usage: $0 <BASE_URL> <API_TOKEN>"
    echo "Example: $0 https://notes.example.com abc123..."
    exit 1
fi

# Test counters
TESTS_PASSED=0
TESTS_FAILED=0

# Function to run a test
test_endpoint() {
    local name=$1
    local method=$2
    local endpoint=$3
    local data=$4
    local expected_status=$5
    
    echo -n "Testing $name... "
    
    if [ -z "$data" ]; then
        response=$(curl -s -w "\n%{http_code}" -X "$method" \
            -H "X-API-Token: $API_TOKEN" \
            -H "Content-Type: application/json" \
            "$BASE_URL$endpoint")
    else
        response=$(curl -s -w "\n%{http_code}" -X "$method" \
            -H "X-API-Token: $API_TOKEN" \
            -H "Content-Type: application/json" \
            -d "$data" \
            "$BASE_URL$endpoint")
    fi
    
    status_code=$(echo "$response" | tail -n1)
    body=$(echo "$response" | head -n-1)
    
    if [ "$status_code" -eq "$expected_status" ]; then
        echo -e "${GREEN}✓ PASSED${NC} (Status: $status_code)"
        TESTS_PASSED=$((TESTS_PASSED + 1))
        return 0
    else
        echo -e "${RED}✗ FAILED${NC} (Expected: $expected_status, Got: $status_code)"
        echo "Response: $body"
        TESTS_FAILED=$((TESTS_FAILED + 1))
        return 1
    fi
}

echo "================================================"
echo "API Testing Suite for Notes Application"
echo "================================================"
echo "Base URL: $BASE_URL"
echo "API Token: ${API_TOKEN:0:10}..."
echo "================================================"
echo

# Test 1: Authentication - Without token (should fail)
echo "--- Authentication Tests ---"
echo -n "Testing without token... "
response=$(curl -s -w "\n%{http_code}" "$BASE_URL/api/notes")
status_code=$(echo "$response" | tail -n1)
if [ "$status_code" -eq 401 ]; then
    echo -e "${GREEN}✓ PASSED${NC} (Correctly rejected)"
    TESTS_PASSED=$((TESTS_PASSED + 1))
else
    echo -e "${RED}✗ FAILED${NC} (Should return 401, got: $status_code)"
    TESTS_FAILED=$((TESTS_FAILED + 1))
fi

# Test 2-5: Notes Endpoints
echo
echo "--- Notes API Tests ---"
test_endpoint "GET all notes" "GET" "/api/notes" "" 200
test_endpoint "GET favorite notes" "GET" "/api/notes?type=favorites" "" 200
test_endpoint "GET trashed notes" "GET" "/api/notes?type=trashed" "" 200
test_endpoint "Search notes" "GET" "/api/notes?query=test" "" 200

# Test 6: Create note
echo -n "Testing CREATE note... "
create_response=$(curl -s -w "\n%{http_code}" -X POST \
    -H "X-API-Token: $API_TOKEN" \
    -H "Content-Type: application/json" \
    -d '{"title":"Test Note","body":"This is a test note created by API test script"}' \
    "$BASE_URL/api/notes")
status_code=$(echo "$create_response" | tail -n1)
body=$(echo "$create_response" | head -n-1)

if [ "$status_code" -eq 200 ]; then
    NOTE_ID=$(echo "$body" | grep -o '"id":[0-9]*' | grep -o '[0-9]*')
    echo -e "${GREEN}✓ PASSED${NC} (Created note ID: $NOTE_ID)"
    TESTS_PASSED=$((TESTS_PASSED + 1))
else
    echo -e "${RED}✗ FAILED${NC} (Status: $status_code)"
    TESTS_FAILED=$((TESTS_FAILED + 1))
    NOTE_ID=""
fi

# Test 7: Update note (if created successfully)
if [ -n "$NOTE_ID" ]; then
    test_endpoint "UPDATE note" "PUT" "/api/notes" \
        "{\"id\":$NOTE_ID,\"title\":\"Updated Test Note\",\"body\":\"Updated content\"}" 200
    
    # Test 8: Toggle favorite
    test_endpoint "ADD to favorites" "PUT" "/api/notes/favorite" \
        "{\"id\":$NOTE_ID,\"favorite\":true}" 200
    
    # Test 9: Toggle trash
    test_endpoint "MOVE to trash" "PUT" "/api/notes/trash" \
        "{\"id\":$NOTE_ID,\"trash\":true}" 200
    
    # Test 10: Restore from trash
    test_endpoint "RESTORE from trash" "PUT" "/api/notes/trash" \
        "{\"id\":$NOTE_ID,\"trash\":false}" 200
    
    # Test 11: Create share link
    test_endpoint "CREATE share link" "POST" "/api/notes/share" \
        "{\"id\":$NOTE_ID}" 200
    
    # Test 12: Delete note permanently
    test_endpoint "DELETE note" "DELETE" "/api/notes?id=$NOTE_ID&permanent=true" "" 200
fi

# Test 13-14: Validation tests
echo
echo "--- Validation Tests ---"
test_endpoint "CREATE note without title" "POST" "/api/notes" \
    '{"body":"Missing title"}' 400
test_endpoint "CREATE note without body" "POST" "/api/notes" \
    '{"title":"Missing body"}' 400

# Test 15-17: Dashboard Endpoints
echo
echo "--- Dashboard API Tests ---"
test_endpoint "GET dashboard stats" "GET" "/api/dashboard/stats" "" 200
test_endpoint "GET activity timeline" "GET" "/api/dashboard/activity" "" 200
test_endpoint "GET productivity stats" "GET" "/api/dashboard/productivity" "" 200

# Test 18-19: Notifications
echo
echo "--- Notifications API Tests ---"
test_endpoint "GET all notifications" "GET" "/api/notifications" "" 200
test_endpoint "GET filtered notifications" "GET" "/api/notifications?filter=noteadded" "" 200

# Test 20-22: Targets/Goals
echo
echo "--- Targets API Tests ---"
test_endpoint "GET all targets" "GET" "/api/targets" "" 200

# Create a target
echo -n "Testing CREATE target... "
future_date=$(date -d "+30 days" +%Y-%m-%d 2>/dev/null || date -v+30d +%Y-%m-%d)
create_target_response=$(curl -s -w "\n%{http_code}" -X POST \
    -H "X-API-Token: $API_TOKEN" \
    -H "Content-Type: application/json" \
    -d "{\"date\":\"$future_date\",\"message\":\"Test Target\"}" \
    "$BASE_URL/api/targets")
status_code=$(echo "$create_target_response" | tail -n1)
body=$(echo "$create_target_response" | head -n-1)

if [ "$status_code" -eq 200 ]; then
    TARGET_ID=$(echo "$body" | grep -o '"id":[0-9]*' | grep -o '[0-9]*')
    echo -e "${GREEN}✓ PASSED${NC} (Created target ID: $TARGET_ID)"
    TESTS_PASSED=$((TESTS_PASSED + 1))
    
    # Delete the target
    if [ -n "$TARGET_ID" ]; then
        test_endpoint "DELETE target" "DELETE" "/api/targets?id=$TARGET_ID" "" 200
    fi
else
    echo -e "${RED}✗ FAILED${NC} (Status: $status_code)"
    TESTS_FAILED=$((TESTS_FAILED + 1))
fi

# Test 23: Messages
echo
echo "--- Messages API Tests ---"
test_endpoint "GET all messages" "GET" "/api/messages" "" 200
test_endpoint "CREATE message" "POST" "/api/messages" \
    '{"name":"Test User","email":"test@example.com","message":"Test message"}' 200

# Test 24: Rate Limiting
echo
echo "--- Rate Limiting Test ---"
echo -n "Testing rate limiting (sending 110 requests)... "
rate_limit_hit=0
for i in {1..110}; do
    status=$(curl -s -o /dev/null -w "%{http_code}" \
        -H "X-API-Token: $API_TOKEN" \
        "$BASE_URL/api/notes")
    if [ "$status" -eq 429 ]; then
        rate_limit_hit=1
        break
    fi
done

if [ $rate_limit_hit -eq 1 ]; then
    echo -e "${GREEN}✓ PASSED${NC} (Rate limit triggered correctly)"
    TESTS_PASSED=$((TESTS_PASSED + 1))
else
    echo -e "${YELLOW}⚠ WARNING${NC} (Rate limit not triggered - may need adjustment)"
fi

# Summary
echo
echo "================================================"
echo "Test Summary"
echo "================================================"
echo -e "Total Tests: $((TESTS_PASSED + TESTS_FAILED))"
echo -e "${GREEN}Passed: $TESTS_PASSED${NC}"
echo -e "${RED}Failed: $TESTS_FAILED${NC}"
echo "================================================"

if [ $TESTS_FAILED -eq 0 ]; then
    echo -e "${GREEN}All tests passed! ✓${NC}"
    exit 0
else
    echo -e "${RED}Some tests failed. Please review the output above.${NC}"
    exit 1
fi
