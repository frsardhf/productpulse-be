import { Injectable, NotFoundException, ConflictException } from '@nestjs/common';
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
    const [user, cartItems] = await Promise.all([
      this.userService.findUserByEmail(userEmail),
      this.cartService.getUserCart(userEmail)
    ]);

    if (!user) {
      throw new NotFoundException(`User with email ${userEmail} not found`);
    }

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

    return checkoutResponse;
  }

  async confirmOrder(orderDto: OrderDto, userEmail: string): Promise<Order> {
    return this.prisma.$transaction(async (prisma) => {
      const [user, products] = await Promise.all([
        this.userService.findUserByEmail(userEmail),
        prisma.product.findMany({
          where: { id: { in: orderDto.productsId } },
          select: { id: true, stock: true }
        })
      ]);

      if (!user) {
        throw new NotFoundException(`User with email ${userEmail} not found`);
      }

      const stockUpdates = [];
      const productMap = new Map(products.map(p => [p.id, p]));

      for (const item of orderDto.orderItems) {
        const product = productMap.get(item.productId);
        
        if (!product) {
          throw new NotFoundException(`Product with ID ${item.productId} not found`);
        }

        if (product.stock < item.quantity) {
          throw new ConflictException(`Insufficient stock for product ID ${item.productId}`);
        }

        stockUpdates.push(
          prisma.product.update({
            where: { id: item.productId },
            data: { stock: product.stock - item.quantity }
          })
        );
      }

      const [order] = await Promise.all([
        prisma.order.create({
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
                price: new Decimal(item.price)
              }))
            }
          },
          include: {
            orderItems: {
              include: { product: true }
            }
          }
        }),
        ...stockUpdates,
        this.cartService.clearCart(userEmail)
      ]);

      return order;
    }, {
      timeout: 10000,
      isolationLevel: 'Serializable'
    });
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
