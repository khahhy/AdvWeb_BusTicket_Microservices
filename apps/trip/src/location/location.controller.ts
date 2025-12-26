import { Controller } from '@nestjs/common';
import { MessagePattern, Payload } from '@nestjs/microservices';
import { LocationsService } from './location.service';
import {
  CreateLocationDto,
  UpdateLocationDto,
  QueryLocationDto,
} from '@app/shared/dto';

@Controller()
export class LocationsController {
  constructor(private readonly locationsService: LocationsService) {}

  @MessagePattern({ cmd: 'create_location' })
  async create(
    @Payload()
    payload: {
      dto: CreateLocationDto;
      userId: string;
      ip: string;
      userAgent: string;
    },
  ) {
    return this.locationsService.create(
      payload.dto,
      payload.userId,
      payload.ip,
      payload.userAgent,
    );
  }

  @MessagePattern({ cmd: 'get_locations' })
  async findAll(@Payload() query: QueryLocationDto) {
    return this.locationsService.findAll(query);
  }

  @MessagePattern({ cmd: 'get_location_cities' })
  async getCities() {
    return this.locationsService.getCities();
  }

  @MessagePattern({ cmd: 'get_location_detail' })
  async findOne(@Payload() id: string) {
    return this.locationsService.findOne(id);
  }

  @MessagePattern({ cmd: 'update_location' })
  async update(
    @Payload()
    payload: {
      id: string;
      dto: UpdateLocationDto;
      userId: string;
      ip: string;
      userAgent: string;
    },
  ) {
    return this.locationsService.update(
      payload.id,
      payload.dto,
      payload.userId,
      payload.ip,
      payload.userAgent,
    );
  }

  @MessagePattern({ cmd: 'delete_location' })
  async remove(
    @Payload()
    payload: {
      id: string;
      userId: string;
      ip: string;
      userAgent: string;
    },
  ) {
    return this.locationsService.remove(
      payload.id,
      payload.userId,
      payload.ip,
      payload.userAgent,
    );
  }
}
