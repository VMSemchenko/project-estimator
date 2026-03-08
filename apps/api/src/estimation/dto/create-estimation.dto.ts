import {
  IsString,
  IsNotEmpty,
  IsOptional,
  IsBoolean,
  IsEnum,
} from "class-validator";

/**
 * Available catalog sets for estimation
 */
export enum CatalogSet {
  DEMO = "demo",
  REAL_WORLD = "real-world",
}

/**
 * DTO for creating a new estimation job
 */
export class CreateEstimationDto {
  @IsString()
  @IsNotEmpty({ message: "inputFolder is required" })
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

  @IsEnum(CatalogSet, {
    message: 'catalogSet must be either "demo" or "real-world"',
  })
  @IsOptional()
  catalogSet?: CatalogSet;
}
