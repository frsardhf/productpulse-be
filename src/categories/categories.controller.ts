import { Controller, Get } from '@nestjs/common';
import { ApiOperation, ApiResponse, ApiTags } from '@nestjs/swagger';
import { PrismaService } from '../prisma.service';

@ApiTags('categories')
@Controller('categories')
export class CategoriesController {
  constructor(private readonly prisma: PrismaService) {}

  @Get()
  @ApiOperation({ summary: 'List product categories' })
  @ApiResponse({ status: 200, description: 'Returns product categories.' })
  findAll() {
    return this.prisma.category.findMany({ orderBy: { name: 'asc' } });
  }
}
