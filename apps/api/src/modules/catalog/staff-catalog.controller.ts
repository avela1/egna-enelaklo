import {
  Body,
  Controller,
  Get,
  HttpCode,
  HttpStatus,
  Param,
  Patch,
  Post,
  Put,
  Req,
} from '@nestjs/common';
import { ApiOkResponse, ApiOperation, ApiTags } from '@nestjs/swagger';
import {
  CreateServiceSchema,
  SaveTemplateSchema,
  UpdateServiceSchema,
  type CreateServiceValues,
  type SaveTemplateValues,
  type UpdateServiceValues,
} from '@egna-enelaklo/shared';
import { CurrentUser, RequirePermission } from '../../common/auth/decorators';
import type { AuthenticatedRequest, Principal } from '../../common/auth/principal';
import { requestMeta } from '../../common/http/request-meta';
import { ZodValidationPipe } from '../../common/pipes/zod-validation.pipe';
import { CatalogService } from './catalog.service';

@ApiTags('staff catalog')
@Controller('staff')
@RequirePermission('catalog.edit')
export class StaffCatalogController {
  constructor(private readonly catalog: CatalogService) {}

  @Get('catalog')
  @ApiOperation({ summary: 'Every service with its template versions' })
  list() {
    return this.catalog.staffList();
  }

  @Post('services')
  @HttpCode(HttpStatus.CREATED)
  @ApiOperation({ summary: 'Create a service with an empty draft template' })
  create(
    @Body(new ZodValidationPipe(CreateServiceSchema)) body: CreateServiceValues,
    @CurrentUser() principal: Principal,
    @Req() request: AuthenticatedRequest,
  ) {
    return this.catalog.createService(body, principal, requestMeta(request));
  }

  @Patch('services/:id')
  @ApiOperation({ summary: 'Update a service' })
  update(
    @Param('id') id: string,
    @Body(new ZodValidationPipe(UpdateServiceSchema)) body: UpdateServiceValues,
    @CurrentUser() principal: Principal,
    @Req() request: AuthenticatedRequest,
  ) {
    return this.catalog.updateService(id, body, principal, requestMeta(request));
  }

  @Get('services/:id/templates')
  @ApiOperation({ summary: 'Every version of a service template' })
  templates(@Param('id') serviceId: string) {
    return this.catalog.listTemplates(serviceId);
  }

  @Post('services/:id/templates')
  @HttpCode(HttpStatus.CREATED)
  @ApiOperation({ summary: 'Create a new draft version of a service template' })
  createDraft(
    @Param('id') serviceId: string,
    @CurrentUser() principal: Principal,
    @Req() request: AuthenticatedRequest,
  ) {
    return this.catalog.createDraftTemplate(serviceId, principal, requestMeta(request));
  }

  @Put('templates/:id')
  @ApiOperation({ summary: 'Save the definition of a draft template' })
  save(
    @Param('id') templateId: string,
    @Body(new ZodValidationPipe(SaveTemplateSchema)) body: SaveTemplateValues,
    @CurrentUser() principal: Principal,
    @Req() request: AuthenticatedRequest,
  ) {
    return this.catalog.saveDraftTemplate(
      templateId,
      body.definition,
      principal,
      requestMeta(request),
    );
  }

  @Post('templates/:id/publish')
  @HttpCode(HttpStatus.OK)
  @ApiOperation({ summary: 'Publish a draft template' })
  @ApiOkResponse({ description: 'The published version and what changed' })
  publish(
    @Param('id') templateId: string,
    @CurrentUser() principal: Principal,
    @Req() request: AuthenticatedRequest,
  ) {
    return this.catalog.publishTemplate(templateId, principal, requestMeta(request));
  }
}
