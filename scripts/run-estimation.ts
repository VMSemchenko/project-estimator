#!/usr/bin/env node

/**
 * Estimation Runner Script
 *
 * This script:
 * 1. Triggers estimation creation via POST /estimate
 * 2. Polls for status via GET /estimate/:id
 * 3. Reads and displays the final estimation when complete
 *
 * Usage:
 *   npx ts-node scripts/run-estimation.ts <input-folder> [output-folder]
 *   node dist/scripts/run-estimation.js <input-folder> [output-folder]
 *
 * Environment Variables:
 *   API_BASE_URL - API base URL (default: http://localhost:3000)
 *   POLL_INTERVAL - Polling interval in ms (default: 2000)
 *   MAX_ATTEMPTS - Max polling attempts (default: 60)
 */

import * as fs from "fs";
import * as path from "path";

// Configuration
const API_BASE_URL = process.env.API_BASE_URL || "http://localhost:3000";
const POLL_INTERVAL = parseInt(process.env.POLL_INTERVAL || "2000", 10);
const MAX_ATTEMPTS = parseInt(process.env.MAX_ATTEMPTS || "60", 10);

// Types
interface CreateEstimationRequest {
  inputFolder: string;
  outputFolder?: string;
  verbose?: boolean;
}

interface CreateEstimationResponse {
  id: string;
  status: string;
  createdAt: string;
  links: {
    self: string;
    result: string;
  };
}

interface GetEstimationResponse {
  id: string;
  status: string;
  createdAt: string;
  completedAt?: string;
  summary?: {
    totalHours: number;
    confidenceLevel: string;
    requirementsCount: number;
  };
  artifacts?: {
    report?: string;
    csv?: string;
    estimationReport?: string;
    detailedBreakdown?: string;
  };
  error?: string;
}

// ANSI color codes
const colors = {
  reset: "\x1b[0m",
  red: "\x1b[31m",
  green: "\x1b[32m",
  yellow: "\x1b[33m",
  blue: "\x1b[34m",
  cyan: "\x1b[36m",
  white: "\x1b[37m",
};

function log(message: string, color: keyof typeof colors = "white"): void {
  console.log(`${colors[color]}${message}${colors.reset}`);
}

function logHeader(message: string): void {
  console.log("");
  log("=".repeat(50), "blue");
  log(`  ${message}`, "blue");
  log("=".repeat(50), "blue");
}

async function sleep(ms: number): Promise<void> {
  return new Promise((resolve) => setTimeout(resolve, ms));
}

async function http<T>(
  endpoint: string,
  options: RequestInit = {},
): Promise<T> {
  const url = `${API_BASE_URL}${endpoint}`;
  const response = await fetch(url, {
    headers: {
      "Content-Type": "application/json",
      ...options.headers,
    },
    ...options,
  });

  if (!response.ok) {
    const errorText = await response.text();
    throw new Error(`HTTP ${response.status}: ${errorText}`);
  }

  return response.json();
}

async function checkApiHealth(): Promise<boolean> {
  try {
    log("Checking API health...", "yellow");
    const response = await fetch(`${API_BASE_URL}/`);
    if (response.ok) {
      log(`✓ API is running at ${API_BASE_URL}`, "green");
      return true;
    }
    return false;
  } catch {
    log(`✗ API is not responding at ${API_BASE_URL}`, "red");
    log("  Start the API with: npm run start:api", "yellow");
    return false;
  }
}

async function createEstimation(
  request: CreateEstimationRequest,
): Promise<CreateEstimationResponse> {
  log(`Creating estimation for: ${request.inputFolder}`, "yellow");

  const response = await http<CreateEstimationResponse>("/estimate", {
    method: "POST",
    body: JSON.stringify(request),
  });

  log(`✓ Estimation created with ID: ${response.id}`, "green");
  log(`  Status: ${response.status}`, "cyan");
  log(`  Created: ${response.createdAt}`, "cyan");

  return response;
}

async function getEstimationStatus(id: string): Promise<GetEstimationResponse> {
  return http<GetEstimationResponse>(`/estimate/${id}`);
}

async function pollForCompletion(id: string): Promise<GetEstimationResponse> {
  log(`\nPolling for completion...`, "yellow");
  log(`  Poll interval: ${POLL_INTERVAL}ms`, "cyan");
  log(`  Max attempts: ${MAX_ATTEMPTS}`, "cyan");

  let attempt = 0;
  let lastStatus = "";

  while (attempt < MAX_ATTEMPTS) {
    attempt++;

    const response = await getEstimationStatus(id);

    // Only log if status changed
    if (response.status !== lastStatus) {
      log(`  [${attempt}/${MAX_ATTEMPTS}] Status: ${response.status}`, "blue");
      lastStatus = response.status;
    } else {
      process.stdout.write(".");
    }

    // Check if completed
    if (response.status === "completed" || response.status === "failed") {
      console.log(""); // New line after dots
      return response;
    }

    await sleep(POLL_INTERVAL);
  }

  throw new Error(
    `Timeout: Estimation did not complete after ${MAX_ATTEMPTS} attempts`,
  );
}

function displayResult(response: GetEstimationResponse): void {
  logHeader("Estimation Result");

  log(`\nID: ${response.id}`, "cyan");
  log(
    `Status: ${response.status}`,
    response.status === "completed" ? "green" : "red",
  );
  log(`Created: ${response.createdAt}`, "cyan");

  if (response.completedAt) {
    log(`Completed: ${response.completedAt}`, "cyan");
  }

  if (response.error) {
    log(`\nError: ${response.error}`, "red");
    return;
  }

  if (response.summary) {
    logHeader("Summary");
    log(`\nTotal Hours: ${response.summary.totalHours.toFixed(1)}`, "green");
    log(`Confidence: ${response.summary.confidenceLevel}`, "cyan");
    log(`Requirements: ${response.summary.requirementsCount}`, "cyan");
  }

  if (response.artifacts) {
    logHeader("Artifacts");

    if (response.artifacts.estimationReport) {
      log("\nEstimation Report:", "yellow");
      console.log(response.artifacts.estimationReport);
    }

    if (response.artifacts.detailedBreakdown) {
      log("\nDetailed Breakdown:", "yellow");
      try {
        const breakdown = JSON.parse(response.artifacts.detailedBreakdown);
        console.log(JSON.stringify(breakdown, null, 2));
      } catch {
        console.log(response.artifacts.detailedBreakdown);
      }
    }
  }
}

function saveResultToFile(
  response: GetEstimationResponse,
  outputFolder: string,
): void {
  const outputDir = path.resolve(outputFolder);

  // Create output directory if it doesn't exist
  if (!fs.existsSync(outputDir)) {
    fs.mkdirSync(outputDir, { recursive: true });
  }

  // Save full response as JSON
  const jsonPath = path.join(outputDir, "estimation-result.json");
  fs.writeFileSync(jsonPath, JSON.stringify(response, null, 2));
  log(`\n✓ Saved full result to: ${jsonPath}`, "green");

  // Save artifacts if present
  if (response.artifacts) {
    if (response.artifacts.estimationReport) {
      const reportPath = path.join(outputDir, "estimation-report.md");
      fs.writeFileSync(reportPath, response.artifacts.estimationReport);
      log(`✓ Saved report to: ${reportPath}`, "green");
    }

    if (response.artifacts.detailedBreakdown) {
      const breakdownPath = path.join(outputDir, "detailed-breakdown.json");
      fs.writeFileSync(breakdownPath, response.artifacts.detailedBreakdown);
      log(`✓ Saved breakdown to: ${breakdownPath}`, "green");
    }
  }
}

function printUsage(): void {
  console.log(`
Estimation Runner Script

Usage:
  npx ts-node scripts/run-estimation.ts <input-folder> [output-folder]
  node dist/scripts/run-estimation.js <input-folder> [output-folder]

Arguments:
  input-folder   Path to the folder containing input documents (required)
  output-folder  Path to save estimation results (optional)

Environment Variables:
  API_BASE_URL   API base URL (default: http://localhost:3000)
  POLL_INTERVAL  Polling interval in ms (default: 2000)
  MAX_ATTEMPTS   Max polling attempts (default: 60)

Examples:
  # Run estimation for sample project
  npx ts-node scripts/run-estimation.ts apps/api/assets/samples/sample-project

  # Run with custom output folder
  npx ts-node scripts/run-estimation.ts apps/api/assets/samples/sample-project output/my-estimation

  # Run with custom API URL
  API_BASE_URL=http://localhost:8080 npx ts-node scripts/run-estimation.ts ./my-docs
`);
}

async function main(): Promise<void> {
  const args = process.argv.slice(2);

  if (args.length === 0 || args[0] === "--help" || args[0] === "-h") {
    printUsage();
    process.exit(0);
  }

  const inputFolder = args[0];
  const outputFolder = args[1];

  logHeader("Estimation Runner");
  log(`\nInput Folder: ${inputFolder}`, "cyan");
  if (outputFolder) {
    log(`Output Folder: ${outputFolder}`, "cyan");
  }
  log(`API URL: ${API_BASE_URL}`, "cyan");

  try {
    // Step 1: Check API health
    logHeader("Step 1: Check API Health");
    const isHealthy = await checkApiHealth();
    if (!isHealthy) {
      process.exit(1);
    }

    // Step 2: Create estimation
    logHeader("Step 2: Create Estimation");
    const createResponse = await createEstimation({
      inputFolder,
      outputFolder,
      verbose: true,
    });

    // Step 3: Poll for completion
    logHeader("Step 3: Poll for Completion");
    const result = await pollForCompletion(createResponse.id);

    // Step 4: Display result
    displayResult(result);

    // Step 5: Save to file if output folder specified
    if (outputFolder) {
      logHeader("Step 5: Save Results");
      saveResultToFile(result, outputFolder);
    }

    // Exit with appropriate code
    if (result.status === "completed") {
      log("\n✓ Estimation completed successfully!", "green");
      process.exit(0);
    } else {
      log(`\n✗ Estimation failed with status: ${result.status}`, "red");
      if (result.error) {
        log(`  Error: ${result.error}`, "red");
      }
      process.exit(1);
    }
  } catch (error) {
    log(`\n✗ Error: ${error}`, "red");
    process.exit(1);
  }
}

// Run main function
main();
