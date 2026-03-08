import {
  Controller,
  Get,
  Post,
  Delete,
  Body,
  Param,
  HttpCode,
  HttpStatus,
  Logger,
  NotFoundException,
  PlainLiteralObject,
} from "@nestjs/common";
import { EstimationService } from "./estimation.service";
import { CreateEstimationDto } from "./dto/create-estimation.dto";
import {
  CreateEstimationResponseDto,
  GetEstimationResponseDto,
} from "./dto/estimation-response.dto";

/**
 * Controller for estimation endpoints
 */
@Controller("estimate")
export class EstimationController {
  private readonly logger = new Logger(EstimationController.name);

  constructor(private readonly estimationService: EstimationService) {}

  /**
   * POST /estimate
   * Trigger a new estimation from input folder
   */
  @Post()
  @HttpCode(HttpStatus.ACCEPTED)
  async createEstimation(
    @Body() dto: CreateEstimationDto,
  ): Promise<CreateEstimationResponseDto> {
    this.logger.log(`Creating estimation for: ${dto.inputFolder}`);
    return this.estimationService.createEstimation(dto);
  }

  /**
   * GET /estimate/:id
   * Get estimation status and results
   */
  @Get(":id")
  @HttpCode(HttpStatus.OK)
  async getEstimation(
    @Param("id") id: string,
  ): Promise<GetEstimationResponseDto> {
    this.logger.log(`Getting estimation: ${id}`);
    return this.estimationService.getEstimation(id);
  }

  /**
   * GET /estimate/:id/report
   * Get the markdown report for a completed estimation
   */
  @Get(":id/report")
  @HttpCode(HttpStatus.OK)
  async getEstimationReport(
    @Param("id") id: string,
  ): Promise<PlainLiteralObject> {
    this.logger.log(`Getting estimation report: ${id}`);
    const estimation = await this.estimationService.getEstimation(id);

    if (!estimation.artifacts?.estimationReport) {
      throw new NotFoundException(`Report not found for estimation ${id}`);
    }

    return {
      id: estimation.id,
      status: estimation.status,
      report: estimation.artifacts.estimationReport,
      csv: estimation.artifacts.detailedBreakdown,
    };
  }

  /**
   * GET /estimate
   * Get all estimation jobs (for admin/debug purposes)
   */
  @Get()
  @HttpCode(HttpStatus.OK)
  async getAllEstimations(): Promise<GetEstimationResponseDto[]> {
    this.logger.log("Getting all estimations");
    return this.estimationService.getAllEstimations();
  }

  /**
   * DELETE /estimate/:id
   * Delete an estimation job
   */
  @Delete(":id")
  @HttpCode(HttpStatus.NO_CONTENT)
  async deleteEstimation(@Param("id") id: string): Promise<void> {
    this.logger.log(`Deleting estimation: ${id}`);
    return this.estimationService.deleteEstimation(id);
  }
}
