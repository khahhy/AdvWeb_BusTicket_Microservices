import { Controller } from '@nestjs/common';
import { MessagePattern, Payload } from '@nestjs/microservices';
import { UserService } from './user.service';
import {
  CreateUserDto,
  UpdateUserDto,
  UpdateRoleDto,
  QueryUserDto,
} from '@app/shared';

@Controller()
export class UserController {
  constructor(private readonly userService: UserService) {}

  @MessagePattern({ cmd: 'user_get_stats' })
  async getStats() {
    return this.userService.getStats();
  }

  @MessagePattern({ cmd: 'user_create_admin' })
  async createAdmin(
    @Payload()
    data: {
      dto: CreateUserDto;
      userId: string;
      ip: string;
      userAgent: string;
    },
  ) {
    return this.userService.createAdmin(
      data.dto,
      data.userId,
      data.ip,
      data.userAgent,
    );
  }

  @MessagePattern({ cmd: 'user_find_all' })
  async findAll(@Payload() query: QueryUserDto) {
    return this.userService.findAll(query);
  }

  @MessagePattern({ cmd: 'user_find_one' })
  async findOne(@Payload() id: string) {
    return this.userService.findOne(id);
  }

  @MessagePattern({ cmd: 'user_update' })
  async update(@Payload() data: { id: string; dto: UpdateUserDto }) {
    return this.userService.update(data.id, data.dto);
  }

  @MessagePattern({ cmd: 'user_update_role' })
  async updateRole(
    @Payload() data: { id: string; dto: UpdateRoleDto; userId: string },
  ) {
    return this.userService.updateRole(
      data.id,
      data.dto,
      data.userId,
      'unknown',
      'unknown',
    );
  }

  @MessagePattern({ cmd: 'user_remove' })
  async remove(@Payload() data: { id: string; userId: string }) {
    return this.userService.remove(data.id, data.userId, 'unknown', 'unknown');
  }
}
