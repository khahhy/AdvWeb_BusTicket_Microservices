// Type definitions for chatbot service

export interface UserContext {
  id?: string;
  email?: string;
  fullName?: string;
}

export interface BookingState {
  stage: 'seat_selection' | 'passenger_info' | 'payment';
  tripId: string;
  routeId: string;
  price: number;
  basePrice?: number;
  startTime?: string | null;
  endTime?: string | null;
  selectedSeats?: string[];
  selectedSeatIds?: string[];
  availableSeats?: string[];
  seatNumberToId?: Record<string, string>;
  fullName?: string;
  email?: string;
  phoneNumber?: string;
  personalId?: string;
  totalPrice?: number;
  bookingId?: string;
  passengerInfo?: {
    name: string;
    email: string;
    phone: string;
  };
}

export interface PendingSearch {
  originCity?: string | null;
  destinationCity?: string | null;
  date?: string | null;
  originIds?: string[] | null;
  destinationIds?: string[] | null;
  originName?: string | null;
  destinationName?: string | null;
  needMoreInfo?: boolean;
  clarificationMessage?: string | null;
}

export interface ChatContext {
  user?: UserContext;
  bookingState?: BookingState;
  pendingSearch?: PendingSearch;
}

export interface ParsedIntent {
  intent: string;
  entities: {
    originCity?: string | null;
    destinationCity?: string | null;
    date?: string | null;
    originIds?: string[] | null;
    destinationIds?: string[] | null;
    origin?: string | null;
    destination?: string | null;
  };
}
