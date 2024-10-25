// src/products/products.controller.ts
import { Body, Controller, Delete, Get, Param, Post, Put, UseGuards, HttpCode, Query } from '@nestjs/common';
import { ProductsService } from './products.service';
import { CreateProductDto } from './dto/create-product.dto';
import { UpdateProductDto } from './dto/update-product.dto';
import { ProductDto } from './dto/product.dto';
import { AdminGuard } from '../guards/admin.guard';
import { ApiTags, ApiResponse, ApiBearerAuth, ApiSecurity } from '@nestjs/swagger';
import { User } from '../auth/decorators/user.decorator';
import { UserEntity } from '../users/users.entity';

@ApiTags('products')
@ApiSecurity('jwt')
@ApiBearerAuth() 
@Controller('products')
export class ProductsController {
  constructor(private readonly productsService: ProductsService) {}

  @UseGuards(AdminGuard)
  @Post()
  @ApiResponse({ status: 201, description: 'The product has been successfully created.', type: ProductDto })
  async create(@Body() createProductDto: CreateProductDto, @User () user: UserEntity): Promise<ProductDto> {
    console.log('Authenticated User:', user);
    return this.productsService.create(createProductDto);
  }

  @UseGuards(AdminGuard)
  @Put(':id')
  @ApiResponse({ status: 200, description: 'The product has been successfully updated.', type: ProductDto })
  @ApiResponse({ status: 404, description: 'Product not found.' })
  async update(@Param('id') id: string, @Body() updateProductDto: UpdateProductDto, @User () user: UserEntity): Promise<ProductDto> {
    console.log('Authenticated User:', user);
    return this.productsService.update(+id, updateProductDto);
  }

  @UseGuards(AdminGuard)
  @Delete(':id')
  @HttpCode(204)
  @ApiResponse({ status: 204, description: 'The product has been successfully deleted.' })
  @ApiResponse({ status: 404, description: 'Product not found.' })
  async delete(@Param('id') id: string, @User () user: UserEntity): Promise<void> {
    console.log('Authenticated User:', user);
    await this.productsService.delete(+id);
  }

  @Get('all')
  @ApiResponse({ status: 200, description: 'Returns all products without pagination.', type: [ProductDto] })
  async findAllProducts(): Promise<ProductDto[]> {
    return this.productsService.findAllProducts();
  }

  @Get()
  @ApiResponse({ status: 200, description: 'Returns all products.', type: [ProductDto] })
  async findAll(@Query('page') page: number = 1, 
    @Query('limit') limit: number = 10, 
    @Query('search') search?: string): Promise<ProductDto[]> {
    return this.productsService.findAll(page, limit, search);
  }

  @Get(':id')
  @ApiResponse({ status: 200, description: 'Returns a specific product by ID.', type: ProductDto })
  @ApiResponse({ status: 404, description: 'Product not found.' })
  async findOne(@Param('id') id: string): Promise<ProductDto | null> {
    return this.productsService.findOne(+id);
  }
}
