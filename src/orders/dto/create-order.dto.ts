import { IsNumber, IsString, IsArray } from 'class-validator';
import { ApiProperty } from '@nestjs/swagger';

export class CreateOrderDto {
  @ApiProperty({
    example: 1,
    description: 'ID of the user placing the order'
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
    example: 'pending',
    description: 'Current status of the order'
  })
  @IsString()
  status: string;

  @ApiProperty({
    example: 99.99,
    description: 'Total price of the order'
  })
  @IsNumber()
  totalPrice: number;
}