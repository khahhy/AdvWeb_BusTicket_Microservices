import { Injectable } from '@nestjs/common';

@Injectable()
export class TripService {
  getHello(): string {
    return 'Hello World!';
  }
}
