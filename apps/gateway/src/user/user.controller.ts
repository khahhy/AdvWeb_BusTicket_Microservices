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
  HttpCode,
  HttpStatus,
} from '@nestjs/common';
import { ClientProxy } from '@nestjs/microservices';
import {
  ApiTags,
  ApiOperation,
  ApiBearerAuth,
  ApiParam,
  ApiBody,
  ApiResponse,
} from '@nestjs/swagger';
import { firstValueFrom } from 'rxjs';
import {
  CreateUserDto,
  UpdateUserDto,
  UpdateRoleDto,
  UpdateStatusDto,
  QueryUserDto,
  JwtAuthGuard,
  RolesGuard,
  Roles,
  UserRole,
  type RequestWithUser,
  BaseResponse,
  handleRpcError,
  UserDto,
} from '@app/shared';
import { UserStatsData } from '@app/shared/type';

@ApiTags('users')
@Controller('users')
export class UserController {
  constructor(
    @Inject('IDENTITY_SERVICE') private readonly identityClient: ClientProxy,
  ) {}

  @UseGuards(JwtAuthGuard, RolesGuard)
  @Roles(UserRole.admin)
  @ApiBearerAuth('JWT-auth')
  @ApiOperation({ summary: 'Admin: Get user statistics (Total, New, Active)' })
  @ApiResponse({ status: 200, description: 'Fetched stats successfully.' })
  @Get('stats')
  async getStats() {
    try {
      return await firstValueFrom(
        this.identityClient.send<BaseResponse<UserStatsData>>(
          { cmd: 'user_get_stats' },
          {},
        ),
      );
    } catch (e) {
      handleRpcError(e);
    }
  }

  @UseGuards(JwtAuthGuard, RolesGuard)
  @Roles(UserRole.admin)
  @ApiBearerAuth('JWT-auth')
  @ApiOperation({ summary: 'Admin: Create a new admin user' })
  @ApiBody({ type: CreateUserDto })
  @ApiResponse({ status: 201, description: 'Admin created successfully.' })
  @ApiResponse({
    status: 400,
    description: 'Email or phone number already exists.',
  })
  @Post()
  @HttpCode(HttpStatus.CREATED)
  async createAdmin(@Body() dto: CreateUserDto, @Req() req: RequestWithUser) {
    try {
      return await firstValueFrom(
        this.identityClient.send<BaseResponse<UserDto>>(
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
      handleRpcError(e);
    }
  }

  @UseGuards(JwtAuthGuard, RolesGuard)
  @Roles(UserRole.admin)
  @ApiBearerAuth('JWT-auth')
  @ApiOperation({ summary: 'Admin: Get all users with pagination & search' })
  @ApiResponse({ status: 200, description: 'Fetched all users successfully.' })
  @Get()
  async findAll(@Query() query: QueryUserDto) {
    try {
      return await firstValueFrom(
        this.identityClient.send<BaseResponse<any>>(
          { cmd: 'user_find_all' },
          query,
        ),
      );
    } catch (e) {
      handleRpcError(e);
    }
  }

  @ApiOperation({ summary: 'Get a user by ID' })
  @ApiParam({ name: 'id', description: 'User ID', type: String })
  @ApiResponse({ status: 200, description: 'Fetched user successfully.' })
  @ApiResponse({ status: 404, description: 'User not found.' })
  @Get(':id')
  async findOne(@Param('id') id: string) {
    try {
      return await firstValueFrom(
        this.identityClient.send<BaseResponse<UserDto>>(
          { cmd: 'user_find_one' },
          id,
        ),
      );
    } catch (e) {
      handleRpcError(e);
    }
  }

  @ApiOperation({
    summary: 'Update user details (fullName, email, phoneNumber)',
  })
  @ApiParam({ name: 'id', description: 'User ID', type: String })
  @ApiBody({ type: UpdateUserDto })
  @ApiResponse({ status: 200, description: 'User updated successfully.' })
  @Patch(':id')
  async update(@Param('id') id: string, @Body() dto: UpdateUserDto) {
    try {
      return await firstValueFrom(
        this.identityClient.send<BaseResponse<UserDto>>(
          { cmd: 'user_update' },
          { id, dto },
        ),
      );
    } catch (e) {
      handleRpcError(e);
    }
  }

  @UseGuards(JwtAuthGuard, RolesGuard)
  @Roles(UserRole.admin)
  @ApiBearerAuth('JWT-auth')
  @ApiOperation({ summary: 'Update user role' })
  @ApiParam({ name: 'id', description: 'User ID', type: String })
  @ApiBody({ type: UpdateRoleDto })
  @ApiResponse({ status: 200, description: 'User role updated successfully.' })
  @Patch(':id/role')
  async updateRole(
    @Param('id') id: string,
    @Body() dto: UpdateRoleDto,
    @Req() req: RequestWithUser,
  ) {
    try {
      return await firstValueFrom(
        this.identityClient.send<BaseResponse<UserDto>>(
          { cmd: 'user_update_role' },
          {
            id,
            dto,
            userId: req.user.userId,
            ip: req.ip,
            userAgent: req.headers['user-agent'],
          },
        ),
      );
    } catch (e) {
      handleRpcError(e);
    }
  }

  @UseGuards(JwtAuthGuard, RolesGuard)
  @Roles(UserRole.admin)
  @ApiBearerAuth('JWT-auth')
  @ApiOperation({ summary: 'Update user status' })
  @ApiParam({ name: 'id', description: 'User ID', type: String })
  @ApiBody({ type: UpdateStatusDto })
  @ApiResponse({
    status: 200,
    description: 'User status updated successfully.',
  })
  @Patch(':id/status')
  async updateStatus(
    @Param('id') id: string,
    @Body() dto: UpdateStatusDto,
    @Req() req: RequestWithUser,
  ) {
    try {
      return await firstValueFrom(
        this.identityClient.send<BaseResponse<UserDto>>(
          { cmd: 'user_update_status' },
          {
            id,
            dto,
            userId: req.user.userId,
            ip: req.ip,
            userAgent: req.headers['user-agent'],
          },
        ),
      );
    } catch (e) {
      handleRpcError(e);
    }
  }

  @UseGuards(JwtAuthGuard, RolesGuard)
  @Roles(UserRole.admin)
  @ApiBearerAuth('JWT-auth')
  @ApiOperation({ summary: 'Delete a user' })
  @ApiParam({ name: 'id', description: 'User ID', type: String })
  @ApiResponse({ status: 200, description: 'User deleted successfully.' })
  @Delete(':id')
  async remove(@Param('id') id: string, @Req() req: RequestWithUser) {
    try {
      return await firstValueFrom(
        this.identityClient.send<BaseResponse<UserDto>>(
          { cmd: 'user_remove' },
          {
            id,
            userId: req.user.userId,
            ip: req.ip,
            userAgent: req.headers['user-agent'],
          },
        ),
      );
    } catch (e) {
      handleRpcError(e);
    }
  }

  @UseGuards(JwtAuthGuard)
  @ApiBearerAuth('JWT-auth')
  @ApiOperation({ summary: 'Get notification preferences for current user' })
  @ApiResponse({
    status: 200,
    description: 'Notification preferences retrieved successfully.',
  })
  @Get('me/notification-preferences')
  async getNotificationPreferences(@Req() req: RequestWithUser) {
    try {
      return await firstValueFrom(
        this.identityClient.send<BaseResponse<any>>(
          { cmd: 'user_get_notification_preferences' },
          req.user.userId,
        ),
      );
    } catch (e) {
      handleRpcError(e);
    }
  }

  @UseGuards(JwtAuthGuard)
  @ApiBearerAuth('JWT-auth')
  @ApiOperation({ summary: 'Update notification preferences for current user' })
  @ApiBody({
    schema: {
      type: 'object',
      properties: {
        email: { type: 'object' },
        sms: { type: 'object' },
      },
    },
  })
  @ApiResponse({
    status: 200,
    description: 'Notification preferences updated successfully.',
  })
  @Patch('me/notification-preferences')
  async updateNotificationPreferences(
    @Req() req: RequestWithUser,
    @Body() preferences: any,
  ) {
    try {
      return await firstValueFrom(
        this.identityClient.send<BaseResponse<any>>(
          { cmd: 'user_update_notification_preferences' },
          {
            userId: req.user.userId,
            // eslint-disable-next-line @typescript-eslint/no-unsafe-assignment
            preferences,
          },
        ),
      );
    } catch (e) {
      handleRpcError(e);
    }
  }
}
