import { Test, TestingModule } from '@nestjs/testing';
import { CartService } from '../cart/cart.service';
import { PrismaService } from '../prisma.service';
import { UsersService } from '../users/users.service';
import { CheckoutStateService } from './orders-state.service';
import { OrdersService } from './orders.service';

describe('OrdersService', () => {
  let ordersService: OrdersService;

  const prisma = {
    order: {
      findMany: jest.fn(),
      update: jest.fn(),
    },
  };

  beforeEach(async () => {
    jest.clearAllMocks();
    const module: TestingModule = await Test.createTestingModule({
      providers: [
        OrdersService,
        { provide: PrismaService, useValue: prisma },
        { provide: CartService, useValue: {} },
        { provide: UsersService, useValue: {} },
        { provide: CheckoutStateService, useValue: {} },
      ],
    }).compile();

    ordersService = module.get(OrdersService);
  });

  it('scopes order history to the supplied authenticated user ID', async () => {
    const orders = [{ id: 1, userId: 7 }];
    prisma.order.findMany.mockResolvedValue(orders);

    await expect(ordersService.getOrderHistory(7)).resolves.toEqual(orders);
    expect(prisma.order.findMany).toHaveBeenCalledWith({
      where: { userId: 7 },
      include: { orderItems: true },
    });
  });

  it('loads all orders for the admin contract', async () => {
    const orders = [{ id: 1 }, { id: 2 }];
    prisma.order.findMany.mockResolvedValue(orders);

    await expect(ordersService.getAllOrders()).resolves.toEqual(orders);
    expect(prisma.order.findMany).toHaveBeenCalledWith({
      include: { orderItems: true },
    });
  });

  it('updates an order status for the admin contract', async () => {
    const order = { id: 1, status: 'shipped' };
    prisma.order.update.mockResolvedValue(order);

    await expect(
      ordersService.updateOrderStatus(1, { status: 'shipped' }),
    ).resolves.toEqual(order);
    expect(prisma.order.update).toHaveBeenCalledWith({
      where: { id: 1 },
      data: { status: 'shipped' },
    });
  });
});
