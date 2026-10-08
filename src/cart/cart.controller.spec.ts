import { Role } from '@prisma/client';
import { AuthenticatedUser } from '../auth/types/authenticated-user.type';
import { CartController } from './cart.controller';
import { CartService } from './cart.service';

describe('CartController', () => {
  const user: AuthenticatedUser = {
    userId: 42,
    name: 'Cart Tester',
    email: 'cart@example.test',
    role: Role.USER,
  };
  const cartService = {
    addCartItem: jest.fn(),
    getUserCart: jest.fn(),
    updateCartItem: jest.fn(),
    removeCartItem: jest.fn(),
    getTotalPrice: jest.fn(),
  };
  const controller = new CartController(cartService as unknown as CartService);

  beforeEach(() => jest.clearAllMocks());

  it('uses the authenticated user ID for every cart operation', async () => {
    cartService.getUserCart.mockResolvedValue([]);
    cartService.getTotalPrice.mockResolvedValue(0);

    await controller.addCartItem({ productId: 7, quantity: 2 }, user);
    await controller.getUserCart(user);
    await controller.updateCartItem(7, { quantity: 3 }, user);
    await controller.deleteCartItem(7, user);
    await controller.getTotalPrice(user);

    expect(cartService.addCartItem).toHaveBeenCalledWith(42, 7, 2);
    expect(cartService.getUserCart).toHaveBeenCalledWith(42);
    expect(cartService.updateCartItem).toHaveBeenCalledWith(42, 7, {
      quantity: 3,
    });
    expect(cartService.removeCartItem).toHaveBeenCalledWith(42, 7);
    expect(cartService.getTotalPrice).toHaveBeenCalledWith(42);
  });
});
