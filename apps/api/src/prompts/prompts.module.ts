import { Module, Global } from '@nestjs/common';
import { PromptsService } from './prompts.service';

/**
 * Module for managing prompt templates for LangGraph agents
 * 
 * Provides:
 * - Template loading from markdown files
 * - Template compilation with context variables
 * - Convenience methods for each agent type
 */
@Global()
@Module({
  providers: [PromptsService],
  exports: [PromptsService],
})
export class PromptsModule {}
