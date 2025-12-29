export class BookingReminderItemDto {
  id!: string;
  userId!: string | null;
  ticketCode!: string | null;

  customerInfo!: any; // Prisma JsonValue

  user!: {
    email?: string;
    phoneNumber?: string | null;
    fullName?: string | null;
  } | null;

  trip!: {
    startTime: string; // ISO
    bus: { plate: string | null };
  };

  route!: {
    origin: { name: string | null };
    destination: { name: string | null };
  };

  pickupStop!: {
    location: { name: string | null; address?: string | null };
  } | null;

  dropoffStop!: {
    location: { name: string | null; address?: string | null };
  } | null;

  seat!: { seatNumber: string | null };
}
