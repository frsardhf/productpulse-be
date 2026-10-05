import { BadRequestException, ConflictException } from '@nestjs/common';
import { Test, TestingModule } from '@nestjs/testing';
import { Prisma } from '@prisma/client';
import { PrismaService } from '../prisma.service';
import { OrderStatus } from '../enums/order-status.enum';
import { CheckoutDto } from './dto/checkout.dto';
import { OrdersService } from './orders.service';

describe('OrdersService', () => {
  let ordersService: OrdersService;

  const idempotencyKey = '7ca1d688-83d4-4ac2-a71a-6cbe35b20d9f';
  const checkoutDto: CheckoutDto = {
    shippingAddress: '123 Main Street, Jakarta',
    idempotencyKey,
  };
  const createdOrder = {
    id: 10,
    userId: 7,
    productsId: [1, 2],
    status: OrderStatus.PROCESSING,
    totalPrice: new Prisma.Decimal('35.50'),
    shippingAddress: checkoutDto.shippingAddress,
    idempotencyKey,
    createdAt: new Date('2026-10-05T00:00:00.000Z'),
    orderItems: [],
  };

  const transaction = {
    cartItem: {
      deleteMany: jest.fn(),
      findMany: jest.fn(),
    },
    order: {
      create: jest.fn(),
      findUnique: jest.fn(),
    },
    product: {
      updateMany: jest.fn(),
    },
  };
  const prisma = {
    $transaction: jest.fn(),
    order: {
      findMany: jest.fn(),
      findUnique: jest.fn(),
      update: jest.fn(),
    },
  };

  beforeEach(async () => {
    jest.clearAllMocks();
    prisma.$transaction.mockImplementation(
      async (callback: (client: typeof transaction) => unknown) =>
        callback(transaction),
    );
    prisma.order.findUnique.mockResolvedValue(null);
    transaction.order.findUnique.mockResolvedValue(null);
    transaction.order.create.mockResolvedValue(createdOrder);
    transaction.product.updateMany.mockResolvedValue({ count: 1 });
    transaction.cartItem.deleteMany.mockResolvedValue({ count: 2 });

    const module: TestingModule = await Test.createTestingModule({
      providers: [OrdersService, { provide: PrismaService, useValue: prisma }],
    }).compile();

    ordersService = module.get(OrdersService);
  });

  it('creates one order from authoritative cart products and prices', async () => {
    transaction.cartItem.findMany.mockResolvedValue([
      {
        id: 20,
        userId: 7,
        productId: 2,
        quantity: 1,
        product: {
          id: 2,
          name: 'Second Product',
          description: 'Second description',
          price: new Prisma.Decimal('15.50'),
          stock: 4,
          categoryId: 1,
        },
      },
      {
        id: 19,
        userId: 7,
        productId: 1,
        quantity: 2,
        product: {
          id: 1,
          name: 'First Product',
          description: 'First description',
          price: new Prisma.Decimal('10.00'),
          stock: 5,
          categoryId: 1,
        },
      },
    ]);

    await expect(ordersService.checkout(7, checkoutDto)).resolves.toEqual(
      createdOrder,
    );

    expect(transaction.product.updateMany).toHaveBeenNthCalledWith(1, {
      where: { id: 1, stock: { gte: 2 } },
      data: { stock: { decrement: 2 } },
    });
    expect(transaction.product.updateMany).toHaveBeenNthCalledWith(2, {
      where: { id: 2, stock: { gte: 1 } },
      data: { stock: { decrement: 1 } },
    });

    const createInput = transaction.order.create.mock.calls[0][0];
    expect(createInput.data).toMatchObject({
      userId: 7,
      idempotencyKey,
      status: OrderStatus.PROCESSING,
      shippingAddress: checkoutDto.shippingAddress,
      productsId: [1, 2],
      orderItems: {
        create: [
          {
            productId: 1,
            productName: 'First Product',
            quantity: 2,
            price: new Prisma.Decimal('10.00'),
          },
          {
            productId: 2,
            productName: 'Second Product',
            quantity: 1,
            price: new Prisma.Decimal('15.50'),
          },
        ],
      },
    });
    expect(createInput.data.totalPrice.toString()).toBe('35.5');
    expect(transaction.cartItem.deleteMany).toHaveBeenCalledWith({
      where: { userId: 7, id: { in: [20, 19] } },
    });
  });

  it('returns the existing order for a repeated idempotency key', async () => {
    transaction.order.findUnique.mockResolvedValue(createdOrder);

    await expect(ordersService.checkout(7, checkoutDto)).resolves.toEqual(
      createdOrder,
    );
    expect(transaction.cartItem.findMany).not.toHaveBeenCalled();
    expect(transaction.product.updateMany).not.toHaveBeenCalled();
    expect(transaction.order.create).not.toHaveBeenCalled();
  });

  it('consolidates duplicate cart rows into one stock update and order item', async () => {
    const product = {
      id: 1,
      name: 'First Product',
      description: 'First description',
      price: new Prisma.Decimal('10.00'),
      stock: 5,
      categoryId: 1,
    };
    transaction.cartItem.findMany.mockResolvedValue([
      { id: 19, userId: 7, productId: 1, quantity: 1, product },
      { id: 20, userId: 7, productId: 1, quantity: 2, product },
    ]);

    await ordersService.checkout(7, checkoutDto);

    expect(transaction.product.updateMany).toHaveBeenCalledTimes(1);
    expect(transaction.product.updateMany).toHaveBeenCalledWith({
      where: { id: 1, stock: { gte: 3 } },
      data: { stock: { decrement: 3 } },
    });
    expect(
      transaction.order.create.mock.calls[0][0].data.orderItems.create,
    ).toEqual([
      {
        productId: 1,
        productName: 'First Product',
        quantity: 3,
        price: new Prisma.Decimal('10.00'),
      },
    ]);
  });

  it('recovers an order created by a concurrent duplicate request', async () => {
    prisma.$transaction.mockRejectedValue({ code: 'P2002' });
    prisma.order.findUnique.mockResolvedValue(createdOrder);

    await expect(ordersService.checkout(7, checkoutDto)).resolves.toEqual(
      createdOrder,
    );
    expect(prisma.$transaction).toHaveBeenCalledTimes(1);
  });

  it('rejects insufficient stock without creating an order or clearing cart', async () => {
    transaction.cartItem.findMany.mockResolvedValue([
      {
        id: 19,
        userId: 7,
        productId: 1,
        quantity: 3,
        product: {
          id: 1,
          name: 'First Product',
          description: 'First description',
          price: new Prisma.Decimal('10.00'),
          stock: 2,
          categoryId: 1,
        },
      },
    ]);
    transaction.product.updateMany.mockResolvedValue({ count: 0 });

    await expect(ordersService.checkout(7, checkoutDto)).rejects.toBeInstanceOf(
      ConflictException,
    );
    expect(transaction.order.create).not.toHaveBeenCalled();
    expect(transaction.cartItem.deleteMany).not.toHaveBeenCalled();
  });

  it('does not clear the cart when order creation fails', async () => {
    transaction.cartItem.findMany.mockResolvedValue([
      {
        id: 19,
        userId: 7,
        productId: 1,
        quantity: 1,
        product: {
          id: 1,
          name: 'First Product',
          description: 'First description',
          price: new Prisma.Decimal('10.00'),
          stock: 2,
          categoryId: 1,
        },
      },
    ]);
    transaction.order.create.mockRejectedValue(
      new Error('Simulated order write failure'),
    );

    await expect(ordersService.checkout(7, checkoutDto)).rejects.toThrow(
      'Simulated order write failure',
    );
    expect(transaction.cartItem.deleteMany).not.toHaveBeenCalled();
  });

  it('rejects an empty cart', async () => {
    transaction.cartItem.findMany.mockResolvedValue([]);

    await expect(ordersService.checkout(7, checkoutDto)).rejects.toBeInstanceOf(
      BadRequestException,
    );
    expect(transaction.product.updateMany).not.toHaveBeenCalled();
  });

  it('rejects non-positive or fractional stored quantities defensively', async () => {
    transaction.cartItem.findMany.mockResolvedValue([
      {
        id: 19,
        userId: 7,
        productId: 1,
        quantity: 0.5,
        product: {
          id: 1,
          name: 'First Product',
          description: 'First description',
          price: new Prisma.Decimal('10.00'),
          stock: 2,
          categoryId: 1,
        },
      },
    ]);

    await expect(ordersService.checkout(7, checkoutDto)).rejects.toBeInstanceOf(
      BadRequestException,
    );
    expect(transaction.product.updateMany).not.toHaveBeenCalled();
  });

  it('retries a transaction conflict with the same idempotency key', async () => {
    transaction.order.findUnique.mockResolvedValue(createdOrder);
    prisma.$transaction
      .mockRejectedValueOnce({ code: 'P2034' })
      .mockImplementationOnce(
        async (callback: (client: typeof transaction) => unknown) =>
          callback(transaction),
      );

    await expect(ordersService.checkout(7, checkoutDto)).resolves.toEqual(
      createdOrder,
    );
    expect(prisma.$transaction).toHaveBeenCalledTimes(2);
  });

  it('scopes order history to the supplied authenticated user ID', async () => {
    const orders = [{ id: 1, userId: 7 }];
    prisma.order.findMany.mockResolvedValue(orders);

    await expect(ordersService.getOrderHistory(7)).resolves.toEqual(orders);
    expect(prisma.order.findMany).toHaveBeenCalledWith({
      where: { userId: 7 },
      include: { orderItems: true },
      orderBy: { createdAt: 'desc' },
    });
  });

  it('loads all orders for the admin contract', async () => {
    const orders = [{ id: 1 }, { id: 2 }];
    prisma.order.findMany.mockResolvedValue(orders);

    await expect(ordersService.getAllOrders()).resolves.toEqual(orders);
    expect(prisma.order.findMany).toHaveBeenCalledWith({
      include: { orderItems: true },
      orderBy: { createdAt: 'desc' },
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
