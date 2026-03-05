#!/usr/bin/env node
import { Command } from 'commander';
import * as dotenv from 'dotenv';
import 'reflect-metadata';

// Load environment variables
dotenv.config();

import { configureEstimateCommand } from './commands/estimate.command';
import { configureCatalogCommand } from './commands/catalog.command';

const program = new Command();

program
  .name('estimator-cli')
  .description('CLI tool for BA Work Estimation System')
  .version('0.1.0');

// Configure commands
configureEstimateCommand(program);
configureCatalogCommand(program);

// Legacy commands for backward compatibility
program
  .command('ingest')
  .description('Ingest documents into the vector store (deprecated: use catalog index)')
  .option('-d, --directory <path>', 'Directory containing documents')
  .option('-f, --file <path>', 'Single file to ingest')
  .action(async (options) => {
    console.log('Note: The ingest command is deprecated. Use "catalog index" instead.');
    console.log('Ingest command called with options:', options);
  });

program
  .command('query')
  .description('Query the knowledge base')
  .argument('<query>', 'Query string')
  .option('-k, --top-k <number>', 'Number of results', '5')
  .action(async (query, options) => {
    console.log('Query command called with:', { query, topK: options.topK });
    // TODO: Implement query
    console.log('Query will be implemented in a future phase');
  });

// Parse arguments
program.parse();
