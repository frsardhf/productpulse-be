import { Body, Controller, Delete, Get, Param, Post, Put, UseGuards, NotFoundException, InternalServerErrorException } from '@nestjs/common';
import { CartService } from './cart.service';
import { CreateCartItemDto } from './dto/create-cart-item.dto';
import { UpdateCartItemDto } from './dto/update-cart-item.dto';
import { ApiTags, ApiResponse, ApiBearerAuth } from '@nestjs/swagger';
import { JwtAuthGuard } from '../guards/jwtauth.guard';
import { User } from '../auth/decorators/user.decorator';
import { CartItemsDto } from './dto/cart-items.dto';

@ApiTags('cart')
@Controller('cart')
@UseGuards(JwtAuthGuard) // Protect all routes in this controller
@ApiBearerAuth()
export class CartController {
  constructor(private readonly cartService: CartService) {}

  @Post('add')
  @ApiResponse({ status: 201, description: 'Item added to cart.' })
  @ApiResponse({ status: 400, description: 'Invalid input.' })
  @ApiResponse({ status: 404, description: 'User or product not found.' })
  @ApiResponse({ status: 500, description: 'Internal server error.' })
  async addCartItem(@Body() createCartItemDto: CreateCartItemDto, @User() user: any) {
    try {
      console.log('Authenticated User:', user);
      const userEmail = user.email;
      const { productId, quantity } = createCartItemDto;
      return await this.cartService.addCartItem(userEmail, productId, quantity);
    } catch (error) {
      if (error instanceof NotFoundException) {
        throw error;
      }
      throw new InternalServerErrorException('Failed to add item to cart');
    }
  }

  @Get('my-cart')
  @UseGuards(JwtAuthGuard)
  @ApiResponse({ status: 200, description: 'Retrieved user cart successfully.', type: [CartItemsDto] })
  async getUserCart(@User() user: any): Promise<CartItemsDto[]> {
    const userEmail = user.email;
    return this.cartService.getUserCart(userEmail);
  }

  @Put(':productId')
  @ApiResponse({ status: 200, description: 'Cart item updated successfully.' })
  @ApiResponse({ status: 404, description: 'Cart item not found.' })
  async updateCartItem(
    @Param('productId') productId: string,
    @Body() updateCartItemDto: UpdateCartItemDto,
    @User() user: any
  ) {
    const userEmail = user.email;
    return this.cartService.updateCartItem(userEmail, parseInt(productId), updateCartItemDto);
  }

  @Delete(':productId')
  @ApiResponse({ status: 204, description: 'Cart item deleted successfully.' })
  @ApiResponse({ status: 404, description: 'Cart item not found.' })
  async deleteCartItem(@Param('productId') productId: string, @User() user: any) {
    const userEmail = user.email;
    await this.cartService.removeCartItem(userEmail, parseInt(productId));
    return { message: 'Cart item deleted successfully' };
  }

  @Get('total')
  @ApiResponse({ status: 200, description: 'Retrieved total price successfully.' })
  async getTotalPrice(@User() user: any) {
    const userEmail = user.email;
    const totalPrice = await this.cartService.getTotalPrice(userEmail);
    return { totalPrice };
  }
}