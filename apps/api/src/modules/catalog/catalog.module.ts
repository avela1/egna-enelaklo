import { Module } from '@nestjs/common';
import { CatalogService } from './catalog.service';
import { ServicesController } from './services.controller';
import { StaffCatalogController } from './staff-catalog.controller';

@Module({
  controllers: [ServicesController, StaffCatalogController],
  providers: [CatalogService],
  exports: [CatalogService],
})
export class CatalogModule {}
