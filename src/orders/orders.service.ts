import {
  BadRequestException,
  ConflictException,
  Injectable,
} from '@nestjs/common';
import { Order, Prisma } from '@prisma/client';
import { PrismaService } from '../prisma.service';
import { OrderStatus } from '../enums/order-status.enum';
import { CheckoutDto } from './dto/checkout.dto';
import { UpdateOrderDto } from './dto/update-order.dto';
import { OrderWithItems } from './types/order-with-items.type';

const ORDER_WITH_ITEMS = { orderItems: true } as const;
const MAX_TRANSACTION_ATTEMPTS = 3;

interface CheckoutLine {
  productId: number;
  productName: string;
  quantity: number;
  price: Prisma.Decimal;
}

type CartRow = Prisma.CartItemGetPayload<{
  include: { product: true };
}>;

@Injectable()
export class OrdersService {
  constructor(private readonly prisma: PrismaService) {}

  async checkout(
    userId: number,
    checkoutDto: CheckoutDto,
  ): Promise<OrderWithItems> {
    for (let attempt = 1; attempt <= MAX_TRANSACTION_ATTEMPTS; attempt += 1) {
      try {
        return await this.prisma.$transaction(
          (transaction) =>
            this.createOrderFromCart(transaction, userId, checkoutDto),
          { maxWait: 5000, timeout: 10000 },
        );
      } catch (error: unknown) {
        const existingOrder = await this.findByIdempotencyKey(
          userId,
          checkoutDto.idempotencyKey,
        );
        if (existingOrder) {
          return existingOrder;
        }

        const retryable =
          this.isPrismaError(error, 'P2002') ||
          this.isPrismaError(error, 'P2034');
        if (retryable && attempt < MAX_TRANSACTION_ATTEMPTS) {
          continue;
        }
        if (retryable) {
          throw new ConflictException(
            'Checkout conflicted with another request. Retry with the same idempotency key.',
          );
        }

        throw error;
      }
    }

    throw new ConflictException(
      'Checkout could not be completed. Retry with the same idempotency key.',
    );
  }

  private async createOrderFromCart(
    transaction: Prisma.TransactionClient,
    userId: number,
    checkoutDto: CheckoutDto,
  ): Promise<OrderWithItems> {
    const existingOrder = await transaction.order.findUnique({
      where: {
        userId_idempotencyKey: {
          userId,
          idempotencyKey: checkoutDto.idempotencyKey,
        },
      },
      include: ORDER_WITH_ITEMS,
    });
    if (existingOrder) {
      return existingOrder;
    }

    const cartRows = await transaction.cartItem.findMany({
      where: { userId },
      include: { product: true },
      orderBy: [{ productId: 'asc' }, { id: 'asc' }],
    });
    if (cartRows.length === 0) {
      throw new BadRequestException('Cart is empty');
    }

    const checkoutLines = this.normalizeCart(cartRows);
    for (const line of checkoutLines) {
      const updateResult = await transaction.product.updateMany({
        where: {
          id: line.productId,
          stock: { gte: line.quantity },
        },
        data: {
          stock: { decrement: line.quantity },
        },
      });

      if (updateResult.count !== 1) {
        throw new ConflictException(
          `Insufficient stock for product ${line.productId}`,
        );
      }
    }

    const totalPrice = checkoutLines.reduce(
      (total, line) => total.add(line.price.mul(line.quantity)),
      new Prisma.Decimal(0),
    );

    const order = await transaction.order.create({
      data: {
        userId,
        idempotencyKey: checkoutDto.idempotencyKey,
        status: OrderStatus.PROCESSING,
        totalPrice,
        shippingAddress: checkoutDto.shippingAddress,
        productsId: checkoutLines.map((line) => line.productId),
        orderItems: {
          create: checkoutLines.map((line) => ({
            productId: line.productId,
            productName: line.productName,
            quantity: line.quantity,
            price: line.price,
          })),
        },
      },
      include: ORDER_WITH_ITEMS,
    });

    await transaction.cartItem.deleteMany({
      where: {
        userId,
        id: { in: cartRows.map((row) => row.id) },
      },
    });

    return order;
  }

  private normalizeCart(cartRows: CartRow[]): CheckoutLine[] {
    const lines = new Map<number, CheckoutLine>();

    for (const row of cartRows) {
      if (!Number.isSafeInteger(row.quantity) || row.quantity <= 0) {
        throw new BadRequestException(
          `Invalid cart quantity for product ${row.productId}`,
        );
      }

      const existing = lines.get(row.productId);
      if (existing) {
        existing.quantity += row.quantity;
      } else {
        lines.set(row.productId, {
          productId: row.productId,
          productName: row.product.name,
          quantity: row.quantity,
          price: row.product.price,
        });
      }
    }

    return [...lines.values()].sort(
      (left, right) => left.productId - right.productId,
    );
  }

  private findByIdempotencyKey(
    userId: number,
    idempotencyKey: string,
  ): Promise<OrderWithItems | null> {
    return this.prisma.order.findUnique({
      where: {
        userId_idempotencyKey: { userId, idempotencyKey },
      },
      include: ORDER_WITH_ITEMS,
    });
  }

  private isPrismaError(error: unknown, code: string): boolean {
    return (
      typeof error === 'object' &&
      error !== null &&
      'code' in error &&
      error.code === code
    );
  }

  async getOrderHistory(userId: number): Promise<Order[]> {
    return this.prisma.order.findMany({
      where: { userId },
      include: { orderItems: true },
      orderBy: { createdAt: 'desc' },
    });
  }

  async updateOrderStatus(
    id: number,
    updateOrderDto: UpdateOrderDto,
  ): Promise<Order> {
    return this.prisma.order.update({
      where: { id },
      data: updateOrderDto,
    });
  }

  async getAllOrders(): Promise<Order[]> {
    return this.prisma.order.findMany({
      include: { orderItems: true },
      orderBy: { createdAt: 'desc' },
    });
  }
}
