import {
  Controller,
  Get,
  Post,
  Patch,
  Delete,
  Param,
  Body,
  Query,
  Inject,
  UseGuards,
  Req,
  HttpException,
  HttpStatus,
} from '@nestjs/common';
import { ClientProxy } from '@nestjs/microservices';
import { ApiTags, ApiOperation, ApiBearerAuth } from '@nestjs/swagger';
import { firstValueFrom } from 'rxjs';
import {
  CreateUserDto,
  UpdateUserDto,
  UpdateRoleDto,
  QueryUserDto,
  JwtAuthGuard,
  RolesGuard,
  Roles,
  UserRole,
  type RequestWithUser,
} from '@app/shared';

@ApiTags('users')
@Controller('users')
export class UserController {
  constructor(
    @Inject('IDENTITY_SERVICE') private readonly identityClient: ClientProxy,
  ) {}

  @UseGuards(JwtAuthGuard, RolesGuard)
  @Roles(UserRole.admin)
  @ApiBearerAuth('JWT-auth')
  @ApiOperation({ summary: 'Admin: Get user statistics' })
  @Get('stats')
  async getStats() {
    try {
      return await firstValueFrom(
        this.identityClient.send({ cmd: 'user_get_stats' }, {}),
      );
    } catch (e) {
      throw new HttpException(e.message, HttpStatus.INTERNAL_SERVER_ERROR);
    }
  }

  @UseGuards(JwtAuthGuard, RolesGuard)
  @Roles(UserRole.admin)
  @ApiBearerAuth('JWT-auth')
  @ApiOperation({ summary: 'Admin: Create a new admin' })
  @Post()
  async createAdmin(@Body() dto: CreateUserDto, @Req() req: RequestWithUser) {
    try {
      return await firstValueFrom(
        this.identityClient.send(
          { cmd: 'user_create_admin' },
          {
            dto,
            userId: req.user.userId,
            ip: req.ip,
            userAgent: req.headers['user-agent'],
          },
        ),
      );
    } catch (e) {
      throw new HttpException(e.message, HttpStatus.BAD_REQUEST);
    }
  }

  @UseGuards(JwtAuthGuard, RolesGuard)
  @Roles(UserRole.admin)
  @ApiBearerAuth('JWT-auth')
  @ApiOperation({ summary: 'Admin: Get all users' })
  @Get()
  async findAll(@Query() query: QueryUserDto) {
    return await firstValueFrom(
      this.identityClient.send({ cmd: 'user_find_all' }, query),
    );
  }

  @Get(':id')
  async findOne(@Param('id') id: string) {
    try {
      return await firstValueFrom(
        this.identityClient.send({ cmd: 'user_find_one' }, id),
      );
    } catch (e) {
      throw new HttpException(e.message, HttpStatus.NOT_FOUND);
    }
  }

  @Patch(':id')
  async update(@Param('id') id: string, @Body() dto: UpdateUserDto) {
    try {
      return await firstValueFrom(
        this.identityClient.send({ cmd: 'user_update' }, { id, dto }),
      );
    } catch (e) {
      throw new HttpException(e.message, HttpStatus.BAD_REQUEST);
    }
  }

  @UseGuards(JwtAuthGuard, RolesGuard)
  @Roles(UserRole.admin)
  @ApiBearerAuth('JWT-auth')
  @Patch(':id/role')
  async updateRole(
    @Param('id') id: string,
    @Body() dto: UpdateRoleDto,
    @Req() req: RequestWithUser,
  ) {
    return await firstValueFrom(
      this.identityClient.send(
        { cmd: 'user_update_role' },
        { id, dto, userId: req.user.userId },
      ),
    );
  }

  @UseGuards(JwtAuthGuard, RolesGuard)
  @Roles(UserRole.admin)
  @ApiBearerAuth('JWT-auth')
  @Delete(':id')
  async remove(@Param('id') id: string, @Req() req: RequestWithUser) {
    return await firstValueFrom(
      this.identityClient.send(
        { cmd: 'user_remove' },
        { id, userId: req.user.userId },
      ),
    );
  }
}
