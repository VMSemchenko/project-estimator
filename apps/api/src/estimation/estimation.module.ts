import { Module } from "@nestjs/common";
import { ConfigModule } from "@nestjs/config";
import { EstimationController } from "./estimation.controller";
import { EstimationService } from "./estimation.service";
import { AgentsModule } from "../agents";
import { CatalogsModule } from "../catalogs";
import { ObservabilityModule } from "../observability";

/**
 * Estimation module for managing estimation jobs
 */
@Module({
  imports: [ConfigModule, AgentsModule, CatalogsModule, ObservabilityModule],
  controllers: [EstimationController],
  providers: [EstimationService],
  exports: [EstimationService],
})
export class EstimationModule {}
