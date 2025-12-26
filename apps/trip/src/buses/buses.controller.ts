import { Controller } from '@nestjs/common';
import { MessagePattern, Payload } from '@nestjs/microservices';
import { BusesService } from './buses.service';
import { CreateBusDto, UpdateBusDto, QueryBusesDto } from '@app/shared/dto';

@Controller()
export class BusesController {
  constructor(private readonly busesService: BusesService) {}

  @MessagePattern({ cmd: 'create_bus' })
  async create(
    @Payload()
    data: {
      dto: CreateBusDto;
      userId: string;
      ip: string;
      userAgent: string;
    },
  ) {
    return this.busesService.create(
      data.dto,
      data.userId,
      data.ip,
      data.userAgent,
    );
  }

  @MessagePattern({ cmd: 'find_all_buses' })
  async findAll(@Payload() query: QueryBusesDto) {
    return this.busesService.findAll(query);
  }

  @MessagePattern({ cmd: 'find_one_bus' })
  async findOne(@Payload() id: string) {
    return this.busesService.findOne(id);
  }

  @MessagePattern({ cmd: 'get_bus_seats' })
  async getSeats(@Payload() id: string) {
    return this.busesService.getSeats(id);
  }

  @MessagePattern({ cmd: 'update_bus' })
  async update(
    @Payload()
    data: {
      id: string;
      dto: UpdateBusDto;
      userId: string;
      ip: string;
      userAgent: string;
    },
  ) {
    return this.busesService.update(
      data.id,
      data.dto,
      data.userId,
      data.ip,
      data.userAgent,
    );
  }

  @MessagePattern({ cmd: 'delete_bus' })
  async remove(
    @Payload()
    data: {
      id: string;
      userId: string;
      ip: string;
      userAgent: string;
    },
  ) {
    return this.busesService.remove(
      data.id,
      data.userId,
      data.ip,
      data.userAgent,
    );
  }
}
