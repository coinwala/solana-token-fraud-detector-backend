#!/bin/bash

# Colors for better output
GREEN='\033[0;32m'
RED='\033[0;31m'
YELLOW='\033[1;33m'
NC='\033[0m' # No Color

# Base URL
BASE_URL="http://localhost:3001"

echo -e "${YELLOW}Testing Solana Token Fraud Detector APIs${NC}\n"

# Test 1: Base endpoint
echo -e "${YELLOW}Testing base endpoint${NC}"
curl -s $BASE_URL | jq .
echo -e "\n"

# Test 2: API Status
echo -e "${YELLOW}Testing API status endpoint${NC}"
curl -s $BASE_URL/api/status | jq .
echo -e "\n"

# Example token addresses for testing
WSOL_ADDRESS="So11111111111111111111111111111111111111112"
USDC_ADDRESS="EPjFWdd5AufqSSqeM2qN1xzybapC8G4wEGGkZwyTDt1v"

# Test 3: Analyze Token
echo -e "${YELLOW}Testing token analysis endpoint with wSOL address${NC}"
curl -s "$BASE_URL/api/tokens/analyze/$WSOL_ADDRESS" | jq .
echo -e "\n"

# Test 4: Get Token Transactions
echo -e "${YELLOW}Testing token transactions endpoint with wSOL address${NC}"
curl -s "$BASE_URL/api/tokens/transactions/$WSOL_ADDRESS?limit=5" | jq .
echo -e "\n"

# Test 5: Get LLM Analysis
echo -e "${YELLOW}Testing LLM analysis endpoint with wSOL address${NC}"
curl -s "$BASE_URL/api/tokens/llm-analysis/$WSOL_ADDRESS" | jq .
echo -e "\n"

# Test 6: Data JSON Test
echo -e "${YELLOW}Testing data.json loading endpoint${NC}"
curl -s "$BASE_URL/api/tokens/data-json-test" | jq .
echo -e "\n"

# Test 7: wSOL Raw Transactions
echo -e "${YELLOW}Testing wSOL raw transactions endpoint${NC}"
curl -s "$BASE_URL/api/tokens/wsol-raw-transactions?limit=3" | jq .
echo -e "\n"

# Optional: Test with USDC
echo -e "${YELLOW}Testing token analysis with USDC address${NC}"
curl -s "$BASE_URL/api/tokens/analyze/$USDC_ADDRESS" | jq .
echo -e "\n"

echo -e "${GREEN}API testing completed!${NC}" 