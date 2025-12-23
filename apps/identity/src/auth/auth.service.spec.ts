import { Test, TestingModule } from '@nestjs/testing';
import { AuthService } from './auth.service';
import { PrismaService } from '../prisma/prisma.service';
import { EmailService } from '../email/email.service';
import { JwtService } from '@nestjs/jwt';
import {
  BadRequestException,
  NotFoundException,
  UnauthorizedException,
} from '@nestjs/common';
import * as bcrypt from 'bcrypt';

// Mock bcrypt
jest.mock('bcrypt');

describe('AuthService', () => {
  let service: AuthService;
  let prismaService: PrismaService;
  let emailService: EmailService;
  let jwtService: JwtService;

  const mockPrismaService = {
    users: {
      findUnique: jest.fn(),
      findFirst: jest.fn(),
      create: jest.fn(),
      update: jest.fn(),
    },
  };

  const mockEmailService = {
    sendVerificationEmail: jest.fn(),
    sendPasswordResetEmail: jest.fn(),
  };

  const mockJwtService = {
    sign: jest.fn(),
  };

  beforeEach(async () => {
    const module: TestingModule = await Test.createTestingModule({
      providers: [
        AuthService,
        {
          provide: PrismaService,
          useValue: mockPrismaService,
        },
        {
          provide: EmailService,
          useValue: mockEmailService,
        },
        {
          provide: JwtService,
          useValue: mockJwtService,
        },
      ],
    }).compile();

    service = module.get<AuthService>(AuthService);
    prismaService = module.get<PrismaService>(PrismaService);
    emailService = module.get<EmailService>(EmailService);
    jwtService = module.get<JwtService>(JwtService);

    // Clear all mocks before each test
    jest.clearAllMocks();
  });

  it('should be defined', () => {
    expect(service).toBeDefined();
  });

  describe('signUp', () => {
    const signUpDto = {
      email: 'test@example.com',
      fullName: 'Test User',
      phoneNumber: '1234567890',
      password: 'password123',
    };

    it('should create a new user successfully', async () => {
      const hashedPassword = 'hashedPassword123';
      (bcrypt.hash as jest.Mock).mockResolvedValue(hashedPassword);

      mockPrismaService.users.findUnique.mockResolvedValue(null);
      mockPrismaService.users.create.mockResolvedValue({
        id: '1',
        email: signUpDto.email,
        fullName: signUpDto.fullName,
        phoneNumber: signUpDto.phoneNumber,
        password: hashedPassword,
        role: 'passenger',
        status: 'unverified',
        emailVerified: false,
        verificationToken: 'token123',
        tokenExpiresAt: new Date(),
        authProvider: 'local',
      });

      mockEmailService.sendVerificationEmail.mockResolvedValue(undefined);

      const result = await service.signUp(signUpDto);

      expect(result).toEqual({
        message:
          'Registration successful. Please check your email to verify your account.',
        email: signUpDto.email,
      });
      expect(mockPrismaService.users.findUnique).toHaveBeenCalledWith({
        where: { email: signUpDto.email },
      });
      expect(bcrypt.hash).toHaveBeenCalledWith(signUpDto.password, 10);
      expect(mockPrismaService.users.create).toHaveBeenCalled();
      expect(mockEmailService.sendVerificationEmail).toHaveBeenCalled();
    });

    it('should throw BadRequestException if email already exists', async () => {
      mockPrismaService.users.findUnique.mockResolvedValue({
        id: '1',
        email: signUpDto.email,
      });

      await expect(service.signUp(signUpDto)).rejects.toThrow(
        BadRequestException,
      );
      await expect(service.signUp(signUpDto)).rejects.toThrow(
        'Email already registered',
      );
    });

    it('should throw BadRequestException if password is missing', async () => {
      mockPrismaService.users.findUnique.mockResolvedValue(null);

      const dtoWithoutPassword = { ...signUpDto, password: '' };

      await expect(service.signUp(dtoWithoutPassword)).rejects.toThrow(
        BadRequestException,
      );
      await expect(service.signUp(dtoWithoutPassword)).rejects.toThrow(
        'Password is required',
      );
    });

    it('should still create user even if email sending fails', async () => {
      const hashedPassword = 'hashedPassword123';
      (bcrypt.hash as jest.Mock).mockResolvedValue(hashedPassword);

      mockPrismaService.users.findUnique.mockResolvedValue(null);
      mockPrismaService.users.create.mockResolvedValue({
        id: '1',
        email: signUpDto.email,
        fullName: signUpDto.fullName,
        phoneNumber: signUpDto.phoneNumber,
        password: hashedPassword,
        role: 'passenger',
        status: 'unverified',
        emailVerified: false,
        verificationToken: 'token123',
        tokenExpiresAt: new Date(),
        authProvider: 'local',
      });

      mockEmailService.sendVerificationEmail.mockRejectedValue(
        new Error('Email service error'),
      );

      const result = await service.signUp(signUpDto);

      expect(result).toEqual({
        message:
          'Registration successful. Please check your email to verify your account.',
        email: signUpDto.email,
      });
    });
  });

  describe('signIn', () => {
    const signInDto = {
      email: 'test@example.com',
      password: 'password123',
    };

    const mockUser = {
      id: '1',
      email: signInDto.email,
      fullName: 'Test User',
      phoneNumber: '1234567890',
      password: 'hashedPassword123',
      role: 'passenger',
      status: 'active',
      emailVerified: true,
      authProvider: 'local',
    };

    it('should sign in user successfully', async () => {
      mockPrismaService.users.findUnique.mockResolvedValue(mockUser);
      (bcrypt.compare as jest.Mock).mockResolvedValue(true);
      mockJwtService.sign.mockReturnValue('jwt-token-123');

      const result = await service.signIn(signInDto);

      expect(result).toEqual({
        message: 'Sign in successful',
        accessToken: 'jwt-token-123',
        user: {
          id: mockUser.id,
          email: mockUser.email,
          fullName: mockUser.fullName,
          phoneNumber: mockUser.phoneNumber,
          role: mockUser.role,
          status: mockUser.status,
        },
      });
      expect(mockPrismaService.users.findUnique).toHaveBeenCalledWith({
        where: { email: signInDto.email },
      });
      expect(bcrypt.compare).toHaveBeenCalledWith(
        signInDto.password,
        mockUser.password,
      );
      expect(mockJwtService.sign).toHaveBeenCalledWith({
        sub: mockUser.id,
        email: mockUser.email,
        role: mockUser.role,
      });
    });

    it('should throw UnauthorizedException if user not found', async () => {
      mockPrismaService.users.findUnique.mockResolvedValue(null);

      await expect(service.signIn(signInDto)).rejects.toThrow(
        UnauthorizedException,
      );
      await expect(service.signIn(signInDto)).rejects.toThrow(
        'Invalid email or password',
      );
    });

    it('should throw BadRequestException if user registered with OAuth', async () => {
      const googleUser = {
        ...mockUser,
        authProvider: 'google',
        password: null,
      };
      mockPrismaService.users.findUnique.mockResolvedValue(googleUser);

      await expect(service.signIn(signInDto)).rejects.toThrow(
        BadRequestException,
      );
      await expect(service.signIn(signInDto)).rejects.toThrow(
        'This account was registered with google',
      );
    });

    it('should throw UnauthorizedException if email not verified', async () => {
      const unverifiedUser = { ...mockUser, emailVerified: false };
      mockPrismaService.users.findUnique.mockResolvedValue(unverifiedUser);

      await expect(service.signIn(signInDto)).rejects.toThrow(
        UnauthorizedException,
      );
      await expect(service.signIn(signInDto)).rejects.toThrow(
        'Please verify your email',
      );
    });

    it('should throw UnauthorizedException if account is banned', async () => {
      const bannedUser = { ...mockUser, status: 'banned' };
      mockPrismaService.users.findUnique.mockResolvedValue(bannedUser);

      await expect(service.signIn(signInDto)).rejects.toThrow(
        UnauthorizedException,
      );
      await expect(service.signIn(signInDto)).rejects.toThrow(
        'Your account has been banned',
      );
    });

    it('should throw UnauthorizedException if password is invalid', async () => {
      mockPrismaService.users.findUnique.mockResolvedValue(mockUser);
      (bcrypt.compare as jest.Mock).mockResolvedValue(false);

      await expect(service.signIn(signInDto)).rejects.toThrow(
        UnauthorizedException,
      );
      await expect(service.signIn(signInDto)).rejects.toThrow(
        'Invalid email or password',
      );
    });

    it('should allow admin to sign in without email verification', async () => {
      const adminUser = {
        ...mockUser,
        role: 'admin',
        emailVerified: false,
      };
      mockPrismaService.users.findUnique.mockResolvedValue(adminUser);
      (bcrypt.compare as jest.Mock).mockResolvedValue(true);
      mockJwtService.sign.mockReturnValue('jwt-token-admin');

      const result = await service.signIn(signInDto);

      expect(result.accessToken).toBe('jwt-token-admin');
      expect(result.user.role).toBe('admin');
    });
  });

  describe('verifyEmail', () => {
    const verificationToken = 'valid-token-123';

    it('should verify email successfully', async () => {
      const mockUser = {
        id: '1',
        email: 'test@example.com',
        emailVerified: false,
        verificationToken,
        tokenExpiresAt: new Date(Date.now() + 24 * 60 * 60 * 1000), // 24 hours from now
      };

      mockPrismaService.users.findUnique.mockResolvedValue(mockUser);
      mockPrismaService.users.update.mockResolvedValue({
        ...mockUser,
        emailVerified: true,
        status: 'active',
      });

      const result = await service.verifyEmail(verificationToken);

      expect(result).toEqual({
        message: 'Email verified successfully. Your account is now active.',
        email: mockUser.email,
        alreadyVerified: false,
      });
      expect(mockPrismaService.users.update).toHaveBeenCalledWith({
        where: { id: mockUser.id },
        data: expect.objectContaining({
          emailVerified: true,
          status: 'active',
        }),
      });
    });

    it('should return success if email already verified', async () => {
      const mockUser = {
        id: '1',
        email: 'test@example.com',
        emailVerified: true,
        verificationToken,
        tokenExpiresAt: new Date(Date.now() + 24 * 60 * 60 * 1000),
      };

      mockPrismaService.users.findUnique.mockResolvedValue(mockUser);
      mockPrismaService.users.update.mockResolvedValue(mockUser);

      const result = await service.verifyEmail(verificationToken);

      expect(result).toEqual({
        message: 'Email verified successfully. Your account is now active.',
        email: mockUser.email,
        alreadyVerified: true,
      });
    });

    it('should throw NotFoundException if token is invalid', async () => {
      mockPrismaService.users.findUnique.mockResolvedValue(null);

      await expect(service.verifyEmail('invalid-token')).rejects.toThrow(
        NotFoundException,
      );
      await expect(service.verifyEmail('invalid-token')).rejects.toThrow(
        'Invalid verification token',
      );
    });

    it('should throw BadRequestException if token is expired', async () => {
      const mockUser = {
        id: '1',
        email: 'test@example.com',
        emailVerified: false,
        verificationToken,
        tokenExpiresAt: new Date(Date.now() - 1000), // Expired
      };

      mockPrismaService.users.findUnique.mockResolvedValue(mockUser);

      await expect(service.verifyEmail(verificationToken)).rejects.toThrow(
        BadRequestException,
      );
      await expect(service.verifyEmail(verificationToken)).rejects.toThrow(
        'Verification token has expired',
      );
    });
  });

  describe('forgotPassword', () => {
    const email = 'test@example.com';

    it('should send password reset email successfully', async () => {
      const mockUser = {
        id: '1',
        email,
        authProvider: 'local',
      };

      mockPrismaService.users.findUnique.mockResolvedValue(mockUser);
      mockPrismaService.users.update.mockResolvedValue({
        ...mockUser,
        resetToken: 'reset-token-123',
        resetTokenExpiresAt: new Date(),
      });
      mockEmailService.sendPasswordResetEmail.mockResolvedValue(undefined);

      const result = await service.forgotPassword(email);

      expect(result).toEqual({
        message:
          'If an account with that email exists, a password reset link has been sent.',
      });
      expect(mockPrismaService.users.update).toHaveBeenCalled();
      expect(mockEmailService.sendPasswordResetEmail).toHaveBeenCalled();
    });

    it('should return success message even if user not found', async () => {
      mockPrismaService.users.findUnique.mockResolvedValue(null);

      const result = await service.forgotPassword(email);

      expect(result).toEqual({
        message:
          'If an account with that email exists, a password reset link has been sent.',
      });
      expect(mockPrismaService.users.update).not.toHaveBeenCalled();
      expect(mockEmailService.sendPasswordResetEmail).not.toHaveBeenCalled();
    });

    it('should throw BadRequestException if user registered with OAuth', async () => {
      const googleUser = {
        id: '1',
        email,
        authProvider: 'google',
      };

      mockPrismaService.users.findUnique.mockResolvedValue(googleUser);

      await expect(service.forgotPassword(email)).rejects.toThrow(
        BadRequestException,
      );
      await expect(service.forgotPassword(email)).rejects.toThrow(
        'This account was registered with google',
      );
    });
  });

  describe('resetPassword', () => {
    const resetToken = 'valid-reset-token';
    const newPassword = 'newPassword123';

    it('should reset password successfully', async () => {
      const mockUser = {
        id: '1',
        email: 'test@example.com',
        resetToken,
        resetTokenExpiresAt: new Date(Date.now() + 60 * 60 * 1000), // 1 hour from now
      };

      const hashedPassword = 'hashedNewPassword';
      (bcrypt.hash as jest.Mock).mockResolvedValue(hashedPassword);

      mockPrismaService.users.findFirst.mockResolvedValue(mockUser);
      mockPrismaService.users.update.mockResolvedValue({
        ...mockUser,
        password: hashedPassword,
        resetToken: null,
        resetTokenExpiresAt: null,
      });

      const result = await service.resetPassword(resetToken, newPassword);

      expect(result).toEqual({
        message:
          'Password reset successfully. You can now sign in with your new password.',
      });
      expect(bcrypt.hash).toHaveBeenCalledWith(newPassword, 10);
      expect(mockPrismaService.users.update).toHaveBeenCalledWith({
        where: { id: mockUser.id },
        data: {
          password: hashedPassword,
          resetToken: null,
          resetTokenExpiresAt: null,
        },
      });
    });

    it('should throw BadRequestException if token is invalid', async () => {
      mockPrismaService.users.findFirst.mockResolvedValue(null);

      await expect(
        service.resetPassword('invalid-token', newPassword),
      ).rejects.toThrow(BadRequestException);
      await expect(
        service.resetPassword('invalid-token', newPassword),
      ).rejects.toThrow('Invalid or expired reset token');
    });

    it('should throw BadRequestException if token is expired', async () => {
      const mockUser = {
        id: '1',
        email: 'test@example.com',
        resetToken,
        resetTokenExpiresAt: new Date(Date.now() - 1000), // Expired
      };

      mockPrismaService.users.findFirst.mockResolvedValue(mockUser);

      await expect(
        service.resetPassword(resetToken, newPassword),
      ).rejects.toThrow(BadRequestException);
      await expect(
        service.resetPassword(resetToken, newPassword),
      ).rejects.toThrow('Reset token has expired');
    });
  });

  describe('getUserById', () => {
    const userId = '1';

    it('should return user by id', async () => {
      const mockUser = {
        id: userId,
        email: 'test@example.com',
        fullName: 'Test User',
        phoneNumber: '1234567890',
        role: 'passenger',
        status: 'active',
        emailVerified: true,
        authProvider: 'local',
        createdAt: new Date(),
      };

      mockPrismaService.users.findUnique.mockResolvedValue(mockUser);

      const result = await service.getUserById(userId);

      expect(result).toEqual(mockUser);
      expect(mockPrismaService.users.findUnique).toHaveBeenCalledWith({
        where: { id: userId },
        select: expect.any(Object),
      });
    });

    it('should throw NotFoundException if user not found', async () => {
      mockPrismaService.users.findUnique.mockResolvedValue(null);

      await expect(service.getUserById('invalid-id')).rejects.toThrow(
        NotFoundException,
      );
      await expect(service.getUserById('invalid-id')).rejects.toThrow(
        'User not found',
      );
    });
  });

  describe('googleLogin', () => {
    const googleUser = {
      email: 'test@example.com',
      fullName: 'Test User',
      providerId: 'google-123',
      authProvider: 'google',
    };

    it('should create new user for Google login', async () => {
      mockPrismaService.users.findUnique.mockResolvedValue(null);
      mockPrismaService.users.create.mockResolvedValue({
        id: '1',
        email: googleUser.email,
        fullName: googleUser.fullName,
        providerId: googleUser.providerId,
        authProvider: 'google',
        role: 'passenger',
        status: 'active',
        emailVerified: true,
        phoneNumber: null,
      });
      mockJwtService.sign.mockReturnValue('google-jwt-token');

      const result = await service.googleLogin(googleUser);

      expect(result.accessToken).toBe('google-jwt-token');
      expect(result.user.email).toBe(googleUser.email);
      expect(mockPrismaService.users.create).toHaveBeenCalled();
    });

    it('should sign in existing Google user', async () => {
      const existingUser = {
        id: '1',
        email: googleUser.email,
        fullName: googleUser.fullName,
        providerId: googleUser.providerId,
        authProvider: 'google',
        role: 'passenger',
        status: 'active',
        emailVerified: true,
        phoneNumber: '1234567890',
      };

      mockPrismaService.users.findUnique.mockResolvedValue(existingUser);
      mockJwtService.sign.mockReturnValue('google-jwt-token');

      const result = await service.googleLogin(googleUser);

      expect(result.accessToken).toBe('google-jwt-token');
      expect(result.user.email).toBe(googleUser.email);
      expect(mockPrismaService.users.create).not.toHaveBeenCalled();
    });

    it('should throw BadRequestException if email registered with different provider', async () => {
      const localUser = {
        id: '1',
        email: googleUser.email,
        authProvider: 'local',
        password: 'hashedPassword',
      };

      mockPrismaService.users.findUnique.mockResolvedValue(localUser);

      await expect(service.googleLogin(googleUser)).rejects.toThrow(
        BadRequestException,
      );
      await expect(service.googleLogin(googleUser)).rejects.toThrow(
        'This email is already registered with local',
      );
    });
  });
});
