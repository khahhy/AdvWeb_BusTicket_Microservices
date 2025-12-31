import { Injectable } from '@nestjs/common';
import { PrismaService } from '../prisma/prisma.service';
import * as os from 'os';

@Injectable()
export class HealthService {
  constructor(private readonly prisma: PrismaService) {}

  async checkHealth(serviceName: string) {
    const start = Date.now();
    let dbStatus = 'connected';
    let dbError: string | null = null;

    try {
      await this.prisma.$queryRaw`SELECT 1`;
    } catch (e) {
      dbStatus = 'disconnected';
      dbError = e instanceof Error ? e.message : 'Unknown error';
    }

    const latency = Date.now() - start;
    const systemStats = this.getSystemStats();

    return {
      status: dbStatus === 'connected' ? 'ok' : 'degraded',
      service: serviceName,
      timestamp: new Date().toISOString(),
      system: systemStats,
      dependencies: {
        database: {
          status: dbStatus,
          latency: `${latency}ms`,
          error: dbError,
        },
      },
    };
  }

  private getSystemStats() {
    const totalMemory = os.totalmem() / 1024 / 1024;
    const freeMemory = os.freemem() / 1024 / 1024;
    const usedSystemMemory = totalMemory - freeMemory;
    const memoryPercent = Math.floor((usedSystemMemory / totalMemory) * 100);
    const heapUsed = process.memoryUsage().heapUsed / 1024 / 1024;
    const loadAvg = os.loadavg();

    return {
      uptime: process.uptime(),
      os: `${os.type()} ${os.release()} (${os.arch()})`,
      memory: {
        unit: 'MB',
        total: Math.round(totalMemory),
        free: Math.round(freeMemory),
        usedSystem: Math.round(usedSystemMemory),
        heapUsed: Math.round(heapUsed),
        percent: memoryPercent,
      },
      cpu: {
        cores: os.cpus().length,
        loadAverage: loadAvg,
      },
    };
  }
}
