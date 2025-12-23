import { Injectable } from '@nestjs/common';
import { EmailService } from './email/email.service';

@Injectable()
export class SupportService {
  constructor(private readonly emailService: EmailService) {}

  async handleUserRegistered(email: string, verifyToken: string) {
    return this.emailService.sendVerificationEmail(email, verifyToken);
  }

  async handleForgotPassword(email: string, resetToken: string) {
    return this.emailService.sendPasswordResetEmail(email, resetToken);
  }
}
