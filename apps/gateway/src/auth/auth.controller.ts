import {
  Controller,
  Post,
  Body,
  Get,
  Query,
  UseGuards,
  Req,
  Res,
  Inject,
  HttpException,
  HttpStatus,
  Patch,
} from '@nestjs/common';
import { ClientProxy } from '@nestjs/microservices';
import {
  ApiTags,
  ApiOperation,
  ApiBearerAuth,
  ApiQuery,
} from '@nestjs/swagger';
import { firstValueFrom } from 'rxjs';
import type { Response } from 'express';
import {
  SignUpDto,
  SignInDto,
  ForgotPasswordDto,
  ResetPasswordDto,
  UpdateProfileDto,
  type RequestWithGoogleUser,
  type RequestWithUser,
  JwtAuthGuard,
} from '@app/shared';
import { GoogleAuthGuard } from './guards/google-auth.guard';

@ApiTags('auth')
@Controller('auth')
export class AuthController {
  constructor(
    @Inject('IDENTITY_SERVICE') private readonly identityClient: ClientProxy,
  ) {}

  private handleAuthError(error: any) {
    const err = error as any;
    let status = Number(err.statusCode || err.status);

    if (isNaN(status)) {
      status = HttpStatus.BAD_REQUEST;
    }

    throw new HttpException(err.message || 'Internal Server Error', status);
  }

  @ApiOperation({ summary: 'Register a new user' })
  @Post('signup')
  async signUp(@Body() dto: SignUpDto) {
    try {
      return await firstValueFrom(
        this.identityClient.send<any>({ cmd: 'auth_signup' }, dto),
      );
    } catch (error) {
      this.handleAuthError(error);
    }
  }

  @ApiOperation({ summary: 'Sign in' })
  @Post('signin')
  async signIn(@Body() dto: SignInDto) {
    try {
      return await firstValueFrom(
        this.identityClient.send<any>({ cmd: 'auth_signin' }, dto),
      );
    } catch (error) {
      this.handleAuthError(error);
    }
  }

  @ApiOperation({ summary: 'Verify email' })
  @ApiQuery({ name: 'token' })
  @Get('verify-email')
  async verifyEmail(@Query('token') token: string) {
    try {
      return await firstValueFrom(
        this.identityClient.send<any>({ cmd: 'auth_verify_email' }, token),
      );
    } catch (error) {
      this.handleAuthError(error);
    }
  }

  @ApiOperation({ summary: 'Resend verification email' })
  @Post('resend-verification')
  async resendVerification(@Body('email') email: string) {
    try {
      return await firstValueFrom(
        this.identityClient.send<any>(
          { cmd: 'auth_resend_verification' },
          email,
        ),
      );
    } catch (error) {
      this.handleAuthError(error);
    }
  }

  @ApiOperation({ summary: 'Forgot password' })
  @Post('forgot-password')
  async forgotPassword(@Body() dto: ForgotPasswordDto) {
    try {
      return await firstValueFrom(
        this.identityClient.send<any>(
          { cmd: 'auth_forgot_password' },
          dto.email,
        ),
      );
    } catch (error) {
      this.handleAuthError(error);
    }
  }

  @ApiOperation({ summary: 'Reset password' })
  @Post('reset-password')
  async resetPassword(@Body() dto: ResetPasswordDto) {
    try {
      return await firstValueFrom(
        this.identityClient.send<any>({ cmd: 'auth_reset_password' }, dto),
      );
    } catch (error) {
      this.handleAuthError(error);
    }
  }

  @ApiOperation({ summary: 'Google Login' })
  @Get('google')
  @UseGuards(GoogleAuthGuard)
  async googleAuth() {}

  @Get('google/callback')
  @UseGuards(GoogleAuthGuard)
  async googleAuthCallback(
    @Req() req: RequestWithGoogleUser,
    @Res() res: Response,
  ) {
    try {
      const tokenData = await firstValueFrom(
        this.identityClient.send<any>({ cmd: 'auth_google_login' }, req.user),
      );

      const frontendUrl = process.env.FRONTEND_URL || 'http://localhost:3000';
      res.redirect(
        `${frontendUrl}/auth-success?token=${tokenData.accessToken}`,
      );
    } catch (error) {
      const frontendUrl = process.env.FRONTEND_URL || 'http://localhost:3000';
      res.redirect(`${frontendUrl}/login?error=auth_failed`);
    }
  }

  @ApiOperation({ summary: 'Get current profile' })
  @Get('me')
  @UseGuards(JwtAuthGuard)
  @ApiBearerAuth('JWT-auth')
  async getCurrentUser(@Req() req: RequestWithUser) {
    try {
      return await firstValueFrom(
        this.identityClient.send<any>(
          { cmd: 'auth_get_user_by_id' },
          req.user.userId,
        ),
      );
    } catch (error) {
      this.handleAuthError(error);
    }
  }

  @ApiOperation({ summary: 'Update profile' })
  @Patch('profile')
  @UseGuards(JwtAuthGuard)
  @ApiBearerAuth('JWT-auth')
  async updateProfile(
    @Req() req: RequestWithUser,
    @Body() dto: UpdateProfileDto,
  ) {
    try {
      return await firstValueFrom(
        this.identityClient.send<any>(
          { cmd: 'auth_update_profile' },
          { userId: req.user.userId, dto },
        ),
      );
    } catch (error) {
      this.handleAuthError(error);
    }
  }
}
