import { Module } from '@nestjs/common';
import { FileReaderTool, PdfReaderTool, CatalogRetrieverTool } from './implementations';
import { RagModule } from '../rag';
import { CatalogsModule } from '../catalogs';

/**
 * Tools Module
 *
 * Provides tools for agents to interact with files, PDFs, and the RAG system.
 * These tools are used by the multi-agent estimation system.
 */
@Module({
  imports: [RagModule, CatalogsModule],
  providers: [FileReaderTool, PdfReaderTool, CatalogRetrieverTool],
  exports: [FileReaderTool, PdfReaderTool, CatalogRetrieverTool],
})
export class ToolsModule {}
