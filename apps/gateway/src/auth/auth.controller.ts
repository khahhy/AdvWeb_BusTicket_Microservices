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
  Patch,
} from '@nestjs/common';
import { ClientProxy } from '@nestjs/microservices';
import {
  ApiTags,
  ApiOperation,
  ApiBearerAuth,
  ApiQuery,
  ApiBody,
} from '@nestjs/swagger';
import { firstValueFrom } from 'rxjs';
import type { Response } from 'express';
import {
  SignUpDto,
  SignInDto,
  ForgotPasswordDto,
  ResetPasswordDto,
  UpdateProfileDto,
  UserDto,
  ResendVerificationDto,
} from '@app/shared/dto';
import type {
  RequestWithGoogleUser,
  RequestWithUser,
  BaseResponse,
} from '@app/shared/type';
import { JwtAuthGuard, handleRpcError } from '@app/shared';
import { GoogleAuthGuard } from '@app/shared';

@ApiTags('auth')
@Controller('auth')
export class AuthController {
  constructor(
    @Inject('IDENTITY_SERVICE') private readonly identityClient: ClientProxy,
  ) {}

  @ApiOperation({ summary: 'Register a new user - sends verification email' })
  @Post('signup')
  async signUp(@Body() dto: SignUpDto) {
    try {
      return await firstValueFrom(
        this.identityClient.send<BaseResponse<{ email: string }>>(
          { cmd: 'auth_signup' },
          dto,
        ),
      );
    } catch (error) {
      handleRpcError(error);
    }
  }

  @ApiOperation({ summary: 'Sign in with email and password' })
  @Post('signin')
  async signIn(@Body() dto: SignInDto) {
    try {
      return await firstValueFrom(
        this.identityClient.send<
          BaseResponse<{ accessToken: string; user: UserDto }>
        >({ cmd: 'auth_signin' }, dto),
      );
    } catch (error) {
      handleRpcError(error);
    }
  }

  @ApiOperation({ summary: 'Verify email with token' })
  @ApiQuery({ name: 'token', description: 'Verification token from email' })
  @Get('verify-email')
  async verifyEmail(@Query('token') token: string) {
    try {
      return await firstValueFrom(
        this.identityClient.send<
          BaseResponse<{ email: string; alreadyVerified: boolean }>
        >({ cmd: 'auth_verify_email' }, token),
      );
    } catch (error) {
      handleRpcError(error);
    }
  }

  @ApiOperation({ summary: 'Resend verification email' })
  @Post('resend-verification')
  @ApiBody({ type: ResendVerificationDto })
  async resendVerification(@Body('email') email: string) {
    try {
      return await firstValueFrom(
        this.identityClient.send<BaseResponse<null>>(
          { cmd: 'auth_resend_verification' },
          email,
        ),
      );
    } catch (error) {
      handleRpcError(error);
    }
  }

  @ApiOperation({ summary: 'Request password reset - sends reset email' })
  @Post('forgot-password')
  async forgotPassword(@Body() dto: ForgotPasswordDto) {
    try {
      return await firstValueFrom(
        this.identityClient.send<BaseResponse<null>>(
          { cmd: 'auth_forgot_password' },
          dto.email,
        ),
      );
    } catch (error) {
      handleRpcError(error);
    }
  }

  @ApiOperation({ summary: 'Reset password with token' })
  @Post('reset-password')
  async resetPassword(@Body() dto: ResetPasswordDto) {
    try {
      return await firstValueFrom(
        this.identityClient.send<BaseResponse<null>>(
          { cmd: 'auth_reset_password' },
          dto,
        ),
      );
    } catch (error) {
      handleRpcError(error);
    }
  }

  @ApiOperation({ summary: 'Initiate Google OAuth login' })
  @Get('google')
  @UseGuards(GoogleAuthGuard)
  googleAuth(): void {
    return;
  }

  @ApiOperation({ summary: 'Google OAuth callback' })
  @Get('google/callback')
  @UseGuards(GoogleAuthGuard)
  async googleAuthCallback(
    @Req() req: RequestWithGoogleUser,
    @Res() res: Response,
  ) {
    const frontendUrl = process.env.FRONTEND_URL || 'http://localhost:5173';
    try {
      const response = await firstValueFrom(
        this.identityClient.send<
          BaseResponse<{ accessToken: string; user: UserDto }>
        >({ cmd: 'auth_google_login' }, req.user),
      );

      // eslint-disable-next-line @typescript-eslint/no-unsafe-assignment
      const token =
        // eslint-disable-next-line @typescript-eslint/no-unsafe-member-access
        (response as any).accessToken ||
        (response.data && response.data.accessToken);

      return res.redirect(`${frontendUrl}/auth-success?token=${token}`);
    } catch (error) {
      console.error('Google callback error:', error);
      return res.redirect(`${frontendUrl}/login?error=auth_failed`);
    }
  }

  @ApiOperation({ summary: 'Get current user info' })
  @Get('me')
  @UseGuards(JwtAuthGuard)
  @ApiBearerAuth('JWT-auth')
  async getCurrentUser(@Req() req: RequestWithUser) {
    try {
      return await firstValueFrom(
        this.identityClient.send<BaseResponse<UserDto>>(
          { cmd: 'auth_get_user_by_id' },
          req.user.userId,
        ),
      );
    } catch (error) {
      handleRpcError(error);
    }
  }

  @ApiOperation({ summary: 'Get user profile' })
  @Get('profile')
  @UseGuards(JwtAuthGuard)
  @ApiBearerAuth('JWT-auth')
  async getProfile(@Req() req: RequestWithUser) {
    try {
      return await firstValueFrom(
        this.identityClient.send<BaseResponse<UserDto>>(
          { cmd: 'auth_get_user_by_id' },
          req.user.userId,
        ),
      );
    } catch (error) {
      handleRpcError(error);
    }
  }

  @ApiOperation({ summary: 'Update user profile' })
  @Patch('profile')
  @UseGuards(JwtAuthGuard)
  @ApiBearerAuth('JWT-auth')
  async updateProfile(
    @Req() req: RequestWithUser,
    @Body() dto: UpdateProfileDto,
  ) {
    try {
      return await firstValueFrom(
        this.identityClient.send<BaseResponse<UserDto>>(
          { cmd: 'auth_update_profile' },
          { userId: req.user.userId, dto },
        ),
      );
    } catch (error) {
      handleRpcError(error);
    }
  }
}
