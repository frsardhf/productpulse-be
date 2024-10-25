import { Test, TestingModule } from '@nestjs/testing';
import { OrdersService } from './orders.service';
import { PrismaService } from '../prisma.service';

describe('OrdersService', () => {
  let ordersService: OrdersService;

  const mockPrismaService = {
    order: {
      create: jest.fn(),
      findMany: jest.fn(),
      findUnique: jest.fn(),
      update: jest.fn(),
      delete: jest.fn(),
    },
  };

  beforeEach(async () => {
    const module: TestingModule = await Test.createTestingModule({
      providers: [
        OrdersService,
        { provide: PrismaService, useValue: mockPrismaService },
      ],
    }).compile();

    ordersService = module.get<OrdersService>(OrdersService);
  });

  it('should be defined', () => {
    expect(ordersService).toBeDefined();
  });

  it('should create an order', async () => {
    const createdAt = new Date().toISOString();
    const orderData = { userId: 1, productsId: [1, 2], status: 'pending',
      totalPrice: 20, createdAt: new Date(createdAt)
     };
    mockPrismaService.order.create.mockResolvedValue(orderData);

    const result = await ordersService.create(orderData);
    expect(result).toEqual(orderData);
    expect(mockPrismaService.order.create).toHaveBeenCalledWith({ data: orderData });
  });

  it('should find all orders', async () => {
    const orders = [{ id: 1, userId: 1, status: 'pending' }];
    mockPrismaService.order.findMany.mockResolvedValue(orders);

    const result = await ordersService.findAll();
    expect(result).toEqual(orders);
    expect(mockPrismaService.order.findMany).toHaveBeenCalled();
  });

  it('should find an order by id', async () => {
    const order = { id: 1, userId: 1, status: 'pending' };
    mockPrismaService.order.findUnique.mockResolvedValue(order);

    const result = await ordersService.findOne(1);
    expect(result).toEqual(order);
    expect(mockPrismaService.order.findUnique).toHaveBeenCalledWith({ where: { id: 1 } });
  });

  it('should update an order', async () => {
    const orderData = { status: 'completed' };
    const updatedOrder = { id: 1, userId: 1, ...orderData };
    mockPrismaService.order.update.mockResolvedValue(updatedOrder);

    const result = await ordersService.update(1, orderData);
    expect(result).toEqual(updatedOrder);
    expect(mockPrismaService.order.update).toHaveBeenCalledWith({
      where: { id: 1 },
      data: orderData,
    });
  });

  it('should delete an order', async () => {
    const orderId = 1;
    mockPrismaService.order.delete.mockResolvedValue({ id: orderId });

    const result = await ordersService.delete(orderId);
    expect(result).toEqual({ id: orderId });
    expect(mockPrismaService.order.delete).toHaveBeenCalledWith({ where: { id: orderId } });
  });
});
