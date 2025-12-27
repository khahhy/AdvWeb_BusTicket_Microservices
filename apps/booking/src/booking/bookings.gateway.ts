import { WebSocketGateway, WebSocketServer } from '@nestjs/websockets';
import { Server } from 'socket.io';

@WebSocketGateway({
  cors: {
    origin: '*',
  },
})
export class BookingsGateway {
  @WebSocketServer()
  server: Server;

  emitSeatLocked(tripId: string, seatId: string, segmentIds: string[]) {
    this.server.emit(`trip.${tripId}`, {
      event: 'SEAT_LOCKED',
      data: { seatId, segmentIds },
    });
  }

  emitSeatUnlocked(tripId: string, seatId: string, segmentIds: string[]) {
    this.server.emit(`trip.${tripId}`, {
      event: 'SEAT_UNLOCKED',
      data: { seatId, segmentIds },
    });
  }

  emitSeatSold(tripId: string, seatId: string, segmentIds: string[]) {
    this.server.emit(`trip.${tripId}`, {
      event: 'SEAT_SOLD',
      data: { seatId, segmentIds },
    });
  }
}
