import { Controller, Get } from '@nestjs/common';
import { ApiOkResponse, ApiOperation, ApiTags } from '@nestjs/swagger';
import { Public } from '../../common/auth/decorators';
import type { HealthReport } from './health.service';
import type { HealthService } from './health.service';

@ApiTags('health')
@Controller('health')
export class HealthController {
  constructor(private readonly health: HealthService) {}

  @Public()
  @Get()
  @ApiOperation({ summary: 'Liveness and database check' })
  @ApiOkResponse({ description: 'Service health including the database connection state' })
  check(): Promise<HealthReport> {
    return this.health.check();
  }
}
