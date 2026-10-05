import { Test, TestingModule } from '@nestjs/testing';
import { Role } from '@prisma/client';
import { AuthenticatedUser } from '../auth/types/authenticated-user.type';
import { OrdersController } from './orders.controller';
import { OrdersService } from './orders.service';

describe('OrdersController', () => {
  let controller: OrdersController;

  const ordersService = {
    checkout: jest.fn(),
    getAllOrders: jest.fn(),
    getOrderHistory: jest.fn(),
    updateOrderStatus: jest.fn(),
  };

  const authenticatedUser: AuthenticatedUser = {
    userId: 7,
    name: 'Test User',
    email: 'test@example.com',
    role: Role.USER,
  };

  beforeEach(async () => {
    jest.clearAllMocks();
    const module: TestingModule = await Test.createTestingModule({
      controllers: [OrdersController],
      providers: [{ provide: OrdersService, useValue: ordersService }],
    }).compile();

    controller = module.get(OrdersController);
  });

  it('creates an order for the authenticated user with one checkout call', async () => {
    const checkoutDto = {
      shippingAddress: '123 Main Street, Jakarta',
      idempotencyKey: '7ca1d688-83d4-4ac2-a71a-6cbe35b20d9f',
    };
    const order = { id: 10, userId: authenticatedUser.userId };
    ordersService.checkout.mockResolvedValue(order);

    await expect(
      controller.checkout(checkoutDto, authenticatedUser),
    ).resolves.toEqual(order);
    expect(ordersService.checkout).toHaveBeenCalledWith(
      authenticatedUser.userId,
      checkoutDto,
    );
  });

  it('loads order history for the authenticated user only', async () => {
    const orders = [{ id: 1, userId: authenticatedUser.userId }];
    ordersService.getOrderHistory.mockResolvedValue(orders);

    await expect(
      controller.getOrderHistory(authenticatedUser),
    ).resolves.toEqual(orders);
    expect(ordersService.getOrderHistory).toHaveBeenCalledWith(
      authenticatedUser.userId,
    );
  });

  it('delegates the admin order listing contract', async () => {
    const orders = [{ id: 1, userId: 7 }];
    ordersService.getAllOrders.mockResolvedValue(orders);

    await expect(controller.getAllOrders()).resolves.toEqual(orders);
  });

  it('delegates the admin order-status update contract', async () => {
    const update = { status: 'shipped' };
    const order = { id: 1, ...update };
    ordersService.updateOrderStatus.mockResolvedValue(order);

    await expect(controller.updateOrderStatus(1, update)).resolves.toEqual(
      order,
    );
    expect(ordersService.updateOrderStatus).toHaveBeenCalledWith(1, update);
  });
});
