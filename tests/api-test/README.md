# Estimator API Testing Guide

This directory contains test files and scripts for testing the Estimator API.

## Prerequisites

1. The API server must be running:

   ```bash
   npm run start:api
   # or for development
   npm run start:dev
   ```

2. Required tools:
   - `curl` - for HTTP requests
   - `jq` - for JSON formatting (optional but recommended)
   - Postman (optional) - for GUI-based testing

## Sample Projects

The following sample projects are available for testing:

| Project                   | Tech Stack                     | Path                                               |
| ------------------------- | ------------------------------ | -------------------------------------------------- |
| E-Commerce Platform       | React, NestJS, MongoDB         | `apps/api/assets/samples/sample-project`           |
| Task Management SaaS      | Python, FastAPI, PostgreSQL    | `apps/api/assets/samples/python-fastapi-project`   |
| Healthcare Patient Portal | Java, Spring Boot, PostgreSQL  | `apps/api/assets/samples/java-springboot-project`  |
| Real-time Analytics       | Go, Microservices, TimescaleDB | `apps/api/assets/samples/go-microservices-project` |

## Testing Methods

### 1. Shell Script

The `run-estimation.sh` script provides a convenient CLI for testing:

```bash
# Make executable
chmod +x tests/api-test/run-estimation.sh

# Check API health
./tests/api-test/run-estimation.sh health

# Run estimation for specific project
./tests/api-test/run-estimation.sh sample-project
./tests/api-test/run-estimation.sh python-project
./tests/api-test/run-estimation.sh java-project
./tests/api-test/run-estimation.sh go-project

# Run all estimations
./tests/api-test/run-estimation.sh all

# List all estimations
./tests/api-test/run-estimation.sh list

# Delete an estimation
./tests/api-test/run-estimation.sh delete <job-id>

# Custom input folder
./tests/api-test/run-estimation.sh custom /path/to/project

# Show help
./tests/api-test/run-estimation.sh help
```

### 2. cURL Commands

View available curl commands:

```bash
# Display curl command reference
./tests/api-test/curl-commands.sh

# Or source the file and use the commands directly
```

Quick test commands:

```bash
# E-Commerce Platform
curl -s -X POST http://localhost:3000/estimate \
  -H 'Content-Type: application/json' \
  -d '{"inputFolder":"apps/api/assets/samples/sample-project","verbose":true}' | jq '.'

# Python Project
curl -s -X POST http://localhost:3000/estimate \
  -H 'Content-Type: application/json' \
  -d '{"inputFolder":"apps/api/assets/samples/python-fastapi-project","verbose":true}' | jq '.'

# Java Project
curl -s -X POST http://localhost:3000/estimate \
  -H 'Content-Type: application/json' \
  -d '{"inputFolder":"apps/api/assets/samples/java-springboot-project","verbose":true}' | jq '.'

# Go Project
curl -s -X POST http://localhost:3000/estimate \
  -H 'Content-Type: application/json' \
  -d '{"inputFolder":"apps/api/assets/samples/go-microservices-project","verbose":true}' | jq '.'

# Get all estimations
curl -s http://localhost:3000/estimate | jq '.'
```

### 3. Postman

1. Import the collection:
   - Open Postman
   - Click Import
   - Select `estimator-api.postman_collection.json`

2. Import the environment:
   - Click Import
   - Select `estimator-api.postman_environment.json`
   - Select the "Estimator - Local" environment

3. Run requests:
   - Start with "Health Check" > "Root Endpoint"
   - Use "Create Estimation" requests to start jobs
   - The `job_id` variable is automatically set from create responses
   - Use "Get Estimation by ID" to check status

## API Endpoints

| Method | Endpoint        | Description           |
| ------ | --------------- | --------------------- |
| GET    | `/`             | Health check          |
| POST   | `/estimate`     | Create new estimation |
| GET    | `/estimate`     | Get all estimations   |
| GET    | `/estimate/:id` | Get estimation by ID  |
| DELETE | `/estimate/:id` | Delete estimation     |

### Create Estimation Request Body

```json
{
  "inputFolder": "path/to/project/requirements",
  "outputFolder": "path/to/output", // optional
  "verbose": true, // optional
  "testMode": false // optional
}
```

### Response Format

Create Estimation (202 Accepted):

```json
{
  "id": "uuid",
  "status": "pending",
  "createdAt": "2024-01-01T00:00:00.000Z"
}
```

Get Estimation (200 OK):

```json
{
  "id": "uuid",
  "status": "completed",
  "inputFolder": "path/to/input",
  "outputFolder": "path/to/output",
  "result": {
    // Estimation results
  },
  "createdAt": "2024-01-01T00:00:00.000Z",
  "completedAt": "2024-01-01T00:05:00.000Z"
}
```

## Environment Variables

| Variable       | Default                 | Description                |
| -------------- | ----------------------- | -------------------------- |
| `API_BASE_URL` | `http://localhost:3000` | API base URL               |
| `API_TIMEOUT`  | `30`                    | Request timeout in seconds |

## Troubleshooting

### API not responding

```bash
# Check if the API is running
curl http://localhost:3000/

# Check the logs
npm run start:api
```

### Estimation stuck in pending

- Check the API logs for errors
- Verify the input folder path is correct
- Ensure all required files exist in the input folder

### jq not found

```bash
# Install jq on macOS
brew install jq

# Install jq on Ubuntu/Debian
sudo apt-get install jq
```

## Files

```
tests/api-test/
├── README.md                              # This file
├── run-estimation.sh                      # Shell script for running estimations
├── curl-commands.sh                       # cURL command reference
├── estimator-api.postman_collection.json  # Postman collection
└── estimator-api.postman_environment.json # Postman environment
```
