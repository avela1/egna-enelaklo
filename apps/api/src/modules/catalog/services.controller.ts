import { Controller, Get, Param } from '@nestjs/common';
import { ApiOkResponse, ApiOperation, ApiTags } from '@nestjs/swagger';
import type { CatalogService } from './catalog.service';

@ApiTags('services')
@Controller('services')
export class ServicesController {
  constructor(private readonly catalog: CatalogService) {}

  @Get()
  @ApiOperation({ summary: 'The services a customer can choose from' })
  @ApiOkResponse({ description: 'The live services with the live template version' })
  list() {
    return this.catalog.listLiveServices();
  }

  @Get(':key/template')
  @ApiOperation({ summary: 'The live request form of a service' })
  template(@Param('key') key: string) {
    return this.catalog.getLiveTemplate(key);
  }
}
