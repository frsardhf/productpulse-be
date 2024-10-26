import { IsNotEmpty, IsNumber, IsPositive } from 'class-validator';
import { ApiProperty } from '@nestjs/swagger';

export class CreateProductDto {
  @ApiProperty({
    example: 'Wireless Mouse',
    description: 'Name of the product'
  })
  @IsNotEmpty({ message: 'Name is required.' })
  name: string;

  @ApiProperty({
    example: 'High-performance wireless mouse with RGB lighting',
    description: 'Detailed description of the product'
  })
  @IsNotEmpty({ message: 'Description is required.' })
  description: string;

  @ApiProperty({
    example: 29.99,
    description: 'Price of the product'
  })
  @IsNotEmpty({ message: 'Price is required.' })
  @IsNumber()
  price: number;

  @ApiProperty({
    example: 100,
    description: 'Available stock quantity',
    minimum: 0
  })
  @IsNotEmpty({ message: 'Stock is required.' })
  @IsNumber()
  @IsPositive()
  stock: number;

  @ApiProperty({
    example: 1,
    description: 'Category ID of the product'
  })
  @IsNotEmpty({ message: 'CategoryId is required.' })
  @IsNumber()
  categoryId: number;
}