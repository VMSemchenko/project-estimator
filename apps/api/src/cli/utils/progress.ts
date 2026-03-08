/**
 * Progress output utilities for CLI
 * Provides spinners, progress indicators, and formatted output
 */

import * as readline from "readline";
import { Logger, LoggerOptions } from "./logger";

/**
 * Spinner frames for animation
 */
const SPINNER_FRAMES = ["⠋", "⠙", "⠹", "⠸", "⠼", "⠴", "⠦", "⠧", "⠇", "⠏"];

/**
 * Status icons
 */
const ICONS = {
  success: "✓",
  error: "✗",
  warning: "⚠",
  info: "ℹ",
  search: "🔍",
  list: "📋",
  gear: "🔧",
  chart: "📊",
  document: "📝",
  folder: "📁",
};

/**
 * Colors for terminal output
 */
const COLORS = {
  reset: "\x1b[0m",
  bright: "\x1b[1m",
  dim: "\x1b[2m",
  green: "\x1b[32m",
  yellow: "\x1b[33m",
  red: "\x1b[31m",
  blue: "\x1b[34m",
  cyan: "\x1b[36m",
  gray: "\x1b[90m",
};

/**
 * Progress options
 */
export interface ProgressOptions {
  /** Show verbose output */
  verbose?: boolean;
  /** Disable spinners (for non-TTY) */
  noSpinners?: boolean;
  /** Logger options for file logging */
  loggerOptions?: LoggerOptions;
}

/**
 * Step information for progress tracking
 */
export interface StepInfo {
  /** Step name */
  name: string;
  /** Step icon */
  icon: keyof typeof ICONS;
  /** Step description */
  description?: string;
}

/**
 * Predefined steps for the estimation pipeline
 */
export const ESTIMATION_STEPS: StepInfo[] = [
  {
    name: "validation",
    icon: "search",
    description: "Validating input artifacts",
  },
  { name: "extraction", icon: "list", description: "Extracting requirements" },
  {
    name: "decomposition",
    icon: "gear",
    description: "Decomposing into atomic works",
  },
  { name: "estimation", icon: "chart", description: "Calculating estimates" },
  { name: "reporting", icon: "document", description: "Generating report" },
];

/**
 * Progress class for managing CLI output
 */
export class Progress {
  private currentFrame = 0;
  private spinnerInterval: NodeJS.Timeout | null = null;
  private currentStep = "";
  private options: ProgressOptions;
  private isTTY: boolean;
  private logger: Logger;

  constructor(options: ProgressOptions = {}) {
    this.options = options;
    this.isTTY = process.stdout.isTTY && !options.noSpinners;
    this.logger = new Logger(options.loggerOptions);
  }

  /**
   * Start a spinner with a message
   */
  start(message: string): void {
    this.logger.info(message);
    if (!this.isTTY) {
      console.log(message);
      return;
    }

    this.stopSpinner();
    this.currentStep = message;

    this.spinnerInterval = setInterval(() => {
      const frame = SPINNER_FRAMES[this.currentFrame];
      readline.cursorTo(process.stdout, 0);
      process.stdout.write(`${COLORS.cyan}${frame}${COLORS.reset} ${message}`);
      this.currentFrame = (this.currentFrame + 1) % SPINNER_FRAMES.length;
    }, 80);
  }

  /**
   * Stop the current spinner and mark as success
   */
  succeed(message?: string): void {
    this.stopSpinner();
    const displayMessage = message || this.currentStep;
    this.logger.success(displayMessage);
    console.log(
      `${COLORS.green}${ICONS.success}${COLORS.reset} ${displayMessage}`,
    );
  }

  /**
   * Stop the current spinner and mark as failed
   */
  fail(message?: string): void {
    this.stopSpinner();
    const displayMessage = message || this.currentStep;
    this.logger.error(displayMessage);
    console.log(`${COLORS.red}${ICONS.error}${COLORS.reset} ${displayMessage}`);
  }

  /**
   * Stop the current spinner and show warning
   */
  warn(message: string): void {
    this.stopSpinner();
    this.logger.warn(message);
    console.log(`${COLORS.yellow}${ICONS.warning}${COLORS.reset} ${message}`);
  }

  /**
   * Stop the current spinner and show info
   */
  info(message: string): void {
    this.stopSpinner();
    this.logger.info(message);
    console.log(`${COLORS.blue}${ICONS.info}${COLORS.reset} ${message}`);
  }

  /**
   * Update the current spinner message
   */
  update(message: string): void {
    this.currentStep = message;
    this.logger.info(message);
    if (!this.isTTY) {
      console.log(message);
    }
  }

  /**
   * Log a sub-item (indented with checkmark)
   */
  logItem(message: string, success = true): void {
    const icon = success ? ICONS.success : ICONS.error;
    const color = success ? COLORS.green : COLORS.red;
    this.logger.log(success ? "success" : "error", `  - ${message}`);
    console.log(`   ${color}${icon}${COLORS.reset} ${message}`);
  }

  /**
   * Log a verbose message (only if verbose mode enabled)
   */
  verbose(message: string): void {
    if (this.options.verbose) {
      this.logger.debug(`   → ${message}`);
      console.log(`${COLORS.gray}   → ${message}${COLORS.reset}`);
    }
  }

  /**
   * Log a section header
   */
  header(icon: keyof typeof ICONS, message: string): void {
    this.stopSpinner();
    this.logger.info(`${ICONS[icon]} ${message}...`);
    console.log(`\n${ICONS[icon]} ${message}...`);
  }

  /**
   * Print a summary box
   */
  summary(title: string, items: Record<string, string | number>): void {
    const lines = ["═".repeat(43), `${COLORS.bright}${title}:${COLORS.reset}`];

    for (const [key, value] of Object.entries(items)) {
      lines.push(`  ${key}: ${value}`);
    }

    lines.push("═".repeat(43));

    this.logger.info(`\n${title}: ${JSON.stringify(items)}`);
    console.log("\n" + lines.join("\n"));
  }

  /**
   * Print an error with details
   */
  error(message: string, details?: string): void {
    this.stopSpinner();
    this.logger.error(`${message}${details ? ` - ${details}` : ""}`);
    console.log(
      `\n${COLORS.red}${COLORS.bright}Error:${COLORS.reset} ${message}`,
    );
    if (details && this.options.verbose) {
      console.log(`${COLORS.gray}${details}${COLORS.reset}`);
    }
  }

  /**
   * Stop the spinner interval
   */
  private stopSpinner(): void {
    if (this.spinnerInterval) {
      clearInterval(this.spinnerInterval);
      this.spinnerInterval = null;
      if (this.isTTY) {
        readline.cursorTo(process.stdout, 0);
        readline.clearLine(process.stdout, 1);
      }
    }
  }

  /**
   * Clean up resources
   */
  stop(): void {
    this.stopSpinner();
    this.logger.close();
  }
}

/**
 * Create a progress instance
 */
export function createProgress(options: ProgressOptions = {}): Progress {
  return new Progress(options);
}

/**
 * Format bytes to human readable
 */
export function formatBytes(bytes: number): string {
  if (bytes === 0) return "0 B";
  const k = 1024;
  const sizes = ["B", "KB", "MB", "GB"];
  const i = Math.floor(Math.log(bytes) / Math.log(k));
  return `${parseFloat((bytes / Math.pow(k, i)).toFixed(1))} ${sizes[i]}`;
}

/**
 * Format duration in milliseconds to human readable
 */
export function formatDuration(ms: number): string {
  if (ms < 1000) return `${ms}ms`;
  if (ms < 60000) return `${(ms / 1000).toFixed(1)}s`;
  const minutes = Math.floor(ms / 60000);
  const seconds = Math.round((ms % 60000) / 1000);
  return `${minutes}m ${seconds}s`;
}

/**
 * Format a number with commas
 */
export function formatNumber(num: number): string {
  return num.toLocaleString();
}

/**
 * Format hours with precision
 */
export function formatHours(hours: number): string {
  return hours.toFixed(1);
}
