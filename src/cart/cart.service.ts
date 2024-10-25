import { Injectable, NotFoundException } from '@nestjs/common';
import { PrismaService } from '../prisma.service';
import { CreateCartItemDto } from './dto/create-cart-item.dto';
import { UpdateCartItemDto } from './dto/update-cart-item.dto';
import { CartItemsDto } from './dto/cart-items.dto';
import { CartItem, Prisma } from '@prisma/client'; 
import { UsersService } from '../users/users.service';

@Injectable()
export class CartService {
  constructor(
    private readonly prisma: PrismaService,
    private readonly userService: UsersService
  ) {}

  async addCartItem(userEmail: string, productId: number, quantity: number) {
    try {
      // First, find the user by email
      const user = await this.userService.findUserByEmail(userEmail);
      if (!user) {
        throw new NotFoundException(`User with email ${userEmail} not found`);
      }

      // Check if the product exists
      const product = await this.prisma.product.findUnique({
        where: { id: productId }
      });

      if (!product) {
        throw new NotFoundException(`Product with id ${productId} not found`);
      }

      // Check if the product is already in the cart
      const existingCartItem = await this.prisma.cartItem.findFirst({
        where: {
          user: { email: userEmail },
          productId: productId,
        },
      });

      if (existingCartItem) {
        // If it exists, update the quantity
        return await this.prisma.cartItem.update({
          where: { id: existingCartItem.id },
          data: { quantity: existingCartItem.quantity + quantity },
        });
      } else {
        // If not, create a new cart item
        return await this.prisma.cartItem.create({
          data: {
            quantity: quantity,
            product: {
              connect: {
                id: productId
              }
            },
            user: {
              connect: {
                email: userEmail
              }
            }
          }
        });
      }
    } catch (error) {
      console.error('Error adding item to cart:', error);
      if (error instanceof NotFoundException) {
        throw error;
      }
      throw new Error('Failed to add item to cart');
    }
  }

  async getUserCart(userEmail: string): Promise<CartItemsDto[]> {
    const cartItems = await this.prisma.cartItem.findMany({
      where: { user: { email: userEmail } },
      include: { product: true },
    });

    const cartProducts: CartItemsDto[] = cartItems.map(item => ({
      id: item.product.id,
      name: item.product.name,
      description: item.product.description,
      price: item.product.price.toString(),
      stock: item.product.stock,
      categoryId: item.product.categoryId,
      quantity: item.quantity,
    }));

    return cartProducts;
  }

  async getCartProductIds(userEmail: string): Promise<number[]> {
    const cartItems = await this.getUserCart(userEmail);
    return cartItems.map(item => item.id);
  }

  async updateCartItem(userEmail: string, productId: number, updateCartItemDto: UpdateCartItemDto): Promise<CartItem> {
    const { quantity } = updateCartItemDto;

    const existingItem = await this.prisma.cartItem.findFirst({
      where: { user: { email: userEmail }, productId },
    });

    if (!existingItem) {
      throw new NotFoundException('Cart item not found');
    }

    return await this.prisma.cartItem.update({
      where: { id: existingItem.id },
      data: { quantity },
    });
  }

  async removeCartItem(userEmail: string, productId: number): Promise<CartItem> {
    const existingItem = await this.prisma.cartItem.findFirst({
      where: { user: { email: userEmail }, productId },
    });

    if (!existingItem) {
      throw new NotFoundException('Cart item not found');
    }

    return await this.prisma.cartItem.delete({
      where: { id: existingItem.id },
    });
  }

  async getTotalPrice(userEmail: string): Promise<number> {
    const cartItems = await this.prisma.cartItem.findMany({
      where: { user: { email: userEmail } },
      include: { product: true },
    });

    return cartItems.reduce((total, item) => {
      const price = item.product.price instanceof Prisma.Decimal ? item.product.price.toNumber() : 0;
      return total + item.quantity * price;
    }, 0);
  }

  async clearCart(userEmail: string): Promise<void> {
    await this.prisma.cartItem.deleteMany({
      where: { user: { email: userEmail } },
    });
  }
}