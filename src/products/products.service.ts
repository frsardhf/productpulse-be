// src/products/products.service.ts
import { Injectable, NotFoundException } from '@nestjs/common';
import { PrismaService } from '../prisma.service';
import { CreateProductDto } from './dto/create-product.dto';
import { UpdateProductDto } from './dto/update-product.dto';
import { ProductDto } from './dto/product.dto';

@Injectable()
export class ProductsService {
  constructor(private readonly prisma: PrismaService) {}

  async create(createProductDto: CreateProductDto): Promise<ProductDto> {
    const product = await this.prisma.product.create({ data: createProductDto });
    return this.transformToDto(product);
  }

  async findAllProducts(): Promise<ProductDto[]> {
    const products = await this.prisma.product.findMany();
    return products.map(this.transformToDto);
  }

  async findAll(page: number = 1, limit: number = 10, search?: string): Promise<ProductDto[]> {
    const products = await this.prisma.product.findMany({
      where: {
        name: {
          contains: search,
          mode: 'insensitive', // Case insensitive search
        },
      },
      skip: (page - 1) * limit,
      take: limit,
    });
    return products.map(this.transformToDto);
  }

  async findOne(id: number): Promise<ProductDto> {
    const product = await this.prisma.product.findUnique({ where: { id } });
    if (!product) {
      throw new NotFoundException('Product not found');
    }
    return this.transformToDto(product);
  }

  async findManyByIds(productIds: number[]): Promise<ProductDto[]> {
    const products = await this.prisma.product.findMany({
      where: {
        id: {
          in: productIds,
        },
      },
      select: {
        id: true,
        name: true,
        description: true,
        price: true,
        categoryId: true,
        // Remove stock from here if it's not in your Prisma schema
      },
    });

    // Transform the result to match ProductDto
    return products.map(product => ({
      ...product,
      stock: 0, // Add a default value for stock if it's required in ProductDto
    }));
  }

  async update(id: number, data: UpdateProductDto): Promise<ProductDto> {
    const product = await this.prisma.product.findUnique({ where: { id } });
    if (!product) {
      throw new NotFoundException('Product not found');
    }
    const updatedProduct = await this.prisma.product.update({ where: { id }, data });
    return this.transformToDto(updatedProduct);
  }

  async delete(id: number): Promise<void> {
    const product = await this.prisma.product.findUnique({ where: { id } });
    if (!product) {
      throw new NotFoundException('Product not found');
    }
    await this.prisma.product.delete({ where: { id } });
  }

  private transformToDto(product: any): ProductDto {
    return {
      id: product.id,
      name: product.name,
      description: product.description,
      price: product.price,
      stock: product.stock,
      categoryId: product.categoryId,
    };
  }
}
