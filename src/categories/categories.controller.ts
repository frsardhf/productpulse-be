import { Controller, Post, Body } from '@nestjs/common';
import { PrismaClient } from '@prisma/client';
import { ApiTags, ApiOperation, ApiResponse } from '@nestjs/swagger';

@ApiTags('categories')  // Add this decorator to group your endpoints
@Controller('categories')
export class CategoriesController {
  private prisma = new PrismaClient();

  @Post('/seed')
  @ApiOperation({ summary: 'Seed categories', description: 'Creates initial set of categories' })
  @ApiResponse({ status: 201, description: 'Categories have been successfully created' })
  @ApiResponse({ status: 400, description: 'Bad request' })
  async seedCategories() {
    const categories = [
      { name: 'Electronics' },
      { name: 'Books' },
      { name: 'Clothing' },
    ];

    const createdCategories = await this.prisma.category.createMany({
      data: categories,
      skipDuplicates: true,
    });

    return createdCategories;
  }
}