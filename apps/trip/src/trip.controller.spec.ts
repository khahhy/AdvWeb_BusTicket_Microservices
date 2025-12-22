import { Test, TestingModule } from '@nestjs/testing';
import { TripController } from './trip.controller';
import { TripService } from './trip.service';

describe('TripController', () => {
  let tripController: TripController;

  beforeEach(async () => {
    const app: TestingModule = await Test.createTestingModule({
      controllers: [TripController],
      providers: [TripService],
    }).compile();

    tripController = app.get<TripController>(TripController);
  });

  describe('root', () => {
    it('should return "Hello World!"', () => {
      expect(tripController.getHello()).toBe('Hello World!');
    });
  });
});
