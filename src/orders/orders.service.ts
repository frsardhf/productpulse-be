import { Injectable, NotFoundException } from '@nestjs/common';
import { PrismaService } from '../prisma.service';
import { UpdateOrderDto } from './dto/update-order.dto';
import { OrderDto } from './dto/order.dto';
import { Order } from '@prisma/client';
import { CartService } from '../cart/cart.service'; 
import { UsersService } from '../users/users.service';
import { Decimal } from '@prisma/client/runtime/library';
import { CheckoutResponse, CheckoutItem } from './types/checkout.type';

@Injectable()
export class OrdersService {
  constructor(
    private readonly prisma: PrismaService,
    private readonly cartService: CartService,
    private readonly userService: UsersService
  ) {}

  async checkout(userEmail: string): Promise<CheckoutResponse> {
    const user = await this.userService.findUserByEmail(userEmail);
    if (!user) {
      throw new NotFoundException(`User with email ${userEmail} not found`);
    }

    const cartItems = await this.cartService.getUserCart(userEmail);
    if (cartItems.length === 0) {
      throw new NotFoundException('No items in the cart to checkout');
    }

    const orderItems: CheckoutItem[] = cartItems.map(item => ({
      productId: item.id,
      name: item.name,
      description: item.description,  
      quantity: item.quantity,
      price: item.price,
      categoryId: item.categoryId,
      stock: item.stock
    }));

    const productsId: number[] = cartItems.map(item => item.id);

    const totalPrice = await this.cartService.getTotalPrice(userEmail);

    const checkoutResponse: CheckoutResponse = {
      id: Math.floor(Math.random() * 1000), // Temporary ID
      userId: user.id,
      status: 'Pending',
      totalPrice: new Decimal(totalPrice),
      createdAt: new Date(),
      productsId: productsId,
      shippingAddress: '', // Will be set during confirmation
      orderItems: orderItems // Include the transformed order items
    };

    return checkoutResponse;
  }

  async confirmOrder(orderDto: OrderDto, userEmail: string): Promise<Order> {
    const user = await this.userService.findUserByEmail(userEmail);
    if (!user) {
      throw new NotFoundException(`User  with email ${userEmail} not found`);
    }
  
    // Use a transaction for creating the order and updating stocks
    const result = await this.prisma.$transaction(async (prisma) => {
      const order = await prisma.order.create({
        data: {
          userId: user.id,
          status: orderDto.status,
          totalPrice: orderDto.totalPrice,
          shippingAddress: orderDto.shippingAddress,
          productsId: orderDto.productsId,
          orderItems: {
            create: orderDto.orderItems.map(item => ({
              product: { connect: { id: item.productId } },
              quantity: item.quantity,
              price: new Decimal(item.price),
            })),
          },
        },
        include: {
          orderItems: { include: { product: true } },
        },
      });
  
      // Update product stocks in a single operation
      const updates = orderDto.orderItems.map(item => ({
        where: { id: item.productId },
        data: { stock: { decrement: item.quantity } }, // Use decrement for batch updating
      }));
  
      await prisma.product.updateMany({
        where: { id: { in: orderDto.orderItems.map(item => item.productId) } },
        data: updates,
      });
  
      await this.cartService.clearCart(userEmail); // If this can be deferred, consider moving it to a background job
  
      return order;
    });
  
    return result;
  }

  async getOrderHistory(userId: number): Promise<Order[]> {
    return this.prisma.order.findMany({
      where: { userId },
      include: { orderItems: true }, // Include order items if needed
    });
  }

  async updateOrderStatus(id: number, updateOrderDto: UpdateOrderDto): Promise<Order> {
    return this.prisma.order.update({
      where: { id },
      data: updateOrderDto,
    });
  }

  async getAllOrders(): Promise<Order[]> {
    return this.prisma.order.findMany({
      include: { orderItems: true }, // Include order items if needed
    });
  }
}
