import { Controller, Get } from '@nestjs/common';
import { ApiOkResponse, ApiOperation, ApiTags } from '@nestjs/swagger';
import { PrismaService } from '../../common/prisma/prisma.service';

@ApiTags('prohibited items')
@Controller('prohibited-items')
export class ProhibitedItemsController {
  constructor(private readonly prisma: PrismaService) {}

  @Get()
  @ApiOperation({ summary: 'The items a customer may not ask a tasker to buy or carry' })
  @ApiOkResponse({
    description: 'The active list, so the form can warn before the request is sent',
  })
  async list() {
    const items = await this.prisma.prohibitedItem.findMany({
      where: { active: true },
      orderBy: { term: 'asc' },
      select: { term: true, note: true },
    });

    return items;
  }
}
