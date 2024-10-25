import { Module } from '@nestjs/common';
import { CartController } from './cart.controller';
import { CartService } from './cart.service';
import { PrismaService } from '../prisma.service';
import { UsersModule } from '../users/users.module';

@Module({
  imports: [UsersModule],
  controllers: [CartController],
  providers: [
    CartService,
    PrismaService
  ],
  exports: [CartService]
})
export class CartModule {}

