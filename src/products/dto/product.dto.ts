import { IsNotEmpty, IsNumber, IsOptional } from 'class-validator';
import { Prisma } from '@prisma/client';
import { ApiProperty } from '@nestjs/swagger';

export class ProductDto {
  @ApiProperty({
    example: 1,
    description: 'Unique identifier of the product'
  })
  id: number;

  @ApiProperty({
    example: 'Wireless Mouse',
    description: 'Name of the product'
  })
  @IsNotEmpty()
  name: string;

  @ApiProperty({
    example: 'High-performance wireless mouse with RGB lighting',
    description: 'Detailed description of the product',
    required: false
  })
  @IsOptional()
  description?: string;

  @ApiProperty({
    example: '29.99',
    description: 'Price of the product'
  })
  @IsNumber()
  @IsNotEmpty()
  price: Prisma.Decimal;

  @ApiProperty({
    example: 100,
    description: 'Available stock quantity'
  })
  @IsNumber()
  @IsNotEmpty()
  stock: number;

  @ApiProperty({
    example: 1,
    description: 'Category ID of the product'
  })
  @IsNotEmpty()
  @IsNumber()
  categoryId: number;
}