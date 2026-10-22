import {
  Body,
  Controller,
  Delete,
  Get,
  HttpCode,
  HttpStatus,
  Param,
  Patch,
  Post,
} from '@nestjs/common';
import { ApiOkResponse, ApiOperation, ApiTags } from '@nestjs/swagger';
import { AddressSchema, type AddressValues } from '@egna-enelaklo/shared';
import { CurrentUser } from '../../common/auth/decorators';
import type { Principal } from '../../common/auth/principal';
import { ZodValidationPipe } from '../../common/pipes/zod-validation.pipe';
import type { AddressesService } from './addresses.service';

@ApiTags('addresses')
@Controller('addresses')
export class AddressesController {
  constructor(private readonly addresses: AddressesService) {}

  @Get()
  @ApiOperation({ summary: 'The saved addresses of the signed in customer' })
  list(@CurrentUser() principal: Principal) {
    return this.addresses.list(principal.id);
  }

  @Post()
  @HttpCode(HttpStatus.CREATED)
  @ApiOperation({ summary: 'Save a new address' })
  create(
    @Body(new ZodValidationPipe(AddressSchema)) body: AddressValues,
    @CurrentUser() principal: Principal,
  ) {
    return this.addresses.create(principal.id, body);
  }

  @Patch(':id')
  @ApiOperation({ summary: 'Change an address' })
  update(
    @Param('id') id: string,
    @Body(new ZodValidationPipe(AddressSchema.partial())) body: Partial<AddressValues>,
    @CurrentUser() principal: Principal,
  ) {
    return this.addresses.update(principal.id, id, body);
  }

  @Delete(':id')
  @HttpCode(HttpStatus.OK)
  @ApiOperation({ summary: 'Remove an address' })
  @ApiOkResponse({ description: 'The address is soft deleted' })
  remove(@Param('id') id: string, @CurrentUser() principal: Principal) {
    return this.addresses.remove(principal.id, id);
  }
}
