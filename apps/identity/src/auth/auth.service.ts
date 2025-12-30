import {
  Inject,
  Injectable,
  BadRequestException,
  NotFoundException,
  UnauthorizedException,
} from '@nestjs/common';
import { JwtService } from '@nestjs/jwt';
import { PrismaService } from '../prisma/prisma.service';
import { SignUpDto } from '@app/shared';
import { SignInDto } from '@app/shared';
import { UpdateProfileDto } from '@app/shared';
import { hash, compare } from 'bcrypt';
import { randomBytes } from 'crypto';
import type { GoogleUserPayload } from '@app/shared';
import { ClientProxy } from '@nestjs/microservices';
import { lastValueFrom } from 'rxjs';

@Injectable()
export class AuthService {
  constructor(
    private readonly prisma: PrismaService,
    private readonly jwtService: JwtService,
    @Inject('SUPPORT_SERVICE') private readonly supportClient: ClientProxy,
  ) {}

  async signUp(dto: SignUpDto) {
    console.log(dto);
    const existingUser = await this.prisma.users.findUnique({
      where: { email: dto.email },
    });
    if (existingUser) {
      throw new BadRequestException('Email already registered');
    }

    if (!dto.password) {
      throw new BadRequestException('Password is required');
    }

    const hashedPassword = await hash(dto.password, 10);

    // Generate verification token
    const verificationToken = randomBytes(32).toString('hex');

    // Token expires in 24 hours
    const tokenExpiresAt = new Date();
    tokenExpiresAt.setHours(tokenExpiresAt.getHours() + 24);

    const user = await this.prisma.users.create({
      data: {
        fullName: dto.fullName,
        email: dto.email,
        phoneNumber: dto.phoneNumber,
        password: hashedPassword,
        role: 'passenger',
        status: 'unverified',
        emailVerified: false,
        verificationToken,
        tokenExpiresAt,
        authProvider: 'local',
      },
    });

    // Send verification email
    try {
      await lastValueFrom(
        this.supportClient.emit('user_created', {
          email: user.email,
          verifyToken: verificationToken,
        }),
      );
    } catch (error) {
      console.error('Error emitting user_created event:', error);
    }

    return {
      message:
        'Registration successful. Please check your email to verify your account.',
      email: user.email,
    };
  }

  async verifyEmail(token: string) {
    // Trim and decode token
    const cleanToken = decodeURIComponent(token.trim());
    console.log('Verifying token:', cleanToken);
    console.log('Token length:', cleanToken.length);

    const user = await this.prisma.users.findUnique({
      where: { verificationToken: cleanToken },
    });

    console.log('User found by token:', user ? `Yes (${user.email})` : 'No');

    if (!user) {
      throw new NotFoundException('Invalid verification token');
    }

    // If already verified, return success (idempotent)
    if (user.emailVerified) {
      console.log('Email already verified, returning success');

      // Clear token after successful re-verification (cleanup)
      if (user.verificationToken) {
        await this.prisma.users.update({
          where: { id: user.id },
          data: {
            verificationToken: null,
            tokenExpiresAt: null,
          },
        });
      }

      return {
        message: 'Email verified successfully. Your account is now active.',
        email: user.email,
        alreadyVerified: true,
      };
    }

    // Check if token expired (only for unverified users)
    if (user.tokenExpiresAt && new Date() > user.tokenExpiresAt) {
      throw new BadRequestException('Verification token has expired');
    }

    console.log('Updating user to verified status...');

    // Update user to verified but keep token for 10 minutes
    // This allows the same verification link to work if user refreshes the page
    const tokenExpiryExtended = new Date(Date.now() + 10 * 60 * 1000); // 10 minutes from now

    await this.prisma.users.update({
      where: { id: user.id },
      data: {
        emailVerified: true,
        status: 'active',
        tokenExpiresAt: tokenExpiryExtended, // Keep token valid for 10 more minutes
      },
    });

    console.log('User verified successfully!');

    return {
      message: 'Email verified successfully. Your account is now active.',
      email: user.email,
      alreadyVerified: false,
    };
  }

  async resendVerificationEmail(email: string) {
    const user = await this.prisma.users.findUnique({
      where: { email },
    });

    if (!user) {
      throw new NotFoundException('User not found');
    }

    if (user.emailVerified) {
      throw new BadRequestException('Email already verified');
    }

    // Generate new verification token
    const verificationToken = randomBytes(32).toString('hex');
    const tokenExpiresAt = new Date();
    tokenExpiresAt.setHours(tokenExpiresAt.getHours() + 24);

    await this.prisma.users.update({
      where: { id: user.id },
      data: {
        verificationToken,
        tokenExpiresAt,
      },
    });

    // Send verification email
    try {
      await lastValueFrom(
        this.supportClient.emit('user_created', {
          email: user.email,
          verifyToken: verificationToken,
        }),
      );
    } catch (error) {
      console.error('Error emitting verification event:', error);
    }

    return {
      message: 'Verification email sent successfully. Please check your inbox.',
    };
  }

  async signIn(dto: SignInDto) {
    // Find user by email
    const user = await this.prisma.users.findUnique({
      where: { email: dto.email },
    });

    if (!user) {
      throw new UnauthorizedException('Invalid email or password');
    }

    // Check if user registered with local auth (not Google)
    if (user.authProvider !== 'local' || !user.password) {
      throw new BadRequestException(
        `This account was registered with ${user.authProvider}. Please use ${user.authProvider} to sign in.`,
      );
    }

    // Check if email is verified (skip for admin users)
    if (!user.emailVerified && user.role !== 'admin') {
      throw new UnauthorizedException(
        'Please verify your email before signing in. Check your inbox for the verification link.',
      );
    }

    // Check if account is active
    if (user.status === 'banned') {
      throw new UnauthorizedException(
        'Your account has been banned. Please contact support.',
      );
    }

    // Verify password
    const isPasswordValid = await compare(dto.password, user.password);
    if (!isPasswordValid) {
      throw new UnauthorizedException('Invalid email or password');
    }

    // Generate JWT token
    const payload = {
      sub: user.id,
      email: user.email,
      role: user.role,
      status: user.status,
    };

    const accessToken = this.jwtService.sign(payload);

    // Return user info and token
    return {
      message: 'Sign in successful',
      accessToken,
      user: {
        id: user.id,
        email: user.email,
        fullName: user.fullName,
        phoneNumber: user.phoneNumber,
        role: user.role,
        status: user.status,
      },
    };
  }

  async forgotPassword(email: string) {
    const user = await this.prisma.users.findUnique({
      where: { email },
    });

    // Don't reveal if user exists or not for security
    if (!user) {
      return {
        message:
          'If an account with that email exists, a password reset link has been sent.',
      };
    }

    // Check if user registered with local auth
    if (user.authProvider !== 'local') {
      throw new BadRequestException(
        `This account was registered with ${user.authProvider}. Please use ${user.authProvider} to sign in.`,
      );
    }

    // Generate reset token
    const resetToken = randomBytes(32).toString('hex');
    const tokenExpiresAt = new Date();
    tokenExpiresAt.setHours(tokenExpiresAt.getHours() + 1); // Token expires in 1 hour

    // Store reset token
    await this.prisma.users.update({
      where: { id: user.id },
      data: {
        resetToken,
        resetTokenExpiresAt: tokenExpiresAt,
      },
    });

    // Send password reset email
    try {
      await lastValueFrom(
        this.supportClient.emit('password_reset_requested', {
          email: user.email,
          resetToken: resetToken,
        }),
      );
    } catch (error) {
      console.error('Error emitting password_reset_requested event:', error);
    }

    return {
      message:
        'If an account with that email exists, a password reset link has been sent.',
    };
  }

  async resetPassword(token: string, newPassword: string) {
    const cleanToken = decodeURIComponent(token.trim());

    const user = await this.prisma.users.findFirst({
      where: { resetToken: cleanToken },
    });

    if (!user) {
      throw new BadRequestException('Invalid or expired reset token');
    }

    // Check if token expired
    if (user.resetTokenExpiresAt && new Date() > user.resetTokenExpiresAt) {
      throw new BadRequestException('Reset token has expired');
    }

    // Hash new password
    const hashedPassword = await hash(newPassword, 10);

    // Update password and clear reset token
    await this.prisma.users.update({
      where: { id: user.id },
      data: {
        password: hashedPassword,
        resetToken: null,
        resetTokenExpiresAt: null,
      },
    });

    return {
      message:
        'Password reset successfully. You can now sign in with your new password.',
    };
  }

  async googleLogin(googleUser: GoogleUserPayload) {
    const { email, fullName, providerId } = googleUser;

    // Check if user exists
    let user = await this.prisma.users.findUnique({
      where: { email },
    });

    if (user) {
      // If user exists but registered with different provider
      if (user.authProvider !== 'google' && user.authProvider !== 'firebase') {
        throw new BadRequestException(
          `This email is already registered with ${user.authProvider}. Please sign in with ${user.authProvider}.`,
        );
      }

      // Update user info if needed
      if (!user.providerId || user.providerId !== providerId) {
        user = await this.prisma.users.update({
          where: { id: user.id },
          data: {
            providerId,
            authProvider: 'google',
            fullName: fullName || user.fullName,
            emailVerified: true,
            status: 'active',
          },
        });
      }
    } else {
      // Create new user
      user = await this.prisma.users.create({
        data: {
          email,
          fullName,
          providerId,
          authProvider: 'google',
          role: 'passenger',
          status: 'active',
          emailVerified: true,
        },
      });
    }

    // Generate JWT token
    const payload = {
      sub: user.id,
      email: user.email,
      role: user.role,
      status: user.status,
    };

    const accessToken = this.jwtService.sign(payload);

    return {
      accessToken,
      user: {
        id: user.id,
        email: user.email,
        fullName: user.fullName,
        phoneNumber: user.phoneNumber,
        role: user.role,
        status: user.status,
      },
    };
  }

  async getUserById(userId: string) {
    const user = await this.prisma.users.findUnique({
      where: { id: userId },
      select: {
        id: true,
        email: true,
        fullName: true,
        phoneNumber: true,
        role: true,
        status: true,
        emailVerified: true,
        authProvider: true,
        createdAt: true,
      },
    });

    if (!user) {
      throw new NotFoundException('User not found');
    }

    return user;
  }

  async updateProfile(userId: string, updateData: UpdateProfileDto) {
    // Check if user exists
    const existingUser = await this.prisma.users.findUnique({
      where: { id: userId },
    });

    if (!existingUser) {
      throw new NotFoundException('User not found');
    }

    // If phone number is being updated, check if it's already taken by another user
    if (updateData.phoneNumber) {
      const phoneExists = await this.prisma.users.findFirst({
        where: {
          phoneNumber: updateData.phoneNumber,
          id: { not: userId }, // Exclude current user
        },
      });

      if (phoneExists) {
        throw new BadRequestException('Phone number is already in use');
      }
    }

    // Update the user
    const updatedUser = await this.prisma.users.update({
      where: { id: userId },
      data: updateData,
      select: {
        id: true,
        email: true,
        fullName: true,
        phoneNumber: true,
        role: true,
        status: true,
        emailVerified: true,
        authProvider: true,
        createdAt: true,
      },
    });

    return updatedUser;
  }
}
