import { Test, TestingModule } from '@nestjs/testing';
import { ProductsService } from './products.service';
import { PrismaService } from '../prisma.service';
import { CreateProductDto } from './dto/create-product.dto';
import { UpdateProductDto } from './dto/update-product.dto';

describe('ProductsService', () => {
  let productsService: ProductsService;
  let mockPrismaService: { 
    product: { 
      create: jest.Mock; 
      findMany: jest.Mock; 
      findUnique: jest.Mock; 
      update: jest.Mock; 
      delete: jest.Mock } 
    };

  beforeEach(async () => {
    mockPrismaService = {
      product: {
        create: jest.fn(),
        findMany: jest.fn(),
        findUnique: jest.fn(),
        update: jest.fn(),
        delete: jest.fn(),
      },
    };

    const module: TestingModule = await Test.createTestingModule({
      providers: [
        ProductsService,
        { provide: PrismaService, useValue: mockPrismaService },
      ],
    }).compile();

    productsService = module.get<ProductsService>(ProductsService);
  });

  it('should be defined', () => {
    expect(productsService).toBeDefined();
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

      mockPrismaService.product.create.mockResolvedValue(createdProduct);

      const result = await productsService.create(createProductDto);
      expect(result).toEqual(createdProduct);
      expect(mockPrismaService.product.create).toHaveBeenCalledWith({
        data: {
          name: createProductDto.name,
          description: createProductDto.description,
          price: createProductDto.price,
          categoryId: createProductDto.categoryId,
        },
      });
    });
  });

  describe('findAll', () => {
    it('should return an array of products', async () => {
      const productArray = [{ id: 1, name: 'Product 1' }, { id: 2, name: 'Product 2' }];
      mockPrismaService.product.findMany.mockResolvedValue(productArray);

      const result = await productsService.findAll();
      expect(result).toEqual(productArray);
      expect(mockPrismaService.product.findMany).toHaveBeenCalled();
    });
  });

  describe('findOne', () => {
    it('should return a single product', async () => {
      const productId = 1;
      const expectedProduct = { id: productId, name: 'Product 1' };
      mockPrismaService.product.findUnique.mockResolvedValue(expectedProduct);

      const result = await productsService.findOne(productId);
      expect(result).toEqual(expectedProduct);
      expect(mockPrismaService.product.findUnique).toHaveBeenCalledWith({ where: { id: productId } });
    });
  });

  describe('update', () => {
    it('should update and return the product', async () => {
      const productId = 1;
      const updateProductDto: UpdateProductDto = { name: 'Updated Product' };
      const updatedProduct = { id: productId, ...updateProductDto };
      
      mockPrismaService.product.update.mockResolvedValue(updatedProduct);

      const result = await productsService.update(productId, updateProductDto);
      expect(result).toEqual(updatedProduct);
      expect(mockPrismaService.product.update).toHaveBeenCalledWith({
        where: { id: productId },
        data: updateProductDto,
      });
    });
  });

  describe('delete', () => {
    it('should delete the product and return the deleted product', async () => {
      const productId = 1;
      const deletedProduct = { id: productId, name: 'Deleted Product' };

      mockPrismaService.product.delete.mockResolvedValue(deletedProduct);

      const result = await productsService.delete(productId);
      expect(result).toEqual(deletedProduct);
      expect(mockPrismaService.product.delete).toHaveBeenCalledWith({ where: { id: productId } });
    });
  });
});
