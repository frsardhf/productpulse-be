import { Injectable, NotFoundException, Logger, ConflictException } from '@nestjs/common';
import { PrismaService } from '../prisma.service';
import { UpdateOrderDto } from './dto/update-order.dto';
import { OrderDto } from './dto/order.dto';
import { Order, OrderItem } from '@prisma/client';
import { CartService } from '../cart/cart.service'; 
import { UsersService } from '../users/users.service';
import { Decimal } from '@prisma/client/runtime/library';
import { CheckoutResponse, CheckoutItem } from './types/checkout.type';

@Injectable()
export class OrdersService {
  private readonly logger = new Logger(OrdersService.name);

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

  private async updateStockForOrder(orderItems: OrderItem[]): Promise<void> {
    const startTime = Date.now();
    this.logger.log('Starting stock update process');

    try {
      // Fetch products
      const fetchStart = Date.now();
      const productIds = orderItems.map(item => item.productId);
      const products = await this.prisma.product.findMany({
        where: { id: { in: productIds } },
      });
      this.logger.debug(`Fetched products in ${Date.now() - fetchStart}ms`);

      // Process updates
      const processStart = Date.now();
      const updates = [];
      for (const orderItem of orderItems) {
        const product = products.find(p => p.id === orderItem.productId);

        if (!product) {
          throw new NotFoundException(`Product with ID ${orderItem.productId} not found`);
        }

        if (product.stock < orderItem.quantity) {
          throw new Error(`Insufficient stock for product ID ${orderItem.productId}`);
        }

        updates.push(
          this.prisma.product.update({
            where: { id: orderItem.productId },
            data: { stock: product.stock - orderItem.quantity },
          })
        );
      }
      this.logger.debug(`Processed updates in ${Date.now() - processStart}ms`);

      // Execute transaction
      const transactionStart = Date.now();
      await this.prisma.$transaction(updates);
      this.logger.debug(`Executed transaction in ${Date.now() - transactionStart}ms`);

      this.logger.log(`Completed stock update in ${Date.now() - startTime}ms`);
    } catch (error) {
      this.logger.error('Stock update failed', {
        duration: Date.now() - startTime,
        error: error.message,
        stack: error.stack,
      });
      throw error;
    }
  }

  async processOrder(orderDto: OrderDto, userEmail: string): Promise<Order> {
    const startTime = Date.now();
    this.logger.log(`Starting order processing for user ${userEmail}`);

    try {
      // Find user
      const userStart = Date.now();
      const user = await this.userService.findUserByEmail(userEmail);
      if (!user) {
        throw new NotFoundException(`User with email ${userEmail} not found`);
      }
      this.logger.debug(`Found user in ${Date.now() - userStart}ms`);

      // Create order
      const orderStart = Date.now();
      const order = await this.prisma.order.create({
        data: {
          userId: user.id,
          status: orderDto.status,
          totalPrice: orderDto.totalPrice,
          shippingAddress: orderDto.shippingAddress,
          productsId: orderDto.productsId,
          orderItems: {
            create: orderDto.orderItems.map(item => ({
              product: {
                connect: {
                  id: item.productId,
                },
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
      this.logger.debug(`Created order in ${Date.now() - orderStart}ms`);

      // Parallel operations
      const parallelStart = Date.now();
      await Promise.all([
        this.updateStockForOrder(order.orderItems),
        this.cartService.clearCart(userEmail)
      ]);
      this.logger.debug(`Completed parallel operations in ${Date.now() - parallelStart}ms`);

      this.logger.log(`Completed order processing in ${Date.now() - startTime}ms`, {
        orderId: order.id,
        userEmail,
        itemCount: order.orderItems.length,
        totalPrice: order.totalPrice.toString(),
      });

      return order;
    } catch (error) {
      this.logger.error('Order processing failed', {
        duration: Date.now() - startTime,
        userEmail,
        error: error.message,
        stack: error.stack,
        orderData: {
          ...orderDto,
          totalPrice: orderDto.totalPrice.toString(),
        },
      });
      throw error;
    }
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
