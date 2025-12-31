import { Inject, Injectable } from '@nestjs/common';
import { ClientProxy } from '@nestjs/microservices';
import { firstValueFrom, timeout, catchError, of } from 'rxjs';
import { HealthCheckRequestDto, HealthCheckResponseDto } from '@app/shared/dto';

@Injectable()
export class HealthService {
  constructor(
    @Inject('TRIP_SERVICE') private readonly tripClient: ClientProxy,
    @Inject('BOOKING_SERVICE') private readonly bookingClient: ClientProxy,
    @Inject('PAYMENT_SERVICE') private readonly paymentClient: ClientProxy,
    @Inject('IDENTITY_SERVICE') private readonly identityClient: ClientProxy,
    @Inject('SUPPORT_SERVICE') private readonly supportClient: ClientProxy,
  ) {}

  private async checkService(name: string, client: ClientProxy) {
    try {
      const start = Date.now();
      const result = await firstValueFrom(
        client
          .send<
            HealthCheckResponseDto,
            HealthCheckRequestDto
          >({ cmd: 'health_check' }, {})
          .pipe(
            timeout(2000),
            catchError((err: Error) => {
              const errorMessage =
                err instanceof Error ? err.message : 'Unknown error';
              return of<HealthCheckResponseDto>({
                status: 'down',
                error: errorMessage,
                service: name,
              });
            }),
          ),
      );

      if (result.status === 'down') {
        return {
          name,
          status: 'down',
          latency: `${Date.now() - start}ms`,
          error: result.error,
        };
      }

      return {
        name,
        status: result.status === 'ok' ? 'up' : 'degraded',
        latency: `${Date.now() - start}ms`,
        details: result,
      };
    } catch {
      return { name, status: 'down', error: 'Timeout or Unreachable' };
    }
  }

  async getSystemHealth() {
    const gatewayMemory = process.memoryUsage();
    const gatewayHealth = {
      service: 'Gateway',
      status: 'up',
      timestamp: new Date().toISOString(),
      system: {
        uptime: process.uptime(),
        memory: {
          heapUsed: Math.round(gatewayMemory.heapUsed / 1024 / 1024) + ' MB',
        },
      },
    };

    const servicesResults = await Promise.all([
      this.checkService('IDENTITY_SERVICE', this.identityClient),
      this.checkService('SUPPORT_SERVICE', this.identityClient),
      this.checkService('TRIP_SERVICE', this.tripClient),
      this.checkService('BOOKING_SERVICE', this.bookingClient),
      this.checkService('PAYMENT_SERVICE', this.paymentClient),
    ]);

    const isAnyDown = servicesResults.some((s) => s.status === 'down');
    const isAnyDegraded = servicesResults.some((s) => s.status === 'degraded');

    let overallStatus = 'ok';
    if (isAnyDown) overallStatus = 'error';
    else if (isAnyDegraded) overallStatus = 'degraded';

    return {
      status: overallStatus,
      gateway: gatewayHealth,
      services: servicesResults,
    };
  }
}
