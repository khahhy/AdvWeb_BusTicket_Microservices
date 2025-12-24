import { Module } from '@nestjs/common';
import { LocationsService } from './location.service';
import { LocationsController } from './location.controller';

@Module({
  controllers: [LocationsController],
  providers: [LocationsService],
})
export class LocationModule {}
