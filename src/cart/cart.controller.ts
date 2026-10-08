import {
  Body,
  Controller,
  Delete,
  Get,
  Param,
  ParseIntPipe,
  Post,
  Put,
  UseGuards,
} from '@nestjs/common';
import { CartService } from './cart.service';
import { CreateCartItemDto } from './dto/create-cart-item.dto';
import { UpdateCartItemDto } from './dto/update-cart-item.dto';
import { ApiTags, ApiResponse, ApiBearerAuth } from '@nestjs/swagger';
import { JwtAuthGuard } from '../guards/jwtauth.guard';
import { User } from '../auth/decorators/user.decorator';
import { CartItemsDto } from './dto/cart-items.dto';
import { AuthenticatedUser } from '../auth/types/authenticated-user.type';

@ApiTags('cart')
@Controller('cart')
@UseGuards(JwtAuthGuard)
@ApiBearerAuth('JWT-auth')
export class CartController {
  constructor(private readonly cartService: CartService) {}

  @Post('add')
  @ApiResponse({ status: 201, description: 'Item added to cart.' })
  @ApiResponse({ status: 400, description: 'Invalid input.' })
  @ApiResponse({ status: 404, description: 'User or product not found.' })
  @ApiResponse({ status: 500, description: 'Internal server error.' })
  async addCartItem(
    @Body() createCartItemDto: CreateCartItemDto,
    @User() user: AuthenticatedUser,
  ) {
    const { productId, quantity } = createCartItemDto;
    return this.cartService.addCartItem(user.userId, productId, quantity);
  }

  @Get('my-cart')
  @UseGuards(JwtAuthGuard)
  @ApiResponse({
    status: 200,
    description: 'Retrieved user cart successfully.',
    type: [CartItemsDto],
  })
  async getUserCart(@User() user: AuthenticatedUser): Promise<CartItemsDto[]> {
    return this.cartService.getUserCart(user.userId);
  }

  @Put(':productId')
  @ApiResponse({ status: 200, description: 'Cart item updated successfully.' })
  @ApiResponse({ status: 404, description: 'Cart item not found.' })
  async updateCartItem(
    @Param('productId', ParseIntPipe) productId: number,
    @Body() updateCartItemDto: UpdateCartItemDto,
    @User() user: AuthenticatedUser,
  ) {
    return this.cartService.updateCartItem(
      user.userId,
      productId,
      updateCartItemDto,
    );
  }

  @Delete(':productId')
  @ApiResponse({ status: 204, description: 'Cart item deleted successfully.' })
  @ApiResponse({ status: 404, description: 'Cart item not found.' })
  async deleteCartItem(
    @Param('productId', ParseIntPipe) productId: number,
    @User() user: AuthenticatedUser,
  ) {
    await this.cartService.removeCartItem(user.userId, productId);
    return { message: 'Cart item deleted successfully' };
  }

  @Get('total')
  @ApiResponse({
    status: 200,
    description: 'Retrieved total price successfully.',
  })
  async getTotalPrice(@User() user: AuthenticatedUser) {
    const totalPrice = await this.cartService.getTotalPrice(user.userId);
    return { totalPrice };
  }
}
