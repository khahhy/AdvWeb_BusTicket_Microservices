import { Controller } from '@nestjs/common';
import { MessagePattern, Payload } from '@nestjs/microservices';
import { ETicketService } from './eticket.service';

@Controller()
export class ETicketController {
  constructor(private readonly eTicketService: ETicketService) {}

  /**
   * For Gateway: GET /bookings/eticket/:ticketCode
   * Pattern: send({ cmd: 'get_eticket_full_data' }, ticketCode)
   */
  @MessagePattern({ cmd: 'get_eticket_full_data' })
  async getFullData(@Payload() ticketCode: string) {
    return this.eTicketService.getFullBookingData(ticketCode);
  }

  /**
   * For Gateway: GET /bookings/eticket/:ticketCode/download
   * Pattern: send({ cmd: 'download_eticket_pdf' }, ticketCode)
   * Return: Buffer (gateway will res.send(buffer))
   */
  @MessagePattern({ cmd: 'download_eticket_pdf' })
  async downloadPdf(@Payload() ticketCode: string): Promise<Buffer> {
    return this.eTicketService.generatePDF(ticketCode);
  }

  /**
   * Optional: if somewhere needs lightweight ticket data
   * Pattern: send({ cmd: 'get_eticket_data' }, ticketCode)
   */
  @MessagePattern({ cmd: 'get_eticket_data' })
  async getTicketData(@Payload() ticketCode: string) {
    return this.eTicketService.getBookingData(ticketCode);
  }
}
