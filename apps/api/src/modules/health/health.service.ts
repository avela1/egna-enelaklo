import { Injectable } from '@nestjs/common';
import { PrismaService } from '../../common/prisma/prisma.service';

export type HealthStatus = 'ok' | 'degraded';

export interface HealthReport {
  database: 'connected' | 'disconnected';
  environment: string;
  status: HealthStatus;
  timestamp: string;
  uptimeSeconds: number;
  version: string;
}

@Injectable()
export class HealthService {
  constructor(private readonly prisma: PrismaService) {}

  async check(): Promise<HealthReport> {
    const databaseConnected = await this.prisma.ping();

    return {
      status: databaseConnected ? 'ok' : 'degraded',
      database: databaseConnected ? 'connected' : 'disconnected',
      environment: process.env['NODE_ENV'] ?? 'development',
      version: process.env['npm_package_version'] ?? '0.1.0',
      uptimeSeconds: Math.round(process.uptime()),
      timestamp: new Date().toISOString(),
    };
  }
}
