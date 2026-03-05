#!/usr/bin/env node
import { Command } from "commander";
import * as dotenv from "dotenv";

// Load environment variables
dotenv.config();

const program = new Command();

program
  .name("estimator-cli")
  .description("CLI tool for BA Work Estimation System")
  .version("0.1.0");

program
  .command("ingest")
  .description("Ingest documents into the vector store")
  .option("-d, --directory <path>", "Directory containing documents")
  .option("-f, --file <path>", "Single file to ingest")
  .action(async (options) => {
    console.log("Ingest command called with options:", options);
    // TODO: Implement document ingestion
    console.log("Document ingestion will be implemented in Phase 2");
  });

program
  .command("estimate")
  .description("Generate work estimation for a project")
  .option("-d, --description <text>", "Project description")
  .option("-f, --file <path>", "File containing project description")
  .action(async (options) => {
    console.log("Estimate command called with options:", options);
    // TODO: Implement estimation
    console.log("Estimation will be implemented in Phase 3");
  });

program
  .command("query")
  .description("Query the knowledge base")
  .argument("<query>", "Query string")
  .option("-k, --top-k <number>", "Number of results", "5")
  .action(async (query, options) => {
    console.log("Query command called with:", { query, topK: options.topK });
    // TODO: Implement query
    console.log("Query will be implemented in Phase 2");
  });

program.parse();
