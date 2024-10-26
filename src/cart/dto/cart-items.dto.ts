import { ApiProperty } from '@nestjs/swagger';

export class CartItemsDto {
  @ApiProperty({
    example: 1,
    description: 'Unique identifier of the cart item'
  })
  id: number;

  @ApiProperty({
    example: 'Wireless Mouse',
    description: 'Name of the product'
  })
  name: string;

  @ApiProperty({
    example: 'Ergonomic wireless mouse with RGB lighting',
    description: 'Detailed description of the product'
  })
  description: string;

  @ApiProperty({
    example: '29.99',
    description: 'Price of the product'
  })
  price: string;

  @ApiProperty({
    example: 100,
    description: 'Available stock quantity'
  })
  stock: number;

  @ApiProperty({
    example: 1,
    description: 'Category identifier of the product'
  })
  categoryId: number;

  @ApiProperty({
    example: 2,
    description: 'Quantity of items in cart'
  })
  quantity: number;
}