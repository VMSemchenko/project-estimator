import { Module } from '@nestjs/common';
import { RagModule } from '../rag/rag.module';
import { CatalogsService } from './catalogs.service';
import { AtomicWorksLoader } from './loaders/atomic-works.loader';
import { BaProcessesLoader } from './loaders/ba-processes.loader';
import { CoefficientsLoader } from './loaders/coefficients.loader';

/**
 * Catalogs Module
 * Provides reference catalog functionality for BA Work Estimation
 */
@Module({
  imports: [RagModule],
  providers: [
    CatalogsService,
    AtomicWorksLoader,
    BaProcessesLoader,
    CoefficientsLoader,
  ],
  exports: [
    CatalogsService,
    AtomicWorksLoader,
    BaProcessesLoader,
    CoefficientsLoader,
  ],
})
export class CatalogsModule {}
