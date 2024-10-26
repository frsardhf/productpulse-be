import { IsNumber, IsOptional, IsPositive } from 'class-validator';
import { ApiProperty } from '@nestjs/swagger';

export class UpdateProductDto {
  @ApiProperty({
    example: 'Updated Wireless Mouse',
    description: 'Updated name of the product',
    required: false
  })
  @IsOptional()
  name?: string;

  @ApiProperty({
    example: 'Updated high-performance wireless mouse with RGB lighting',
    description: 'Updated description of the product',
    required: false
  })
  @IsOptional()
  description?: string;

  @ApiProperty({
    example: 39.99,
    description: 'Updated price of the product',
    required: false,
    minimum: 0
  })
  @IsOptional()
  @IsNumber()
  @IsPositive()
  price?: number;

  @ApiProperty({
    example: 150,
    description: 'Updated stock quantity',
    required: false,
    minimum: 0
  })
  @IsOptional()
  @IsNumber()
  @IsPositive()
  stock?: number;

  @ApiProperty({
    example: 2,
    description: 'Updated category ID of the product',
    required: false
  })
  @IsOptional()
  @IsNumber()
  categoryId?: number;
}