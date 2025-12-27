import {
  WebSocketGateway,
  WebSocketServer,
  OnGatewayConnection,
  OnGatewayDisconnect,
  SubscribeMessage,
  MessageBody,
  ConnectedSocket,
} from '@nestjs/websockets';
import { Server, Socket } from 'socket.io';
import { Logger } from '@nestjs/common';

@WebSocketGateway({
  cors: {
    origin: ['http://localhost:3000', 'http://localhost:5173'],
    credentials: true,
  },
  namespace: 'payment',
})
export class PaymentGateway
  implements OnGatewayConnection, OnGatewayDisconnect
{
  @WebSocketServer()
  server: Server;

  private readonly logger = new Logger(PaymentGateway.name);
  private bookingSubscriptions = new Map<string, Set<string>>(); // bookingId -> Set<socketId>

  handleConnection(client: Socket) {
    this.logger.log(`Client connected: ${client.id}`);
  }

  handleDisconnect(client: Socket) {
    this.logger.log(`Client disconnected: ${client.id}`);

    // Clean up subscriptions
    this.bookingSubscriptions.forEach((sockets, bookingId) => {
      sockets.delete(client.id);
      if (sockets.size === 0) {
        this.bookingSubscriptions.delete(bookingId);
      }
    });
  }

  @SubscribeMessage('subscribe-payment')
  handleSubscribePayment(
    @MessageBody() data: { bookingId: string },
    @ConnectedSocket() client: Socket,
  ) {
    const { bookingId } = data;

    if (!this.bookingSubscriptions.has(bookingId)) {
      this.bookingSubscriptions.set(bookingId, new Set());
    }

    this.bookingSubscriptions.get(bookingId)!.add(client.id);

    this.logger.log(`Client ${client.id} subscribed to booking ${bookingId}`);

    return { success: true, bookingId };
  }

  @SubscribeMessage('unsubscribe-payment')
  handleUnsubscribePayment(
    @MessageBody() data: { bookingId: string },
    @ConnectedSocket() client: Socket,
  ) {
    const { bookingId } = data;

    const sockets = this.bookingSubscriptions.get(bookingId);
    if (sockets) {
      sockets.delete(client.id);
      if (sockets.size === 0) {
        this.bookingSubscriptions.delete(bookingId);
      }
    }

    this.logger.log(
      `Client ${client.id} unsubscribed from booking ${bookingId}`,
    );

    return { success: true, bookingId };
  }

  /**
   * Emit payment success event to subscribed clients
   */
  emitPaymentSuccess(
    bookingId: string,
    data: {
      ticketCode: string;
      amount: number;
      bookingIds: string[];
    },
  ) {
    const sockets = this.bookingSubscriptions.get(bookingId);

    if (sockets && sockets.size > 0) {
      sockets.forEach((socketId) => {
        this.server.to(socketId).emit('payment-success', {
          bookingId,
          ...data,
        });
      });

      this.logger.log(
        `Emitted payment success for booking ${bookingId} to ${sockets.size} client(s)`,
      );
    } else {
      this.logger.log(`No subscribers for booking ${bookingId}, skipping emit`);
    }
  }

  /**
   * Emit payment failure event to subscribed clients
   */
  emitPaymentFailure(
    bookingId: string,
    data: {
      reason: string;
    },
  ) {
    const sockets = this.bookingSubscriptions.get(bookingId);

    if (sockets && sockets.size > 0) {
      sockets.forEach((socketId) => {
        this.server.to(socketId).emit('payment-failure', {
          bookingId,
          ...data,
        });
      });

      this.logger.log(
        `Emitted payment failure for booking ${bookingId} to ${sockets.size} client(s)`,
      );
    }
  }
}
