import { LoggerService, Injectable } from "@nestjs/common";
import * as fs from "fs";
import * as path from "path";

/**
 * Custom logger service that writes to both console and file
 */
@Injectable()
export class FileLogger implements LoggerService {
  private logDir: string;
  private logFile: string;
  private logLevel: string;

  constructor() {
    this.logDir = process.env.LOG_DIR || "logs";
    this.logLevel = process.env.LOG_LEVEL || "debug";

    // Create logs directory if it doesn't exist
    if (!fs.existsSync(this.logDir)) {
      fs.mkdirSync(this.logDir, { recursive: true });
    }

    // Create log file with timestamp
    const timestamp = new Date().toISOString().replace(/[:.]/g, "-");
    this.logFile = path.join(this.logDir, `estimator-${timestamp}.log`);

    // Initialize log file with header
    this.writeToFile(`\n=== Log started at ${new Date().toISOString()} ===\n`);
  }

  /**
   * Log debug message
   */
  debug(message: string, ...optionalParams: unknown[]): void {
    if (this.shouldLog("debug")) {
      this.writeLogEntry("DEBUG", message, optionalParams);
    }
  }

  /**
   * Log info message
   */
  log(message: string, ...optionalParams: unknown[]): void {
    if (this.shouldLog("log")) {
      this.writeLogEntry("INFO", message, optionalParams);
    }
  }

  /**
   * Log warning message
   */
  warn(message: string, ...optionalParams: unknown[]): void {
    if (this.shouldLog("warn")) {
      this.writeLogEntry("WARN", message, optionalParams);
    }
  }

  /**
   * Log error message
   */
  error(message: string, ...optionalParams: unknown[]): void {
    if (this.shouldLog("error")) {
      this.writeLogEntry("ERROR", message, optionalParams);
    }
  }

  /**
   * Log verbose message
   */
  verbose(message: string, ...optionalParams: unknown[]): void {
    if (this.shouldLog("verbose")) {
      this.writeLogEntry("VERBOSE", message, optionalParams);
    }
  }

  /**
   * Format and write log entry
   */
  private writeLogEntry(
    level: string,
    message: string,
    params: unknown[],
  ): void {
    const timestamp = new Date().toISOString();
    const formattedParams = params.length > 0 ? JSON.stringify(params) : "";
    const logLine = `[${timestamp}] [${level}] ${message} ${formattedParams}\n`;

    // Write to file
    this.writeToFile(logLine);

    // Also output to console
    console.log(`[${level}] ${message}`, ...params);
  }

  /**
   * Write to log file
   */
  private writeToFile(content: string): void {
    try {
      fs.appendFileSync(this.logFile, content, "utf8");
    } catch (error) {
      console.error("Failed to write to log file:", error);
    }
  }

  /**
   * Check if log level should be output
   */
  private shouldLog(level: string): boolean {
    const levels = ["debug", "verbose", "log", "warn", "error"];
    const currentLevelIndex = levels.indexOf(this.logLevel.toLowerCase());
    const messageLevelIndex = levels.indexOf(level.toLowerCase());
    return messageLevelIndex >= currentLevelIndex;
  }

  /**
   * Get the current log file path
   */
  getLogFilePath(): string {
    return this.logFile;
  }
}
