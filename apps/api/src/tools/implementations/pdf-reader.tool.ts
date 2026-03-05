import { Injectable, Logger } from '@nestjs/common';
import * as fs from 'fs/promises';
import * as path from 'path';
// eslint-disable-next-line @typescript-eslint/no-require-imports
const pdfParse = require('pdf-parse');
import { PdfExtractionResult } from '../interfaces';

/**
 * Options for PDF extraction
 */
export interface PdfExtractionOptions {
  /** Maximum number of pages to extract (default: all) */
  maxPages?: number;

  /** Whether to include page-by-page text (default: false) */
  includePages?: boolean;
}

/**
 * PdfReaderTool
 *
 * Tool for extracting text content from PDF files.
 * Supports multi-page PDFs and preserves basic structure.
 *
 * @example
 * const tool = new PdfReaderTool();
 * const result = await tool.extractText('/path/to/document.pdf');
 * console.log(result.text);
 * console.log(result.pageCount);
 */
@Injectable()
export class PdfReaderTool {
  private readonly logger = new Logger(PdfReaderTool.name);

  readonly name = 'pdf_reader';
  readonly description =
    'Extract text content from PDF files. Supports multi-page PDFs and returns metadata including page count.';

  /**
   * Extract text from a PDF file
   * @param pdfPath - Path to the PDF file
   * @param options - Extraction options
   * @returns PdfExtractionResult with text, page count, and metadata
   */
  async extractText(
    pdfPath: string,
    options: PdfExtractionOptions = {},
  ): Promise<PdfExtractionResult> {
    this.logger.debug(`Extracting text from PDF: ${pdfPath}`);

    try {
      const absolutePath = path.resolve(pdfPath);
      const stats = await fs.stat(absolutePath);

      if (!stats.isFile()) {
        throw new Error(`Path is not a file: ${pdfPath}`);
      }

      // Read the PDF file
      const dataBuffer = await fs.readFile(absolutePath);

      // Parse the PDF
      const data = await pdfParse(dataBuffer);

      // Extract text and metadata
      const text = data.text || '';
      const pageCount = data.numpages || 0;
      const metadata: Record<string, unknown> = {
        info: data.info || {},
        metadata: data.metadata || null,
        version: data.version || 'unknown',
      };

      this.logger.debug(
        `Successfully extracted text from PDF: ${pdfPath} (${pageCount} pages, ${text.length} characters)`,
      );

      // Optionally extract page-by-page text
      let pages: string[] | undefined;
      if (options.includePages) {
        pages = await this.extractPagesInternal(dataBuffer, pageCount, options.maxPages);
      }

      return {
        text,
        pageCount,
        metadata,
        pages,
      };
    } catch (error) {
      this.logger.error(`Failed to extract text from PDF ${pdfPath}: ${error}`);
      throw new Error(`Failed to extract text from PDF ${pdfPath}: ${error}`);
    }
  }

  /**
   * Extract text from a specific page of a PDF
   * @param pdfPath - Path to the PDF file
   * @param pageNumber - Page number to extract (1-indexed)
   * @returns Text content of the specified page
   */
  async extractPage(pdfPath: string, pageNumber: number): Promise<string> {
    this.logger.debug(`Extracting page ${pageNumber} from PDF: ${pdfPath}`);

    if (pageNumber < 1) {
      throw new Error('Page number must be 1 or greater');
    }

    try {
      const absolutePath = path.resolve(pdfPath);
      const dataBuffer = await fs.readFile(absolutePath);

      // Get total page count first
      const pdfInfo = await pdfParse(dataBuffer);
      const totalPages = pdfInfo.numpages || 0;

      if (pageNumber > totalPages) {
        throw new Error(
          `Page ${pageNumber} does not exist. PDF has ${totalPages} pages.`,
        );
      }

      // Extract the specific page
      // Note: pdf-parse doesn't support direct page extraction, so we use a custom approach
      const pages = await this.extractPagesInternal(dataBuffer, totalPages);
      const pageIndex = pageNumber - 1;

      if (pages && pages[pageIndex]) {
        this.logger.debug(
          `Successfully extracted page ${pageNumber} from PDF: ${pdfPath}`,
        );
        return pages[pageIndex];
      }

      // Fallback: try to extract from full text using page breaks
      const pageText = this.extractPageFromFullText(pdfInfo.text, pageNumber, totalPages);
      this.logger.debug(
        `Successfully extracted page ${pageNumber} from PDF: ${pdfPath} (fallback method)`,
      );
      return pageText;
    } catch (error) {
      this.logger.error(
        `Failed to extract page ${pageNumber} from PDF ${pdfPath}: ${error}`,
      );
      throw new Error(
        `Failed to extract page ${pageNumber} from PDF ${pdfPath}: ${error}`,
      );
    }
  }

  /**
   * Check if a file is a valid PDF
   * @param filePath - Path to check
   * @returns True if file is a valid PDF
   */
  async isPdf(filePath: string): Promise<boolean> {
    try {
      const absolutePath = path.resolve(filePath);
      const dataBuffer = await fs.readFile(absolutePath);

      // Check PDF magic number
      const header = dataBuffer.subarray(0, 5).toString('ascii');
      if (header !== '%PDF-') {
        return false;
      }

      // Try to parse the PDF
      await pdfParse(dataBuffer);
      return true;
    } catch {
      return false;
    }
  }

  /**
   * Get PDF metadata without extracting full text
   * @param pdfPath - Path to the PDF file
   * @returns PDF metadata
   */
  async getMetadata(pdfPath: string): Promise<Record<string, unknown>> {
    this.logger.debug(`Getting metadata from PDF: ${pdfPath}`);

    try {
      const absolutePath = path.resolve(pdfPath);
      const dataBuffer = await fs.readFile(absolutePath);
      const data = await pdfParse(dataBuffer, {
        // Only get metadata, don't extract full text
        max: 1,
      });

      return {
        pageCount: data.numpages || 0,
        info: data.info || {},
        metadata: data.metadata || null,
        version: data.version || 'unknown',
      };
    } catch (error) {
      this.logger.error(`Failed to get metadata from PDF ${pdfPath}: ${error}`);
      throw new Error(`Failed to get metadata from PDF ${pdfPath}: ${error}`);
    }
  }

  /**
   * Internal method to extract pages from PDF buffer
   * This is a simplified implementation that splits text by form feed characters
   */
  private async extractPagesInternal(
    dataBuffer: Buffer,
    totalPages: number,
    maxPages?: number,
  ): Promise<string[]> {
    const pages: string[] = [];
    const limit = maxPages ? Math.min(maxPages, totalPages) : totalPages;

    // pdf-parse doesn't have native page extraction, so we use a workaround
    // by rendering each page separately
    for (let i = 1; i <= limit; i++) {
      try {
        // Use pdf-parse's page rendering option
        const pageData = await this.renderPage(dataBuffer, i);
        pages.push(pageData);
      } catch (error) {
        this.logger.warn(`Failed to extract page ${i}: ${error}`);
        pages.push('');
      }
    }

    return pages;
  }

  /**
   * Render a specific page from PDF
   * Note: This is a simplified implementation
   */
  private async renderPage(dataBuffer: Buffer, pageNumber: number): Promise<string> {
    return new Promise((resolve, reject) => {
      const options = {
        pagerender: (pageData: { textContent: { items: Array<{ str: string }> } }) => {
          // Extract text from page content
          const textItems = pageData.textContent?.items || [];
          const text = textItems.map((item) => item.str).join(' ');
          return text;
        },
      };

      pdfParse(dataBuffer, options)
        .then((data: { text: string }) => {
          // Since pdf-parse renders all pages, we need to split by form feed
          const allPages = data.text.split('\f');
          const pageIndex = pageNumber - 1;
          resolve(allPages[pageIndex] || '');
        })
        .catch(reject);
    });
  }

  /**
   * Extract a specific page from full text using form feed delimiter
   */
  private extractPageFromFullText(
    fullText: string,
    pageNumber: number,
    totalPages: number,
  ): string {
    const pages = fullText.split('\f');
    const pageIndex = pageNumber - 1;

    if (pageIndex >= 0 && pageIndex < pages.length) {
      return pages[pageIndex];
    }

    // If no form feed delimiters, estimate page position
    if (pages.length === 1 && totalPages > 1) {
      const avgPageLength = Math.floor(fullText.length / totalPages);
      const start = (pageNumber - 1) * avgPageLength;
      const end = pageNumber * avgPageLength;
      return fullText.substring(start, end);
    }

    return '';
  }
}
