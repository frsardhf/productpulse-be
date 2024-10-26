import { Controller, Post, Body } from '@nestjs/common';
import { PrismaClient } from '@prisma/client';

@Controller('categories')
export class CategoriesController {
  private prisma = new PrismaClient();

  @Post('/seed')
  async seedCategories() {
    const categories = [
      { name: 'Electronics' },
      { name: 'Books' },
      { name: 'Clothing' },
    ];

    const createdCategories = await this.prisma.category.createMany({
      data: categories,
      skipDuplicates: true, // This prevents duplicate categories
    });

    return createdCategories;
  }
}
