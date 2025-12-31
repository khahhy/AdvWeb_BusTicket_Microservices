/* eslint-disable @typescript-eslint/unbound-method */
/* eslint-disable @typescript-eslint/no-unsafe-call */
/* eslint-disable @typescript-eslint/no-unsafe-assignment */
import { Test, TestingModule } from '@nestjs/testing';
import { AuthController } from './auth.controller';
import { AuthService } from './auth.service';
import { SignUpDto } from '../../../../libs/shared/src/dto/auth/signup.dto';
import { SignInDto } from '../../../../libs/shared/src/dto/auth/signin.dto';
import { ForgotPasswordDto } from '../../../../libs/shared/src/dto/auth/forgot-password.dto';
import { ResetPasswordDto } from '../../../../libs/shared/src/dto/auth/reset-password.dto';
import { UpdateProfileDto } from '../../../../libs/shared/src/dto/auth/update-profile.dto';

describe('AuthController', () => {
  let controller: AuthController;
  let authService: AuthService;

  const mockAuthService = {
    signUp: jest.fn(),
    signIn: jest.fn(),
    verifyEmail: jest.fn(),
    resendVerificationEmail: jest.fn(),
    forgotPassword: jest.fn(),
    resetPassword: jest.fn(),
    googleLogin: jest.fn(),
    getUserById: jest.fn(),
    updateProfile: jest.fn(),
  };

  beforeEach(async () => {
    const module: TestingModule = await Test.createTestingModule({
      controllers: [AuthController],
      providers: [
        {
          provide: AuthService,
          useValue: mockAuthService,
        },
      ],
    }).compile();

    controller = module.get<AuthController>(AuthController);
    authService = module.get<AuthService>(AuthService);

    // Clear all mocks before each test
    jest.clearAllMocks();
  });

  it('should be defined', () => {
    expect(controller).toBeDefined();
  });

  describe('signUp', () => {
    it('should call authService.signUp with correct parameters', async () => {
      const signUpDto: SignUpDto = {
        email: 'test@example.com',
        fullName: 'Test User',
        phoneNumber: '1234567890',
        password: 'password123',
      };

      const expectedResult = {
        message:
          'Registration successful. Please check your email to verify your account.',
        email: signUpDto.email,
      };

      mockAuthService.signUp.mockResolvedValue(expectedResult);

      const result = await controller.signUp(signUpDto);

      expect(authService.signUp).toHaveBeenCalledWith(signUpDto);
      expect(authService.signUp).toHaveBeenCalledTimes(1);
      expect(result).toEqual(expectedResult);
    });
  });

  describe('signIn', () => {
    it('should call authService.signIn with correct parameters', async () => {
      const signInDto: SignInDto = {
        email: 'test@example.com',
        password: 'password123',
      };

      const expectedResult = {
        message: 'Sign in successful',
        accessToken: 'jwt-token-123',
        user: {
          id: '1',
          email: signInDto.email,
          fullName: 'Test User',
          phoneNumber: '1234567890',
          role: 'passenger',
          status: 'active',
        },
      };

      mockAuthService.signIn.mockResolvedValue(expectedResult);

      const result = await controller.signIn(signInDto);

      expect(authService.signIn).toHaveBeenCalledWith(signInDto);
      expect(authService.signIn).toHaveBeenCalledTimes(1);
      expect(result).toEqual(expectedResult);
    });
  });

  describe('verifyEmail', () => {
    it('should call authService.verifyEmail with correct token', async () => {
      const token = 'verification-token-123';
      const expectedResult = {
        message: 'Email verified successfully. Your account is now active.',
        email: 'test@example.com',
        alreadyVerified: false,
      };

      mockAuthService.verifyEmail.mockResolvedValue(expectedResult);

      const result = await controller.verifyEmail(token);

      expect(authService.verifyEmail).toHaveBeenCalledWith(token);
      expect(authService.verifyEmail).toHaveBeenCalledTimes(1);
      expect(result).toEqual(expectedResult);
    });
  });

  describe('resendVerification', () => {
    it('should call authService.resendVerificationEmail with correct email', async () => {
      const email = 'test@example.com';
      const expectedResult = {
        message:
          'Verification email sent successfully. Please check your inbox.',
      };

      mockAuthService.resendVerificationEmail.mockResolvedValue(expectedResult);

      const result = await controller.resendVerification(email);

      expect(authService.resendVerificationEmail).toHaveBeenCalledWith(email);
      expect(authService.resendVerificationEmail).toHaveBeenCalledTimes(1);
      expect(result).toEqual(expectedResult);
    });
  });

  describe('forgotPassword', () => {
    it('should call authService.forgotPassword with correct email', async () => {
      const forgotPasswordDto: ForgotPasswordDto = {
        email: 'test@example.com',
      };

      const expectedResult = {
        message:
          'If an account with that email exists, a password reset link has been sent.',
      };

      mockAuthService.forgotPassword.mockResolvedValue(expectedResult);

      const result = await controller.forgotPassword(forgotPasswordDto);

      expect(authService.forgotPassword).toHaveBeenCalledWith(
        forgotPasswordDto.email,
      );
      expect(authService.forgotPassword).toHaveBeenCalledTimes(1);
      expect(result).toEqual(expectedResult);
    });
  });

  describe('resetPassword', () => {
    it('should call authService.resetPassword with correct parameters', async () => {
      const resetPasswordDto: ResetPasswordDto = {
        token: 'reset-token-123',
        newPassword: 'newPassword123',
      };

      const expectedResult = {
        message:
          'Password reset successfully. You can now sign in with your new password.',
      };

      mockAuthService.resetPassword.mockResolvedValue(expectedResult);

      const result = await controller.resetPassword(resetPasswordDto);

      expect(authService.resetPassword).toHaveBeenCalledWith(
        resetPasswordDto.token,
        resetPasswordDto.newPassword,
      );
      expect(authService.resetPassword).toHaveBeenCalledTimes(1);
      expect(result).toEqual(expectedResult);
    });
  });

  describe('googleAuthCallback', () => {
    it('should handle Google OAuth callback and redirect with token', async () => {
      const mockReq = {
        user: {
          email: 'test@example.com',
          fullName: 'Test User',
          providerId: 'google-123',
          authProvider: 'google',
        },
      };

      const mockRes = {
        redirect: jest.fn(),
      };

      const expectedAuthResult = {
        accessToken: 'google-jwt-token',
        user: {
          id: '1',
          email: 'test@example.com',
          fullName: 'Test User',
          phoneNumber: null,
          role: 'passenger',
          status: 'active',
        },
      };

      mockAuthService.googleLogin.mockResolvedValue(expectedAuthResult);

      await controller.googleAuthCallback(mockReq, mockRes);

      expect(authService.googleLogin).toHaveBeenCalledWith(mockReq.user);
      expect(mockRes.redirect).toHaveBeenCalledWith(
        `${process.env.FRONTEND_URL}/auth-success?token=${expectedAuthResult.accessToken}`,
      );
    });
  });

  describe('getCurrentUser', () => {
    it('should return current user info', async () => {
      const mockReq = {
        user: {
          userId: '1',
          email: 'test@example.com',
          role: 'passenger',
        },
      };

      const expectedResult = {
        id: '1',
        email: 'test@example.com',
        fullName: 'Test User',
        phoneNumber: '1234567890',
        role: 'passenger',
        status: 'active',
        emailVerified: true,
        authProvider: 'local',
        createdAt: new Date(),
      };

      mockAuthService.getUserById.mockResolvedValue(expectedResult);

      const result = await controller.getCurrentUser(mockReq);

      expect(authService.getUserById).toHaveBeenCalledWith(mockReq.user.userId);
      expect(result).toEqual(expectedResult);
    });
  });

  describe('getProfile', () => {
    it('should return user profile', async () => {
      const mockReq = {
        user: {
          userId: '1',
          email: 'test@example.com',
          role: 'passenger',
        },
      };

      const expectedResult = {
        id: '1',
        email: 'test@example.com',
        fullName: 'Test User',
        phoneNumber: '1234567890',
        role: 'passenger',
        status: 'active',
        emailVerified: true,
        authProvider: 'local',
        createdAt: new Date(),
      };

      mockAuthService.getUserById.mockResolvedValue(expectedResult);

      const result = await controller.getProfile(mockReq);

      expect(authService.getUserById).toHaveBeenCalledWith(mockReq.user.userId);
      expect(result).toEqual(expectedResult);
    });
  });

  describe('updateProfile', () => {
    it('should update user profile', async () => {
      const mockReq = {
        user: {
          userId: '1',
          email: 'test@example.com',
          role: 'passenger',
        },
      };

      const updateProfileDto: UpdateProfileDto = {
        fullName: 'Updated Name',
        phoneNumber: '9876543210',
      };

      const expectedResult = {
        id: '1',
        email: 'test@example.com',
        fullName: 'Updated Name',
        phoneNumber: '9876543210',
        role: 'passenger',
        status: 'active',
        emailVerified: true,
        authProvider: 'local',
        createdAt: new Date(),
      };

      mockAuthService.updateProfile.mockResolvedValue(expectedResult);

      const result = await controller.updateProfile(mockReq, updateProfileDto);

      expect(authService.updateProfile).toHaveBeenCalledWith(
        mockReq.user.userId,
        updateProfileDto,
      );
      expect(result).toEqual(expectedResult);
    });
  });
});
