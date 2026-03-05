import { IsString, IsNotEmpty, IsOptional, IsBoolean } from 'class-validator';

/**
 * DTO for creating a new estimation job
 */
export class CreateEstimationDto {
  @IsString()
  @IsNotEmpty({ message: 'inputFolder is required' })
  inputFolder: string;

  @IsString()
  @IsOptional()
  outputFolder?: string;

  @IsBoolean()
  @IsOptional()
  verbose?: boolean;

  @IsBoolean()
  @IsOptional()
  testMode?: boolean;
}
