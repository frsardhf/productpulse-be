import { Decimal } from '@prisma/client/runtime/library';
import { IsDate, IsNumber, IsString, IsArray } from 'class-validator';
import { ApiProperty } from '@nestjs/swagger';

export class OrderDto {
  @ApiProperty({
    example: 1,
    description: 'Unique identifier of the order'
  })
  @IsNumber()
  id: number;

  @ApiProperty({
    example: 1,
    description: 'ID of the user who placed the order'
  })
  @IsNumber()
  userId: number;

  @ApiProperty({
    example: [1, 2, 3],
    description: 'Array of product IDs in the order'
  })
  @IsArray()
  productsId: number[];

  @ApiProperty({
    example: [
      { productId: 1, quantity: 2, price: "29.99" }
    ],
    description: 'Detailed information about each ordered item'
  })
  @IsArray()
  orderItems: {
    productId: number;
    quantity: number;
    price: string;
  }[];

  @ApiProperty({
    example: 'processing',
    description: 'Current status of the order'
  })
  @IsString()
  status: string;

  @ApiProperty({
    example: '99.99',
    description: 'Total price of the order'
  })
  @IsNumber()
  totalPrice: Decimal;

  @ApiProperty({
    example: '2024-01-01T00:00:00Z',
    description: 'Date and time when the order was created'
  })
  @IsDate()
  createdAt: Date;

  @ApiProperty({
    example: '123 Main St, City, Country',
    description: 'Shipping address for the order'
  })
  @IsString()
  shippingAddress: string;
}