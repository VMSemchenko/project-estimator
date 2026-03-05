/**
 * Catalog command for CLI
 * Manages catalog indexing operations
 */

import { Command } from 'commander';
import { NestFactory } from '@nestjs/core';
import { AppModule } from '../../app.module';
import { CatalogsService } from '../../catalogs/catalogs.service';
import { createProgress, Progress } from '../utils/progress';

/**
 * Catalog command options
 */
export interface CatalogCommandOptions {
  /** Verbose mode */
  verbose?: boolean;
  /** Force re-index */
  force?: boolean;
}

/**
 * Run catalog indexing
 */
async function runCatalogIndex(options: CatalogCommandOptions): Promise<void> {
  const progress = createProgress({ verbose: options.verbose });

  try {
    progress.header('folder', 'Indexing catalogs');

    // Initialize NestJS application context
    const app = await NestFactory.createApplicationContext(AppModule, {
      logger: options.verbose ? ['error', 'warn', 'log'] : ['error'],
    });

    const catalogsService = app.get(CatalogsService);

    // Load catalogs
    progress.start('Loading catalogs from YAML files...');
    await catalogsService.loadAllCatalogs();
    progress.succeed('Catalogs loaded');

    // Index catalogs
    progress.start('Indexing catalogs into vector store...');
    await catalogsService.indexCatalogs();
    progress.succeed('Catalogs indexed');

    // Get statistics from loaders
    const atomicWorksCount = catalogsService.getAllAtomicWorks().length;
    const baProcessesCount = catalogsService.getAllBaProcesses().length;
    const coefficientsCount = catalogsService.getAllCoefficients().length;

    progress.logItem(`Atomic works: ${atomicWorksCount}`);
    progress.logItem(`BA processes: ${baProcessesCount}`);
    progress.logItem(`Coefficients: ${coefficientsCount}`);

    progress.summary('Catalog Indexing Complete', {
      'Atomic Works': atomicWorksCount,
      'BA Processes': baProcessesCount,
      'Coefficients': coefficientsCount,
    });

    // Clean up
    await app.close();
    progress.stop();

  } catch (error) {
    const errorMessage = error instanceof Error ? error.message : String(error);
    progress.error('Catalog indexing failed', errorMessage);
    
    if (options.verbose && error instanceof Error && error.stack) {
      console.error(error.stack);
    }
    
    process.exit(1);
  }
}

/**
 * Show catalog status
 */
async function runCatalogStatus(options: CatalogCommandOptions): Promise<void> {
  const progress = createProgress({ verbose: options.verbose });

  try {
    // Initialize NestJS application context
    const app = await NestFactory.createApplicationContext(AppModule, {
      logger: options.verbose ? ['error', 'warn', 'log'] : ['error'],
    });

    const catalogsService = app.get(CatalogsService);

    // Get statistics from loaders
    const atomicWorksCount = catalogsService.getAllAtomicWorks().length;
    const baProcessesCount = catalogsService.getAllBaProcesses().length;
    const coefficientsCount = catalogsService.getAllCoefficients().length;

    console.log('\n📊 Catalog Status\n');
    console.log(`  Atomic Works:  ${atomicWorksCount}`);
    console.log(`  BA Processes:  ${baProcessesCount}`);
    console.log(`  Coefficients:  ${coefficientsCount}`);
    console.log('');

    // Clean up
    await app.close();

  } catch (error) {
    const errorMessage = error instanceof Error ? error.message : String(error);
    progress.error('Failed to get catalog status', errorMessage);
    process.exit(1);
  }
}

/**
 * Configure the catalog command
 */
export function configureCatalogCommand(program: Command): void {
  const catalogCommand = program
    .command('catalog')
    .description('Manage reference catalogs');

  // catalog:index subcommand
  catalogCommand
    .command('index')
    .description('Index catalogs into vector store')
    .option('-v, --verbose', 'Show detailed progress', false)
    .option('-f, --force', 'Force re-indexing', false)
    .action(async (options: CatalogCommandOptions) => {
      await runCatalogIndex(options);
    });

  // catalog:status subcommand
  catalogCommand
    .command('status')
    .description('Show catalog indexing status')
    .option('-v, --verbose', 'Show detailed output', false)
    .action(async (options: CatalogCommandOptions) => {
      await runCatalogStatus(options);
    });
}
