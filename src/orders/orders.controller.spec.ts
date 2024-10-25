import { Test, TestingModule } from '@nestjs/testing';
import { OrdersController } from './orders.controller';
import { OrdersService } from './orders.service';
import { CreateOrderDto } from './dto/create-order.dto';

describe('OrdersController', () => {
  let ordersController: OrdersController;
  let ordersService: OrdersService;

  const mockOrdersService = {
    create: jest.fn(),
    findAll: jest.fn(),
    findOne: jest.fn(),
    update: jest.fn(),
    delete: jest.fn(),
  };

  beforeEach(async () => {
    const module: TestingModule = await Test.createTestingModule({
      controllers: [OrdersController],
      providers: [
        { provide: OrdersService, useValue: mockOrdersService },
      ],
    }).compile();

    ordersController = module.get<OrdersController>(OrdersController);
    ordersService = module.get<OrdersService>(OrdersService);
  });

  it('should be defined', () => {
    expect(ordersController).toBeDefined();
  });

  describe('create', () => {
    it('should create an order and return it', async () => {
      const createdAt = new Date().toISOString();
      const createOrderDto: CreateOrderDto = {
        userId: 1,
        productsId: [1, 2],
        status: 'pending',
        totalPrice: 20, 
        createdAt: new Date(createdAt)
      };
      const createdOrder = { id: 1, ...createOrderDto };

      mockOrdersService.create.mockResolvedValue(createdOrder);

      const result = await ordersController.create(createOrderDto);
      expect(result).toEqual(createdOrder);
      expect(mockOrdersService.create).toHaveBeenCalledWith(createOrderDto);
    });
  });

  describe('findAll', () => {
    it('should return an array of orders', async () => {
      const orders = [{ id: 1, userId: 1, productIds: [1], status: 'pending' }];
      mockOrdersService.findAll.mockResolvedValue(orders);

      const result = await ordersController.findAll();
      expect(result).toEqual(orders);
      expect(mockOrdersService.findAll).toHaveBeenCalled();
    });
  });

  describe('findOne', () => {
    it('should return an order by id', async () => {
      const order = { id: 1, userId: 1, productIds: [1], status: 'pending' };
      mockOrdersService.findOne.mockResolvedValue(order);

      const result = await ordersController.findOne('1');
      expect(result).toEqual(order);
      expect(mockOrdersService.findOne).toHaveBeenCalledWith(1);
    });
  });

  describe('update', () => {
    it('should update an order and return it', async () => {
      const updateOrderDto = { status: 'completed' };
      const updatedOrder = { id: 1, userId: 1, productIds: [1], status: 'completed' };

      mockOrdersService.update.mockResolvedValue(updatedOrder);

      const result = await ordersController.update('1', updateOrderDto);
      expect(result).toEqual(updatedOrder);
      expect(mockOrdersService.update).toHaveBeenCalledWith(1, updateOrderDto);
    });
  });

  describe('delete', () => {
    it('should delete an order by id', async () => {
      mockOrdersService.delete.mockResolvedValue(undefined);

      const result = await ordersController.delete('1');
      expect(result).toBeUndefined();
      expect(mockOrdersService.delete).toHaveBeenCalledWith(1);
    });
  });
});
