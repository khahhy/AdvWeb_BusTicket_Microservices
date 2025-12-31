import { Test, TestingModule } from '@nestjs/testing';
import { ETicketController } from './eticket.controller';
import { ETicketService } from './eticket.service';

describe('ETicketController', () => {
  let controller: ETicketController;
  let service: ETicketService;

  const mockETicketService = {
    getFullBookingData: jest.fn(),
    generatePDF: jest.fn(),
    getBookingData: jest.fn(),
  };

  beforeEach(async () => {
    const module: TestingModule = await Test.createTestingModule({
      controllers: [ETicketController],
      providers: [
        {
          provide: ETicketService,
          useValue: mockETicketService,
        },
      ],
    }).compile();

    controller = module.get<ETicketController>(ETicketController);
    service = module.get<ETicketService>(ETicketService);
  });

  afterEach(() => {
    jest.clearAllMocks();
  });

  it('should be defined', () => {
    expect(controller).toBeDefined();
  });

  describe('getFullData', () => {
    it('should return full booking data', async () => {
      const ticketCode = 'BK123456';
      const expectedResult = {
        message: 'Booking data retrieved successfully',
        data: {
          bookingCode: 'BK123456',
          passengerName: 'John Doe',
          status: 'CONFIRMED' as const,
        },
      };

      mockETicketService.getFullBookingData.mockResolvedValue(expectedResult);

      const result = await controller.getFullData(ticketCode);

      expect(result).toEqual(expectedResult);
      expect(service.getFullBookingData).toHaveBeenCalledWith(ticketCode);
    });
  });

  describe('downloadPdf', () => {
    it('should generate e-ticket PDF', async () => {
      const ticketCode = 'BK123456';
      const mockPdfBuffer = Buffer.from('mock-pdf-data');

      mockETicketService.generatePDF.mockResolvedValue(mockPdfBuffer);

      const result = await controller.downloadPdf(ticketCode);

      expect(result).toEqual(mockPdfBuffer);
      expect(service.generatePDF).toHaveBeenCalledWith(ticketCode);
    });
  });

  describe('getTicketData', () => {
    it('should return lightweight ticket data', async () => {
      const ticketCode = 'BK123456';
      const expectedResult = {
        ticketCode: 'BK123456',
        passengerName: 'John Doe',
        email: 'john@example.com',
        phoneNumber: '1234567890',
        tripName: 'Hà Nội - Sài Gòn',
        busPlate: '29A-12345',
        busType: 'Giường nằm',
        from: 'Hà Nội',
        to: 'Sài Gòn',
        departureTime: '08:00',
        arrivalTime: '20:00',
        seatNumber: 'A1',
        price: '100,000 VND',
        bookingDate: '31/12/2023',
      };

      mockETicketService.getBookingData.mockResolvedValue(expectedResult);

      const result = await controller.getTicketData(ticketCode);

      expect(result).toEqual(expectedResult);
      expect(service.getBookingData).toHaveBeenCalledWith(ticketCode);
    });
  });
});
