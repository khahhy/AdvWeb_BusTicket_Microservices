import { Module } from '@nestjs/common';
import { UserService } from './user.service';
import { UserController } from './user.controller';
import { PrismaModule } from '../prisma/prisma.module';
import { RedisCacheModule } from '@app/shared';

@Module({
  imports: [PrismaModule, RedisCacheModule],
  controllers: [UserController],
  providers: [UserService],
})
export class UserModule {}
