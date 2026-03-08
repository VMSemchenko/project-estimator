/**
 * Logger utility for CLI
 * Writes output to both console and log file with timestamps
 */

import * as fs from "fs";
import * as path from "path";

/**
 * Logger options
 */
export interface LoggerOptions {
  /** Log file path (if not specified, no file logging) */
  logFile?: string;
  /** Enable console output */
  console?: boolean;
  /** Include timestamps */
  timestamps?: boolean;
}

/**
 * Log levels
 */
export type LogLevel = "info" | "warn" | "error" | "debug" | "success";

/**
 * Logger class for dual output (console + file)
 */
export class Logger {
  private logFile: string | null;
  private enableConsole: boolean;
  private enableTimestamps: boolean;
  private logStream: fs.WriteStream | null = null;

  constructor(options: LoggerOptions = {}) {
    this.logFile = options.logFile || null;
    this.enableConsole = options.console !== false;
    this.enableTimestamps = options.timestamps !== false;

    if (this.logFile) {
      // Ensure directory exists
      const logDir = path.dirname(this.logFile);
      if (!fs.existsSync(logDir)) {
        fs.mkdirSync(logDir, { recursive: true });
      }

      // Create write stream
      this.logStream = fs.createWriteStream(this.logFile, { flags: "a" });

      // Write session header
      const sessionHeader = `\n${"=".repeat(60)}\nSession started: ${this.getTimestamp()}\n${"=".repeat(60)}\n`;
      this.logStream.write(sessionHeader);
    }
  }

  /**
   * Get formatted timestamp
   */
  private getTimestamp(): string {
    return new Date().toISOString();
  }

  /**
   * Format message with timestamp for file logging
   */
  private formatForFile(level: LogLevel, message: string): string {
    const timestamp = this.getTimestamp();
    const levelStr = level.toUpperCase().padEnd(7);
    return `[${timestamp}] [${levelStr}] ${this.stripAnsi(message)}`;
  }

  /**
   * Strip ANSI color codes from string
   */
  private stripAnsi(str: string): string {
    // eslint-disable-next-line no-control-regex
    return str.replace(/\x1b\[[0-9;]*m/g, "");
  }

  /**
   * Log a message
   */
  log(level: LogLevel, message: string): void {
    // Console output
    if (this.enableConsole) {
      switch (level) {
        case "error":
          console.error(message);
          break;
        case "warn":
          console.warn(message);
          break;
        default:
          console.log(message);
      }
    }

    // File output
    if (this.logStream) {
      const fileMessage = this.formatForFile(level, message);
      this.logStream.write(fileMessage + "\n");
    }
  }

  /**
   * Log info message
   */
  info(message: string): void {
    this.log("info", message);
  }

  /**
   * Log success message
   */
  success(message: string): void {
    this.log("success", message);
  }

  /**
   * Log warning message
   */
  warn(message: string): void {
    this.log("warn", message);
  }

  /**
   * Log error message
   */
  error(message: string): void {
    this.log("error", message);
  }

  /**
   * Log debug message
   */
  debug(message: string): void {
    this.log("debug", message);
  }

  /**
   * Write raw message (no level prefix)
   */
  raw(message: string): void {
    if (this.enableConsole) {
      console.log(message);
    }
    if (this.logStream) {
      this.logStream.write(this.stripAnsi(message) + "\n");
    }
  }

  /**
   * Close the logger and flush any pending writes
   */
  close(): void {
    if (this.logStream) {
      const sessionFooter = `\n${"=".repeat(60)}\nSession ended: ${this.getTimestamp()}\n${"=".repeat(60)}\n`;
      this.logStream.write(sessionFooter);
      this.logStream.end();
      this.logStream = null;
    }
  }
}

/**
 * Create a logger instance
 */
export function createLogger(options: LoggerOptions = {}): Logger {
  return new Logger(options);
}

/**
 * Generate log file name with timestamp
 */
export function generateLogFileName(prefix: string = "estimation"): string {
  const timestamp = new Date().toISOString().replace(/[:.]/g, "-");
  return `logs/${prefix}-${timestamp}.log`;
}
