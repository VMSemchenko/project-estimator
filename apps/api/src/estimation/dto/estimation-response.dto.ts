import {
  EstimationStatus,
  ConfidenceLevel,
  EstimationSummary,
  EstimationArtifacts,
  EstimationLinks,
} from '../interfaces/estimation-job.interface';

/**
 * DTO for create estimation response (POST /estimate)
 */
export class CreateEstimationResponseDto {
  id: string;
  status: EstimationStatus;
  createdAt: string;
  links: EstimationLinks;
}

/**
 * DTO for get estimation response (GET /estimate/:id)
 */
export class GetEstimationResponseDto {
  id: string;
  status: EstimationStatus;
  createdAt: string;
  completedAt?: string;
  summary?: EstimationSummary;
  artifacts?: EstimationArtifacts;
  error?: string;
}

/**
 * DTO for health check response (GET /health)
 */
export class HealthResponseDto {
  status: string;
  timestamp: string;
  services: {
    mongodb: string;
    zhipuai: string;
    langfuse: string;
  };
}

/**
 * DTO for error response
 */
export class ErrorResponseDto {
  statusCode: number;
  message: string;
  error: string;
  timestamp: string;
  path: string;
}
