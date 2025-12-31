import { Test, TestingModule } from '@nestjs/testing';
import { EmailService } from './email.service';

describe('EmailService', () => {
  let service: EmailService;

  beforeEach(async () => {
    const module: TestingModule = await Test.createTestingModule({
      providers: [EmailService],
    }).compile();

    service = module.get<EmailService>(EmailService);
  });

  it('should be defined', () => {
    expect(service).toBeDefined();
  });

  describe('sendVerificationEmail', () => {
    it('should send verification email', async () => {
      const email = 'test@example.com';
      const token = 'verification-token-123';

      // Mock the transporter sendMail method
      const sendMailSpy = jest
        .spyOn(service['transporter'], 'sendMail')
        .mockResolvedValue({
          accepted: [email],
          rejected: [],
          response: '250 OK',
        } as any);

      await service.sendVerificationEmail(email, token);

      expect(sendMailSpy).toHaveBeenCalled();
      const callArgs = sendMailSpy.mock.calls[0][0];
      expect(callArgs.to).toBe(email);
      expect(callArgs.subject).toContain('Verify');
      expect(callArgs.html).toContain(token);
    });
  });

  describe('sendPasswordResetEmail', () => {
    it('should send password reset email', async () => {
      const email = 'test@example.com';
      const token = 'reset-token-123';

      const sendMailSpy = jest
        .spyOn(service['transporter'], 'sendMail')
        .mockResolvedValue({
          accepted: [email],
          rejected: [],
          response: '250 OK',
        } as any);

      await service.sendPasswordResetEmail(email, token);

      expect(sendMailSpy).toHaveBeenCalled();
      const callArgs = sendMailSpy.mock.calls[0][0];
      expect(callArgs.to).toBe(email);
      expect(callArgs.subject).toContain('Reset');
      expect(callArgs.html).toContain(token);
    });
  });

  describe('sendBookingConfirmation', () => {
    it('should send booking confirmation email', async () => {
      const email = 'test@example.com';
      const bookingDetails = {
        bookingCode: 'BK123456',
        passengerName: 'John Doe',
        tripFrom: 'Hà Nội',
        tripTo: 'Sài Gòn',
        departureTime: '08:00',
        seatNumber: 'A1',
        totalPrice: 100000,
      };

      const sendMailSpy = jest
        .spyOn(service['transporter'], 'sendMail')
        .mockResolvedValue({
          accepted: [email],
          rejected: [],
          response: '250 OK',
        } as any);

      await service.sendBookingConfirmation(email, bookingDetails);

      expect(sendMailSpy).toHaveBeenCalled();
      const callArgs = sendMailSpy.mock.calls[0][0];
      expect(callArgs.to).toBe(email);
      expect(callArgs.subject).toContain('Confirmation');
      expect(callArgs.html).toContain(bookingDetails.bookingCode);
    });
  });

  describe('sendBookingCancellation', () => {
    it('should send booking cancellation email', async () => {
      const email = 'test@example.com';
      const bookingCode = 'BK123456';

      const sendMailSpy = jest
        .spyOn(service['transporter'], 'sendMail')
        .mockResolvedValue({
          accepted: [email],
          rejected: [],
          response: '250 OK',
        } as any);

      await service.sendBookingCancellation(email, bookingCode);

      expect(sendMailSpy).toHaveBeenCalled();
      const callArgs = sendMailSpy.mock.calls[0][0];
      expect(callArgs.to).toBe(email);
      expect(callArgs.subject).toContain('Cancellation');
      expect(callArgs.html).toContain(bookingCode);
    });
  });
});
