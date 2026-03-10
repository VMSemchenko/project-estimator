#!/bin/bash

# Estimator API - cURL Commands Reference
# This file contains ready-to-use curl commands for testing the estimator API

# Configuration
API_BASE_URL="${API_BASE_URL:-http://localhost:3002}"

echo "Estimator API - cURL Commands"
echo "API Base URL: $API_BASE_URL"
echo "=============================="
echo ""

# ============================================
# HEALTH CHECK
# ============================================
echo "1. Health Check / Root Endpoint"
echo "--------------------------------"
echo "curl -s $API_BASE_URL/ | jq '.'"
echo ""

# ============================================
# CREATE ESTIMATION
# ============================================
echo "2. Create Estimation (E-Commerce Platform - React/NestJS)"
echo "---------------------------------------------------------"
cat << 'EOF'
curl -s -X POST "$API_BASE_URL/estimate" \
  -H "Content-Type: application/json" \
  -d '{
    "inputFolder": "apps/api/assets/samples/sample-project",
    "outputFolder": "output/sample-project",
    "verbose": true
  }' | jq '.'
EOF
echo ""

echo "3. Create Estimation (Task Management - Python/FastAPI)"
echo "--------------------------------------------------------"
cat << 'EOF'
curl -s -X POST "$API_BASE_URL/estimate" \
  -H "Content-Type: application/json" \
  -d '{
    "inputFolder": "apps/api/assets/samples/python-fastapi-project",
    "outputFolder": "output/python-fastapi-project",
    "verbose": true
  }' | jq '.'
EOF
echo ""

echo "4. Create Estimation (Healthcare Portal - Java/Spring Boot)"
echo "------------------------------------------------------------"
cat << 'EOF'
curl -s -X POST "$API_BASE_URL/estimate" \
  -H "Content-Type: application/json" \
  -d '{
    "inputFolder": "apps/api/assets/samples/java-springboot-project",
    "outputFolder": "output/java-springboot-project",
    "verbose": true
  }' | jq '.'
EOF
echo ""

echo "5. Create Estimation (Real-time Analytics - Go Microservices)"
echo "--------------------------------------------------------------"
cat << 'EOF'
curl -s -X POST "$API_BASE_URL/estimate" \
  -H "Content-Type: application/json" \
  -d '{
    "inputFolder": "apps/api/assets/samples/go-microservices-project",
    "outputFolder": "output/go-microservices-project",
    "verbose": true
  }' | jq '.'
EOF
echo ""

echo "6. Create Estimation (Test Mode - Faster)"
echo "------------------------------------------"
cat << 'EOF'
curl -s -X POST "$API_BASE_URL/estimate" \
  -H "Content-Type: application/json" \
  -d '{
    "inputFolder": "apps/api/assets/samples/sample-project",
    "outputFolder": "output/test-run",
    "verbose": true,
    "testMode": true
  }' | jq '.'
EOF
echo ""

# ============================================
# GET ESTIMATION
# ============================================
echo "7. Get Estimation by ID"
echo "------------------------"
echo "curl -s $API_BASE_URL/estimate/{JOB_ID} | jq '.'"
echo ""

# ============================================
# GET ALL ESTIMATIONS
# ============================================
echo "8. Get All Estimations"
echo "-----------------------"
echo "curl -s $API_BASE_URL/estimate | jq '.'"
echo ""

# ============================================
# DELETE ESTIMATION
# ============================================
echo "9. Delete Estimation"
echo "---------------------"
echo "curl -s -X DELETE $API_BASE_URL/estimate/{JOB_ID}"
echo ""

# ============================================
# EXAMPLE WORKFLOW
# ============================================
echo ""
echo "=============================="
echo "EXAMPLE: Complete Workflow"
echo "=============================="
echo ""
cat << 'EOF'
# 1. Create estimation and capture job ID
JOB_ID=$(curl -s -X POST "$API_BASE_URL/estimate" \
  -H "Content-Type: application/json" \
  -d '{
    "inputFolder": "apps/api/assets/samples/sample-project",
    "verbose": true
  }' | jq -r '.id')

echo "Created job: $JOB_ID"

# 2. Poll for status until complete
while true; do
  STATUS=$(curl -s "$API_BASE_URL/estimate/$JOB_ID" | jq -r '.status')
  echo "Status: $STATUS"
  
  if [ "$STATUS" != "pending" ] && [ "$STATUS" != "processing" ]; then
    break
  fi
  
  sleep 2
done

# 3. Get final result
curl -s "$API_BASE_URL/estimate/$JOB_ID" | jq '.'

# 4. Clean up (optional)
curl -s -X DELETE "$API_BASE_URL/estimate/$JOB_ID"
EOF
echo ""

# ============================================
# QUICK COPY COMMANDS
# ============================================
echo ""
echo "=============================="
echo "QUICK COPY - Single Line Commands"
echo "=============================="
echo ""

echo "# Sample Project (E-Commerce):"
echo "curl -s -X POST http://localhost:3000/estimate -H 'Content-Type: application/json' -d '{\"inputFolder\":\"apps/api/assets/samples/sample-project\",\"verbose\":true}' | jq '.'"
echo ""

echo "# Python Project (Task Management):"
echo "curl -s -X POST http://localhost:3000/estimate -H 'Content-Type: application/json' -d '{\"inputFolder\":\"apps/api/assets/samples/python-fastapi-project\",\"verbose\":true}' | jq '.'"
echo ""

echo "# Java Project (Healthcare):"
echo "curl -s -X POST http://localhost:3000/estimate -H 'Content-Type: application/json' -d '{\"inputFolder\":\"apps/api/assets/samples/java-springboot-project\",\"verbose\":true}' | jq '.'"
echo ""

echo "# Go Project (Analytics):"
echo "curl -s -X POST http://localhost:3000/estimate -H 'Content-Type: application/json' -d '{\"inputFolder\":\"apps/api/assets/samples/go-microservices-project\",\"verbose\":true}' | jq '.'"
echo ""

echo "# Get all estimations:"
echo "curl -s http://localhost:3000/estimate | jq '.'"
