import {
  Controller,
  Get,
  Post,
  Patch,
  Param,
  Body,
  HttpCode,
  HttpStatus,
  Req,
  UseGuards,
  Query,
  Inject,
} from '@nestjs/common';
import { ClientProxy } from '@nestjs/microservices';
import {
  ApiTags,
  ApiOperation,
  ApiBearerAuth,
  ApiBody,
  ApiResponse,
} from '@nestjs/swagger';
import { firstValueFrom } from 'rxjs';
import { CreateBookingDto, QueryBookingDto } from '@app/shared/dto';
import {
  JwtAuthGuard,
  RolesGuard,
  UserRole,
  Roles,
  BaseResponse,
  handleRpcError,
  type RequestWithUser,
} from '@app/shared';

@ApiTags('Bookings')
@Controller('bookings')
export class BookingsController {
  constructor(
    @Inject('BOOKING_SERVICE') private readonly bookingClient: ClientProxy,
  ) {}

  @Post('lock')
  @ApiOperation({ summary: 'Lock a seat temporarily' })
  async lockSeat(@Body() body: any, @Req() req: RequestWithUser) {
    try {
      const userId = req.user?.userId || 'guest-temp-id';
      return await firstValueFrom(
        this.bookingClient.send({ cmd: 'lock_seat' }, { ...body, userId }),
      );
    } catch (e) {
      handleRpcError(e);
    }
  }

  @Post()
  @ApiOperation({ summary: 'Create a new booking' })
  @ApiBody({ type: CreateBookingDto })
  async create(@Body() createDto: CreateBookingDto) {
    try {
      return await firstValueFrom(
        this.bookingClient.send({ cmd: 'create_booking' }, createDto),
      );
    } catch (e) {
      handleRpcError(e);
    }
  }

  @Get()
  @UseGuards(JwtAuthGuard, RolesGuard)
  @Roles(UserRole.admin)
  @ApiBearerAuth('JWT-auth')
  async findAll(@Query() query: QueryBookingDto) {
    try {
      return await firstValueFrom(
        this.bookingClient.send({ cmd: 'find_all_bookings' }, query),
      );
    } catch (e) {
      handleRpcError(e);
    }
  }

  @Get(':id')
  async findOne(@Param('id') id: string) {
    try {
      return await firstValueFrom(
        this.bookingClient.send({ cmd: 'find_one_booking' }, id),
      );
    } catch (e) {
      handleRpcError(e);
    }
  }
}
