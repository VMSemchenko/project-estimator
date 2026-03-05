import { Injectable, Logger } from '@nestjs/common';
import * as fs from 'fs/promises';
import * as path from 'path';
import { FileReadResult } from '../interfaces';

/**
 * Input type for FileReaderTool readFile operation
 */
export interface ReadFileInput {
  /** Path to the file to read */
  filePath: string;

  /** File encoding (defaults to utf-8) */
  encoding?: BufferEncoding;
}

/**
 * Input type for FileReaderTool readFiles operation
 */
export interface ReadFilesInput {
  /** Array of file paths to read */
  filePaths: string[];

  /** File encoding (defaults to utf-8) */
  encoding?: BufferEncoding;
}

/**
 * Input type for FileReaderTool listFiles operation
 */
export interface ListFilesInput {
  /** Directory to list files from */
  directory: string;

  /** File extensions to filter (e.g., ['.txt', '.md']) */
  extensions?: string[];

  /** Whether to search recursively */
  recursive?: boolean;
}

/**
 * Output type for listFiles operation
 */
export interface ListFilesOutput {
  /** Directory that was listed */
  directory: string;

  /** Array of file paths found */
  files: string[];

  /** Number of files found */
  count: number;
}

/**
 * FileReaderTool
 *
 * Tool for reading text files from the file system.
 * Supports reading single files, batch reading, listing files,
 * and checking file existence.
 *
 * @example
 * const tool = new FileReaderTool();
 * const content = await tool.readFile('/path/to/file.txt');
 */
@Injectable()
export class FileReaderTool {
  private readonly logger = new Logger(FileReaderTool.name);

  readonly name = 'file_reader';
  readonly description =
    'Read text files from the file system. Supports single file reading, batch reading, directory listing, and file existence checks.';

  /**
   * Read a single file and return its content
   * @param filePath - Path to the file to read
   * @param encoding - File encoding (defaults to utf-8)
   * @returns FileReadResult with content and metadata
   */
  async readFile(filePath: string, encoding: BufferEncoding = 'utf-8'): Promise<FileReadResult> {
    this.logger.debug(`Reading file: ${filePath}`);

    try {
      const absolutePath = path.resolve(filePath);
      const stats = await fs.stat(absolutePath);

      if (!stats.isFile()) {
        throw new Error(`Path is not a file: ${filePath}`);
      }

      const content = await fs.readFile(absolutePath, encoding);

      this.logger.debug(`Successfully read file: ${filePath} (${stats.size} bytes)`);

      return {
        path: absolutePath,
        content,
        size: stats.size,
      };
    } catch (error) {
      this.logger.error(`Failed to read file ${filePath}: ${error}`);
      throw new Error(`Failed to read file ${filePath}: ${error}`);
    }
  }

  /**
   * Read multiple files in batch
   * @param filePaths - Array of file paths to read
   * @param encoding - File encoding (defaults to utf-8)
   * @returns Map of file paths to their content
   */
  async readFiles(filePaths: string[], encoding: BufferEncoding = 'utf-8'): Promise<Map<string, FileReadResult>> {
    this.logger.debug(`Reading ${filePaths.length} files`);

    const results = new Map<string, FileReadResult>();

    await Promise.all(
      filePaths.map(async (filePath) => {
        try {
          const result = await this.readFile(filePath, encoding);
          results.set(filePath, result);
        } catch (error) {
          this.logger.warn(`Skipping file ${filePath}: ${error}`);
          // Store error as a result with empty content
          results.set(filePath, {
            path: filePath,
            content: '',
            size: 0,
          });
        }
      }),
    );

    this.logger.debug(`Successfully read ${results.size} files`);
    return results;
  }

  /**
   * List files in a directory, optionally filtered by extension
   * @param directory - Directory to list files from
   * @param extensions - File extensions to filter (e.g., ['.txt', '.md'])
   * @param recursive - Whether to search recursively (defaults to false)
   * @returns ListFilesOutput with array of file paths
   */
  async listFiles(
    directory: string,
    extensions?: string[],
    recursive: boolean = false,
  ): Promise<ListFilesOutput> {
    this.logger.debug(`Listing files in: ${directory}`);

    try {
      const absolutePath = path.resolve(directory);
      const stats = await fs.stat(absolutePath);

      if (!stats.isDirectory()) {
        throw new Error(`Path is not a directory: ${directory}`);
      }

      const files = recursive
        ? await this.listFilesRecursive(absolutePath, extensions)
        : await this.listFilesFlat(absolutePath, extensions);

      this.logger.debug(`Found ${files.length} files in ${directory}`);

      return {
        directory: absolutePath,
        files,
        count: files.length,
      };
    } catch (error) {
      this.logger.error(`Failed to list files in ${directory}: ${error}`);
      throw new Error(`Failed to list files in ${directory}: ${error}`);
    }
  }

  /**
   * Check if a file exists
   * @param filePath - Path to check
   * @returns True if file exists, false otherwise
   */
  async fileExists(filePath: string): Promise<boolean> {
    this.logger.debug(`Checking if file exists: ${filePath}`);

    try {
      const absolutePath = path.resolve(filePath);
      const stats = await fs.stat(absolutePath);
      return stats.isFile();
    } catch {
      return false;
    }
  }

  /**
   * List files in a directory (non-recursive)
   */
  private async listFilesFlat(
    directory: string,
    extensions?: string[],
  ): Promise<string[]> {
    const entries = await fs.readdir(directory, { withFileTypes: true });
    const files: string[] = [];

    for (const entry of entries) {
      if (entry.isFile()) {
        const filePath = path.join(directory, entry.name);
        if (this.matchesExtensions(entry.name, extensions)) {
          files.push(filePath);
        }
      }
    }

    return files;
  }

  /**
   * List files in a directory recursively
   */
  private async listFilesRecursive(
    directory: string,
    extensions?: string[],
  ): Promise<string[]> {
    const files: string[] = [];
    const entries = await fs.readdir(directory, { withFileTypes: true });

    for (const entry of entries) {
      const fullPath = path.join(directory, entry.name);

      if (entry.isDirectory()) {
        const subFiles = await this.listFilesRecursive(fullPath, extensions);
        files.push(...subFiles);
      } else if (entry.isFile() && this.matchesExtensions(entry.name, extensions)) {
        files.push(fullPath);
      }
    }

    return files;
  }

  /**
   * Check if a filename matches the given extensions
   */
  private matchesExtensions(filename: string, extensions?: string[]): boolean {
    if (!extensions || extensions.length === 0) {
      return true;
    }

    const ext = path.extname(filename).toLowerCase();
    return extensions.map((e) => e.toLowerCase()).includes(ext);
  }
}
