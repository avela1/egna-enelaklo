import { Controller, Get, Query, Req, Res } from '@nestjs/common';
import { ApiOkResponse, ApiOperation, ApiTags } from '@nestjs/swagger';
import type { Response } from 'express';
import { AuditQuerySchema, type AuditQuery } from '@egna-enelaklo/shared';
import { CurrentUser, RequirePermission } from '../../../common/auth/decorators';
import type { AuthenticatedRequest, Principal } from '../../../common/auth/principal';
import { requestMeta } from '../../../common/http/request-meta';
import { ZodValidationPipe } from '../../../common/pipes/zod-validation.pipe';
import type { StaffAuditService } from './staff-audit.service';
import { csvCell } from './staff-audit.service';

const CSV_COLUMNS = [
  'time',
  'actor',
  'actorEmail',
  'actorRole',
  'action',
  'targetType',
  'targetId',
  'detail',
  'ip',
  'requestId',
] as const;

@ApiTags('staff audit')
@Controller('staff/audit')
@RequirePermission('audit.view')
export class StaffAuditController {
  constructor(private readonly audit: StaffAuditService) {}

  @Get()
  @ApiOperation({ summary: 'The audit log, newest first' })
  @ApiOkResponse({ description: 'A paginated list of audit entries' })
  list(@Query(new ZodValidationPipe(AuditQuerySchema)) query: AuditQuery) {
    return this.audit.list(query);
  }

  @Get('export.csv')
  @ApiOperation({ summary: 'Download the audit log as CSV' })
  async exportCsv(
    @Query(new ZodValidationPipe(AuditQuerySchema)) query: AuditQuery,
    @CurrentUser() principal: Principal,
    @Req() request: AuthenticatedRequest,
    @Res() response: Response,
  ) {
    const rows = await this.audit.exportRows(query);

    await this.audit.recordExport(principal, requestMeta(request), rows.length);

    const lines = [CSV_COLUMNS.join(',')];

    for (const row of rows) {
      lines.push(
        [
          row.createdAt,
          row.actorName ?? '',
          row.actorEmail ?? '',
          row.actorRole,
          row.action,
          row.targetType,
          row.targetId,
          row.detail ?? '',
          row.ip ?? '',
          row.requestId ?? '',
        ]
          .map((value) => csvCell(value))
          .join(','),
      );
    }

    response.setHeader('Content-Type', 'text/csv; charset=utf-8');
    response.setHeader('Content-Disposition', 'attachment; filename="egna-audit-log.csv"');
    response.send(`${lines.join('\n')}\n`);
  }
}
