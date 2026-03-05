import { Module } from '@nestjs/common';
import { EstimationController } from './estimation.controller';
import { EstimationService } from './estimation.service';
import { AgentsModule } from '../agents';

/**
 * Estimation module for managing estimation jobs
 */
@Module({
  imports: [AgentsModule],
  controllers: [EstimationController],
  providers: [EstimationService],
  exports: [EstimationService],
})
export class EstimationModule {}
