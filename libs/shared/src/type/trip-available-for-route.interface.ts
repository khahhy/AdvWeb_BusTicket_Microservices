export interface TripsForRouteResponse {
  tripId: string;
  startTime: string | Date;
  endTime: string | Date;
  busName: string;
  amenities: any;
  pickupLocation: string;
  dropoffLocation: string;
  pricing: number;
}
