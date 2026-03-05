import { Module, Global } from '@nestjs/common';
import { TracingService } from './tracing.service';
import { MetricsService } from './metrics.service';
import { AiModule } from '../ai/ai.module';

/**
 * Global module for observability services
 * Provides tracing and metrics capabilities across the application
 */
@Global()
@Module({
  imports: [AiModule],
  providers: [TracingService, MetricsService],
  exports: [TracingService, MetricsService],
})
export class ObservabilityModule {}
