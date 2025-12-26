import { Controller } from '@nestjs/common';
import { MessagePattern, Payload } from '@nestjs/microservices';
import { AuthService } from './auth.service';
import {
  SignUpDto,
  SignInDto,
  ResetPasswordDto,
  UpdateProfileDto,
} from '@app/shared/dto';

@Controller()
export class AuthController {
  constructor(private readonly authService: AuthService) {}

  @MessagePattern({ cmd: 'auth_signup' })
  async signUp(@Payload() dto: SignUpDto) {
    return this.authService.signUp(dto);
  }

  @MessagePattern({ cmd: 'auth_signin' })
  async signIn(@Payload() dto: SignInDto) {
    return this.authService.signIn(dto);
  }

  @MessagePattern({ cmd: 'auth_verify_email' })
  async verifyEmail(@Payload() token: string) {
    return this.authService.verifyEmail(token);
  }

  @MessagePattern({ cmd: 'auth_resend_verification' })
  async resendVerification(@Payload() email: string) {
    return this.authService.resendVerificationEmail(email);
  }

  @MessagePattern({ cmd: 'auth_forgot_password' })
  async forgotPassword(@Payload() email: string) {
    return this.authService.forgotPassword(email);
  }

  @MessagePattern({ cmd: 'auth_reset_password' })
  async resetPassword(@Payload() dto: ResetPasswordDto) {
    return this.authService.resetPassword(dto.token, dto.newPassword);
  }

  @MessagePattern({ cmd: 'auth_google_login' })
  async googleLogin(@Payload() user: any) {
    return this.authService.googleLogin(user);
  }

  @MessagePattern({ cmd: 'auth_get_user_by_id' })
  async getUserById(@Payload() userId: string) {
    return this.authService.getUserById(userId);
  }

  @MessagePattern({ cmd: 'auth_update_profile' })
  async updateProfile(
    @Payload() data: { userId: string; dto: UpdateProfileDto },
  ) {
    return this.authService.updateProfile(data.userId, data.dto);
  }
}
