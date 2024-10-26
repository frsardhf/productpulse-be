import { Body, Controller, Delete, Get, Param, Post, Put, UseGuards, HttpCode, Query } from '@nestjs/common';
import { ProductsService } from './products.service';
import { CreateProductDto } from './dto/create-product.dto';
import { UpdateProductDto } from './dto/update-product.dto';
import { ProductDto } from './dto/product.dto';
import { AdminGuard } from '../guards/admin.guard';
import { ApiTags, ApiResponse, ApiBearerAuth, ApiOperation, ApiQuery } from '@nestjs/swagger';
import { User } from '../auth/decorators/user.decorator';
import { UserEntity } from '../users/users.entity';

@ApiTags('products')
@Controller('products')
export class ProductsController {
  constructor(private readonly productsService: ProductsService) {}

  @Post()
  @UseGuards(AdminGuard)
  @ApiBearerAuth('JWT-auth')
  @ApiOperation({ summary: 'Create a new product (Admin only)' })
  @ApiResponse({ status: 201, description: 'The product has been successfully created.', type: ProductDto })
  @ApiResponse({ status: 401, description: 'Unauthorized - User not authenticated' })
  @ApiResponse({ status: 403, description: 'Forbidden - User is not an admin' })
  async create(@Body() createProductDto: CreateProductDto, @User() user: UserEntity): Promise<ProductDto> {
    console.log('Authenticated User:', user);
    return this.productsService.create(createProductDto);
  }

  @Put(':id')
  @UseGuards(AdminGuard)
  @ApiBearerAuth('JWT-auth')
  @ApiOperation({ summary: 'Update a product by ID (Admin only)' })
  @ApiResponse({ status: 200, description: 'The product has been successfully updated.', type: ProductDto })
  @ApiResponse({ status: 401, description: 'Unauthorized - User not authenticated' })
  @ApiResponse({ status: 403, description: 'Forbidden - User is not an admin' })
  @ApiResponse({ status: 404, description: 'Product not found.' })
  async update(
    @Param('id') id: string,
    @Body() updateProductDto: UpdateProductDto,
    @User() user: UserEntity
  ): Promise<ProductDto> {
    console.log('Authenticated User:', user);
    return this.productsService.update(+id, updateProductDto);
  }

  @Delete(':id')
  @UseGuards(AdminGuard)
  @HttpCode(204)
  @ApiBearerAuth('JWT-auth')
  @ApiOperation({ summary: 'Delete a product by ID (Admin only)' })
  @ApiResponse({ status: 204, description: 'The product has been successfully deleted.' })
  @ApiResponse({ status: 401, description: 'Unauthorized - User not authenticated' })
  @ApiResponse({ status: 403, description: 'Forbidden - User is not an admin' })
  @ApiResponse({ status: 404, description: 'Product not found.' })
  async delete(@Param('id') id: string, @User() user: UserEntity): Promise<void> {
    console.log('Authenticated User:', user);
    await this.productsService.delete(+id);
  }

  @Get('all')
  @ApiOperation({ summary: 'Get all products without pagination' })
  @ApiResponse({ status: 200, description: 'Returns all products without pagination.', type: [ProductDto] })
  async findAllProducts(): Promise<ProductDto[]> {
    return this.productsService.findAllProducts();
  }

  @Get()
  @ApiOperation({ summary: 'Get all products with pagination and search' })
  @ApiResponse({ status: 200, description: 'Returns paginated products.', type: [ProductDto] })
  @ApiQuery({ name: 'page', required: false, description: 'Page number (default: 1)', type: Number })
  @ApiQuery({ name: 'limit', required: false, description: 'Items per page (default: 10)', type: Number })
  @ApiQuery({ name: 'search', required: false, description: 'Search term', type: String })
  async findAll(
    @Query('page') page: number = 1,
    @Query('limit') limit: number = 10,
    @Query('search') search?: string
  ): Promise<ProductDto[]> {
    return this.productsService.findAll(page, limit, search);
  }

  @Get(':id')
  @ApiOperation({ summary: 'Get a product by ID' })
  @ApiResponse({ status: 200, description: 'Returns a specific product by ID.', type: ProductDto })
  @ApiResponse({ status: 404, description: 'Product not found.' })
  async findOne(@Param('id') id: string): Promise<ProductDto | null> {
    return this.productsService.findOne(+id);
  }
}