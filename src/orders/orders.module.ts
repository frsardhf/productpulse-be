import { Module } from '@nestjs/common';
import { CartService } from '../cart/cart.service';
import { OrdersService } from './orders.service';
import { OrdersController } from './orders.controller';
import { PrismaService } from '../prisma.service';
import { CartModule } from 'src/cart/cart.module';
import { UsersModule } from 'src/users/users.module';

@Module({
  imports: [
    CartModule,
    UsersModule],
  providers: [
    OrdersService,
    PrismaService,
  ],
  controllers: [OrdersController],
})
export class OrdersModule {}
