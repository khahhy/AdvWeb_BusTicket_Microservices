import { ApiProperty } from '@nestjs/swagger';

export class HealthCheckRequestDto {}

export class HealthCheckResponseDto {
  @ApiProperty()
  status: 'ok' | 'degraded' | 'down' | 'error';

  @ApiProperty()
  service?: string;

  @ApiProperty()
  timestamp?: string;

  @ApiProperty()
  error?: string;

  @ApiProperty()
  system?: {
    uptime: number;
    memory: {
      heapUsed: string;
      rss: string;
    };
  };

  @ApiProperty()
  dependencies?: {
    database?: {
      status: string;
      latency: string;
      error?: string;
    };
  };
}
