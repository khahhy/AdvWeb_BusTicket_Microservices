import { Controller } from '@nestjs/common';
import { MessagePattern } from '@nestjs/microservices';
import { HealthService } from './health.service';

@Controller()
export class HealthController {
  private readonly SERVICE_NAME = 'IDENTITY_SERVICE';

  constructor(private readonly healthService: HealthService) {}

  @MessagePattern({ cmd: 'health_check' })
  async check() {
    return this.healthService.checkHealth(this.SERVICE_NAME);
  }
}
