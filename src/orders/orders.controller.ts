import {
  Body,
  Controller,
  Get,
  Param,
  Post,
  Put,
  UseGuards,
} from '@nestjs/common';
import { OrdersService } from './orders.service';
import { UpdateOrderDto } from './dto/update-order.dto';
import { Order } from '@prisma/client';
import { AdminGuard } from '../guards/admin.guard';
import { ApiTags, ApiResponse, ApiBearerAuth } from '@nestjs/swagger';
import { JwtAuthGuard } from '../guards/jwtauth.guard';
import { User } from '../auth/decorators/user.decorator';
import { AuthenticatedUser } from '../auth/types/authenticated-user.type';
import { CheckoutDto } from './dto/checkout.dto';
import { CheckoutResponse } from './types/checkout.type';

@ApiTags('orders')
@UseGuards(JwtAuthGuard)
@ApiBearerAuth('JWT-auth')
@Controller('orders')
export class OrdersController {
  constructor(private readonly ordersService: OrdersService) {}

  @Post('checkout')
  @ApiResponse({
    status: 200,
    description: 'Checkout details retrieved successfully.',
  })
  async checkout(@User() user: AuthenticatedUser): Promise<CheckoutResponse> {
    return this.ordersService.checkout(user.email);
  }

  @Post('validate')
  @ApiResponse({ status: 201, description: 'Order validated successfully.' })
  async validateInventory(
    @User() user: AuthenticatedUser,
  ): Promise<CheckoutResponse> {
    return this.ordersService.validateInventory(user.email);
  }

  @Post('create')
  @ApiResponse({ status: 201, description: 'Order created successfully.' })
  async createOrder(
    @Body() checkoutDto: CheckoutDto,
    @User() user: AuthenticatedUser,
  ): Promise<Order> {
    return this.ordersService.createOrder(checkoutDto, user.email);
  }

  @Post('confirm')
  @ApiResponse({ status: 201, description: 'Order created successfully.' })
  async confirmOrder(
    @Body() checkoutDto: CheckoutDto,
    @User() user: AuthenticatedUser,
  ): Promise<Order> {
    return this.ordersService.confirmOrder(checkoutDto, user.email);
  }

  @Get('history')
  async getOrderHistory(@User() user: AuthenticatedUser): Promise<Order[]> {
    return this.ordersService.getOrderHistory(user.userId);
  }

  @UseGuards(AdminGuard)
  @Put(':id')
  async updateOrderStatus(
    @Param('id') id: number,
    @Body() updateOrderDto: UpdateOrderDto,
  ): Promise<Order> {
    return this.ordersService.updateOrderStatus(id, updateOrderDto);
  }

  @UseGuards(AdminGuard)
  @Get()
  async getAllOrders(): Promise<Order[]> {
    return this.ordersService.getAllOrders();
  }
}
