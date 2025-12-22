import { Controller, Get } from '@nestjs/common';
import { TripService } from './trip.service';

@Controller()
export class TripController {
  constructor(private readonly tripService: TripService) {}

  @Get()
  getHello(): string {
    return this.tripService.getHello();
  }
}
