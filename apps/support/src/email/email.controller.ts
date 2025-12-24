import { Controller } from '@nestjs/common';
import { EventPattern, Payload } from '@nestjs/microservices';
import { EmailService } from './email.service';

@Controller()
export class EmailController {
  constructor(private readonly emailService: EmailService) {}

  @EventPattern('user_created')
  async handleUserCreated(
    @Payload() data: { email: string; verifyToken: string },
  ) {
    await this.emailService.sendVerificationEmail(data.email, data.verifyToken);
  }
}
