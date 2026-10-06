import {
  ConflictException,
  Injectable,
  NotFoundException,
} from '@nestjs/common';
import { CartItem, Prisma } from '@prisma/client';
import { PrismaService } from '../prisma.service';
import { CartItemsDto } from './dto/cart-items.dto';
import { UpdateCartItemDto } from './dto/update-cart-item.dto';

const MAX_CART_MUTATION_ATTEMPTS = 3;

@Injectable()
export class CartService {
  constructor(private readonly prisma: PrismaService) {}

  async addCartItem(
    userId: number,
    productId: number,
    quantity: number,
  ): Promise<CartItem> {
    this.assertValidQuantity(quantity);

    for (let attempt = 1; attempt <= MAX_CART_MUTATION_ATTEMPTS; attempt += 1) {
      try {
        return await this.prisma.$transaction(
          async (transaction) => {
            const product = await transaction.product.findUnique({
              where: { id: productId },
              select: { stock: true },
            });
            if (!product) {
              throw new NotFoundException(
                `Product with id ${productId} not found`,
              );
            }

            const existingItem = await transaction.cartItem.findUnique({
              where: { userId_productId: { userId, productId } },
            });
            const nextQuantity = (existingItem?.quantity ?? 0) + quantity;
            this.assertWithinStock(nextQuantity, product.stock);

            return transaction.cartItem.upsert({
              where: { userId_productId: { userId, productId } },
              update: { quantity: nextQuantity },
              create: { userId, productId, quantity },
            });
          },
          { isolationLevel: Prisma.TransactionIsolationLevel.Serializable },
        );
      } catch (error: unknown) {
        if (this.isRetryableWriteConflict(error)) {
          if (attempt < MAX_CART_MUTATION_ATTEMPTS) {
            continue;
          }
          throw new ConflictException(
            'Cart changed concurrently. Please try again.',
          );
        }
        throw error;
      }
    }

    throw new ConflictException('Cart could not be updated. Please try again.');
  }

  async getUserCart(userId: number): Promise<CartItemsDto[]> {
    const cartItems = await this.prisma.cartItem.findMany({
      where: { userId },
      include: { product: true },
      orderBy: { id: 'asc' },
    });

    return cartItems.map((item) => ({
      id: item.product.id,
      name: item.product.name,
      description: item.product.description,
      price: item.product.price.toString(),
      stock: item.product.stock,
      categoryId: item.product.categoryId,
      quantity: item.quantity,
    }));
  }

  async getCartProductIds(userId: number): Promise<number[]> {
    const cartItems = await this.getUserCart(userId);
    return cartItems.map((item) => item.id);
  }

  async updateCartItem(
    userId: number,
    productId: number,
    updateCartItemDto: UpdateCartItemDto,
  ): Promise<CartItem> {
    const { quantity } = updateCartItemDto;
    this.assertValidQuantity(quantity);

    return this.prisma.$transaction(
      async (transaction) => {
        const product = await transaction.product.findUnique({
          where: { id: productId },
          select: { stock: true },
        });
        if (!product) {
          throw new NotFoundException(`Product with id ${productId} not found`);
        }
        this.assertWithinStock(quantity, product.stock);

        const result = await transaction.cartItem.updateMany({
          where: { userId, productId },
          data: { quantity },
        });
        if (result.count !== 1) {
          throw new NotFoundException('Cart item not found');
        }

        return transaction.cartItem.findUniqueOrThrow({
          where: { userId_productId: { userId, productId } },
        });
      },
      { isolationLevel: Prisma.TransactionIsolationLevel.Serializable },
    );
  }

  async removeCartItem(userId: number, productId: number): Promise<CartItem> {
    try {
      return await this.prisma.cartItem.delete({
        where: { userId_productId: { userId, productId } },
      });
    } catch (error: unknown) {
      if (this.isPrismaError(error, 'P2025')) {
        throw new NotFoundException('Cart item not found');
      }
      throw error;
    }
  }

  async getTotalPrice(userId: number): Promise<number> {
    const cartItems = await this.prisma.cartItem.findMany({
      where: { userId },
      include: { product: true },
    });

    return cartItems.reduce(
      (total, item) => total + item.quantity * item.product.price.toNumber(),
      0,
    );
  }

  async clearCart(userId: number): Promise<void> {
    await this.prisma.cartItem.deleteMany({ where: { userId } });
  }

  private assertValidQuantity(quantity: number): void {
    if (!Number.isSafeInteger(quantity) || quantity < 1) {
      throw new ConflictException('Cart quantity must be a positive integer');
    }
  }

  private assertWithinStock(quantity: number, stock: number): void {
    if (quantity > stock) {
      throw new ConflictException(
        `Requested quantity exceeds available stock of ${stock}`,
      );
    }
  }

  private isRetryableWriteConflict(error: unknown): boolean {
    return (
      this.isPrismaError(error, 'P2002') || this.isPrismaError(error, 'P2034')
    );
  }

  private isPrismaError(error: unknown, code: string): boolean {
    return (
      typeof error === 'object' &&
      error !== null &&
      'code' in error &&
      error.code === code
    );
  }
}
