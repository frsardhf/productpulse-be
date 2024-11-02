// src/orders/orders.service.ts
import { Injectable, NotFoundException } from '@nestjs/common';
import { PrismaService } from '../prisma.service';
import { UpdateOrderDto } from './dto/update-order.dto';
import { OrderDto } from './dto/order.dto';
import { CheckoutDto } from './dto/checkout.dto';
import { Order } from '@prisma/client';
import { CartService } from '../cart/cart.service'; 
import { UsersService } from '../users/users.service';
import { CheckoutStateService } from './orders-state.service';
import { Decimal } from '@prisma/client/runtime/library';
import { CheckoutResponse, CheckoutItem } from './types/checkout.type';

@Injectable()
export class OrdersService {
  constructor(
    private readonly prisma: PrismaService,
    private readonly cartService: CartService,
    private readonly userService: UsersService,
    private readonly checkoutStateService: CheckoutStateService
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
      id: Math.floor(Math.random() * 1000), 
      userId: user.id,
      status: 'Pending',
      totalPrice: new Decimal(totalPrice),
      createdAt: new Date(),
      productsId: productsId,
      shippingAddress: '', 
      orderItems: orderItems 
    };

    this.checkoutStateService.setCheckoutState(userEmail, checkoutResponse);

    return checkoutResponse;
  }

  async confirmOrder(checkoutDto: CheckoutDto, userEmail: string): Promise<Order> {
    const checkoutState = this.checkoutStateService.getCheckoutState(userEmail);
    if (!checkoutState) {
      throw new NotFoundException('Checkout session expired or not found. Please checkout again.');
    }
  
    const user = await this.userService.findUserByEmail(userEmail);
    if (!user) {
      throw new NotFoundException(`User with email ${userEmail} not found`);
    }
  
    try {
      const order = await this.prisma.$transaction(async (prisma) => {
        const products = await prisma.product.findMany({
          where: { 
            id: { 
              in: checkoutState.productsId 
            } 
          },
          select: {
            id: true,
            stock: true
          }
        });
  
        for (const orderItem of checkoutState.orderItems) {
          const product = products.find(p => p.id === orderItem.productId);
          if (!product) {
            throw new NotFoundException(`Product with ID ${orderItem.productId} not found`);
          }
          if (product.stock < orderItem.quantity) {
            throw new Error(`Insufficient stock for product ${orderItem.productId}`);
          }
        }
  
        const createdOrder = await prisma.order.create({
          data: {
            userId: user.id,
            status: checkoutState.status,
            totalPrice: checkoutState.totalPrice,
            shippingAddress: checkoutDto.shippingAddress,
            productsId: checkoutState.productsId,
            orderItems: {
              create: checkoutState.orderItems.map(item => ({
                product: {
                  connect: { id: item.productId },
                },
                quantity: item.quantity,
                price: new Decimal(item.price),
              })),
            },
          },
          include: {
            orderItems: {
              include: {
                product: true,
              },
            },
          },
        });
  
        for (const orderItem of checkoutState.orderItems) {
          await prisma.product.update({
            where: { id: orderItem.productId },
            data: { 
              stock: {
                decrement: orderItem.quantity 
              }
            },
          });
        }
  
        return createdOrder;
      }, {
        maxWait: 5000,
        timeout: 10000
      });
  
      await this.cartService.clearCart(userEmail);
      this.checkoutStateService.clearCheckoutState(userEmail);
  
      return order;
  
    } catch (error) {
      this.checkoutStateService.clearCheckoutState(userEmail);
      console.error('Order confirmation error:', error);
      
      if (error.code === 'P2034') {
        throw new Error('Transaction timeout. Please try again.');
      }
      
      throw error;
    }
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
