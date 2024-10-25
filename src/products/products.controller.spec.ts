import { Test, TestingModule } from '@nestjs/testing';
import { ProductsController } from './products.controller';
import { ProductsService } from './products.service';
import { CreateProductDto } from './dto/create-product.dto';
import { UpdateProductDto } from './dto/update-product.dto';

describe('ProductsController', () => {
  let productsController: ProductsController;
  let productsService: ProductsService;

  const mockProductsService = {
    create: jest.fn(),
    findAll: jest.fn(),
    findOne: jest.fn(),
    update: jest.fn(),
    delete: jest.fn(),
  };

  beforeEach(async () => {
    const module: TestingModule = await Test.createTestingModule({
      controllers: [ProductsController],
      providers: [
        { provide: ProductsService, useValue: mockProductsService },
      ],
    }).compile();

    productsController = module.get<ProductsController>(ProductsController);
    productsService = module.get<ProductsService>(ProductsService);
  });

  it('should be defined', () => {
    expect(productsController).toBeDefined();
  });

  describe('create', () => {
    it('should create a product and return it', async () => {
      const createProductDto: CreateProductDto = {
        name: 'Test Product',
        description: 'Product Description',
        price: 100,
        stock: 6,
        categoryId: 1,
      };
      const createdProduct = { id: 1, ...createProductDto };

      mockProductsService.create.mockResolvedValue(createdProduct);

      const result = await productsController.create(createProductDto);
      expect(result).toEqual(createdProduct);
      expect(mockProductsService.create).toHaveBeenCalledWith(createProductDto);
    });
  });

  describe('findAll', () => {
    it('should return an array of products', async () => {
      const products = [{ id: 1, name: 'Test Product', price: 100 }];
      mockProductsService.findAll.mockResolvedValue(products);

      const result = await productsController.findAll();
      expect(result).toEqual(products);
      expect(mockProductsService.findAll).toHaveBeenCalled();
    });
  });

  describe('findOne', () => {
    it('should return a product by id', async () => {
      const product = { id: 1, name: 'Test Product', price: 100 };
      mockProductsService.findOne.mockResolvedValue(product);

      const result = await productsController.findOne('1');
      expect(result).toEqual(product);
      expect(mockProductsService.findOne).toHaveBeenCalledWith(1);
    });
  });

  describe('update', () => {
    it('should update a product and return it', async () => {
      const updateProductDto: UpdateProductDto = {
        name: 'Updated Product',
        description: 'Updated Description',
        price: 150,
        categoryId: 1,
      };
      const updatedProduct = { id: 1, ...updateProductDto };

      mockProductsService.update.mockResolvedValue(updatedProduct);

      const result = await productsController.update('1', updateProductDto);
      expect(result).toEqual(updatedProduct);
      expect(mockProductsService.update).toHaveBeenCalledWith(1, updateProductDto);
    });
  });

  describe('delete', () => {
    it('should delete a product by id', async () => {
      mockProductsService.delete.mockResolvedValue(undefined);

      const result = await productsController.delete('1');
      expect(result).toBeUndefined();
      expect(mockProductsService.delete).toHaveBeenCalledWith(1);
    });
  });
});
