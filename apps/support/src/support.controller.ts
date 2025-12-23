import { Controller } from '@nestjs/common';
import { EventPattern, Payload } from '@nestjs/microservices';
import { SupportService } from './support.service';

@Controller()
export class SupportController {
  constructor(private readonly supportService: SupportService) {}

  @EventPattern('user_created')
  async handleUserCreated(
    @Payload() data: { email: string; verifyToken: string },
  ) {
    await this.supportService.handleUserRegistered(
      data.email,
      data.verifyToken,
    );
  }

  @EventPattern('forgot_password')
  async handleForgotPassword(
    @Payload() data: { email: string; resetToken: string },
  ) {
    await this.supportService.handleForgotPassword(data.email, data.resetToken);
  }
}
